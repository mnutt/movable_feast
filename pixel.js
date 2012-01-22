var Buffer = require('buffer').Buffer;

var data = new Buffer(42);
data.write("GIF89a\001\000\001\000\200\000\000\000\000\000\377\377\377!\371\004\001\000\000\000\000,\000\000\000\000\001\000\001\000\000\002\001D\000;", 'binary');

exports.data = data;
exports.size = 42;

exports.handleError = function(err, response, type, query) {
  log.error("Error for " + type + ", " + query + ":");
  log.error(JSON.stringify(err));

  if(response.finished) { return; }

  if (err === "No rows") {
    response.writeHead(config.errorCode, { 'Content-Type': 'image/gif',
                              'Content-Length': exports.size,
                              'X-Error': "404 " + type + " not found" });
    response.end(exports.data);
  } else {
    response.writeHead(config.errorCode, { 'Content-Type': 'image/gif',
                              'X-Error': "500 System error",
                              'Content-Length': exports.size });
    response.end(exports.data);
  }
};
