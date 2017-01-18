import "source-map-support/register"
import "reflect-metadata"
import * as assert from "assert";

import {SqlQuery,SqlExpression,JoinType} from "./query"
import * as meta from "./metadata"
import {table, id, joinMany, joinOne, text, FieldMeta, embedded} from "./metadata"

export interface DatabaseConnection {
    query(sql: string, params: any[]): Promise<Object[]>;
}

class IdValue {
    values: any[];
    len: number;
    
    constructor(values: any[]) {
        this.values = values;
        this.len = this.values.length;
    }
    
    equals(other: IdValue) {
        if (this.len != other.len) {
            return false;
        }
        for(let i = 0; i < this.len; i++) {
            if (this.values[i] !== other.values[i]) {
                return false;
            }
        }
        return true;
    }
}

export class TableMapping {

    public tableName: string;
    public clz: Function;
    public fields: FieldMeta[];
    
    constructor(tableName: string, clz: Function, fields: FieldMeta[]) {
        this.tableName = tableName;
        this.clz = clz;
        this.fields = fields;
    }   
}

class SimpleFieldMapping {
    public field: FieldMeta;
    
    constructor(field: FieldMeta) {
        this.field = field;
    }   
}

class Alias {
    alias: string;
    resultClass: Function;
    parentAlias: string;
    linkField: FieldMeta;
    idFields: FieldMeta[];
    isLinkedValue: boolean;
    factoryFunc: Function;

    constructor(alias: string, clz: Function, parentAlias: string, linkField: FieldMeta, idFields: FieldMeta[]) {
        this.alias = alias;
        this.resultClass = clz;
        this.parentAlias = parentAlias;
        this.linkField = linkField;
        this.idFields = idFields;
        this.factoryFunc = clz.bind(clz);
    }
}

export class QueryBuilder {
    private query: SqlQuery;
    private resultClass: Function;
    private rootAlias: string;
    private aliases = new Map<string,Alias>();
    private fieldMappings = new Map<string,SimpleFieldMapping>();
    
    constructor(clz: Function) {
        let tableMappings = this.determineTableMapping(clz);
        if (tableMappings.length == 0) {
            throw `Missing @table decorator on class ${clz.name} and all of its superclasses`;
        }
        let topMapping = tableMappings[tableMappings.length - 1];
        this.rootAlias = topMapping.tableName;
        this.resultClass = clz;
        this.query = new SqlQuery(this.rootAlias);
        
        this.addClass(this.resultClass, this.rootAlias, null, null);
    }
    
    addClass(clz: Function, alias: string, parentAlias: string, linkField: FieldMeta): void {
        this.aliases[alias] = new Alias(alias, clz, parentAlias, linkField, this.determineIdFields(clz));
        this.addFields(alias, alias, clz, null);
    }

