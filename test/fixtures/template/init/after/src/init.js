var fs = require('fs')
  , path = require('path');

module.exports = {
  after: function (target, config, resolve, reject) {
    fs.writeFile(path.join(target, 'bar'), '',
      function (err) {
        if (err) return reject();
        return resolve();
      }
    )
  }
}
