require("source-map-support/register");
require("reflect-metadata");
import {runTests} from "../test/test-utils"

import * as transactions from "./transactions"
import * as transformresults from "./transformresults"

runTests(transactions)
.then(() => runTests(transformresults))