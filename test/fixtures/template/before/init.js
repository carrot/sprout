module.exports = {

  before: function (resolve, reject) {
    console.log(__dirname);
    fs.writeFileSync(path.join(__dirname, 'bar'), 'foo\n');
    resolve();
  }

}
