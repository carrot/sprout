exports.configure = [
  {
    name: 'name',
    type: 'input',
    message: 'What is the name of your project?'
  }
]

exports.after = (sprout, done) ->
  sprout.utils.write_from 'bin', sprout.config_values.name
  done()
