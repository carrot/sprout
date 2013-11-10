module.exports = ->

    console.log ''
    console.log 'Command Usage'.bold.blue
    console.log '-------------'
    console.log '(parameters in brackets are optional)'
    console.log ''
    console.log 'add'.bold + ' [name]'.italic + ' url: adds the template at url as name. if name is'
    console.log '                not given, uses the last piece of the url.'
    console.log 'remove'.bold + ' name: removes the named template from sprout.'
    console.log 'list'.bold + ': lists templates that have been added to sprout.'
    console.log 'init'.bold + ' name' + ' [path]'.italic + ': create a new project with the named template'
    console.log '                  at the given path. if path is not given, creates a folder'
    console.log '                  in the current directory.'
    console.log ''
