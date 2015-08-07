var tinylr = require('tiny-lr')
var choki = require('chokidar')
var exec = require('child_process').exec 
var lr = tinylr()
lr.listen(35729)


choki.watch('src', {ignored: /[\/\\]\./}).on('all', function(event, path) {
  console.log(event, path)
  var child = exec('npm run build-client',
  function (error, stdout, stderr) {
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if (error !== null) {
      console.log('exec error: ' + error);
    }
    lr.changed({
      body: {
        files: [path]
      }
    })
  })
})