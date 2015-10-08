// var h = require('hyperscript')
// var Shares = require('./shares')
// var shares = new Shares()
// shares.all(function (err, data) {
//   for (var i = 0; i < data.length; i++) {
//     document.getElementById('page').appendChild(
//       h('div', 'SOME TEXT')
//     )
//   }
// })
var Connection = require('./connection')
var createBus = require('chrome-bus')
var wikidbevents = require('./wikidbevents')
var bus = createBus()

var wikiview = document.getElementById('wikidbview') 
wikiview.addEventListener('contentload', function (evt) { // You have to wait for the webview to load before attaching the eventbus 
  var wvbus = createBus(wikiview) // Pass in the webview when creating the bus 
  wvbus.on(wikidbevents.RECENTREPONSE, function (msg) {
    console.log('Message Received')
    console.log(msg)
  })
  
  wvbus.emit(wikidbevents.RECENT, '')
})
var connection = new Connection()
var Pages = require('./pages')
var pages = new Pages()
var pagestable = document.getElementById('pagestable')
pages.appendTable(pagestable)

function updateWebviews () {
  var webview = document.getElementById('wv')
  // webview.style.height = document.documentElement.clientHeight + "px"
  webview.style.width = document.documentElement.clientWidth + 'px'
  webview.style.height = (document.documentElement.clientHeight - 100) + 'px'
}
function load () {
  updateWebviews()
}
window.onresize = updateWebviews
window.onload = load
document.getElementById('homepage').hidden = false
document.getElementById('listpages').hidden = true
document.getElementById('sharepages').hidden = true
document.getElementById('createpage').hidden = true

document.getElementById('btnConnection').addEventListener('click', function (evt) {
  if (connection.status === Connection.DISCONNECTED) {
    var msg = {}
    msg.type = 'service'
    msg.action = 'start'
    chrome.runtime.sendMessage([JSON.stringify(msg)])
    connection.status = Connection.CONNECTING
    document.getElementById('btnConnection').src = 'images/connecting.png'
    
    // Set icon to yellow
  } else if (connection.status === Connection.CONNECTED) {
    var msg = {}
    msg.type = 'service'
    msg.action = 'stop'
    chrome.runtime.sendMessage([JSON.stringify(msg)])
    connection.status = Connection.CONNECTING
    document.getElementById('btnConnection').src = 'images/connecting.png'
    // Set icon to yellow
  }
})

chrome.runtime.onMessage.addListener(function (event) {
  console.log('chrome-event: ' + event)
  var msg = JSON.parse(event)
  if (msg.type === 'service') {
    switch (msg.action) {
      case 'started' :
        document.getElementById('btnConnection').src = 'images/connected.png'
        connection.status = Connection.CONNECTED
        // set the icon to green
        break
      case 'stopped' :
        document.getElementById('btnConnection').src = 'images/disconnected.png'
        connection.status = Connection.DISCONNECTED
        // set the icon to red
        break
      default :
        break
    }
  }
})

document.getElementById('btnCreate').addEventListener('click', function (evt) {
  document.getElementById('homepage').hidden = true
  document.getElementById('listpages').hidden = true
  document.getElementById('sharepages').hidden = true
  document.getElementById('createpage').hidden = false
// document.getElementById('wv').style.left = '-100px'
})

document.getElementById('btnHome').addEventListener('click', function (evt) {
  document.getElementById('homepage').hidden = false
  document.getElementById('listpages').hidden = true
  document.getElementById('sharepages').hidden = true
  document.getElementById('createpage').hidden = true
})
document.getElementById('btnAll').addEventListener('click', function (evt) {
  document.getElementById('homepage').hidden = true
  document.getElementById('listpages').hidden = false
  document.getElementById('sharepages').hidden = true
  document.getElementById('createpage').hidden = true
})

document.getElementById('btnShare').addEventListener('click', function (evt) {
  document.getElementById('homepage').hidden = true
  document.getElementById('listpages').hidden = true
  document.getElementById('sharepages').hidden = false
  document.getElementById('createpage').hidden = true
})

document.getElementById('btnSave').addEventListener('click', function (evt) {
  document.getElementById('wv').contentWindow.postMessage('Message from Chrome APP!', '*')
})

var messageHandler = function (event) {
  console.log('Got message from webpage back: ' + event.data)
}
window.addEventListener('message', messageHandler, false)
