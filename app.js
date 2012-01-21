var express = require('express');
var sio = require('socket.io');

var app = express.createServer();

app.use(express.static(__dirname + '/public'));

var io = sio.listen(app);

setInterval(function() {
  io.sockets.volatile.emit('levels', 10 + Math.floor(Math.random() * 5));
}, 50);

app.listen(3044);
