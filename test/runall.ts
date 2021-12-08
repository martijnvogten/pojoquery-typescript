import "source-map-support/register"
import {runTests} from "./test-utils"

import * as tosqlembedded from "./tosql-embedded"
import * as tosqlexpressions from "./tosql-expressions"
import * as tosqlbasics from "./tosql-basic"
import * as tosqlmany2many from "./tosql-many2many"
import * as internals from "./internals"
import * as joinconditions from "./tosql-joinconditions"
import * as joinconditions2 from "./tosql-joinconditions2"


async function doit() {
	await runTests(tosqlexpressions);
	await runTests(internals);
	await runTests(tosqlbasics);
	await runTests(tosqlmany2many);
	await runTests(tosqlembedded);
	await runTests(joinconditions);
	await runTests(joinconditions2);
}

doit();