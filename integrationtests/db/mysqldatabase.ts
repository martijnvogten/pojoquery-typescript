var mysql = require("mysql");

export function sql(parts: string[], ...values: any[]): string {
    let index = 0;
    var result = parts[index++];
    values.forEach(val => {
        result += mysql.escape(val) + parts[index++];
    });
    return result;
}

export interface ConnectionCallback<T> {
    (param: mysql.IConnection): T;
}

export class MySQLConnection {
    private conn: mysql.IConnection;
    
    constructor(conn: mysql.IConnection) {
        this.conn = conn;
    }
    
    beginTransaction(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.conn.beginTransaction(err => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        });
    }
    
    query<T>(sql: string, params?: any[]): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.conn.query(sql, params, (error, values) => {
                if (error) {
                    console.error(`ERROR ${error}`);
                    console.error(sql);
                    reject(error);
                    return;
                }
                resolve(values);
            });
        });
    }
    
    commit(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.conn.commit((err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        });
    }
    
    rollback(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.conn.rollback(() => {
                resolve();
            })
        });
    }
    
    release() {
        this.conn.release();
    }
}

export class MySQLDatabase {
    
    private pool: mysql.IPool; 
    
    constructor(host: string, user: string, password: string, database?: string) {
        this.pool = mysql.createPool({host, user, password, database});
        this.pool.on('connection', function (connection) {
            connection.query(`SET SESSION sql_mode='ANSI_QUOTES'`);
        });
    }
    
    private getConnection(): Promise<MySQLConnection> {
        return new Promise<MySQLConnection>((resolve, reject) => {
            this.pool.getConnection((error, conn) => {
                if (error) {
                    console.log(error);
                    reject(error);
                    return;
                }
                resolve(new MySQLConnection(conn));
            });
        });
    }
    
    public async runInTransaction<T>(callback: (conn: MySQLConnection) => Promise<T>): Promise<T> {
        let conn = await this.getConnection();
        try {
            await conn.beginTransaction();
            let result = await callback(conn);
            await conn.commit();
            return result;
        } catch (e) {
            await conn.rollback();
            throw e;
        } finally {
            conn.release();
        }
    }

    public async withConnection<T>(callback: (conn: MySQLConnection) => Promise<T>): Promise<T> {
        let conn = await this.getConnection();
        try {
            return await callback(conn);
        } finally {
            conn.release();
        }
    }

    /** Auto-commit */
    public async update(tableName: string, idcondition: Object, values: Object): Promise<void> {
        return this.withConnection(conn => 
            conn.query<void>('UPDATE `' + tableName + '` SET ? WHERE ?', [values, idcondition])
        );
    }
    
    /** Auto-commit */
    public query<T>(sql: string, values?: any[]): Promise<T> {
        return this.withConnection(conn => conn.query<T>(sql, values));
    }
    
    endPool() {
        this.pool.end();
    }

}

