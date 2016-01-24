import * as testdb from "./testdb"
import * as test from "../test/test-utils"

export function testRollback(): Promise<void> {
    return testdb.withEmptyDatabase(async (db) => {
        await db.query("CREATE TABLE test (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(255) NOT NULL, PRIMARY KEY(id))");
        try {
            await db.runInTransaction(async (transaction) => {
                await transaction.query("INSERT INTO test SET ?", [{name: "Henk"}]);
                let rows = await transaction.query("SELECT COUNT(*) as the_count FROM test");
                test.equal(rows[0]['the_count'], 1, "rowcount before exception should be 1");
                throw "Testing exceptions";
            });
        } catch (e) {
            test.equal(e, "Testing exceptions");
        }
        let rows = await(db.query("SELECT COUNT(*) as the_count FROM test"));
        test.equal(rows[0]['the_count'], 0); 
    });
}