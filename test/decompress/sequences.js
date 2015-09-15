test1: {
    input: {
        foo(), bar();
    }
    expect: {
        foo();
        bar();
    }
}

test2: {
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

test6: {
    input: {
        if (x = 5, y) z();

        for (x = 5, i = 0; i < 5; i++) console.log(i);

        for (x = 5; i < 5; i++) console.log(i);

        switch (x = 5, y) {}

        with (x = 5, obj);
    }
    expect: {
        x = 5;
        if (y) {
            z();
        }

        x = 5;
        for (i = 0; i < 5; i++) {
            console.log(i);
        }

        for (x = 5; i < 5; i++) {
            console.log(i);
        }

        x = 5;
        switch (y) {
        }

        x = 5;
        with (obj) {
        }
    }
}

test7: {
    input: {
        var a = (x(), y());
        b = (x(), y());
    }
    expect: {
        x();
        var a = y();
        x();
        b = y();
    }
}

test8: {
    input: {
        a && (b = c, d() && e(), f()), g();
    }
    expect: {
        if (a) {
            b = c;
            if (d()) {
                e();
            }
            f();
        }
        g();
    }
}
