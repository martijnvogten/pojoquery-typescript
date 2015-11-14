import "source-map-support/register"
import {MySQLDatabase} from "./db/mysqldatabase"

let db = new MySQLDatabase("127.0.0.1", "root", "");

function q(sql: string, ...params: any[]) {
	return (conn: mysql.IConnection) => {
		console.log("Running query: ", sql);
		return new Promise<mysql.IConnection>((resolve, reject) => {
			conn.query(sql, params, (err, ...args) => {
				if (err) {
					reject(err);
					return;
				}
				resolve(conn);
			});
		});
	};
}

function inTransaction(conn: mysql.IConnection, sql: string, ...params: any[]): Promise<any> {
	return new Promise<any>((resolve, reject) => {
		console.log("Running query: ", sql);
		conn.query(sql, params, (err, values) => {
			if (err) {
				reject(err);
				return;
			}
			resolve(values);
		});
	});
}

async function migrate() {
	let conn = await db.getConnection();
	await conn.query("DROP DATABASE IF EXISTS `pojoquery_test`");
	await conn.query("CREATE DATABASE `pojoquery_test` DEFAULT CHARSET utf8");
}


db.getConnection()
.then(q("DROP DATABASE IF EXISTS `pojoquery_test`"))
.then(q("CREATE DATABASE `pojoquery_test` DEFAULT CHARSET utf8"))
.then(q("USE pojoquery_test"))
.then(q("CREATE TABLE test (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))"))
.then(q("INSERT INTO test SET ?", {name: "Henk"}))
.then(conn => new Promise<mysql.IConnection>((resolve, reject) => {
	inTransaction(conn, "SELECT * FROM test")
	.then(values => console.log("Got values", values))
	.then(() => resolve(conn))
	.catch(error => reject(error));
}))
.then(conn => conn.release())
.then(() => console.log("Everything went well"))
.catch(e => console.log("Caught something!", e))
.then(() => db.endPool()); // Then after the catch acts as a finally block..!