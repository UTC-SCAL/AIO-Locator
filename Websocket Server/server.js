var http = require('http');
var Static = require('node-static');
var app = http.createServer(handler);
var io = require('socket.io').listen(app);
var port = 3080;

var files = new Static.Server('./public');

function handler (request, response) {
	request.on('end', function() {
		files.serve(request, response);
	}).resume();
}

// delete to see more logs from sockets

io.sockets.on('connection', function (socket) {

	socket.on('send:coords', function (data) {
		socket.broadcast.emit('load:coords', data);
	});
});

// start app on specified port
app.listen(port);
console.log('Server runnong on http://localhost:' + port);