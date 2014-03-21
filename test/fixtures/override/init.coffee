exports.configure = [
  {
    type: 'input',
    name: 'foo',
    message: 'What is foo?'
  },
  {
    type: 'confirm',
    name: 'snow',
    message: 'Does Jon Snow know nothing?',
    default: false
  },
  {
    type: 'list',
    name: 'size',
    message: 'What size do you need',
    choices: [ 'Large', 'Medium', 'Small' ]
  },
  {
    type: "rawlist",
    name: "liquid",
    message: "You also get a free 2L liquid",
    choices: [ "Pepsi", "7up", "Coke" ]
  }
]
