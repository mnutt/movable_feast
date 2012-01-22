var child_process = require('child_process');
var app = require('express').createServer();

app.get("/", function(req, res) {
  console.log("SHUTDOWN");
  require('child_process').exec("sudo killall apcupsd", function(err, stdout, stderr) {
    console.log(stderr);
    console.log(stdout);
    child_process.exec("sudo apcupsd -f /etc/apcupsd/apcupsd.conf -o", function(err, stdout, stderr) {
      console.log(stderr);
      console.log(stdout);
      child_process.exec("sleep 5; sudo apcupsd -f /etc/apcupsd/apcupsd.conf", function(err, stdout, stderr) {
        console.log(stderr);
        console.log(stdout);
      });
    });
  });
  res.writeHead(200, {});
  res.end("ok");
});

app.listen(3552);
