import {MySQLDatabase} from "./db/mysqldatabase"

function getDb(schema?: string): MySQLDatabase {
    return new MySQLDatabase("127.0.0.1", "root", "", schema);
}

export async function withEmptyDatabase(callback: (db: MySQLDatabase) => void) {
    let db = getDb();
    try {
		await db.withConnection(async (conn) => {
            await conn.query("DROP DATABASE IF EXISTS `pojoquery_test`");
            await conn.query("CREATE DATABASE `pojoquery_test` DEFAULT CHARSET utf8");
        });
        let testDb = getDb("pojoquery_test");
        try {
            await callback(testDb);
        } finally {
            testDb.endPool();
        }
    } finally {
        db.endPool();
    }
}
