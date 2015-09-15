test1: {
    input: {
        foo && bar();
        foo || bar();
    }
    expect: {
        if (foo) {
            bar();
        }
        if (!foo) {
            bar();
        }
    }
}

test2: {
    input: {
        foo ? x() : y();
        foo ? x() : bar ? y() : baz && z();
        foo ? x() : bar ? y() : baz ? z() : t();
    }
    expect: {
        if (foo) {
            x();
        } else {
            y();
        }

        if (foo) {
            x();
        } else if (bar) {
            y();
        } else if (baz) {
            z();
        }

        if (foo) {
            x();
        } else if (bar) {
            y();
        } else if (baz) {
            z();
        } else {
            t();
        }
    }
}

test3: {
    input: {
        some_condition() && some_other_condition() && do_something();
        some_condition() && some_other_condition() ? do_something() : alternate();
    }
    expect: {
        if (some_condition() && some_other_condition()) {
            do_something();
        }

        if (some_condition() && some_other_condition()) {
            do_something();
        } else {
            alternate();
        }
    }
}