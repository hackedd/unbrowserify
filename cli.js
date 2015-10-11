/*jslint node: true */
(function () {
    "use strict";

    var unbrowserify = require("./unbrowserify"),
        filename,
        outputDirectory;

    if (process.argv.length <= 2) {
        console.error("Usage: " + process.argv.join(" ") + " Source [Outdir]");
        process.exit();
    }

    filename = process.argv[2];
    outputDirectory = process.argv.length >= 4 ? process.argv[3] : ".";
    unbrowserify.unbrowserify(filename, outputDirectory);
}());
