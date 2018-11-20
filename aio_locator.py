import json
import sys
import threading
import uuid
from functools import partial

import cv2
import pyproj
from darkflow.net.build import TFNet
from flask import Flask, render_template, Response
from shapely.geometry import Point, Polygon
from shapely.ops import transform
from socketIO_client import SocketIO, LoggingNamespace

from utils import *

app = Flask(__name__)

# Radius of the earth, in KM:
earth_radius = 6371
frame_for_stream = None


class ReferencePoint:
    x, y, lat, lon = None, None, None, None

    def __init__(self, self_x, self_y, self_lat, self_lon):
        self.x = self_x
        self.y = self_y
        self.lat = self_lat
        self.lon = self_lon

    def get_geocoords(self):
        return self.lat, self.lon

    def get_lat(self):
        return self.lat

    def get_lon(self):
        return self.lon

    def get_pixcoords(self):
        return self.x, self.y

    def get_x(self):
        return self.x

    def get_y(self):
        return self.y


class Rectangle:
    x, y, w, h = 0, 0, 0, 0
    top_left, top_right, bottom_left, bottom_right = (0, 0), (0, 0), (0, 0), (0, 0)

    def __init__(self, in_x, in_y, in_w, in_h):
        self.x = in_x
        self.y = in_y
        self.w = in_w
        self.h = in_h
        self.top_left = (in_x, in_y)
        self.top_right = (in_x + in_w, in_y)
        self.bottom_left = (in_x, in_y + in_h)
        self.bottom_right = (in_x + in_w, in_y + in_h)

    @classmethod
    def from_contour(cls, contour):
        in_x, in_y, in_w, in_h = cv2.boundingRect(contour)
        return cls(in_x, in_y, in_w, in_h)

    def intersects(self, other):
        if self.x > other.x + other.w or self.x + self.w < other.x:
            return False
        if self.y > other.y + other.h or self.y + self.h < other.y:
            return False
        return True

    def merge(self, other):
        new_x = self.x if self.x < other.x else other.x
        new_y = self.y if self.y < other.y else other.y
        new_w = self.w if self.w > other.w else other.w
        new_h = self.h if self.h > other.h else other.h
        return Rectangle(new_x, new_y, new_w, new_h)

    def get_dimensions(self):
        return self.x, self.y, self.w, self.h

    def draw(self, img):
        cv2.rectangle(img, (self.x, self.y), (self.x + self.w, self.y + self.h), (125, 125, 125), 2)


def get_geom_dist(x1, y1, x2, y2):
    return math.sqrt(math.pow(x2 - x1, 2) + math.pow(y2 - y1, 2))


def get_distance_by_pixels(obj_pt, h, left_point, right_point, cam_coords, init_distance, init_pix_height, ref_ratio):
    distance_from_left = get_geom_dist(obj_pt[0], obj_pt[1], left_point.get_x(),
                                       left_point.get_y()) * ref_ratio
    distance_from_right = get_geom_dist(obj_pt[0], obj_pt[1], right_point.get_x(),
                                        right_point.get_y()) * ref_ratio
    meters_from_cam = (init_distance / (h / init_pix_height)) * 0.3048

    # Create circles from the three lat lons with radius = distance from person
    a = latlonbuffer(left_point.lat, left_point.lon, distance_from_left)
    b = latlonbuffer(right_point.lat, right_point.lon, distance_from_right)
    c = latlonbuffer(cam_coords[0], cam_coords[1], meters_from_cam)

    intersection = a.intersection(c)

    ret_lat, ret_lon = None, None

    if type(intersection) is Polygon:
        check_lat, check_lon = right_point.lat, right_point.lon
        db_lon, db_lat = intersection.exterior.coords[0]
        smallest_dist = get_distance(db_lat, db_lon, check_lat, check_lon)
        for lon, lat in intersection.exterior.coords:
            new_dist = get_distance(lat, lon, check_lat, check_lon)
            if new_dist < smallest_dist:
                smallest_dist = new_dist
                ret_lat, ret_lon = lat, lon
        if smallest_dist < meters_from_cam:
            for lon, lat in intersection.exterior.coords:
                if get_distance(lat, lon, check_lat, check_lon) > meters_from_cam:
                    ret_lat, ret_lon = lat, lon
                    break
    return ret_lat, ret_lon


