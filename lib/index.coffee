base = new (require('./base'))

module.exports = require('./api')
module.exports.cli = require('./cli')
module.exports.path = base.path.bind(base)
