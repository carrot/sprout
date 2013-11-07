module.exports = (name, url) ->
  # 
  # setup
  # 

  if not name and not url then throw 'your template needs a name!'

  if name and not url
    @url = name
    @name = @url.split('/')[@url.split('/').length-1]
  else
    @name = name
    @url = url

  # 
  # implementation
  # 
  
  console.log "cloning #{@name} from #{@url}"
