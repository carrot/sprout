module.exports = {
  after: function (utils, config) {
    return utils.target.write('bar', '');
  }
}
