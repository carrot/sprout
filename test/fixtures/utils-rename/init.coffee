exports.after = (sprout, done) ->
  sprout.utils.rename '.npc.yml', '.travis.yml'
  done()
