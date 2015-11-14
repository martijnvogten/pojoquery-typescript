import * as test from "./test-utils";
import {QueryBuilder} from "../pojoquery"
import {SqlExpression} from "../query"
import {table, id, text, joinOne} from "../metadata"

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

class ArticleDetail extends Article {
	@joinOne(User)
	author: User;
}

export function getSuperclass() {
	test.equal(new QueryBuilder(User).getSuperclass(ArticleDetail), Article, "getSuperclass");
}
	
export function tableMapping() {
	let mapping = new QueryBuilder(User).determineTableMapping(ArticleDetail)
	test.equal(mapping.length, 1, "One table");
	test.equal(mapping[0].fields.length, 3, "Three fields");
}
	
export function resolveAliases() {
	test.equal(QueryBuilder.resolveAliases(new SqlExpression("{this}.name"), "user").sql, "`user`.name", "resolveSimple");			
	test.equal(QueryBuilder.resolveAliases(new SqlExpression("{author}.name"), "user").sql, "`user.author`.name", "resolveSimple");			
}
	
