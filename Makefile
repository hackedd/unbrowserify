test: lint test/fib/bundle.js test/fib/bundle-min.js
	mocha

lint: unbrowserify.js decompress.js cli.js test/test.js test/fib/main.js test/fib/fib.js
	jslint $? || true

coverage: test unbrowserify-cov.js decompress-cov.js
	TEST_COV=1 mocha --reporter html-cov > coverage.html
	@echo "Coverage report written to coverage.html" >&2

test/fib/bundle.js: test/fib/main.js test/fib/fib.js
	cd test/fib; browserify main.js -o bundle.js

%-cov.js: %.js
	jscoverage $<

%-min.js: %.js
	uglifyjs $< --output $@ --compress --mangle

.PHONY: test lint coverage
