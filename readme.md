# Sprout

[![npm](https://badge.fury.io/js/sprout.png)](http://badge.fury.io/js/sprout)
[![tests](https://travis-ci.org/carrot/sprout.png?branch=master)](https://travis-ci.org/carrot/sprout)
[![dependencies](https://david-dm.org/carrot/sprout.png?theme=shields.io)](https://david-dm.org/carrot/sprout)
[![Coverage Status](https://coveralls.io/repos/carrot/sprout/badge.png?branch=cli-refactor)](https://coveralls.io/r/carrot/sprout?branch=cli-refactor)

Simple new project templating

> **Note:** This project is in early development, and versioning is a little different. [Read this](http://markup.im/#q4_cRZ1Q) for more details.

### Why should you care?

A lot of the time you make projects with similar starting templates/boilerplates. There are a number of different standard boilerplates out there (like h5bp), but everyone has their own preferences and tweaks. The goal of sprout is to allow you to write a base template once that is somewhat configurable where it needs to be then initialize the template with the options you choose from the command line or through a javascript API to get a jumpstart on your project.

There is another project called [grunt-init](https://github.com/gruntjs/grunt-init) that does just about the same thing, but after [experimenting with it](https://github.com/carrot/grunt-init-node) a bit, we weren't huge fans of the API or the way that it was set up.

### Installation

```
npm install sprout -g
```

### CLI Usage

Sprout can be used directly through the command line to intitialize projects. Once installed, it exposes the `sprout` binary, which you can use to add, remove, and/or use your templates. The commands are more or less what you would expect, and are listed below. For reference, words in bold are necessary to type out as-is, words in italic represent placeholders for user input, and words in brackets represent optional arguments.

Command params in `[brackets]` are optional, and in `<angle_brackets>` are required.

#### Add Template
**Command**:  
`sprout add [name] <clone_url_or_path>`

**Description**: Adds a template to your repertoire. Name represents how you would like the template to be named within sprout. You are required to add a _template_ which can be either a clone url or a path to a local template. If no name is provided, sprout will use the last piece of the template as the name.

---

#### Remove Template
**Command**:  
`sprout remove <name>`

**Description**: Removes the template with the specified name from sprout.
**Aliases**: `rm`, `delete`

---

#### List Templates
**Command**:  
`sprout list`

**Description**: Lists all templates that you have added to sprout.
**Aliases**: `ls`, `all`

---

#### Initialize Template
**Command**:  
`sprout init <name> [path] [overrides]`

**Description**: Initializes the template with the given name at the given path. If no path is provided it will create a new folder with the same name as the template in the current working directory. If there already is one, it will throw an error.

Sprout also comes with a [man page](man) and will display a help menu as a refresher on these commands if you type something wrong.  

**Options**: You can pass override arguments like `-o key value key2 val2` as options which will override the prompts set in your templates.

**Aliases**: `new`, `create`

> **Note**: Options overrides set from the command line will only be passed to your ejs templates as either a string or a boolean. This means that when overriding there are many powerful features from inquirer.js (like validation) that you won't be able to take advantage of.

---

### Javascript API

Sprout was made specifically to be easy to integrate into javascript applications and libraries that create project structures for you. It can be installed locally via npm and used directly in a node project. The API is similar to the CLI interface described above. Each method returns a [A+ compliant](http://promises-aplus.github.io/promises-spec/) promise (with extra sugar from [when.js](https://github.com/cujojs/when)) Example code given in coffeescript:

```coffee
path = require 'path'
sprout = require 'sprout'

# Adding a template
# -----------------
sprout.add({ name: 'node', uri: 'https://github.com/carrot/sprout-node' })
  .catch(console.error.bind(console))
  .done(-> console.log('template added!'))

# removing a template
# -------------------
sprout.remove('node')
  .catch(console.error.bind(console))
  .done(-> console.log('template removed!'))

# listing templates
# -----------------

# this comes back as a js object
templates = sprout.list()

# this comes back as a formatted and colored string inteded to
# to be printed to the command line
console.log sprout.list(pretty: true)

# initializing a template
# -----------------------

sprout.init({
  name: 'node',
  path: path.join(process.cwd(), 'new_project'),
  overrides: { foo: 'bar' } # optional, will prompt if not provided
  defaults: { name: 'suggested name'} # optional
}).catch(console.error.bind(console))
  .done(-> console.log('project initialized!'))

# other things
# ------------

# returns the path that templates are stored in
console.log sprout.path()

# returns the path of the template name passed in
console.log sprout.path('node')

```

### Writing Your Own Templates

Ok so enough about how this is used, I'm sure you are super excited at this point to get in there and write a template. Probably more excited than a [party gorilla](http://www.ivanwalsh.com/wp-content/uploads/2011/08/the-oatmeal-cartoon.jpg), which is pretty wild. So let's take a look.

First thing you'll want to do is set up your project structure, which will probably look something like this:

```
root
`- files...
init.coffee
readme.md
license.md
```

So a folder called `root` where the actual template goes, an `init.coffee` where we'll set up the config and stuff, and then any other files you need like a readme and license, which will *not* be included with the template. If you don't want any config options, you don't even need the `init.coffee`, just the `root` folder with the files in it and that's it. But let's assume you are after some additional configuration and jump into `init.coffee`.


```coffee

# This function is executed before any of the configuration happens.
# It's a good place to put any introductory messages you want to display.
# It is of course optional, and can be asynchronous.
exports.before = (sprout, done) ->
  console.log 'welcome! this is my before message'
  done()

# Configure is exposed as an array, which accepts any number of
# arguments. Each argument can be a string or an object. A string
# will prompt the user directly for that value, and using an object
# allows you to configure a slightly more customizable prompt.

# The 'prompt' option in an object has a couple of preset values you
# conforms to the configuration used by SBoudrias/Inquirer.js, found here:
# https://github.com/SBoudrias/Inquirer.js#question
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
    type: "confirm",
    name: "travis",
    message: "Do you want to utilize Travis CI?",
    default: false
  },
]

# This function is executed after the configuration info is collected.
# It's a good place to do any other custom config you need, like building
# extra files etc. You have the full power of node at your fingertips here.
exports.after = (sprout, done) ->
  console.log sprout.config_values # all the config values you collected
  if not sprout.config_values.travis then sprout.remove('.travis.yml')
  done()

```

We also provide you the power of [String.js](http://stringjs.com/) in all of your ejs templates. This means you can run powerful string operations on your user input like:

```js
class <%= S('user_model').capialize().s; %> // given 'user_model' is prompted by your init.coffee
```

So between this config file and the root folder, you should be able to make anything happen fairly easily. If not, please open up and issue and we'll try to make it happening-er and/or easier for you : )
