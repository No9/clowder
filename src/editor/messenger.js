var edtevts = require('../editorevents')
var createBus = require('chrome-bus')
var bus = createBus()

bus.on(edtevts.NEW, function (evt) {
  console.log('NEW FIRED')
})