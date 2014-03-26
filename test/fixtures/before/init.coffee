fs = require 'fs'
path = require 'path'

exports.before = (sprout, done) ->
  sprout.target = sprout.target.replace('testproj', 'newproj')
  done()


exports.configure = [
  {
    type: 'input',
    name: 'foo',
    message: 'What is foo?'
  }
]
