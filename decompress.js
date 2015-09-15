/*jslint node: true */
(function () {
    "use strict";

    var uglifyJS = require("uglifyjs"),
        defaultOptions = {
            constants: true,
            sequences: true,
            conditionals: true
        };

    function asStatement(node) {
        if (node instanceof uglifyJS.AST_Statement) {
            return node;
        }
        return new uglifyJS.AST_SimpleStatement({ body: node });
    }

    function replaceInBlock(node, field, replace) {
        var i, newNodes,
            body = node[field],
            single = body instanceof uglifyJS.AST_Node;

        if (body === null || body === undefined) {
            return;
        }

        if (single) {
            body = [body];
        }

        i = 0;
        while (i < body.length) {
            newNodes = replace(body[i], i, body);
            if (newNodes) {
                newNodes.unshift(i, 1);
                Array.prototype.splice.apply(body, newNodes);
            } else {
                i += 1;
            }
        }

        if (single) {
            if (body.length === 1) {
                node[field] = body[0];
            } else {
                node[field] = new uglifyJS.AST_BlockStatement({body: body});
            }
        }
    }

    function removeSequences(node, field) {
        var nodeTypes = [
            { type: uglifyJS.AST_Return, field: "value" },
            { type: uglifyJS.AST_SimpleStatement, field: "body" },
            { type: uglifyJS.AST_If, field: "condition" },
            { type: uglifyJS.AST_For, field: "init" },
            { type: uglifyJS.AST_With, field: "expression" },
            { type: uglifyJS.AST_Switch, field: "expression" }
        ];

        replaceInBlock(node, field, function (child) {
            var j, seq;

            if (child instanceof uglifyJS.AST_Var) {
                for (j = 0; j < child.definitions.length; j += 1) {
                    if (child.definitions[j].value instanceof uglifyJS.AST_Seq) {
                        seq = child.definitions[j].value;
                        child.definitions[j].value = seq.cdr;
                        return [new uglifyJS.AST_SimpleStatement({body: seq.car}), child];
                    }
                }
            }

            if (child instanceof uglifyJS.AST_SimpleStatement &&
                    child.body instanceof uglifyJS.AST_Assign &&
                    child.body.right instanceof uglifyJS.AST_Seq) {
                seq = child.body.right;
                child.body.right = seq.cdr;
                return [new uglifyJS.AST_SimpleStatement({body: seq.car}), child];
            }

            for (j = 0; j < nodeTypes.length; j += 1) {
                if (child instanceof nodeTypes[j].type && child[nodeTypes[j].field] instanceof uglifyJS.AST_Seq) {
                    seq = child[nodeTypes[j].field];
                    child[nodeTypes[j].field] = seq.cdr;
                    return [new uglifyJS.AST_SimpleStatement({body: seq.car}), child];
                }
            }
        });
    }

    function transformBefore(node) {
        if (this.options.constants) {
            /* 0/0 => NaN */
            if (node instanceof uglifyJS.AST_Binary && node.operator === "/" &&
                    node.left instanceof uglifyJS.AST_Number && node.left.value === 0 &&
                    node.right instanceof uglifyJS.AST_Number && node.right.value === 0) {
                return new uglifyJS.AST_NaN();
            }

            /* 1/0 => Infinity */
            if (node instanceof uglifyJS.AST_Binary && node.operator === "/" &&
                    node.left instanceof uglifyJS.AST_Number && node.left.value === 1 &&
                    node.right instanceof uglifyJS.AST_Number && node.right.value === 0) {
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
        }

        if (this.options.sequences) {
            if (node instanceof uglifyJS.AST_Block) {
                removeSequences(node, "body");
            } else if (node instanceof uglifyJS.AST_StatementWithBody) {
                removeSequences(node, "body");
                if (node instanceof uglifyJS.AST_If) {
                    removeSequences(node, "alternative");
                }
            }
        }

        if (this.options.conditionals) {
            if (node instanceof uglifyJS.AST_SimpleStatement && node.body instanceof uglifyJS.AST_Binary) {
                /* a && b; => if (a) { b; } */
                if (node.body.operator === "&&") {
                    node = new uglifyJS.AST_If({
                        condition: node.body.left,
                        body: asStatement(node.body.right),
                        alternative: null
                    });
                    node.transform(this);
                    return node;
                }
                /* a || b; => if (!a) { b; } */
                if (node.body.operator === "||") {
                    node = new uglifyJS.AST_If({
                        condition: new uglifyJS.AST_UnaryPrefix({operator: "!", expression: node.body.left}),
                        body: asStatement(node.body.right),
                        alternative: null
                    });
                    node.transform(this);
                    return node;
                }
            }

            /* a ? b : c; => if (a) { b; } else { c; } */
            if (node instanceof uglifyJS.AST_SimpleStatement && node.body instanceof uglifyJS.AST_Conditional) {
                node = new uglifyJS.AST_If({
                    condition: node.body.condition,
                    body: asStatement(node.body.consequent),
                    alternative: asStatement(node.body.alternative)
                });
                node.transform(this);
                return node;
            }

            /* return a ? b : c; => if (a) { return b; } else { return c; } */
            if (node instanceof uglifyJS.AST_Return && node.value instanceof uglifyJS.AST_Conditional) {
                node = new uglifyJS.AST_If({
                    condition: node.value.condition,
                    body: new uglifyJS.AST_Return({ value: node.value.consequent }),
                    alternative: new uglifyJS.AST_Return({ value: node.value.alternative })
                });
                node.transform(this);
                return node;
            }

            /* return void a(); => a(); return; */
            if (node instanceof uglifyJS.AST_Block || node instanceof uglifyJS.AST_StatementWithBody) {
                replaceInBlock(node, "body", function (child) {
                    if (child instanceof uglifyJS.AST_Return &&
                            child.value instanceof uglifyJS.AST_UnaryPrefix &&
                            child.value.operator === "void") {
                        return [new uglifyJS.AST_SimpleStatement({ body: child.value.expression }),
                                new uglifyJS.AST_Return({ value: null }) ];
                    }
                });
            }
        }
    }

    function decompress(node, options) {
        var k, transform;

        if (options === undefined) {
            options = defaultOptions;
        } else {
            for (k in defaultOptions) {
                if (defaultOptions.hasOwnProperty(k) && options[k] === undefined) {
                    options[k] = defaultOptions[k];
                }
            }
        }

        transform = new uglifyJS.TreeTransformer(transformBefore);
        transform.options = options;
        node.transform(transform);
    }

    module.exports = decompress;
}());
