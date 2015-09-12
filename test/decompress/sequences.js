test1: {
    transform: "sequences";

    input: {
        foo(), bar();
    }
    expect: {
        foo();
        bar();
    }
}

test2: {
    transform: "sequences";

    input: {
        foo(), bar(), baz();
    }
    expect: {
        foo();
        bar();
        baz();
    }
}

test3: {
    transform: "sequences";

    input: {
        if (test) foo(), bar(), baz();
        else x(), y(), z();
    }
    expect: {
        if (test) {
            foo();
            bar();
            baz();
        } else {
            x();
            y();
            z();
        }
    }
}

test4: {
    transform: "sequences";

    input: {
        if (a(), test) b();
    }
    expect: {
        a();
        if (test) {
            b();
        }
    }
}

test5: {
    transform: "sequences";

    input: {
        function f() {
            return a(), b();
        }
    }
    expect: {
        function f() {
            a();
            return b();
        }
    }
}
