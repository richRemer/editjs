name = $(shell jq -r .name < package.json)
version = $(shell jq -r .version < package.json)
sources = $(shell find build menu src ui -type f)

appimage = $(name)-$(version).AppImage
command = $(name)

prefix = /usr/local
target = dist/target$(prefix)
libexec = $(target)/libexec
bin = $(target)/bin

build: $(libexec)/$(appimage) $(bin)/$(command)

clean:
	rm -fr dist node_modules

node_modules:
	npm install
	@touch $@

dist/$(appimage): node_modules $(sources)
	npm run build

dist/$(command).sh: Makefile
	echo '#!/bin/bash -e' > $@
	echo nohup $(prefix)/libexec/$(appimage) -- '"$$@"' '&>' '$$(mktemp -d)/$(command).log' '&' >> $@
	@chmod +x $@

$(libexec)/$(appimage): dist/$(appimage)
	@mkdir -p $(@D)
	cp $< $@

$(bin)/$(command): dist/$(command).sh
	@mkdir -p $(@D)
	cp $< $@

install: $(libexec)/$(appimage) $(bin)/$(command)
	cp -rT $(target) /

.PHONY: build clean install
