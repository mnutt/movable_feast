var express = require('express');
var sio = require('socket.io');
var child_process = require('child_process');
var url = require('url');
var fs = require('fs');
var http = require('http');
var postmark = require('postmark')("ca6fb40e-0060-4b44-b4d9-bbdc76409b61");

var app = express.createServer();

var host = process.env.HOST || "localhost";

app.use(express.static(__dirname + '/public'));

var io = sio.listen(app);

var percent = 0.0;
var percents = [];

var emailSent = false;
var emailAddresses = {
  "michael@nuttnet.net": "Michael Nutt"
};

var emailBody = fs.readFileSync(__dirname + '/public/email.html').toString('utf8');
var threshold = 80;

var fetchInterval = setInterval(function() {
  child_process.exec("apcaccess | grep LOAD", function(err, stdout, stderr) {
    percent = parseFloat((stdout.match(/\d+\.\d+/) || [0])[0]);

    percents.push(percent);
    if(percents.length > 3) { percents = percents.slice(-3); }

    if(emailSent == false && (percents[0] + percents[1] + percents[2]) / 3 > threshold) {
      sendEmail();
      emailSent = true;
    }

    console.log("Logged power level: " + percent + "%");
  });
}, 500);

var sendInterval = setInterval(function() {
  io.sockets.volatile.emit('levels', percent);
}, 50);

function sendEmail() {
  for(var address in emailAddresses) {
    var name = emailAddresses[address];
    console.log("Sending email to " + address + ".");
    postmark.send({
      "From": "Movable Feast <followup@alwaysbecalling.com>",
      "To": address,
      "Subject": "Power Spike!",
      "HtmlBody": emailBody.replace(/\|NAME\|/g, name).replace(/localhost/g, host)
    });
  }
}

app.get("/shutdown", function(req, res) {
  clearInterval(fetchInterval);

  var query = url.parse(req.url, true).query;

  http.get({ host: 'localhost', port: 3352, path: '/' }, function(res) { console.log("SHUTDOWN")});
  io.sockets.emit('shutdown', query.person || "someone");

  res.writeHead(200, {});
  res.end("Shutdown complete!");
});

app.get("/test", function(req, res) {
  percent += 25;
  for(var i = 1; i < 10; i++) {
    setTimeout(function() {
      percent += Math.floor(Math.random() * 10);
    }, i * 100);
  }

  res.writeHead(200, {});
  res.end("");
});

app.listen(3002);
