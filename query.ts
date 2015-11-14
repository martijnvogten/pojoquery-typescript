import * as meta from './metadata'
import {QueryBuilder} from './pojoquery'

export class SqlExpression {
	sql: string;
	params: any[];
	
	constructor(sql: string, params?: any[]) {
		this.sql = sql;
		this.params = params;
	}
	
	toSql() {
		return this.sql;
	}
	
	static implode(glue: string, expressions: SqlExpression[]): SqlExpression {
		let sqlParts: string[] = [];
		let params: any[] = [];
		expressions.forEach(part => {
			sqlParts.push(part.sql);
			params = params.concat(part.params);
		});
		return new SqlExpression(sqlParts.join(glue), params);
	}
};

export class SqlField {
	expression: SqlExpression;
	alias: string;
}

export class JoinType {
	static LEFT = new JoinType("LEFT");
	static RIGHT = new JoinType("RIGHT");
	static INNER = new JoinType("INNER");
	
	private sql: string;
	
	constructor(sql: string) {
		this.sql = sql;
	}
	
	getSql(): string {
		return this.sql;
	}
}

interface SqlJoin {
	joinType: JoinType;
	table: string;
	alias: string;
	joinCondition: SqlExpression;
}

export class SqlQuery {
	private tableName: string;
	private joins: SqlJoin[] = [];
	private fields: SqlField[] = [];
	private wheres: SqlExpression[] = [];
	
	constructor(tableName: string) {
		this.tableName = tableName;
	}
	
	addField(sql: string, fieldAlias: string) {
		this.fields.push({expression: new SqlExpression(sql), alias: fieldAlias});
	}
	
	addWhere(where: SqlExpression) {
		this.wheres.push(where);
	}
	
	addJoin(joinType: JoinType, table: string, alias: string, joinCondition: SqlExpression) {
		this.joins.push({joinType, table, alias, joinCondition});
	}
	
	toSql() {
		let fields = SqlExpression.implode(",\n ", this.fields.map(field => {
			if (field.alias == null) {
				return field.expression;
			} else {
				let resolved = QueryBuilder.resolveAliases(field.expression, "");
				let sql = resolved.sql + ' AS "' + field.alias + '"';
				return new SqlExpression(sql, resolved.params);
			}
		}));

		let joinExpressions = this.joins.map(j => {
			let sql = j.joinType.getSql() + " JOIN " + j.table + " AS \"" + j.alias + "\"";
			let resolved = QueryBuilder.resolveAliases(j.joinCondition, "");
			if (j.joinCondition != null) {
				sql += " ON " + resolved.sql;
			}
			return new SqlExpression(sql, resolved.params);
		});
		let joinsClause = SqlExpression.implode("\n ", joinExpressions);
		
		let wheres = this.wheres.map(w => w.toSql()).join(" AND ");
		return [
			"SELECT\n",
			fields.sql,
			"FROM\n",
			this.tableName,
			joinsClause.sql,
			wheres.length && "WHERE " + wheres, 
		].filter(it => !!it).join(' ');
	}
}

