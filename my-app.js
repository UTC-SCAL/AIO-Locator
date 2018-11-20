let map = undefined;
let socket = io.connect("ws://150.182.130.194:3080");
let connects = {};
let markers = {};

var icons = [
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/pedestrian.png",
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/vehicle.png",
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/cyclist.png",
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/object.png",
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/ped_group.png",
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/infrastructure.png",
    "https://github.com/oitsjustjose/SCAL_USIgnite/raw/gh-pages/img/camera.png"
];

function initPage() {
    let latlng = new google.maps.LatLng(35.0479, -85.2960);
    let options =
        {
            zoom: 20,
            center: latlng
        };
    map = new google.maps.Map(document.getElementById("map"), options);

    socket.on('load:coords', function (data) {
        if (!(data.id in connects)) {
            setMarker(data);
        }

        connects[data.id] = data;
        connects[data.id].updated = $.now();
    });

    setInterval(function () {
        for (var id in connects) {
            if (connects[id].static === true) {
                continue;
            }
            if ($.now() - connects[id].updated > 2000) {
                markers[id].setMap(null);
                delete markers[id];
                delete connects[id];
            }
        }
    }, 2000);
}

function setMarker(data) {
    markers[data.id] = new google.maps.Marker(
        {
            position: new google.maps.LatLng(data.coords[0], data.coords[1]),
            map: map,
            icon: icons[data.type],
            clickable: false
        }
    );
}
