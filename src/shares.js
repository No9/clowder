var PouchDB = require('pouchdb')

function Shares () {
  this.db = new PouchDB('shares')
  this.remoteCouch = false
}

Shares.prototype.all = function (cb) {
  this.db.allDocs({include_docs: true, descending: true}, function (err, doc) {
    console.log(doc.rows)
    cb(err, doc.rows)
  })
}

Shares.prototype.add = function (name, available, cb) {
  var share = {
    _id: new Date().toISOString(),
    name: name,
    isAvailable: available
  }
  this.db.put(share, function callback (err, result) {
    if (!err) {
      cb(err, result)
      console.log('Successfully posted a todo!')
    }
  })
}

module.exports = Shares
