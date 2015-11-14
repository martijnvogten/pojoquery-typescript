import "source-map-support/register"

import * as tosql_basic from "./tosql-basic"
import * as internals from "./internals"
import {runTests} from "./test-utils"

runTests(internals);
runTests(tosql_basic);