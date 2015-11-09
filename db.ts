var mysql = require("mysql");
var pool = mysql.createPool({host: '127.0.0.1', user: "root", password: "", database: 'riantis'});

export function getConnection() {
	return new Promise<mysql.IConnection>((resolve, reject) => {
		return pool.getConnection((error, conn) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(conn);
			conn.release();
		});
	});
}

export function sql(parts: string[], ...values: any[]): string {
	var result = parts.shift();
	values.forEach(val => {
		result += mysql.escape(val) + parts.shift();
	});
	return result;
}

export function update(tableName: string, idcondition: any, properties: any): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		getConnection()
		.then(conn => {
			conn.query('UPDATE `' + tableName + '` SET ? WHERE ?', [properties, idcondition], (error, values) => {
				if (error) {
					console.error(`ERROR ${error}`);
					console.error(sql);
					reject(error);
					return;
				}
				resolve();
			});
		});
	});
}

export function query<T>(sql: string, values?: any[]): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		getConnection()
		.then(conn => {
			conn.query(sql, values, (error, values) => {
				if (error) {
					console.error(`ERROR ${error}`);
					console.error(sql);
					reject(error);
					return;
				}
				resolve(values);
			});
		});
	});
}
