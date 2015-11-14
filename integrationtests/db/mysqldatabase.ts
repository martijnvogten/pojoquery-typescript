var mysql = require("mysql");

export function sql(parts: string[], ...values: any[]): string {
	var result = parts.shift();
	values.forEach(val => {
		result += mysql.escape(val) + parts.shift();
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
	}
	
	public getConnection(): Promise<MySQLConnection> {
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
	
	public withConnection<T>(resolve: ConnectionCallback<T>, reject: (any) => void) {
		return this.pool.getConnection((error, conn) => {
			if (error) {
				console.log(error);
				reject(error);
				return;
			}
			resolve(conn);
		});
	}
	
	update(tableName: string, idcondition: Object, values: Object): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			this.withConnection(conn => {
				conn.query('UPDATE `' + tableName + '` SET ? WHERE ?', [values, idcondition], (error, values) => {
					conn.release();
					if (error) {
						console.error(`ERROR ${error}`);
						console.error(error);
						reject(error);
						return;
					}
					resolve();
				});
			}, reject);
		});
	}
	
	query<T>(sql: string, values?: any[]): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			this.withConnection(conn => {
				conn.query(sql, values, (error, values) => {
					conn.release();
					if (error) {
						console.error(`ERROR ${error}`);
						console.error(sql);
						reject(error);
						return;
					}
					resolve(values);
				});
			}, reject);
		});
	}
	
	endPool() {
		this.pool.end();
	}

}

