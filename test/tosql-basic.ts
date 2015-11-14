import "reflect-metadata"
import * as test from "./test-utils";

import {table, id, text, joinOne, joinMany} from "../metadata"
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"

@table("user")
class User {
	@id
	id: string;
	
	@text()
	email: string;
}

@table("article")
class Article {
	@id
	id: number;
	
	@text()
	title: string;
}

@table("comment")
class Comment {
	@id
	id: number;
	
	@text()
	comment: string;
}

class CommentDetail extends Comment {
	@joinOne(User)
	author: User;
}

class ArticleDetail extends Article {
	@joinMany(Comment)
	comments: Comment[];
}

class ArticleDetailWithCommentAuthors extends Article {
	@joinMany(CommentDetail)
	comments: CommentDetail[];
}

export function simpleQuery() {
	testToSql(
		build(User), 
		`SELECT "user".id AS "user.id", "user".email AS "user.email" FROM user`
	);
}
	
export function simpleWhereClause() {
	testToSql(
		build(User).addWhere("id = ?", 1),
		`SELECT "user".id AS "user.id", "user".email AS "user.email" FROM user WHERE id = ?`
	);
}
	
export function simpleArticleQuery() {
	testToSql(
		build(Article), 
		`SELECT "article".id AS "article.id", "article".title AS "article.title" FROM article`
	);
}
export function atricleDetail() {
	testToSql(
		build(ArticleDetail), `
		SELECT 
			"article".id AS "article.id", 
			"article".title AS "article.title",
			"comments".id AS "comments.id", 
			"comments".comment AS "comments.comment" 
		FROM article 
			LEFT JOIN comment AS "comments" ON "article".id = "comments".article_id`
	);
}
	
export function atricleDetailWithAuthors() {
	testToSql(
		build(ArticleDetailWithCommentAuthors),
		`SELECT 
			"article".id AS "article.id", 
			"article".title AS "article.title", 
			"comments".id AS "comments.id", 
			"comments".comment AS "comments.comment", 
			"comments.author".id AS "comments.author.id", 
			"comments.author".email AS "comments.author.email" 
		FROM article 
			LEFT JOIN comment AS "comments" ON "article".id = "comments".article_id 
			LEFT JOIN user AS "comments.author" ON "comments".author_id = "comments.author".id`
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