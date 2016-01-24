
import "reflect-metadata"
import * as test from "./test-utils";

import {table, id, text, embedded} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"

class Address {
    @text()
    street: string;
    
    @text()
    number: string;
    
    @text()
    zipcode: string;
    
    @text()
    city: string;
    
    @text()
    country: string;
}

@table("student")
class Student {
    @id
    id: number;
    
    @embedded(Address, {prefix: "home_"})
    homeAddress: Address;
}

export function testBasicEmbedded() {
    testToSql(
        build(Student),`
        SELECT 
            "student".id AS "student.id", 
            "student".home_street AS "homeAddress.street", 
            "student".home_number AS "homeAddress.number", 
            "student".home_zipcode AS "homeAddress.zipcode", 
            "student".home_city AS "homeAddress.city", 
            "student".home_country AS "homeAddress.country" 
        FROM "student"
        `
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