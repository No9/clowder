var PouchDB = require('pouchdb')

function Connection () {
  this.db = new PouchDB('userinfo')
  this.remoteCouch = false
  this.CONNECTED = 'connected'
  this.CONNECTING = 'connecting'
  this.DISCONNECTED = 'disconnected'
  this.status = this.DISCONNECTED
}
