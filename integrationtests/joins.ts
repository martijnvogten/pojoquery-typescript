import * as test from "../test/test-utils";

import {table, id, text, number, joinOne, joinMany} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"
import {sql} from "./db/mysqldatabase"
import * as testdb from "./testdb"

@table("personaldetails")
class PersonalDetails {
    @id
    personalDetails_id: string;
    
    @text()
    phone: string;
}

@table("user")
class User {
    @id
    user_id: number;
    
    @text()
    username: string;

    @joinOne(PersonalDetails, {linkField: 'details_id'})
	personalDetails: PersonalDetails;
}

export function testJoins(): Promise<void> {
    return testdb.withEmptyDatabase(async (db) => {
        await db.query("CREATE TABLE `user` (user_id INT NOT NULL AUTO_INCREMENT, username VARCHAR(255), details_id BIGINT NOT NULL, PRIMARY KEY(user_id))");
        await db.query("CREATE TABLE `personaldetails` (personalDetails_id INT NOT NULL AUTO_INCREMENT, phone VARCHAR(255), PRIMARY KEY(personalDetails_id))");
        
        let personalDetailsId = (await db.query("INSERT INTO `personaldetails` (phone) VALUES ('123456789')"))['insertId'];
        await db.query(sql`INSERT INTO user (username, details_id) VALUES ('john', ${personalDetailsId})`);
        
        let users = await new QueryBuilder(User).execute<User>(db);
        test.equal(users.length, 1);

        await db.query(sql`UPDATE user SET details_id=NULL`);
        let usersWithoutDetails = await new QueryBuilder(User).execute<User>(db);
        test.equal(usersWithoutDetails.length, 1);
    });
}
