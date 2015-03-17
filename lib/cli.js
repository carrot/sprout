var Sprout = require('./')
  , path = require('path')
  , inquirer = require('inquirer')
  , os = require('os')
  , osenv = require('osenv')
  , crypto = require('crypto')
  , Promise = require('bluebird')
  , chalk = require('chalk')
  , _ = require('lodash');

module.exports = (function () {

  /*
   * The methods publicly available to
   * the CLI.  Executed with `CLI`
   * instance.
   */

  var methods = {

    /*
     * Add a template.
     * @param {Object} options - CLI arguments.
     */

    add: function (options) {
      var name = options.name
        , src = options.src;
      return this.sprout.add(name, src).then(
        function () {
          return 'template `' + name + '` from ' + src + ' added!'
        }
      );
    },

    /*
     * Remove a template.
     * @param {Object} options - CLI arguments.
     */

    remove: function (options) {
      var name = options.name;
      return this.sprout.remove(name).then(
        function () {
          return 'template `' + name + '` removed!'
        }
      );
    },

    /*
     * Update a template.
     * @param {Object} options - CLI arguments.
     */

    update: function (options) {
      var name = options.name;
      return this.sprout.update(name).then(
        function () {
          return 'template `' + name + '` updated!'
        }
      );
    },

    /*
     * List all templates.
     * @param {Object} options - CLI arguments.
     */

    list: function (options) {
      var self = this;
      return new Promise(
        function (resolve, reject) {
          var template
          for (var name in self.sprout.templates) {
            console.log(chalk.gray('▸ ') + chalk.green(name));
          }
          return resolve();
        }
      )
    },

    /*
     * Initialize a template.
     * @param {Object} options - CLI arguments.
     */

    init: function (options) {
      var name = options.name
        , target = options.target;
      delete options.name;
      delete options.target;
      options.questionnaire = questionnaire;
      return this.sprout.init(name, target, options).then(
        function () {
          return 'template `' + name + '` initialized at ' + target + '!'
        }
      );
    }

  }

  /*
   * Returns a CLI instance.
   * @return {Function} CLI instance.
   */

  var CLI = function () {

    /*
     * Sets a user path for Sprout templates
     * and instantiates Sprout with the
     * path returned.
     */

    var user = (osenv.user() || generateFakeUser()).replace(/\\/g, '-')
      , tmp = path.join((os.tmpdir ? os.tmpdir() : ostmpDir()), user)
      , p = path.join((osenv.home() || tmp), '.config', 'sprout');
    this.sprout = new Sprout(p);
  }

  CLI.prototype = {

    /*
     * Run the CLI based on the arguments passed.
     * @param {Object} args - CLI arguments.
     * @returns {Promise} - a Promise with no return value.
     */

    run: function (args) {
      var args = (args || {})
        , action = args.action;
      delete args.action;
      return methods[action].call(this, args).then(
        function (message) {
          if (message) {
            var msg = chalk.green.bold('✓ ') + chalk.green(message.toString());
            console.log(msg);
          }
        }
      ).catch(
        function (error) {
          var msg = chalk.red.bold('✘ ') + chalk.red(error.toString());
          console.log(msg);
        }
      );
    }

  }

  /*
   * A helper function for calling Inquirer.
   * Passed to `cli.init` to be called when
   * `template.init` would like answers.
   * @param {Array} questions - questions to inquire about.
   * @param {Array} skip - names of questions to skip.
   * @returns {Promise} - a promise with the answers.
   */

  var questionnaire = function (questions, skip) {
    return new Promise(
      function (resolve) {
        var qs = []
          , question;
        for (var i=0; i<questions.length; i++) {
          question = questions[i];
          if (!_.contains(skip, question.name)) {
            qs.push(question);
          }
        }
        return inquirer.prompt(qs,
          function (answers) {
            return resolve(answers);
          }
        )
      }
    );
  }

  /*
   * A helper function for generating a fake
   * user; where necessary, used to create a
   * user Sprout folder.
   * @param {Array} questions - questions to inquire about.
   * @param {Array} skip - names of questions to skip.
   * @returns {Promise} - a promise with the answers.
   */

  var generateFakeUser = function () {
    var uid = [process.pid, Date.now(), Math.floor(Math.random()*10000000)].join('-');
    return crypto
      .createHash('md5')
      .update(uid)
      .digest('hex');
  }

  return CLI;

}.call(this));
