var express = require('express');
var sio = require('socket.io');
var child_process = require('child_process');
var url = require('url');
var fs = require('fs');
var http = require('http');
var pixel = require('./pixel');
var postmark = require('postmark')("ca6fb40e-0060-4b44-b4d9-bbdc76409b61");
var everyauth = require('everyauth');

var app = express.createServer();

var host = process.env.HOST || "localhost";

app.use(express.static(__dirname + '/public'));


var oauthAccessToken = null;

everyauth.oauth2
  .apiHost("http://dev.tendrilinc.com")
  .oauthHost("http://dev.tendrilinc.com")
  .appId("0c30adc89f7ab9d4f26cc9702a77488d")
  .appSecret("e8c58507da224cf10b24b8d8e02cde0a")
  .authPath("/oauth/authorize")
  .accessTokenPath("/oauth/access_token")
  .findOrCreateUser(function() {
    return {user: "nouser"};
  })
  .getSession(function(req) {
    return {session:"dontuse"};
  })
  .fetchOAuthUser(function(accessToken) {
    var p = this.Promise();
    console.log(accessToken);
    oauthAccessToken = accessToken;

    setTimeout(function() {
      p.fulfill({token: accessToken});
    }, 1);

    return p;
  })
  .redirectPath("/oauthSuccess")
  .authQueryParam("connectURL", "dev.tendrilinc.com")
  .authQueryParam("scope", "account billing consumption")
  .authQueryParam("response_type", "code")
  .accessTokenHttpMethod("get")
  .accessTokenParam("grant_type", "authorization_code")
  .entryPath('/auth/oauth2')
  .callbackPath('/auth/oauth2/callback')
  .myHostname("http://" + host + ":3002");


app.get('/reading', function(req, res) {
  readMeter(function(err, data) {
    if(err) {
      console.log(err);
    }
    console.log(data);
  });
});

function readMeter(callback) {
  http.get({ host: 'dev.tendrilinc.com',
             port: 80,
             path: '/connect/meter/read;external_account_id=aid_aw;from=2011-07-01T00:00:00-0000;to=2012-12-31T00:00:00-0000;limit-to-latest=1;source=ACTUAL',
             headers: {
               'Accept': 'application/json',
               'Access_Token': oauthAccessToken,
               'X-Route': 'sandbox'
             }
           }, function(res) {
             var data = '';
             res.on('data', function(chunk) {
               data += chunk;
             });
             res.on('end', function() {
               console.log(data);
               try {
                 var parsed = JSON.parse(data);
                 callback(null, parsed);
               } catch(e) { callback(e, null); }
             });
           });
}

function turnVoltOff() {
  console.log("oauth token: " + oauthAccessToken);

  options = {
    host: 'dev.tendrilinc.com',
    port: 80,
    path: '/connect/device-action',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Access_Token': oauthAccessToken,
      'X-Route': 'sandbox'
    }
  }

  post_body =
    ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
     '<setVoltDataRequest xmlns="http://platform.tendrilinc.com/tnop/extension/ems" deviceId="001db70000024685" locationId="1">',
     '<data>',
       '<mode>Off</mode>',
     '</data>',
     '</setVoltDataRequest>'].join('\n');

  var req = http.request(options, function(res) {

    res.setEncoding('utf8');
    res.on('data', function(chunk) {
      console.log('BODY: ' + chunk);
    });
  });
  req.write(post_body);
  req.end();
}

function checkVoltStatus() {

}

app.use(everyauth.middleware());
everyauth.helpExpress(app);

var io = sio.listen(app);

var percent = 0.0;
var percents = [];

var emailSent = false;
var emailAddresses = {
  "michael@nuttnet.net": "Michael Nutt",
  "david.g.yang@gmail.com": "David Yang",
  "fred@unionsquareventures.com": "Fred Wilson",
  "rachel@groundreport.com": "Rachel Sterne",
  "frank.rimalovski@nyu.edu": "Frank Rimalovski",
  "korth@cs.nyu.edu": "Evan Korth",
  "mhs@nyserda.org": "Mike Shimazu",
  "mgotsch@nycif.org": "Maria Gotsch",
  "achopra@ostp.eop.gov": "Aneesh Chopra"
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

app.get("/open", function(req, res) {
  var query = url.parse(req.url, true).query;

  setTimeout(function() {
    io.sockets.emit('person', query.person || "someone");
  }, 1000);

  res.writeHead(200, { 'Cache-Control': "no-cache max-age=0",
                       'Expires': "Thu, 01 Dec 1994 16:00:00 GMT" });
  res.end(pixel.data);
});

app.get("/shutdown", function(req, res) {
  clearInterval(fetchInterval);

  var query = url.parse(req.url, true).query;

  http.get({ host: 'localhost', port: 3552, path: '/' }, function(res) { console.log("SHUTDOWN")});
  io.sockets.emit('shutdown', query.person || "someone");

  res.writeHead(200, {});
  res.end("Shutdown complete!");
});

app.get("/tendril_shutdown", function(req, res) {
  turnVoltOff();
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
