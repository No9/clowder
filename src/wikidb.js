var level = require('level-browserify')
var wikidb = require('wikidb')
var db = level('pages')
var wdb = wikidb(db, { dir: '/wiki.blob' })
console.log('loaded db')

var opts = {
    key: 'hello there',
    tag: 'welcome'
};
var w = wdb.createWriteStream(opts, function (err, key) {
	console.log(err)
    console.log(key);
})