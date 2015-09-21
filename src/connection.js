function Connection () {
}

Connection.CONNECTED = 'connected'
Connection.CONNECTING = 'connecting'
Connection.DISCONNECTED = 'disconnected'
Connection.prototype.status = Connection.DISCONNECTED

module.exports = Connection
