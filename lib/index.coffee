Base = require('./base')
base = new Base

module.exports =
  commands: require('./commands')
  path: base.path.bind(base)
