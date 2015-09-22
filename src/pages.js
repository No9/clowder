var level = require('level-browserify')
var db = level('pages')
var h = require('hyperscript')
var Pages = function () {
  
}

Pages.prototype.appendTable = function (element) {
  element.appendChild(
    h('table.u-full-width',
      h('thead',
        h('tr',
          h('th','Page Title')
        )
      ),
      h('tbody',
        h('tr',
          h('td', 'a link eventually')
        )
      )
     )
  )
}

module.exports = Pages
/*
function () {
  db.put('name', 'Level', function (err) {
    if (err) return console.log('Ooops!', err) // some kind of I/O error
  
    // 3) fetch by key
    db.get('name', function (err, value) {
      if (err) return console.log('Ooops!', err) // likely the key was not found
  
      // ta da!
      console.log('name=' + value)
    })
  })  
}
<table class="u-full-width">
  <thead>
    <tr>
      <th>Name</th>
      <th>Age</th>
      <th>Sex</th>
      <th>Location</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Dave Gamache</td>
      <td>26</td>
      <td>Male</td>
      <td>San Francisco</td>
    </tr>
    <tr>
      <td>Dwayne Johnson</td>
      <td>42</td>
      <td>Male</td>
      <td>Hayward</td>
    </tr>
  </tbody>
</table>
*/
