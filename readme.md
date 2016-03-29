# Sprout

[![npm](http://img.shields.io/npm/v/sprout.svg?style=flat)](https://badge.fury.io/js/sprout) [![tests](http://img.shields.io/travis/carrot/sprout/master.svg?style=flat)](https://travis-ci.org/carrot/sprout) [![coverage](http://img.shields.io/coveralls/carrot/sprout.svg?style=flat)](https://coveralls.io/r/carrot/sprout) [![dependencies](http://img.shields.io/gemnasium/carrot/sprout.svg?style=flat)](https://gemnasium.com/carrot/sprout)
[![devDependencies](https://img.shields.io/david/dev/carrot/sprout.svg)](https://gemnasium.com/carrot/sprout)

Simple project templating & skeletons

> **To use Sprout via the command line, install the [sprout-cli package](http://npmjs.org/package/sprout-cli) ([github](http://www.github.com/carrot/sprout-cli))**.

## Why should you care?

A lot of the time you make projects with similar starting templates/boilerplates. There are a number of different standard boilerplates out there (like h5bp), but everyone has their own preferences and tweaks. The goal of sprout is to allow you to write a base template once that is somewhat configurable where it needs to be then initialize the template with the options you choose from the command line or through a javascript API to get a jumpstart on your project.

We are aware that the [yeoman project](https://github.com/yeoman/yo) serves a similar purpose, but built this anyway because we needed a project with a very clean and understandable generator API as well as a public javascript API for integration into other projects, and yeoman does not have either of these.

### Usage

Sprout is most commonly manipulated through its [command-line interface](http://github.com/carrot/sprout-cli). However, Sprout was made specifically to be easy to integrate into javascript applications and libraries that create project structures for you. It can be installed locally via npm and used directly in a node project. The API is similar to the CLI interface described above. Each method returns a [A+ compliant](http://promises-aplus.github.io/promises-spec/) promise (with extra sugar from [when.js](https://github.com/cujojs/when)).

### Installation

```sh
$ npm install sprout --save
```

### Usage

To construct a `Sprout` instance:

```javascript
import Sprout from 'sprout'
const sprout = new Sprout('/path/where/templates/live')
```

A `Sprout` instance has the following public values:

- `path`: (string) the path where the templates live.
- `templates`: (object) a dictionary of `Template` objects.

It also is an instance of `EventEmitter` and emits a few events for feedback.

### Methods

Each method returns an A+ promise.  The promise, on success, returns the same sprout instance.

#### sprout.add(name, src)

Create a new template called `name` from `src`.

```js
const name = 'sprout-sprout'
const src = 'git@github.com:carrot/sprout-sprout'

sprout.add(name, src).then((sprout) => {
  console.log('template added!')
})
```

#### sprout.remove(name)

Remove an existing template called `name`.

```js
const name = 'sprout-sprout'

sprout.remove(name).then((sprout) => {
  console.log('template removed!')
})
```

#### sprout.init(name, target, options)

Use a template called `name` and save instance to `target`.

```js
const name = 'sprout-sprout'
const target = '~/Projects/sprout-sprout-instance'

/*
 * Options:
 * locals {Object} - EJS locals to template.
 * tag {String} - A git tag to generate the template from.
 * branch {String} - A git branch to generate the template from.
 * configPath {String} - Path to a JSON or yaml file with pre-defined values.
 * questionnaire {Function} - Function that returns a promise for an object
 */

const options = {
  locals: {
    foo: 'bar'
  }
}

sprout.init(name, target, options).then((sprout) => {
  console.log('template generated!')
})
```

#### sprout.run(name, target, generator, args)

Run a generator in a template called `name` and on template instance instance at `target`, optionally with an array of `args` (or string if just one).

```js
const name = 'mvc'
const target = '~/Projects/mvc-instance'
const generator = 'model'

sprout.run(name, target, generator, 'User').then((sprout) => {
  console.log('a model named `User` was created!')
})
```

## Writing Your Own Templates

For an example, as well as a sprout template that helps you create new sprout templates, be sure to check out [sprout-sprout](https://github.com/carrot/sprout-sprout). If you would like a more generic example, check out [sprout-example](https://github.com/carrot/sprout-example)

Ok so enough about how this is used, I'm sure you are super excited at this point to get in there and write a template. Probably more excited than a [party gorilla](http://theoatmeal.com/comics/party_gorilla), which is pretty wild. So let's take a look.

First thing you'll want to do is set up your project structure, which will probably look something like this:

```
├── root          Where the actual template goes.
├── generators    Where generators go.
│   ├── file1
│   └── file2
│   └── file3
└── init.js       The Sprout configuration file.
└── package.json  Optionally, include a package.json file; all
                  dependencies will be installed on init.
```

### init.js

`init.js` sets the hooks and configuration for your sprout template.

```js
/*
 * This function is executed before any of the configuration happens.
 * It's a good place to put any introductory messages you want to display.
 * It is of course optional, and can be asynchronous.
 */

exports.before = function (utils) {
  console.log('Getting started...')
}

/*
 * Configure is exposed as an array, which accepts any number of
 * arguments. Each argument can be a string or an object. A string
 * will prompt the user directly for that value, and using an object
 * allows you to configure a slightly more customizable prompt.

 * The 'prompt' option in an object has a couple of preset values you
 * conforms to the configuration used by SBoudrias/Inquirer.js, found here:
 * https://github.com/SBoudrias/Inquirer.js#question
 */

exports.configure = [
  {
    type: 'input',
    name: 'foo',
    message: 'What is foo?'
  },
  {
    type: 'input',
    name: 'github_handle',
    message: 'What is your github handle?'
  },
  {
    type: 'confirm',
    name: 'travis',
    message: 'Do you want to utilize Travis CI?',
    default: false
  }
]

/*
 * This function is executed after the configuration info is collected, but
 * before the templates are rendered. It's a good place use user provided config
 * to generate additional config values needed in the template.
 */

exports.beforeRender = function (utils, config) {
  config.foo = 'bar'
  return utils.target.write('foo.jade', 'h1 Hello World!', config)
}

/*
 * This function is executed after the templates are rendered.  It's a good place
 * to do any other custom config you need, like building extra files etc. You
 * have the full power of node at your fingertips here.
 */

exports.after = function (utils, config) {
  return utils.target.rename('foo.jade', 'bar.jade')
}

/*
 * Optionally specify globs to ignore.
 */

exports.ignore = ['fizz.*']

/*
* Optionally specify a defaults object to your templates.
* Helpful for adding locals to use within your templates
*/

exports.defaults = { moment: require('moment') }

```

We also provide you the power of [underscore.string](http://epeli.github.io/underscore.string/#api) in all of your ejs templates. This means you can run powerful string operations on your user input like:

```js
// given 'user_model' is prompted by your init.js
function <%= S.classify('user_model') %> (foo, bar) {
  // <%= S.classify('user_model') %> constructor!
}
```

So between this config file and the root folder, you should be able to make anything happen fairly easily. If not, please open up and issue and we'll try to make it happening-er and/or easier for you : )

### Hooks
Sprout comes with the following events for you to write custom logic for. Each hook is passed a utilities object for manipulating files in your template.  Each of these hooks accept A+ promises as return values.  To use these events, export a function for the hook (or multiple hooks) of your choosing in your `init.js`:

- `before` - run before prompting for user input; is passed a configuration object as the second argument.
- `beforeRender` - run after the project configuration is set; is passed a configuration object as the second argument.
- `after` - run after rendering has completed; is passed a configuration object as the second argument.

The utilities object passed to each hook contains the following functions (each returns a promise):

function                               | description
:------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------
`utils.copy(from, to)`                 | copy a file or directory recursively at `from` (relative to the template's _base_ directory) to the path at `to` (relative to the template's _target_ directory).
`utils.src.read(from)`                 | read a file at `from` (relative to the template's _base_ directory).
`utils.target.copy(from, to)`          | copy a file at `from` (relative to the template's _target_ directory) to the path at `to` (relative to the template's _target_ directory).
`utils.target.read(from)`              | read a file at `from` (relative to the template's _target_ directory).
`utils.target.write(to, what, locals)` | write `what` to path `to` (relative to the template's _target_ directory), optionally with ejs locals at `locals`.
`utils.target.rename(from, to)`        | rename file at `from` to path at `to` (relative to the template's _target_ directory).
`utils.target.remove(what)`            | remove files; pass a path or an array of paths (relative to the template's _target_ directory).
`utils.target.exec(cmd, cwd)`          | run a child process with the _target_ directory set at the current working directory by default; optionally, pass a path to `cwd` (relative to the target directory).


### Generators
Sprout templates may also include "generators": small scripts to be executed on instances of a template.  For example, an `mvc` template may include `model`, `controller`, and `view` generators for quickly stubbing out an model-view-controller application.  Generators are passed `utils` (an instance of the `Utils` that reads from the _base_ directory and writes to the _target_ directory) in the first argument; any arguments passed to `sprout.run()` follow.  A model generator in an `mvc` template may look like this:

```js
module.exports = (utils, name) => {
  return utils.src.read('templates/model').then((output) => {
    return utils.target.write(`lib/models/${name}.js`, output, { name: name })
  })
}
```

These generators are stored in your template's `generators` folder and can be used with sprout's `run` method:

```js
sprout.run('mvc', 'model', 'User')
```

### Versioning Templates

Sometimes changes happen and you might want to be able to specify different versions of a single template. Sprout handles this through [git tags](http://git-scm.com/book/en/Git-Basics-Tagging). To specify which tag to use, simply pass a `tag` option to sprout's `init` method.


```js
sprout.init('my-template', '~/Projects/my-template-instance', { tag: '0.1.2' })
```

`init` also accepts a branch option for specifying which branch to generate from:

```js
sprout.init('my-template', '~/Projects/my-template-instance', { branch: 'develop' })
```

Although you are welcome to use whatever versioning system you are comfortable with, we would **strongly recommended** using [semver](http://semver.org/), the widely accepted standard in package versioning. This will provide you with a clear framework for managing situations when breaking changes have been made to your template.

### License & Contributing

- Details on the license [can be found here](LICENSE.md)
- Details on running tests and contributing [can be found here](CONTRIBUTING.md)
