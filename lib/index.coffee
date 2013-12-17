Base = require('./base')
base = new Base

module.exports = require('./api')
module.exports.path = base.path.bind(base)
