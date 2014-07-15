exports.after = (sprout, done) ->
  sprout.utils.configure name: 'foo'
  sprout.compile()
    .done -> done()
