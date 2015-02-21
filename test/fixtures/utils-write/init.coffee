exports.after = (sprout, done) ->
  sprout.utils.write 'foo', 'bar <%= fizz %>', {fizz: 'buzz'}
  done()
