Base = require('./base')
base = new Base

module.exports = require('./commands')
module.exports.path = base.path.bind(base)
