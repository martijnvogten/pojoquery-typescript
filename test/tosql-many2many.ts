
import "reflect-metadata"
import * as test from "./test-utils";

import {table, id, text, joinOne, joinMany} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"

@table("student")
class Student {
    @id
    id: number;
    
    @text()
    name: string;
}

@table("course")
class Course {
    @id
    id: number;
    
    @text()
    title: string;
}

@table("curriculum")
class Curriculum {
    @id
    id: number;
    
    @text()
    name: string;
}

class CourseDetail extends Course {
    @joinMany(Student, {linkTable: "course_students"})
    students: Student[];
}

class CurriculumDetail extends Curriculum {
    @joinMany(CourseDetail)
    courses: CourseDetail[];
}

export function testBasicMany2Many() {
    testToSql(
        build(CourseDetail),`
        SELECT 
            "course".id AS "course.id", 
            "course".title AS "course.title", 
            "students".id AS "students.id", 
            "students".name AS "students.name" 
        FROM "course" 
            LEFT JOIN "course_students" AS "course_students" ON "course".id = "course_students".course_id
            LEFT JOIN "student" AS "students" ON "course_students".student_id = "students".id
        `
    );
}

export function testMany2ManyOneLevelDeeper() {
    testToSql(
        build(CurriculumDetail),`
        SELECT 
            "curriculum".id AS "curriculum.id", 
            "curriculum".name AS "curriculum.name", 
            "courses".id AS "courses.id", 
            "courses".title AS "courses.title", 
            "courses.students".id AS "courses.students.id", 
            "courses.students".name AS "courses.students.name" 
        FROM "curriculum" 
            LEFT JOIN "course" AS "courses" ON "curriculum".id = "courses".curriculum_id 
            LEFT JOIN "course_students" AS "courses.course_students" ON "courses".id = "courses.course_students".course_id 
            LEFT JOIN "student" AS "courses.students" ON "courses.course_students".student_id = "courses.students".id
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