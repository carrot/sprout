fs = require 'fs'
path = require 'path'

exports.before_render = (sprout, done) ->
  sprout.config_values.foo = 'doge'
  done()


exports.configure = [
  {
    type: 'input',
    name: 'foo',
    message: 'What is foo?'
  }
]
