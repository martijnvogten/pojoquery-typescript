import "reflect-metadata"
import * as test from "./test-utils";

import {table, id, text, timestamp, joinMany, joinOne} from "../metadata"
import {QueryBuilder} from "../pojoquery"

@table("person")
class Person {
	@id
	personID: number;
	
	@text()
	firstname: string;

	@text()
	lastname: string;
}
	
@table("event")
class Event {
	@id
	eventID: number;
	
	@text()
	title: string;

	@text()
	location: string;

	@timestamp()
	date: Date;
}

@table("festival")
class Festival {
	@id
	festivalId: number;

	@text()
	name: string;

	@joinMany(() => EventWithVisitorsAndOrganizers, {foreignLinkField: "festivalID"})
	events: EventWithVisitorsAndOrganizers[];
}

class EventWithFestival extends Event {
	@joinMany(() => Festival, {linkField: "festivalID"})
	festival: Festival;
}

class EventWithVisitorsAndOrganizers extends Event {
	@joinMany(() => Person, {
		linkTable: "event_person",
		linkField: "eventID",
		foreignLinkField: "personID", 
		joinCondition: "{this}.eventID={linktable}.eventID AND {linktable}.role='visitor'"
	})
	visitors: Person[];
	
	@joinMany(() => Person, {
		linkTable: "event_person",
		linkField: "eventID",
		foreignLinkField: "personID",
		joinCondition: "{this}.eventID={linktable}.eventID AND {linktable}.role='organizer'"
	})
	organizers: Person[];
}


@table("employee")
class Employee {
	@id
	id: number;
	
	@joinOne(() => Department, {joinCondition: "{this}.department_id = {department}.id"})
	department: Department;
}

@table("department")
class Department {
	@id
	id: number;
	
	@text()
	name: string;
}

export function testSimpleDepartmentEmployeeJoinCondition() {
	testToSql(
        build(Employee),`
		SELECT
			"employee".id AS "employee.id",
			"department".id AS "department.id",
			"department".name AS "department.name"
			FROM "employee"
			LEFT JOIN "department" AS "department" ON "employee".department_id = "department".id
		`
    );
}

function testToSql(query: QueryBuilder, expectedSql: string) {
    test.equal(norm(query.toSql()), norm(expectedSql));
}

function norm(sql: string) {
    return sql.trim().replace(/\s+/g, " ");
}

function build(clz: Function): QueryBuilder {
    return new QueryBuilder(clz);
}