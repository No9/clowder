var edtevts = require('../editorevents')
var createBus = require('chrome-bus')
var bus = createBus()

bus.on(edtevts.NEW, function (evt) {
  window.editor.setValue('')
  bus.emit(edtevts.NEWRESPONSE, '')
})

bus.on(edtevts.SET, function (evt) {
  editor.setValue(evt.page)
  bus.emit(edtevts.SETRESPONSE, '')
})

bus.on(edtevts.LATEST, function (evt) {
  var latest = {}
  latest.content = window.editor.getValue()
  bus.emit(edtevts.LATESTRESPONSE, latest)
})
