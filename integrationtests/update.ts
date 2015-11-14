import "source-map-support/register"
import {MySQLDatabase} from "./db/mysqldatabase"

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