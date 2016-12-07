require("source-map-support/register");
require("reflect-metadata");
import {runTests} from "../test/test-utils"

import * as transactions from "./transactions"
import * as transformresults from "./transformresults"
import * as resulttypes from "./resulttypes"
import * as joins from "./joins"

runTests(transactions)
.then(() => runTests(transformresults))
.then(() => runTests(resulttypes))
.then(() => runTests(joins))