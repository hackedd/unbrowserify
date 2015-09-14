test1: {
    transform: "replaceConstants";

    input: {
        var a = 0 / 0,
            b = !0,
            c = !1,
            d = 1 / 0;
    }
    expect: {
        var a = NaN,
            b = true,
            c = false,
            d = Infinity;
    }
}
