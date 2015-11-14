import "source-map-support/register"
import {MySQLDatabase} from "./db/mysqldatabase"

let db = new MySQLDatabase("127.0.0.1", "root", "");

async function migrate() {
	let conn = await db.getConnection();
	try {
		await conn.query("DROP DATABASE IF EXISTS `pojoquery_test`");
		await conn.query("CREATE DATABASE `pojoquery_test` DEFAULT CHARSET utf8");
		await conn.query("USE pojoquery_test");
		await conn.query("CREATE TABLE test (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))");
		await conn.beginTransaction();
		await conn.query("INSERT INTO test SET ?", [{name: "Henk"}]);
		await conn.commit();
		let values = await conn.query("SELECT * FROm test");
		console.log("Got result", values);
	} catch(e) {
		console.log("Got error", e);
		await conn.rollback();
	} finally {
		db.endPool();
	}
}

migrate();