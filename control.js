var app = require('express').createServer();

app.get("/", function(req, res) {
  console.log("SHUTDOWN");
//  require('child_process').exec("sudo killall apcupsd && sudo apcupsd -f /etc/apcupsd/apcupsd.conf -o", function(err, stdout, stderr) {});
  res.writeHead(200, {});
  res.end("ok");
});

app.listen(3352);
