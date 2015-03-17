var Sprout = require('./')
  , inquirer = require('inquirer')
  , Promise = require('bluebird')
  , colors = require('colors')
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
     * List all templates.
     * @param {Object} options - CLI arguments.
     */

    list: function (options) {
      var self = this;
      return new Promise(
        function (resolve, reject) {
          var template
          for (var name in self.sprout.templates) {
            console.log(('+ ' + name).green);
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

  var CLI = function (path) {
    this.sprout = new Sprout(path);
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
            console.log(('✓ '.bold + message.toString()).green);
          }
        }
      ).catch(
        function (error) {
          console.log(('✘ '.bold + error.toString()).red);
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

  return CLI;

}.call(this));
