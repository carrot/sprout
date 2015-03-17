var fs = require('fs')
  , path = require('path');

module.exports = {

  after: function (target, config, resolve, reject) {
    fs.writeFileSync(path.join(target, 'bar'), 'foo\n');
    resolve();
  }

}
