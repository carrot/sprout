build:
	cp -R lib src
	babel src --out-dir lib

unbuild:
	rm -rf lib
	mv src lib

publish:
	make build
	npm publish .
	make unbuild
