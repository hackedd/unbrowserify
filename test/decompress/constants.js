test1: {
    transform: "replaceConstants";

    input: {
        var a = 0 / 0,
            b = !0,
            c = !1;
    }
    expect: {
        var a = NaN,
            b = true,
            c = false;
    }
}
