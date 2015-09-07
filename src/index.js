var h = require('hyperscript')
var Shares = require('./shares')
var shares = new Shares()

shares.all(function (err, data) {
  for (var i = 0; i < data.length; i++) {
    document.getElementById('page').appendChild(
      h('div', 'SOME TEXT')
    )
  }
})

document.getElementById('btnAdd').addEventListener('click', function (evt) {
  console.log('add clicked')
  document.getElementById('wv').hidden = false
  document.getElementById('wv').style.width = '100%'
  document.getElementById('wv').style.height = '100%'
})

// document.getElementById('wv').setAttribute('src', '/editor/pageeditor.html')
/*document.getElementById('page').appendChild(
  h('div.row#options',
    h('button#group', 'groups'),
    h('button#group', 'shares')
  )
)*/