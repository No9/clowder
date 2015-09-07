chrome.app.runtime.onLaunched.addListener(function () { // eslint-disable-line
  chrome.app.window.create('index.html', { // eslint-disable-line
    'bounds': {
      'width': 400,
      'height': 500
    }
  })
})
//var express = require('express');
//var app = express();
//
//app.get('/', function (req, res) {
//  console.log('connect')
//  res.send('Hello World!');
//  res.end();
//});
//
//var server = app.listen(3000, '127.0.0.1', function () {
//  var host = server.address().address;
//  var port = server.address().port;
//
//  console.log('Example app listening at http://%s:%s', host, port);
//});
var http = require('http');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello World\n');
}).listen(3000, '127.0.0.1');
console.log('Server running at http://127.0.0.1:3000/');