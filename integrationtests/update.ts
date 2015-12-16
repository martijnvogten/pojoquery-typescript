import "source-map-support/register"
import {MySQLDatabase} from "./db/mysqldatabase"
import {text,id,timestamp} from "../metadata"

class User {
	@id
	id: number;
	
	@text()
	username: string;
	
	@text()
	email: string;
}

class UserRecord extends User {
	@text()
	password: string;
	
	@timestamp()
	created_at: Date;
	
	@timestamp()
	updated_at: Date;
}

async function testTransactions() {
	const db = new MySQLDatabase("127.0.0.1", "root", "");
	try {
		await db.withConnection(async (conn) => {
			await conn.query("DROP DATABASE IF EXISTS `pojoquery_test`");
			await conn.query("CREATE DATABASE `pojoquery_test` DEFAULT CHARSET utf8");
			await conn.query("USE pojoquery_test");
			await conn.query("CREATE TABLE test (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))");
		});
		await db.runInTransaction(async (transaction) => {
			await transaction.query("USE pojoquery_test");
			await transaction.query("INSERT INTO test SET ?", [{name: "Henk"}]);
			await transaction.query("INSERT INTO test SET ?", [{name: "Piet"}]);
		});
	} catch(e) {
		console.log("Got error", e);
	} finally {
		db.endPool();
	}
}

testTransactions();