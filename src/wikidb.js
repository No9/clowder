var level = require('level-browserify')
var wikidb = require('wikidb')
var wikidbevents = require('./wikidbevents')
var appevents = require('./appevents')
var db = level('pages')
var through = require('through2')
var wdb = wikidb(db, { dir: '/wiki.blob' })
var createBus = require('chrome-bus')
var bus = createBus()
 
bus.on(wikidbevents.WRITE, function (msg) {
  var w = wdb.createWriteStream(msg.opts, function (err, key) {
	if (err) {
	  console.error(err)
	  bus.emit(appevents.ERROR, err)
	}
	msg.opts.key = key
	bus.emit(wikidbevents.WRITERESPONSE, msg.opts)
  })
  w.write(msg.page)
  w.end()
})

bus.on(wikidbevents.RECENT, function (msg) {
  var recentlist = [];
  var rs = wdb.recent().pipe(through.obj(function (row, enc, next) {
	console.log('key:  ' + row.meta.key)
	console.log('hash: ' + row.hash)
	console.log('date: ' + new Date(row.meta.time))
	console.log('-----------------------------')
	var r = wdb.createReadStream(row.hash)
	r.pipe(through.obj(function(row, enc, next) {
		recentlist.push(row)
	}))
	r.on('end', function () { console.log(); next() })
  }))
  rs.on('end', function () {
	  bus.emit(wikidbevents.RECENTREPONSE, recentlist)
  })
})
