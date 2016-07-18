/*jslint node: true */
/*global describe, it */
"use strict";

var assert = require("assert"),
    path = require("path"),
    fs = require("fs"),
    uglifyJS = require("uglifyjs"),
    here = path.dirname(module.filename),
    suffix = process.env.TEST_COV ? "-cov" : "",
    unbrowserify = require("../unbrowserify" + suffix),
    decompress = require("../decompress" + suffix);

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

Object.values = function (obj) {
    var key, values = [];
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            values.push(obj[key]);
        }
    }
    return values;
};

describe("unbrowserify", function () {
    describe("formatCode", function () {
        it("should output each var on a new line", function () {
            var ast = parseString("var a = 1, b = 2, c = 3;");
            assert.equal(formatCode(ast), "var a = 1,\n    b = 2,\n    c = 3;");
        });

        it("should keep vars in a for on the same line", function () {
            var ast = parseString("for (var i = 0, j = 0; ;) {}");
            assert.equal(formatCode(ast), "for (var i = 0, j = 0; ;) {}");
        });
    });

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

    function extractHelper(bundleFilename, test) {
        var bundle = path.resolve(here, "fib", bundleFilename),
            bundleSource = fs.readFileSync(bundle, "utf8"),
            ast = parseString(bundleSource, bundle),
            mainFunction = unbrowserify.findMainFunction(ast),
            moduleObject = mainFunction.args[0],
            main = mainFunction.args[2],
            moduleNames = unbrowserify.extractModuleNames(moduleObject, main);

        test(moduleObject, moduleNames);
    }

    describe("extractModuleNames", function () {
        it("should find the module names", function () {
            extractHelper("bundle.js", function (moduleObject, moduleNames) {
                var modules = Object.values(moduleNames).sort();
                assert.deepEqual(modules, ["fib", "main"]);
            });
        });

        it("should find the module names after compression", function () {
            extractHelper("bundle-min.js", function (moduleObject, moduleNames) {
                var modules = Object.values(moduleNames).sort();
                assert.deepEqual(modules, ["fib", "main"]);
            });
        });
    });

    describe("extractModules", function () {
        var fib = path.resolve(here, "fib", "fib.js"),
            fibSource = fs.readFileSync(fib, "utf8"),
            expected = parseString(fibSource, fib);

        it("should find the modules", function () {
            extractHelper("bundle.js", function (moduleObject, moduleNames) {
                var modules = unbrowserify.extractModules(moduleObject, moduleNames);

                assert.ok(modules.main instanceof uglifyJS.AST_Toplevel);
                assert.ok(modules.fib instanceof uglifyJS.AST_Toplevel);

                /* Check round-trip. */
                assert.equal(formatCode(modules.fib), formatCode(expected));
            });
        });

        it("should find the modules after compression", function () {
            extractHelper("bundle-min.js", function (moduleObject, moduleNames) {
                var modules = unbrowserify.extractModules(moduleObject, moduleNames);

                assert.ok(modules.main instanceof uglifyJS.AST_Toplevel);
                assert.ok(modules.fib instanceof uglifyJS.AST_Toplevel);

                /* The code for the two modules is no longer equal, because it has been compressed. */
            });
        });
    });
});

describe("decompress", function () {
    var directory = path.resolve(here, "decompress");

    function findTestFiles() {
        var isJs = /\.js$/;
        return fs.readdirSync(directory).filter(function (name) {
            return isJs.test(name);
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

                if (name === "description") {
                    testCase[name] = node.body.start.value;
                    return true;
                }

                if (name === "input" || name === "expect") {
                    testCase[name] = node.body;
                    return true;
                }

                throw new Error("Unsupported label '" + name + "' at line " + node.label.start.line);
            }

            if (!inTest && !(node instanceof uglifyJS.AST_Toplevel)) {
                throw new Error("Unsupported statement " + node.TYPE + " at line " + node.start.line);
            }
        });
        ast.walk(tw);

        return cases;
    }

    findTestFiles().forEach(function (filename) {
        describe(filename, function () {
            getTestCases(filename).forEach(function (testCase) {
                it(testCase.description || testCase.name, function () {
                    var output, expect;

                    decompress(testCase.input);

                    output = formatCode(testCase.input);
                    expect = formatCode(testCase.expect);

                    assert.equal(output, expect);
                });
            });
        });
    });
});
