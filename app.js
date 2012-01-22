var express = require('express');
var sio = require('socket.io');
var child_process = require('child_process');
var url = require('url');

var app = express.createServer();

app.use(express.static(__dirname + '/public'));

var io = sio.listen(app);

var percent = 0.0;

var fetchInterval = setInterval(function() {
  child_process.exec("apcaccess | grep LOAD", function(err, stdout, stderr) {
    percent = parseFloat(stdout.match(/\d+\.\d+/)[0]);
    console.log(percent);
  });
}, 500);

var sendInterval = setInterval(function() {
  io.sockets.volatile.emit('levels', percent);
}, 50);


app.get("/shutdown", function(req, res) {
  clearInterval(fetchInterval);
  clearInterval(sendInterval);

  var query = url.parse(req.url, true).query;

  child_process.exec("sudo killall apcupsd && sudo apcupsd -f /etc/apcupsd/apcupsd.conf -o", function(err, stdout, stderr) {});
  io.sockets.emit('shutdown', query.person || "someone");

  res.writeHead(200, {});
  res.end("Shutdown complete!");
});


app.listen(3044);