    addFields(alias: string, fieldsAlias: string, clz: Function, superClass: Function) {
        let fields = this.collectFieldsOfClass(clz, superClass);
        
        this.collectFieldsOfClass(clz, superClass).forEach(f => {
            if (f.type == joinMany) {
                const props = f.props;
                if (props && props.linkTable) {
                    let linkTable = props.linkTable;
                    let ownMapping = this.determineTableMapping(f.declaringClass);
                    let linkField = props.linkField || this.linkFieldName(ownMapping[0].tableName);
                    let linkTableAlias = alias == this.rootAlias ? linkTable : alias + "." + linkTable;
                    let idField = this.determineIdField(f.declaringClass);
                    
                    let joinCondition  = new SqlExpression("{" + alias + "}." + idField.fieldName + " = {" + linkTableAlias + "}." + linkField)                 
                    this.query.addJoin(JoinType.LEFT, linkTable, linkTableAlias, joinCondition)
                     
                    let componentType = f.props.linkedClass;
                    
                    let foreignMapping = this.determineTableMapping(componentType);
                    let foreignIdField = this.determineIdField(componentType);
                    let foreignTable = foreignMapping[0].tableName;
                    let linkTableField = props.foreignLinkField || this.linkFieldName(foreignTable);
                    let linkAlias = alias == this.rootAlias ? f.fieldName : alias + "." + f.fieldName;
                    
                    joinCondition  = new SqlExpression("{" + linkTableAlias + "}." + linkTableField + " = {" + linkAlias + "}." + foreignIdField.fieldName)                 
                    this.query.addJoin(JoinType.LEFT, foreignTable, linkAlias, joinCondition)
                    
                    this.aliases[linkAlias] = new Alias(linkAlias, componentType, alias, f, [foreignIdField]);
                    this.addClass(componentType, linkAlias, alias, f);
                } else {
                    let componentType = f.props.linkedClass;
                    let linkAlias = this.joinMany(alias, f, componentType);
                    this.addClass(componentType, linkAlias, alias, f);
                }
            } else if (f.type == joinOne) {
                let componentType = f.props.linkedClass;
                let linkAlias = this.joinOne(alias, f, componentType);
                this.addClass(componentType, linkAlias, alias, f);
            } else if (f.type == embedded) {
                let prefix = (f.props && f.props.prefix) || "";

                let foreignalias = alias == this.rootAlias ? f.fieldName : alias + "." + f.fieldName 
                this.collectFieldsOfClass(f.props.linkedClass, null).forEach(embeddedField => {
                    this.query.addField(
                        '{' + alias + '}.' + prefix + embeddedField.fieldName,
                        foreignalias + "." + embeddedField.fieldName
                    );
                });
                this.aliases[foreignalias] = new Alias(foreignalias, f.props.linkedClass, alias, f, this.determineIdFields(f.props.linkedClass));
            } else {
                let selectExpression: string;

                if (f.props && f.props.expression) {
                    selectExpression = QueryBuilder.resolveAliases(new SqlExpression(f.props.expression), alias).sql;
                } else {
                    let fieldName = (f.props && f.props.fieldName) || f.fieldName;
                    selectExpression = "{" + alias + "}." + fieldName;
                }
                this.addField(selectExpression, fieldsAlias + "." + f.fieldName, f);
            }
        });
    }
    
    addField(expression: string, fieldAlias: string, f: FieldMeta) {
        this.fieldMappings[fieldAlias] = new SimpleFieldMapping(f);
        this.query.addField(expression, fieldAlias);
    }

    private joinOne(alias: string, f: FieldMeta, type: Function): string {
        let tableName = this.determineTableName(type);
        let linkAlias = alias == this.rootAlias ? f.fieldName : (alias + "." + f.fieldName);
        
        let joinCondition: SqlExpression = null;
        if (f.props.joinCondition != null) {
            joinCondition = QueryBuilder.resolveAliases(new SqlExpression(f.props.joinCondition), alias);
        } else {
            let idField = this.determineIdField(type);
            joinCondition = new SqlExpression("{" + alias + "}." + this.linkFieldName(f.fieldName) + " = {" + linkAlias + "}." + idField.fieldName);
        }
        this.query.addJoin(JoinType.LEFT, tableName, linkAlias, joinCondition);
        return linkAlias;
    }
    
    private joinMany(alias: string, f: FieldMeta, componentType: Function): string {
        let tableName = this.determineTableName(componentType);
        let ownMapping = this.determineTableMapping(f.declaringClass);
        let idField = this.determineIdField(f.declaringClass).fieldName;
        let linkField = (f.props && f.props.linkField) || this.linkFieldName(ownMapping[0].tableName);
        
        let joinCondition: SqlExpression = null;
        if (f.props && f.props.joinCondition) {
            joinCondition = QueryBuilder.resolveAliases(new SqlExpression(f.props.joinCondition), alias);
        }
        
        return this.joinMany2(alias, f.fieldName, tableName, idField, linkField, joinCondition);
    }

    private joinMany2(alias: string, fieldName: string, tableName: string, idField: string, linkField: string, joinCondition?: SqlExpression) {
        let linkAlias = alias == this.rootAlias ? fieldName : (alias + "." + fieldName);
        if (joinCondition == null) {
            joinCondition = new SqlExpression("{" + alias + "}." + idField + " = {" + linkAlias + "}." + linkField);
        }
        this.query.addJoin(JoinType.LEFT, tableName, linkAlias, joinCondition);
        return linkAlias;
    }
    
