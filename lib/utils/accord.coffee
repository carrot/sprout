# Accord - a tiny args parser

# functions can take named arguments or a single config object
# if the last arg is a function, expects a callback. otherwise returns a promise
# this function must be called in the context that the variables should be attached to

module.exports = (args) ->

  types = []
  names = []
  vals = []
  for name, arg of args
    types.push(typeof arg)
    names.push(name)
    vals.push(arg)

  # if the first argument is an object and the second is a callback
  # parse as object, assign callback
  if types[0] == 'object' and types[1] == 'function'
    parse_object.call(@, vals[0])
    @[names[1]] = vals[1]
    return

  # if the first argument is an object and there's only one argument
  #   - parse as object, return
  if types[0] == 'object' and types.length == 1
    parse_object.call(@, vals[0])
    return

  # if there is a function arg followed only by undefined's
  #   - shift out the function to the last arg

  # finally
  #   - assign each arg to the context with the appropriate name

parse_object = (obj) ->
  @[name] = arg for name, arg of obj
