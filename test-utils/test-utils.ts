import * as assert from "assert";
import {AssertionError} from "assert";

import * as diff from "diff";
import {green, red, bold} from "colors";

function showDiffWithColors(one: string, other: string): string {
	return diff.diffChars(one, other).map(part => {
		if (part.added) {
			return '';
		}
		if (part.removed) {
			return red.bold(part.value);
		}
		return part.value;
	}).join('');	
}

export function runTests(tests: Object) {
	Object.keys(tests).forEach(testName => {
		try {
			tests[testName]();
			console.log(testName + ": " + green.bold("OK"));
		} catch (e) {
			console.log(testName + ": " + red.bold("FAIL"));
			if (e instanceof AssertionError) {
				let ae: AssertionError = e;
				console.log(ae.message);
				if (typeof ae.expected == 'string') {
					console.log("expected:", showDiffWithColors(ae.expected, ae.actual));
					console.log("actual  :", showDiffWithColors(ae.actual, ae.expected));
				} else {
					console.log("expected:", ae.expected);
					console.log("actual  :", ae.actual);
				}
			}
			throw e;
		}
	});
}
