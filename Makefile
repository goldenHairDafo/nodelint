PACKAGE = nodelint
NODEJS = $(if $(shell test -f /usr/bin/nodejs && echo "true"),nodejs,node)

PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
DATADIR ?= $(PREFIX)/share
MANDIR ?= $(PREFIX)/share/man
LIBDIR ?= $(PREFIX)/lib
ETCDIR = /etc
PACKAGEDATADIR ?= $(DATADIR)/$(PACKAGE)

BUILDDIR = dist

$(shell if [ ! -d $(BUILDDIR) ]; then mkdir $(BUILDDIR); fi)

DOCS = $(shell find doc -name '*.md' \
        |sed 's|.md|.1|g' \
        |sed 's|doc/|man1/|g' \
        )

all: build doc

build: stamp-build

stamp-build: jslint/jslint.js nodelint config.js
	touch $@;
	cp $^ $(BUILDDIR);
	perl -pi -e 's{^\s*SCRIPT_DIRECTORY =.*?\n}{}ms' $(BUILDDIR)/nodelint
	perl -pi -e 's{path\.join\(SCRIPT_DIRECTORY, '\''config.js'\''\)}{"$(ETCDIR)/nodelint.conf"}' $(BUILDDIR)/nodelint
	perl -pi -e 's{path\.join\(SCRIPT_DIRECTORY, '\''jslint/jslint\.js'\''\)}{"$(PACKAGEDATADIR)/jslint.js"}' $(BUILDDIR)/nodelint

install: build doc
	install --directory $(PACKAGEDATADIR)
	install --mode 0644 $(BUILDDIR)/jslint.js $(PACKAGEDATADIR)/jslint.js
	install --mode 0644 $(BUILDDIR)/config.js $(ETCDIR)/nodelint.conf
	install --mode 0755 $(BUILDDIR)/nodelint $(BINDIR)/nodelint
	install --directory $(MANDIR)/man1/
	cp -a man1/nodelint.1 $(MANDIR)/man1/

uninstall:
	rm -rf $(PACKAGEDATADIR)/jslint.js $(ETCDIR)/nodelint.conf $(BINDIR)/nodelint
	rm -rf $(MANDIR)/man1/nodelint.1

clean:
	rm -rf $(BUILDDIR) stamp-build

test:
	@which nodeunit > /dev/null 2>&1 || echo "Run 'npm install nodeunit' before run this"
	nodeunit test

lint:
	./nodelint ./nodelint ./config.js ./package.json ./examples/reporters/ ./examples/textmate/ ./examples/vim/ ./test/

doc: man1 $(DOCS)
	@true

man1:
	@if ! test -d man1 ; then mkdir -p man1 ; fi

# use `npm install ronn` for this to work.
man1/%.1: doc/%.md
	ronn --roff $< > $@

.PHONY: test install uninstall build all