def get_yolo_results(tfnet, frame):
    """Get the TFNet reuslts without drawing"""
    return tfnet.return_predict(frame)


def get_and_draw_yolo_results(tfnet, frame):
    """Get the TFNet results and draw them"""
    results = tfnet.return_predict(frame)
    frame = draw_yolo_results(results, frame)
    return frame, results


def draw_yolo_results(results, img):
    """Draw the YOLO results on the frame"""
    for result in results:
        if result['label'] == "car" or result['label'] == "truck":
            b, g, r = 15, 0, 214
        elif result['label'] == "person":
            b, g, r = 255, 168, 9
        elif result['label'] == "bicycle":
            b, g, r = 255, 101, 162
        else:
            b, g, r = 0, 227, 251
        # Ignore birds and keyboards...
        if "bird" in result['label'] or "keyboard" in result['label']:
            continue
        x = result['topleft']['x']
        y = result['topleft']['y']
        w = result['bottomright']['x'] - x
        h = result['bottomright']['y'] - y
        cv2.rectangle(img, (x, y), (x + w, y + h), (b, g, r), 4)
        cv2.putText(img, "{}: {}".format(result['label'], "%.2f" % result['confidence']), (x, y - 16),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (b, g, r), 1)
    return img


def latlonbuffer(lat, lon, radius_m):
    proj4str = '+proj=aeqd +lat_0=%s +lon_0=%s +x_0=0 +y_0=0' % (lat, lon)
    aeqd = pyproj.Proj(proj4str)
    project = partial(pyproj.transform, aeqd, pyproj.Proj(init='epsg:4326'))
    return transform(project, Point(0, 0).buffer(radius_m))


