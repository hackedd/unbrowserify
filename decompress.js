/*jslint node: true */
(function () {
    "use strict";

    var uglifyJS = require("uglifyjs"),
        transforms = {};

    transforms.replaceConstants = new uglifyJS.TreeTransformer(function (node) {
        /* 0/0 => NaN */
        if (node instanceof uglifyJS.AST_Binary && node.operator === "/" &&
                node.left instanceof uglifyJS.AST_Number && node.left.value === 0 &&
                node.right instanceof uglifyJS.AST_Number &&  node.right.value === 0) {
            return new uglifyJS.AST_NaN();
        }

        /* !0 => true, !1 => false */
        if (node instanceof uglifyJS.AST_UnaryPrefix && node.operator === "!" &&
                node.expression instanceof uglifyJS.AST_Number) {
            if (node.expression.value === 0) {
                return new uglifyJS.AST_True();
            }
            if (node.expression.value === 1) {
                return new uglifyJS.AST_False();
            }
        }
    });

    function removeSequences(body) {
        var i, child;

        for (i = 0; i < body.length; i += 1) {
            child = body[i];

            if (child instanceof uglifyJS.AST_Return && child.value instanceof uglifyJS.AST_Seq) {
                /* return a, b; => a; return b; */
                body.splice(i, 0, new uglifyJS.AST_SimpleStatement({body: child.value.car}));
                child.value = child.value.cdr;
            } else if (child instanceof uglifyJS.AST_SimpleStatement && child.body instanceof uglifyJS.AST_Seq) {
                /* a, b; => a; b; */
                body.splice(i, 0, new uglifyJS.AST_SimpleStatement({body: child.body.car}));
                child.body = child.body.cdr;
            } else if (child instanceof uglifyJS.AST_If && child.condition instanceof uglifyJS.AST_Seq) {
                /* if (a, b) => a; if (b) */
                body.splice(i, 0, new uglifyJS.AST_SimpleStatement({body: child.condition.car}));
                child.condition = child.condition.cdr;
            } /*else {
                 console.log(child.TYPE, child.print_to_string());
            }*/
        }
    }

    function removeSequencesSingle(node, property) {
        var body = [node[property]];

        removeSequences(body);
        if (body.length !== 1) {
            node[property] = new uglifyJS.AST_BlockStatement({body: body});
        }
    }

    transforms.sequences = new uglifyJS.TreeTransformer(function (node) {
        if (node instanceof uglifyJS.AST_Block) {
            removeSequences(node.body);
        } else if (node instanceof uglifyJS.AST_StatementWithBody) {
            removeSequencesSingle(node, "body");
            if (node instanceof uglifyJS.AST_If) {
                removeSequencesSingle(node, "alternative");
            }
        } /*else {
            console.log(node.TYPE, node.print_to_string());
        }*/
    });

    function decompress(node) {
        node.transform(transforms.replaceConstants);
        node.transform(transforms.sequences);
    }

    module.exports = {
        transforms: transforms,
        decompress: decompress
    };
}());
