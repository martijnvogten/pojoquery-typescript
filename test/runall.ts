import "source-map-support/register"

import * as basic from "./basic"
import * as internals from "./internals"
import {runTests} from "./test-utils"

runTests(internals);
runTests(basic);