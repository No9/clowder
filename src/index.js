var createBus = require('chrome-bus')
var Connection = require('./connection') // Manages the services
var connection = new Connection()
var pgmgr = require('./pagemanager') // Handles tabs
var markdown = require( "markdown" ).markdown

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
var wvbus
wikiview.addEventListener('contentload', function (evt) { // You have to wait for the webview to load before attaching the eventbus 
  wvbus = createBus(wikiview) // Pass in the webview when creating the bus 
  recentpages = new RecentPages(wvbus)
  wvbus.on(wikidbevents.RECENTRESPONSE, function (msg) {
    console.log('Recentlist Received')
    console.log(msg)
    recentpages.update(recentpagestile, msg)
  })
  
  // Update the UI on a write response
  wvbus.on(wikidbevents.WRITERESPONSE, function(msg) {
    wvbus.emit(wikidbevents.RECENT, '')
  })
  
  // render a read 
  wvbus.on(wikidbevents.READRESPONSE, function(msg) {
    console.log(msg)
    var b = new Buffer(msg.content.data)
    // TODO: Render page
    console.log(markdown.toHTML(b.toString()))
    document.body.innerHTML = markdown.toHTML(b.toString())
  })
  // Get the recent content
  wvbus.emit(wikidbevents.RECENT, '')
})

var editorview = document.getElementById('editorview')
var editorbus
editorview.addEventListener('contentload', function (evt) { // You have to wait for the webview to load before attaching the eventbus 
  editorbus = createBus(editorview) // Pass in the webview when creating the bus 
  editorbus.on(editorevents.LATESTRESPONSE, function (msg) {
    console.log('latest content')
    console.log(msg)
    wvbus.emit(wikidbevents.WRITE, { 'page': msg.content, 'opts' : { 'key' : document.getElementById('titleInput').value, 'prev': undefined, 'tag': undefined }})
  })
  document.getElementById('btnCreate').addEventListener('click', function (evt) {
    pgmgr('createpage')
    document.getElementById('titleInput').focus()
    editorbus.emit(editorevents.NEW, '')
  })
})

// UI Components
var Pages = require('./pages')
var RecentPages = require('./tiles/recentpages')

var pages = new Pages()
var recentpages
var recentpagestile = document.getElementById('recentpagestile') 
var pagestable = document.getElementById('pagestable')

pages.appendTable(pagestable)


document.getElementById('btnSave').addEventListener('click', function (evt) {
  if (document.getElementById('titleInput').value === '') {
    document.getElementById('titleInput').focus()
    console.log('YOU CAN\' SAVE IT')
    return false
  }
  
  // msg { page: '', opts:{ key: 'welcome page', prev: undefined, tag: 'welcome' }}
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
