var createBus = require('chrome-bus')
var Connection = require('./connection') // Manages the services
var connection = new Connection()
var pgmgr = require('./pagemanager') // Handles tabs

// Constants 
var wikidbevents = require('./wikidbevents')
var editorevents = require('./editorevents')
var connectionevents = require('./connectionevents')

// UI Components
var Pages = require('./pages')
var pages = new Pages()
var pagestable = document.getElementById('pagestable')
pages.appendTable(pagestable)

var connectionbus = createBus()

var wikiview = document.getElementById('wikidbview') 
wikiview.addEventListener('contentload', function (evt) { // You have to wait for the webview to load before attaching the eventbus 
  var wvbus = createBus(wikiview) // Pass in the webview when creating the bus 
  wvbus.on(wikidbevents.RECENTREPONSE, function (msg) {
    console.log('Message Received')
    console.log(msg)
  })
  wvbus.emit(wikidbevents.RECENT, '')
})

var editorview = document.getElementById('editorview')
var editorbus = {}
editorview.addEventListener('contentload', function (evt) { // You have to wait for the webview to load before attaching the eventbus 
  editorbus = createBus(editorview) // Pass in the webview when creating the bus 
  editorbus.on(editorevents.RECENTREPONSE, function (msg) {
    console.log('latest content')
    console.log(msg)
  })
})

document.getElementById('btnSave').addEventListener('click', function (evt) {
  editorbus.emit(wikidbevents.LATEST, '')
})

function updateWebviews () {
  var webview = document.getElementById('editorview')
  // webview.style.height = document.documentElement.clientHeight + "px"
  webview.style.width = document.documentElement.clientWidth + 'px'
  webview.style.height = (document.documentElement.clientHeight - 100) + 'px'
}
function load () {
  updateWebviews()
}
window.onresize = updateWebviews
window.onload = load
pgmgr('homepage') // Toggle to hompage by default

// connection managment 
document.getElementById('btnConnection').addEventListener('click', function (evt) {
  if (connection.status === Connection.DISCONNECTED) {
    connectionbus.emit(connectionevents.START, '')
    connection.status = Connection.CONNECTING
    document.getElementById('btnConnection').src = 'images/connecting.png'
  } else if (connection.status === Connection.CONNECTED) { // Set icon to yellow
    connectionbus.emit(connectionevents.STOP, '')
    connection.status = Connection.CONNECTING
    document.getElementById('btnConnection').src = 'images/connecting.png'
  }
})

connectionbus.on(connectionevents.STARTRESPONSE, function (evt) {
  document.getElementById('btnConnection').src = 'images/connected.png'
  connection.status = Connection.CONNECTED
})

connectionbus.on(connectionevents.START, function (evt) {
  console.log('EVENT')
})

connectionbus.on(connectionevents.STOPRESPONSE, function (evt) {
  document.getElementById('btnConnection').src = 'images/disconnected.png'
  connection.status = Connection.DISCONNECTED
})

document.getElementById('btnCreate').addEventListener('click', function (evt) {
  pgmgr('createpage')
})

document.getElementById('btnHome').addEventListener('click', function (evt) {
  pgmgr('homepage')
})

document.getElementById('btnAll').addEventListener('click', function (evt) {
  pgmgr('listpages')
})

document.getElementById('btnShare').addEventListener('click', function (evt) {
  pgmgr('sharepages')
})
