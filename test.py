import cv2
from darkflow.net.build import TFNet
from aio_locator import get_and_draw_yolo_results, draw_yolo_results


if __name__ == "__main__":
    cap = cv2.VideoCapture()
    cap.open("rtsp://admin:hotdog123@10.199.1.235:80/live/ch0")
    tfnet = TFNet({"model": "cfg/yolo.cfg", "load": "weights/yolo.weights", "threshold": 0.6, "gpu": 1.0})
    frame_tally = 9
    results = None
    while True:
        try:
            ret, frame = cap.read()
            if not ret:
                cap.release()
                print("Re-connecting..")
                cap.open("rtsp://admin:hotdog123@10.199.1.235:80/live/ch0")
                continue
            if frame_tally == 9:
                frame, results = get_and_draw_yolo_results(tfnet, frame)
                frame_tally = 0
            else:
                draw_yolo_results(results, frame)
                frame_tally += 1
            cv2.imshow("Live feed", frame)
            key = cv2.waitKey(1) & 0XF
            if key == ord('q'):
                break

        except KeyboardInterrupt:
            break
    cap.release()
    cv2.destroyAllWindows()
