var fs = require('fs')
  , path = require('path');

module.exports = {

  before: function (target, resolve, reject) {
    fs.writeFileSync(path.join(target, 'bar'), 'foo\n', 'utf8');
    resolve();
  }

}
