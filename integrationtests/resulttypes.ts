import * as test from "../test/test-utils";

import * as q from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"
import {sql} from "./db/mysqldatabase"
import * as testdb from "./testdb"

@q.table("user")
class User {
	@q.id
	id: number;
	
	@q.text()
	firstName: string;
	
	@q.text()
	lastName: string;
	
	getFullName(): string {
		return [this.firstName, this.lastName].join(' ');
	}
}


export function testUserType(): Promise<void> {
    return testdb.withEmptyDatabase(async (db) => {
        await db.query("CREATE TABLE `user` (id INT NOT NULL AUTO_INCREMENT, firstName VARCHAR(255), lastName VARCHAR(255), PRIMARY KEY(id))");
        
        let userId = (await db.query("INSERT INTO `user` SET ?", [{firstName: 'Jimi', lastName: 'Hendrix'}]))['insertId'];
        
        let users = await new QueryBuilder(User).execute<User>(db);
        test.equal(users.length, 1);
        test.equal(users[0].getFullName(), 'Jimi Hendrix');
    });
}
