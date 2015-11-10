var h = require('hyperscript')
var RecentPages = function () {
  
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
  element.appendChild(h('h5', 'Recent Pages'))
  element.appendChild(h('ul',
    recentlist.map(function (k) {
      return h('li', k.meta.key)
    })
  ))
}

module.exports = RecentPages