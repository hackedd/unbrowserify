module.exports = function (n) {
    "use strict";
    var a = 0, b = 1, f, i;
    for (i = 1; i < n; i += 1) {
        f = a + b;
        a = b;
        b = f;
    }
    return f;
};
