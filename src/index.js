var createBus = require('chrome-bus')
var Connection = require('./connection') // Manages the services
var connection = new Connection()
var pgmgr = require('./pagemanager') // Handles tabs

// Constants 
var wikidbevents = require('./wikidbevents')
var editorevents = require('./editorevents')
var connectionevents = require('./connectionevents')

// connection managment 
var connectionbus = createBus()
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

connectionbus.on(connectionevents.STOPRESPONSE, function (evt) {
  document.getElementById('btnConnection').src = 'images/disconnected.png'
  connection.status = Connection.DISCONNECTED
})

// Attach buses to views
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

editorview.addEventListener('contentload', function (evt) { // You have to wait for the webview to load before attaching the eventbus 
  editorbus = createBus(editorview) // Pass in the webview when creating the bus 
  editorbus.on(editorevents.LATESTRESPONSE, function (msg) {
    console.log('latest content')
    console.log(msg)
  })
  document.getElementById('btnCreate').addEventListener('click', function (evt) {
    pgmgr('createpage')
    document.getElementById('titleInput').focus()
    editorbus.emit(editorevents.NEW, '')
  })
})

// UI Components
var Pages = require('./pages')
var pages = new Pages()
var pagestable = document.getElementById('pagestable')
pages.appendTable(pagestable)

document.getElementById('btnSave').addEventListener('click', function (evt) {
  if (document.getElementById('titleInput').value === '') {
    document.getElementById('titleInput').focus()
    console.log('YOU CAN\' SAVE IT')
    return false
  }
  editorbus.emit(editorevents.LATEST, '')
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

// Page Button Handlers


document.getElementById('btnHome').addEventListener('click', function (evt) {
  pgmgr('homepage')
})

document.getElementById('btnAll').addEventListener('click', function (evt) {
  pgmgr('listpages')
})

document.getElementById('btnShare').addEventListener('click', function (evt) {
  pgmgr('sharepages')
})
