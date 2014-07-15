exports.after = (sprout, done) ->
  ejs = sprout.utils.read 'bin'
  sprout.utils.write 'foo', ejs
  done()