    static resolveAliases(sql: SqlExpression, prefixAlias: string): SqlExpression {
        return new SqlExpression(sql.sql.replace(/\{[a-zA-Z0-9_\.]+\}\./g, match => {
            let alias = match.substring(1, match.length - 2);
            let combinedAlias = "";
            if (alias == "this") {
                combinedAlias = prefixAlias;
            } else if (prefixAlias) {
                combinedAlias = prefixAlias + "." + alias;
            } else {
                combinedAlias = alias;
            }
            return '"' + combinedAlias + '".';
        }), sql.params);
    }

    linkFieldName(tableName: string) {
        return tableName + '_id';
    }
    
    determineIdField(clz: Function) {
        return this.determineIdFields(clz)[0];
    }
    
    determineIdFields(clz: Function) {
        let fields = this.collectFieldsOfClass(clz, null);
        return fields.filter(f => f.isIdField);
    }
    
    determineTableName(clz: Function) {
        return this.determineTableMapping(clz).pop().tableName;
    }

    addWhere(sql: string, ...params: any[]): QueryBuilder {
        this.query.addWhere(new SqlExpression(sql, params));
        return this;
    }
    
    addOrderBy(fieldName: string, ascending: boolean): QueryBuilder {
        this.query.addOrderBy(fieldName, ascending);
        return this;
    }

    setLimit(maxRows: number, startIndex?: number): QueryBuilder {
        this.query.setLimit(maxRows);
        if (startIndex > -1) {
            this.query.setStartIndex(startIndex);
        }
        return this;
    }
    
    toSql() {
        let sqlExpr = this.query.toSqlExpression();
        return sqlExpr.sql;
    }
    
    execute<R>(db: DatabaseConnection, params?: any[]): Promise<R[]> {
        let sqlExpr = this.query.toSqlExpression();
        return db.query(sqlExpr.sql, sqlExpr.params).then(rows => {
            return this.processRows(rows) as R[]
        });
    }

    queryLimitedList<R>(db: DatabaseConnection, maxResults: number, startIndex?: number): Promise<R[]> {
        let idQuery = new SqlQuery(this.query.getTableName());
        let idFields = this.determineIdFields(this.resultClass);
        if (idFields.length > 1) {
            throw `Cannot run id query on table ${this.query.getTableName()} because it has multiple ID fields`;
        }
        idQuery.addField("DISTINCT \"" + this.query.getTableName() + "\"." + idFields[0].fieldName, "_id");
        idQuery.setJoins(this.query.getJoins());
        idQuery.setOrderBys(this.query.getOrderBys());
        idQuery.setWheres(this.query.getWheres());
        idQuery.setLimit(maxResults);
        if (startIndex) {
            idQuery.setStartIndex(startIndex);
        }
        return db.query(idQuery.toSqlExpression().sql, [])
        .then(rows => {
            let ids = rows.map(row => row["_id"]);
            if (ids.length == 0) {
                return [];
            }
            this.query.addWhere(new SqlExpression("\"" + this.query.getTableName() + "\"." + idFields[0].fieldName + " IN (?)", [ids]));
            return this.execute(db);
        })
    }
    
    querySingleRow<R>(db: DatabaseConnection): Promise<R> {
        return this.execute(db).then(entities => entities[0] as R);
    }
    
    determineTableMapping(clz: Function): TableMapping[] {
        let mappedClz = clz;
        let tables: TableMapping[] = [];
        let fields: FieldMeta[] = [];
        
        while (clz != null) {
            if (mappedClz == null) {
                mappedClz = clz;
            }
            let tableName = meta.getTable(clz);
            fields = fields.concat(this.collectFieldsOfClass(clz, this.getSuperclass(clz)));
            if (tableName != null) {
                tables.unshift(new TableMapping(tableName, mappedClz, fields));
                fields = [];
                mappedClz = null;
            }
            clz = this.getSuperclass(clz);
        }
        if (fields.length > 0 && tables.length > 0) {
            tables[0].fields = tables[0].fields.concat(fields);
        }
        return tables;
    }
    
