var h = require('hyperscript')
var Shares = require('./shares')
var shares = new Shares()


shares.all(function (err, data) {
  for (var i = 0; i < data.length; i++) {
    document.getElementById('page').appendChild(
      h('div', 'SOME TEXT')
    )
  }
})
function updateWebviews() {
  var webview = document.getElementById("wv")
  // webview.style.height = document.documentElement.clientHeight + "px"
  webview.style.width = document.documentElement.clientWidth + "px"
  webview.style.height = (document.documentElement.clientHeight - 100) + 'px'
}
function load() {
  updateWebviews()
}
window.onresize = updateWebviews
onload = load
document.getElementById('homepage').hidden = false
document.getElementById('listpages').hidden = true
document.getElementById('sharepages').hidden = true
document.getElementById('createpage').hidden = true
  
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
  document.getElementById('wv').contentWindow.postMessage("Message from Chrome APP!", "*");
})

var messageHandler = function(event) {
  console.log("Got message from webpage back: " + event.data);
};
window.addEventListener('message', messageHandler, false);

// document.getElementById('wv').setAttribute('src', '/editor/pageeditor.html')
/*document.getElementById('page').appendChild(
  h('div.row#options',
    h('button#group', 'groups'),
    h('button#group', 'shares')
  )
)*/