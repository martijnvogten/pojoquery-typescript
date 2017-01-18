import * as test from "../test/test-utils";

import {table, id, text, number, joinOne, joinMany} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"
import {sql,MySQLDatabase} from "./db/mysqldatabase"
import * as testdb from "./testdb"

@table("orderstatuschange")
class OrderStatusChange {
    @id
    id: string;
    
    @text()
    status: string;
}

@table("orderitem")
class OrderItem {
    @id
    id: string;
    
    @text()
    product: string;
    
    @number()
    price: number;
}

@table("order")
class Order {
    @id
    id: string;
    
    @joinMany(OrderItem)
    orderItems: OrderItem[];
    
    @joinMany(OrderStatusChange)
    changes: OrderStatusChange[];
}

export function joinManyDouble(): Promise<void> {
    return testdb.withEmptyDatabase(async (db) => {
        await createTablesAndInsertData(db);
        await createOrder(db);
        
        let orders = await new QueryBuilder(Order).execute<Order>(db);
        test.equal(orders.length, 1);
        
        let order = orders[0];
        
        test.equal(order.changes.length, 3);
        test.equal(order.orderItems.length, 2);
    });
}

export function testLimitWithJoins(): Promise<void> {
    return testdb.withEmptyDatabase(async (db) => {
        await createTablesAndInsertData(db);
        await createOrder(db);
        await createOrder(db);

        let orders = await new QueryBuilder(Order).execute<Order>(db);
        test.equal(orders.length, 2);

        let limited = await new QueryBuilder(Order).queryLimitedList<Order>(db, 1);
        test.equal(limited.length, 1);
    });
}

async function createTablesAndInsertData(db: MySQLDatabase): Promise<void> {
    await db.query("CREATE TABLE `order` (id INT NOT NULL AUTO_INCREMENT, PRIMARY KEY(id))");
    await db.query("CREATE TABLE `orderitem` (id INT NOT NULL AUTO_INCREMENT, order_id INT NOT NULL, product VARCHAR(190), price DECIMAL, PRIMARY KEY(id))");
    await db.query("CREATE TABLE `orderstatuschange` (id INT NOT NULL AUTO_INCREMENT, order_id INT NOT NULL, status VARCHAR(190), PRIMARY KEY(id))");
}

async function createOrder(db: MySQLDatabase): Promise<number> {
    let orderId = (await db.query("INSERT INTO `order` () VALUES ()"))['insertId'];
    await db.query(sql`INSERT INTO orderitem (order_id, product, price) VALUES (${orderId}, 'book', 15.0)`);
    await db.query(sql`INSERT INTO orderitem (order_id, product, price) VALUES (${orderId}, 'agenda', 7.5)`);
    
    await db.query(sql`INSERT INTO orderstatuschange (order_id, status) VALUES (${orderId}, 'PAID')`);
    await db.query(sql`INSERT INTO orderstatuschange (order_id, status) VALUES (${orderId}, 'SHIPPED')`);
    await db.query(sql`INSERT INTO orderstatuschange (order_id, status) VALUES (${orderId}, 'DELIVERED')`);
    return orderId;
}