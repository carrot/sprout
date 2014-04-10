base = new (require('./base'))

module.exports = require('./api')
module.exports.path = base.path.bind(base)