    collectFieldsOfClass(clz: Function, stopAtSuperClass: Function): FieldMeta[] {
        let result: FieldMeta[] = [];
        while(clz != null && clz != stopAtSuperClass) {
            result = this.filterFields(clz).concat(result);
            clz = this.getSuperclass(clz);
        }
        return result;
    }
    
    filterFields(clz: Function): FieldMeta[] {
        return meta.getFields(clz);
    }
    
    getSuperclass(clz: Function): Function {
        if (!clz.prototype) {
            return null;
        }
        let proto = Object.getPrototypeOf(clz.prototype);
        if (!proto) {
            return null;
        }
        return proto.constructor;
    }
    
    processRows<R>(rows: Object[]): R[] {
        let result: R[] = [];
        let allEntities: {id: IdValue, entity: Object}[] = [];
        
        for(let row of rows) {
            let onThisRow = this.collectValuesByAlias(row);
            for(let aliasName in this.aliases) {
                let a = this.aliases[aliasName];
                
                let values = onThisRow[a.alias];
                if (this.allNulls(values)) {
                    continue;
                }
                
                let id = this.createId(a.alias, values, a.idFields);
                
                if (a.parentAlias == null) {
                    // Primary 
                    
                    if (allEntities.filter(entry => entry.id.equals(id)).length == 0) {
                        let entity = this.buildEntityFromValues(a.factoryFunc, values, aliasName) as R;
                        allEntities.push({id, entity});
                        result.push(entity);
                    }
                } else {
                    
                    // Find the parent
                    let parentValues = onThisRow[a.parentAlias];
                    let parentId = this.createId(a.parentAlias, parentValues, this.aliases[a.parentAlias].idFields);
                    let parent = allEntities.filter(entry => entry.id.equals(parentId))[0].entity;
                    
                    // Linked entity
                    let entityEntry = allEntities.filter(entry => entry.id.equals(id))[0];
                    let entity;
                    if (!entityEntry) {
                        entity = this.buildEntityFromValues(a.factoryFunc, values, aliasName);
                        allEntities.push({id, entity});
                    } else {
                        entity = entityEntry.entity;
                    }
                    
                    let targetFieldName = a.linkField.fieldName;
                    if (a.linkField.type == joinMany) {
                        if (!parent[targetFieldName]) {
                            parent[targetFieldName] = [];
                        }
                        if (parent[targetFieldName].indexOf(entity) == -1) {
                            parent[targetFieldName].push(entity);
                        }
                    } else {
                        parent[targetFieldName] = entity;
                    }
                }
            };
        };
        return result;
    }
    
    buildEntityFromValues<R>(factoryFunc: any, values: Object, aliasName: string): R {
        let result = new factoryFunc();

        Object.keys(values).forEach(key => {
            let prop = key.substring(aliasName.length + 1);
            result[prop] = values[key];
        })
        return result as R;
    }
    
    collectValuesByAlias(row: Object): Object {
        let result = {};
        for(let alias in this.aliases) {
            let values = this.getAliasValues(row, alias);
            result[alias] = values;
        }
        return result;
    }
    
    getAliasValues(row: Object, alias: string) {
        let result = {};
        Object.keys(row).forEach(key => {
            let dotPos = key.lastIndexOf(".");
            if (alias == key.substring(0, dotPos)) {
                result[key] = row[key];
            }
        });
        return result;
    }
    
    allNulls(values: Object) {
        for(var key in values) {
            if (values[key] !== null) {
                return false;
            }
        }
        return true;
    }
    
    private createId(alias: string, values: Object, idFields: FieldMeta[]): IdValue {
        let params = [];
        idFields.forEach(f => {
            params.push(values[alias + "." + f.fieldName]);
        });
        return new IdValue([alias].concat(params));
    }
}