###############################################################
#         A thread worker for trilatering video data          #
###############################################################
def trilateration_worker():
    global ion_id
    global frame_for_stream

    with SocketIO('localhost', 3080, LoggingNamespace) as socket:
        ###############################################################
        #                   Restore data from JSON                    #
        ###############################################################
        try:
            with open("saved_data.json", "r") as json_file:
                from_json = json.load(json_file)
        except FileNotFoundError:
            print("saved_data.json not found.")
            sys.exit(0)
        left_point = ReferencePoint(from_json['left_ref_x'], from_json['left_ref_y'], from_json['left_ref_lat'],
                                    from_json['left_ref_lon'])
        right_point = ReferencePoint(from_json['right_ref_x'], from_json['right_ref_y'], from_json['right_ref_lat'],
                                     from_json['right_ref_lon'])
        ref_distance = get_distance(left_point.get_lat(), left_point.get_lon(), right_point.get_lat(),
                                    right_point.get_lon())
        ref_ratio = ref_distance / get_geom_dist(left_point.get_x(), left_point.get_y(), right_point.get_x(),
                                                 right_point.get_y())
        ion_id = from_json['ion_id']
        init_pix_height = from_json['initial_pixel_height']
        init_distance = from_json['initial_distance']
        cam_coords = (from_json['camera_lat'], from_json['camera_lon'])

        ###############################################################
        #               Data we need between frames                   #
        ###############################################################
        tfnet = TFNet({"model": "cfg/yolo.cfg", "load": "weights/yolo.weights", "threshold": 0.6, "gpu": 1.0})
        cap = cv2.VideoCapture()
        cap.open("rtsp://admin:hotdog123@10.199.1.235:80/live/ch0")
    ###############################################################
    #               Upload infr point to the db                   #
    ###############################################################
    base_points = [{
        "id": ion_id + "_infr_0",
        "active": True,
        "type": 6,
        "static": True,
        "coords": [{
            "lat": cam_coords[0],
            "lng": cam_coords[1],
            "acr": 1.0
        }]
    }, {
        "id": ion_id + "_infr_1",
        "active": True,
        "type": 5,
        "static": True,
        "coords": [{
            "lat": 35.048195,
            "lng": -85.296711,
            "acr": 1.0
        }]
    }, {
        "id": ion_id + "_infr_2",
        "active": True,
        "type": 5,
        "static": True,
        "coords": [{
            "lat": 35.048462,
            "lng": -85.297410,
            "acr": 1.0
        }]
    }, {
        "id": ion_id + "_infr_3",
        "active": True,
        "type": 5,
        "static": True,
        "coords": [{
            "lat": 35.048721,
            "lng": -85.298081,
            "acr": 1.0
        }]
    }, {
        "id": ion_id + "_infr_4",
        "active": True,
        "type": 5,
        "static": True,
        "coords": [{
            "lat": 35.048963,
            "lng": -85.298718,
            "acr": 1.0
        }]
    }]
    socket.emit('send:coords', base_points)
    clear()
    frame_tally = 9
    yolo_results = None
    while True:
        try:
            # Keep the infastructure running:
            # for packet in base_points:
            #     socket.emit('send:coords', packet)
            ret, frame = cap.read()

            if not ret:
                print('uh')
                cap.release()
                print("Reconnecting to video stream")
                cap.open("rtsp://admin:hotdog123@10.199.1.235:80/live/ch0")
                continue
            ###############################################################
            #                 Analyze frame with YOLO                     #
            ###############################################################
            if frame_tally == 9:
                frame, yolo_results = get_and_draw_yolo_results(tfnet, frame)
                frame_tally = 0
            else:
                draw_yolo_results(yolo_results, frame)
                frame_tally += 1

            if len(yolo_results) > 0:
                # Loop through every result, picking JUST out people:
                for result in yolo_results:
                    if result["label"] == "keyboard":
                        continue
                    x = result["topleft"]["x"]
                    y = result["topleft"]["y"]
                    w = result["bottomright"]["x"] - x
                    h = result["bottomright"]["y"] - y
                    # Center of bounding box (bb) in (x, y) form:
                    lat, lon = get_distance_by_pixels((x + (w / 2), y + h), h, left_point, right_point, cam_coords,
                                                      init_distance, init_pix_height, ref_ratio)
                    if lat is not None and lon is not None:
                        object_type = 3
                        if result["label"] == "person":
                            object_type = 0
                        elif result["label"] == "car" or result["label"] == "truck":
                            object_type = 1
                        elif result["label"] == "bicycle":
                            object_type = 2
                        socket.emit('send:coords', {
                            "id": ion_id + str(uuid.uuid4()),
                            "active": True,
                            "type": object_type,
                            "static": False,
                            "coords": [{
                                "lat": lat,
                                "lng": lon,
                                "acr": 1.0
                            }]
                        })
                        ###############################################################
                        #             Your average "stream image" stuff               #
                        ###############################################################
                        frame_for_stream = frame
                        cv2.waitKey(1)
        except KeyboardInterrupt:
            for packet in base_points:
                packet['static'] = False
                socket.emit(packet)
            break


###############################################################
#                       Footage Streaming                     #
###############################################################
@app.route('/')
def index():
    """Where the server URL directs to."""
    return render_template('index.html')


def gen():
    """A generator for the processed YOLO image."""
    while True:
        frame = get_frame()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')


@app.route('/video_feed')
def video_feed():
    return Response(gen(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')


def get_frame():
    """Retrieve the decoded frame."""
    global frame_for_stream
    ret, jpeg = cv2.imencode('.jpg', frame_for_stream)
    return jpeg.tobytes()


if __name__ == "__main__":
    clear()
    if len(sys.argv) == 1:
        ###########################################
        #      Load ion id from the json file     #
        ###########################################
        try:
            with open("saved_data.json", "r") as f:
                from_json_ionID = json.load(f)
                ion_id = from_json_ionID["ion_id"]
        except FileNotFoundError:
            print("saved_data.json not found.")
            sys.exit(0)
        ###########################################
        #      Spawn threads for YOLO and FB      #
        ###########################################
        main_thread = threading.Thread(target=trilateration_worker)
        main_thread.start()
        ###########################################
        #    Spawn thread for FLASK server        #
        ###########################################
        app.run(host='0.0.0.0', port=3000, debug=False, threaded=True)
    else:
        print('Incorrect syntax\nUsage:\n\tRun using "python aio_locator.py"')
