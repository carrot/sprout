exports.after = (sprout, done) ->
  sprout.utils.write 'foo', 'bar'
  done()
