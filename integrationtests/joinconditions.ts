import "reflect-metadata"
import * as test from "../test/test-utils";

import {table, id, text, joinMany, joinOne} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import { timestamp } from "..";
import * as testdb from "./testdb"
import { MySQLConnection, MySQLDatabase, sql } from "./db/mysqldatabase";

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

// class EventWithFestival extends Event {
// 	@joinMany(() => Festival, {linkField: "festivalID"})
// 	festival: Festival;
// }

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

export function testFestivals(): Promise<void> {
    return testdb.withEmptyDatabase(async (db) => {
		await createTables(db);

		await db.runInTransaction(async conn => {
			await insertTestData(conn);
	
			let q = new QueryBuilder(Festival);
			console.log(q.toSql());
			const festivals = await q.execute<Festival>(conn);
			
			const events = festivals[0].events;
			test.equal(events.length, 1);
	
			test.equal(events[0].visitors.length, 1);
			test.equal(events[0].organizers.length, 1);
		});
    });
}

async function insertTestData(conn: MySQLConnection) {
	const janeId = (await conn.query("INSERT INTO `person` SET ?", [{firstName: 'Jane', lastName: 'Doe'}]))['insertId'];
	const stellaId = (await conn.query("INSERT INTO `person` SET ?", [{firstName: 'Stella', lastName: 'Smith'}]))['insertId'];
	const festivalId = (await conn.query("INSERT INTO `festival` SET ?", [{name: 'Communic8'}]))['insertId'];
    const eventId = (await conn.query("INSERT INTO `event` SET ?", [{location: 'Las Vegas', festivalId: festivalId, date: new Date(2020, 4, 15)}]))['insertId'];
	
	// Jane is a visitor, Stella is the organizer
	conn.query("INSERT INTO event_person SET ?", [{eventID: eventId, personID: janeId, role: "visitor"}]);
	conn.query("INSERT INTO event_person SET ?", [{eventID: eventId, personID: stellaId, role: "organizer"}]);
}

async function createTables(db: MySQLDatabase) {
	await db.query("CREATE TABLE person (personID BIGINT NOT NULL AUTO_INCREMENT, firstname VARCHAR(1023), lastname VARCHAR(1023), PRIMARY KEY (personID))");
	await db.query("CREATE TABLE event (eventID BIGINT NOT NULL AUTO_INCREMENT, festivalID BIGINT, title VARCHAR(1023), date DATE, location VARCHAR(1023), PRIMARY KEY (eventID))");
	await db.query("CREATE TABLE festival (festivalID BIGINT NOT NULL AUTO_INCREMENT, name VARCHAR(1023), PRIMARY KEY (festivalID))");
	await db.query("CREATE TABLE event_person (eventID BIGINT NOT NULL, personID BIGINT NOT NULL, role VARCHAR(1023), PRIMARY KEY (eventID, personID))");
}
