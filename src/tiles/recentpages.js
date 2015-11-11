var h = require('hyperscript')
var wikidbevents = require('../wikidbevents')
var RecentPages = function (db) {
  this.databus = db
}
// Expected output format
// <h5>Recent Pages</h5>
//   <ul>
//     <li>A test page</li>
//   </ul>
RecentPages.prototype.update = function (element, recentlist) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
  var that = this
  element.appendChild(h('h5', 'Recent Pages'))
  element.appendChild(h('ul',
    recentlist.map(function (k) {
      return h('li', 
              h('a', { href: '#',
                onclick: function (e) {
                  that.databus.emit(wikidbevents.READ, k)
                  // alert(k.meta.key)
                  e.preventDefault()
                }
              }, k.meta.key)
      )
    })
  ))
}

module.exports = RecentPages