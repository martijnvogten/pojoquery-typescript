import "source-map-support/register"
import {runTests} from "./test-utils"

import * as tosqlembedded from "./tosql-embedded"
import * as tosqlbasics from "./tosql-basic"
import * as tosqlmany2many from "./tosql-many2many"
import * as internals from "./internals"

runTests(internals);
runTests(tosqlbasics);
runTests(tosqlmany2many);
runTests(tosqlembedded);