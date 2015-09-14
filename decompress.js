/*jslint node: true */
(function () {
    "use strict";

    var uglifyJS = require("uglifyjs"),
        transforms = {};

    function asStatement(node) {
        if (node instanceof uglifyJS.AST_Statement) {
            return node;
        }
        return new uglifyJS.AST_SimpleStatement({ body: node });
    }

    transforms.replaceConstants = new uglifyJS.TreeTransformer(function (node) {
        /* 0/0 => NaN */
        if (node instanceof uglifyJS.AST_Binary && node.operator === "/" &&
                node.left instanceof uglifyJS.AST_Number && node.left.value === 0 &&
                node.right instanceof uglifyJS.AST_Number &&  node.right.value === 0) {
            return new uglifyJS.AST_NaN();
        }

        /* 1/0 => Infinity */
        if (node instanceof uglifyJS.AST_Binary && node.operator === "/" &&
                node.left instanceof uglifyJS.AST_Number && node.left.value === 1 &&
                node.right instanceof uglifyJS.AST_Number &&  node.right.value === 0) {
            return new uglifyJS.AST_Infinity();
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
        var i, j, child, seq, lifted,
            nodeTypes = [
                { type: uglifyJS.AST_Return, field: "value" },
                { type: uglifyJS.AST_SimpleStatement, field: "body" },
                { type: uglifyJS.AST_If, field: "condition" },
                { type: uglifyJS.AST_For, field: "init" },
                { type: uglifyJS.AST_With, field: "expression" },
                { type: uglifyJS.AST_Switch, field: "expression" }
            ];

        i = 0;
        while (i < body.length) {
            child = body[i];

            lifted = false;
            for (j = 0; j < nodeTypes.length; j += 1) {
                if (child instanceof nodeTypes[j].type && child[nodeTypes[j].field] instanceof uglifyJS.AST_Seq) {
                    seq = child[nodeTypes[j].field];
                    body.splice(i, 0, new uglifyJS.AST_SimpleStatement({body: seq.car}));
                    child[nodeTypes[j].field] = seq.cdr;
                    lifted = true;
                    break;
                }
            }

            if (lifted === false) {
                i += 1;
            }
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

    transforms.conditionals = new uglifyJS.TreeTransformer(function (node) {
        if (node instanceof uglifyJS.AST_SimpleStatement && node.body instanceof uglifyJS.AST_Binary) {
            if (node.body.operator === "&&") {
                return new uglifyJS.AST_If({
                    condition: node.body.left,
                    body: asStatement(node.body.right)
                });
            }
            if (node.body.operator === "||") {
                return new uglifyJS.AST_If({
                    condition: new uglifyJS.AST_UnaryPrefix({ operator: "!", expression: node.body.left }),
                    body: asStatement(node.body.right)
                });
            }
        }

        if (node instanceof uglifyJS.AST_SimpleStatement && node.body instanceof uglifyJS.AST_Conditional) {
            node = new uglifyJS.AST_If({
                condition: node.body.condition,
                body: asStatement(node.body.consequent),
                alternative: asStatement(node.body.alternative)
            });
            node.transform(this);
            return node;
        }
    });

    function decompress(node) {
        node.transform(transforms.replaceConstants);
        node.transform(transforms.sequences);
        node.transform(transforms.conditionals);
    }

    module.exports = {
        transforms: transforms,
        decompress: decompress
    };
}());
