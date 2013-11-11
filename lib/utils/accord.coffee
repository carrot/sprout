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

  # if the first argument is an object and the second is a function
  #   - parse first as object, assign callback, return
  if types[0] == 'object' and types[1] == 'function'
    parse_object.call(@, vals[0])
    return @[names[1]] = vals[1]

  # if the first argument is an object and there's only one argument
  #   - parse first as object, return
  if types[0] == 'object' and types.length == 1
    return parse_object.call(@, vals[0])

  # if there is a function arg followed only by undefined's
  #   - assume args are skipped and it's a callback
  #   - set the last arg to the callback
  #   - set the arg that was previously the callback to undefined
  for t, i in types
    prev = types[i-1]
    if prev == 'function' and t == 'undefined'
      if types.slice(i).every((i) -> i == 'undefined')
        args[names[names.length-1]] = args[names[i-1]]
        args[names[i-1]] = undefined
        break

  # finally
  #   - assign each arg to the context with the appropriate name
  @[name] = arg for name, arg of args

parse_object = (obj) ->
  @[name] = arg for name, arg of obj
