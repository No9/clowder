chrome.app.runtime.onLaunched.addListener(function () { // eslint-disable-line
  chrome.app.window.create('index.html', { // eslint-disable-line
    'bounds': {
      'width': 1000,
      'height': 740
    }
  })
})


var http = require('http')
var Server = require('node-ssdp').Server
var Client = require('node-ssdp').Client
var httpServer = {}
var server = new Server()
var createBus = require('chrome-bus')
var cnnevents = require('./connectionevents')
var svcmgr = createBus()

server.addUSN('upnp:rootdevice')
server.addUSN('urn:schemas-upnp-org:service:ContentDirectory:1')

server.on('advertise-alive', function (headers) {
  console.log('advertise-alive', headers)
// Expire old devices from your cache.
// Register advertising device somewhere (as designated in http headers heads)
})

server.on('advertise-bye', function (headers) {
  // Remove specified device from cache.
})

function startServices () {
  httpServer = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.end('Hello World\n')
  }).listen(3000, '127.0.0.1')
  
  console.log('Server running at http://127.0.0.1:3000/')
  if (server._socketBound) {
    server.resume()
  } else {
    server.start()
  }
}

function stopServices () {
  server.pause()
  httpServer.close()
}

svcmgr.on(cnnevents.START, function (data) {
  console.log('starting services')
  startServices()
  svcmgr.emit(cnnevents.STARTRESPONSE, '')
})

svcmgr.on(cnnevents.STOP, function (data) {
  console.log('stopping services')
  stopServices()
  svcmgr.emit(cnnevents.STOPRESPONSE)
})
