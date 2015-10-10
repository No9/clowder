var pages = {
  'homepage' : document.getElementById('homepage'),
  'listpages' : document.getElementById('listpages'),
  'sharepages' : document.getElementById('sharepages'),
  'createpage' : document.getElementById('createpage')
}
module.exports = function(activate) {
  for (var key in pages) {
    pages[key].hidden = true
  }
  pages[activate].hidden = false
}