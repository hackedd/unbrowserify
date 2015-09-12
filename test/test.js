/*jslint node: true */
/*global describe, it */
(function () {
    "use strict";

    var assert = require("assert"),
        path = require("path"),
        fs = require("fs"),
        uglifyJS = require("uglifyjs"),
        unbrowserify = require("../unbrowserify"),
        decompress = require("../decompress");

    function parseString(code, filename) {
        var ast = uglifyJS.parse(code, {filename: filename});
        ast.figure_out_scope();
        return ast;
    }

    function formatCode(ast) {
        return ast.print_to_string({
            beautify: true,
            ascii_only: true,
            bracketize: true
        });
    }

    describe("unbrowserify", function () {
        describe("findMainFunction", function () {
            it("should find the main function", function () {
                var ast = parseString("var foo; !function e(){ }(foo);"),
                    f = unbrowserify.findMainFunction(ast);

                assert.equal(f instanceof uglifyJS.AST_Call, true);
                assert.equal(f.expression.name.name, "e");
            });

            it("should find the first function if multiple defined", function () {
                var ast = parseString("var foo; !function e(){ }(foo); !function f(){ }(foo);"),
                    f = unbrowserify.findMainFunction(ast);

                assert.equal(f instanceof uglifyJS.AST_Call, true);
                assert.equal(f.expression.name.name, "e");
            });

            it("should return undefined if no functions are defined", function () {
                var ast = parseString("var foo;"),
                    f = unbrowserify.findMainFunction(ast);

                assert.equal(f, undefined);
            });
        });

        describe("extractModuleNames", function () {
            it("should find the module names");
        });

        describe("extractModules", function () {
            it("should find the modules");
        });
    });

    describe("decompress", function () {
        var here = path.dirname(module.filename),
            directory = path.resolve(here, "decompress");

        function findTestFiles() {
            return fs.readdirSync(directory).filter(function (name) {
                return /\.js$/.test(name);
            });
        }

        function getTestCases(filename) {
            var code = fs.readFileSync(path.resolve(directory, filename), "utf8"),
                ast = parseString(code, filename),
                inTest = false,
                testCase,
                cases = [],
                tw;

            tw = new uglifyJS.TreeWalker(function (node, descend) {
                var name;

                if (node instanceof uglifyJS.AST_LabeledStatement) {
                    name = node.label.name;

                    if (this.parent() instanceof uglifyJS.AST_Toplevel) {
                        testCase = {name: name};
                        cases.push(testCase);
                        inTest = true;
                        descend();
                        inTest = false;
                        return true;
                    }

                    if (name === "description" || name === "transform") {
                        testCase[name] = node.body.start.value;
                        return true;
                    }

                    if (name === "input" || name === "expect") {
                        testCase[name] = node.body;
                        return true;
                    }

                    throw new Error("Unsupported label '" + name + "' at line " + node.label.start.line);
                } else if (!inTest && !(node instanceof uglifyJS.AST_Toplevel)) {
                    throw new Error("Unsupported statement " + node.TYPE + " at line " + node.start.line);
                }
            });
            ast.walk(tw);

            return cases;
        }

        findTestFiles().forEach(function (filename) {
            describe(filename, function () {
                getTestCases(filename).forEach(function (testCase) {
                    var transform, doDecompress;

                    if (testCase.transform) {
                        transform = decompress.transforms[testCase.transform];
                        assert.ok(transform);
                        doDecompress = function (node) {
                            node.transform(transform)
                        };
                    } else {
                        doDecompress = decompress.decompress;
                    }

                    it(testCase.description || testCase.name, function () {
                        var output, expect;

                        doDecompress(testCase.input);
                        output = formatCode(testCase.input);
                        expect = formatCode(testCase.expect);

                        assert.equal(output, expect);
                    });
                });
            });
        });
    });
}());
