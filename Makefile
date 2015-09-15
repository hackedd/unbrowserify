test: lint
	mocha

lint: unbrowserify.js decompress.js utils.js test/test.js
	jslint $? || true

coverage: test unbrowserify-cov.js decompress-cov.js
	TEST_COV=1 mocha --reporter html-cov > coverage.html
	@echo "Coverage report written to coverage.html" >&2

%-cov.js: %.js
	jscoverage $<

.PHONY: test lint coverage
