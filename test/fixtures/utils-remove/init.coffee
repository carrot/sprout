exports.after = (sprout, done) ->
  sprout.utils.remove '.travis.yml'
  done()
