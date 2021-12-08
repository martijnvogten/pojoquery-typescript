import "reflect-metadata";
import { id, joinMany, joinOne, number, table, text } from "../metadata";
import { QueryBuilder } from "../pojoquery";
import * as test from "./test-utils";

@table("tag")
class Tag {
	// @text()
	// entityClass: string;

	// @number()
	// entityId: number;

	@text()
	tag: string;
}

@table("department")
class Department {
	@id
	department_id: number;

    @joinMany(() => Tag, {
		joinCondition: `{tag}.entity_id = {this}.department_id AND {tag}.entity_type = 'department'` })
	tags: Tag[];
}

@table("employee")
class Employee {
	@id
	employee_id: number;

    @joinMany(() => Tag, {
		joinCondition: `{tag}.entity_id = {this}.employee_id AND {tag}.entity_type = 'employee'` })
	tags: Tag[];

	@text()
	name: string;

	@joinOne(Department)
	department: Department;
}

export function testTags() {

}

export function testSimpleDepartmentEmployeeJoinCondition() {
	console.log(build(Employee).toSql());
	testToSql(
        build(Employee),
		`
		SELECT
		"employee".employee_id AS "employee.employee_id",
		"tags".tag AS "tags.tag",
		"employee".name AS "employee.name",
		"department".department_id AS "department.department_id",
		"department.tags".tag AS "department.tags.tag"
		FROM "employee"
		LEFT JOIN "tag" AS "tags" ON "employee.tag".entity_id = "employee".employee_id AND "employee.tag".entity_type = 'employee'
		LEFT JOIN "department" AS "department" ON "employee".department_id = "department".department_id
		LEFT JOIN "tag" AS "department.tags" ON "department.tag".entity_id = "department".department_id AND "department.tag".entity_type = 'department'
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