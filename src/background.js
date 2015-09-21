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
  
  
  // var client = new Client()
  // 
  // client.on('response', function (headers, statusCode, rinfo) {
  //   console.log('Got a response to an m-search.')
  //   console.log(headers)
  //   console.log(statusCode)
  //   console.log(rinfo)
  // })
  // client.search('urn:schemas-upnp-org:service:ContentDirectory:1')
}

function stopServices () {
  server.pause()
  httpServer.close()
}

chrome.runtime.onMessage.addListener(function (event) {
  console.log('Got message from webpage: ' + event)
  var msg = JSON.parse(event)
  if (msg.type === 'service') {
    switch (msg.action) {
      case 'start' :
        startServices()
        var msg = {}
        msg.type = 'service'
        msg.action = 'started'
        chrome.runtime.sendMessage([JSON.stringify(msg)])
        break
      case 'stop' :
        stopServices()
        var msg = {}
        msg.type = 'service'
        msg.action = 'stopped'
        chrome.runtime.sendMessage([JSON.stringify(msg)])
        break
      default :
        break
    }
  }
})
