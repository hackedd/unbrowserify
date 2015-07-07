/*jslint node: true */
/*global describe, it */
(function () {
    "use strict";

    var assert = require("assert"),
        uglifyJS = require("uglifyjs"),
        unbrowserify = require("../unbrowserify");

    function parseString(code, filename) {
        var ast = uglifyJS.parse(code, {filename: filename});
        ast.figure_out_scope();
        return ast;
    }

    describe("unbrowserify", function () {
        describe("findMainFunction", function () {
            it("should find the main function", function () {
                var ast = parseString("var foo; !function e(){ }(foo);"),
                    f = unbrowserify.findMainFunction(ast);

                assert.equal(true, f instanceof uglifyJS.AST_Call);
                assert.equal("e", f.expression.name.name);
            });

            it("should find the first function if multiple defined", function () {
                var ast = parseString("var foo; !function e(){ }(foo); !function f(){ }(foo);"),
                    f = unbrowserify.findMainFunction(ast);

                assert.equal(true, f instanceof uglifyJS.AST_Call);
                assert.equal("e", f.expression.name.name);
            });

            it("should return undefined if no functions are defined", function () {
                var ast = parseString("var foo;"),
                    f = unbrowserify.findMainFunction(ast);

                assert.equal(undefined, f);
            });
        });

        describe("extractModuleNames", function () {
            it("should find the module names");
        });

        describe("extractModules", function () {
            it("should find the modules");
        });
    });

}());
