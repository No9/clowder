var h = require('hyperscript')

document.getElementById('page').appendChild(
  h('div.row#options',
    h('button#group', 'groups'),
    h('button#group', 'knowledge')
  )
)