import "reflect-metadata"
import * as test from "./test-utils";

import {table, number, id, text, joinOne, joinMany} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"

@table("orderitem")
class OrderItem {
    @id
    id: string;
    
    @number({expression: "{this}.quantity * {this}.unitPrice"})
    totalPrice: number;
    
    @number()
    quantity: number;
    
    @number()
    unitPrice: number;
}

export function simpleExpression() {
    testToSql(
        build(OrderItem), 
        `SELECT 
            "orderitem".id AS "orderitem.id", 
            "orderitem".quantity * "orderitem".unitPrice AS "orderitem.totalPrice", 
            "orderitem".quantity AS "orderitem.quantity", 
            "orderitem".unitPrice AS "orderitem.unitPrice" 
        FROM "orderitem"`
    );
}

function testToSql(query: QueryBuilder, expectedSql: string) {
    test.equal(norm(query.toSql()), norm(expectedSql));
}

function norm(sql: string) {
    return sql.trim().replace(/\s+/g, " ");
}

function build(clz: Function): QueryBuilder {
    return new QueryBuilder(clz);
}