fs = require 'fs'
path = require 'path'
nodefn = require 'when/node/function'

exports.refigure = [
  {
    type: 'input',
    name: 'foo',
    message: 'What is foo?'
  }
]

exports.after = (sprout, done) ->
  original = path.join(sprout.target, 'index.html')
  target   = path.join(sprout.target, 'findex.html')
  nodefn.call(fs.rename, original, target)
    .done((-> done()), done)
