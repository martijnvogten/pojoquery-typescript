import * as meta from './metadata'
import {QueryBuilder} from './pojoquery'

export type Implodable = SqlExpression | string;

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
    
    static implode(glue: string, expressions: Implodable[]): SqlExpression {
        let sqlParts: string[] = [];
        let params: any[] = [];
        expressions.forEach(part => {
            if (part instanceof SqlExpression) {
                sqlParts.push(part.sql);
                if (part.params) {
                    params = params.concat(part.params);
                }
            } else {
                sqlParts.push(part);
            }
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

export interface SqlJoin {
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
    private orderBys: SqlExpression[] = [];
    private limit: number = -1;
    private startIndex: number = -1;
    
    constructor(tableName: string) {
        this.tableName = tableName;
    }
    
    getTableName(): string {
        return this.tableName;
    }

    addField(sql: string, fieldAlias: string) {
        this.fields.push({expression: new SqlExpression(sql), alias: fieldAlias});
    }

    setFields(fields: SqlField[]): void {
        this.fields = fields;
    }

    getFields(): SqlField[] {
        return this.fields;
    }
    
    addWhere(where: SqlExpression) {
        this.wheres.push(where);
    }

    setWheres(wheres: SqlExpression[]): void {
        this.wheres = wheres;
    }

    getWheres(): SqlExpression[] {
        return this.wheres;
    }

    addOrderBy(fieldName: string, ascending: boolean) {
        this.orderBys.push(new SqlExpression(fieldName + ' ' + (ascending ? "ASC" : "DESC")));
    }

    setOrderBys(orderBys: SqlExpression[]): void {
        this.orderBys = orderBys;
    }

    getOrderBys(): SqlExpression[] {
        return this.orderBys;
    }

    setLimit(maxRows: number) {
        this.limit = maxRows;
    }
    
    setStartIndex(index: number) {
        this.startIndex = index;
    }
    
    addJoin(joinType: JoinType, table: string, alias: string, joinCondition: SqlExpression) {
        this.joins.push({joinType, table, alias, joinCondition});
    }

    setJoins(joins: SqlJoin[]): void {
        this.joins = joins;
    }

    getJoins(): SqlJoin[] {
        return this.joins;
    }
    
    toSqlExpression(): SqlExpression {
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
            let sql = j.joinType.getSql() + ' JOIN "' + j.table + '" AS "' + j.alias + '"';
            let resolved = QueryBuilder.resolveAliases(j.joinCondition, "");
            if (j.joinCondition != null) {
                sql += " ON " + resolved.sql;
            }
            return new SqlExpression(sql, resolved.params);
        });
        
        
        let clauses: Implodable[] = ["SELECT\n", fields, "FROM\n", '"' + this.tableName + '"'];
        
        if (joinExpressions.length) {
            let joinsClause = SqlExpression.implode("\n ", joinExpressions);
            clauses.push(joinsClause);
        }
        
        if (this.wheres.length) {
            clauses.push("WHERE");
            clauses.push(SqlExpression.implode(' AND ', this.wheres));
        }
        
        if (this.orderBys.length) {
            clauses.push("ORDER BY");
            clauses.push(SqlExpression.implode(', ', this.orderBys));
        }

        if (this.startIndex > -1 && this.limit > -1) {
            clauses.push("LIMIT " + this.startIndex + ", " + this.limit);
        } else if (this.limit > -1) {
            clauses.push("LIMIT " + this.limit);
        }
        
        return SqlExpression.implode(' ', clauses);
    }
}

