exports.configure = [
  {
    type: 'input',
    name: 'foo',
    message: 'What is foo?',
    validate: (msg) ->
      msg.toUpperCase()
  }
]
