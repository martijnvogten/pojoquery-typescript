
const METAKEY_TABLE = "pojoquery.table";
const METAKEY_FIELDS = "pojoquery.fields";


declare namespace Reflect {
	function getOwnMetadata(key: string, target: any): any;
	function defineMetadata(key: string, value: any, target: any);
}


export const getFields: (target: any) => FieldMeta[] = lazyMetadata.bind(null, METAKEY_FIELDS, () => []);
export const getTable: (target: any) => string = lazyMetadata.bind(null, METAKEY_TABLE, () => null);

export function lazyMetadata<T>(key: string, initialValue: () => T, target: any): T {
	let metadata = Reflect.getOwnMetadata(key, target); 
	if (metadata === undefined) {
		let val = initialValue();
		Reflect.defineMetadata(key, val, target);
		return val;
	}
	return metadata;
}

export function table(tableName: string) {
	return (targetConstructor: Function) => {
		Reflect.defineMetadata(METAKEY_TABLE, tableName, targetConstructor);
	};
}

export interface FieldMetaProps {
	expression?: string;
	fieldName?: string;
	linkField?: string;
	linkedClass?: Function;
	joinCondition?: string;
}

export interface FieldMeta {
	declaringClass: Function;
	fieldName: string;
	isIdField?: boolean;
	type: Function;
	props: FieldMetaProps;
}


export function id(target: any, key: string) {
	var constructor = target.constructor;
	var fields = getFields(constructor);
	fields.push({declaringClass: constructor, fieldName: key, type: id, isIdField: true, props: {}});
}

export function text(props?: FieldMetaProps) {
	return function field(target: any, key: string) {
		var fields = getFields(target.constructor);
		fields.push({declaringClass: target.constructor, fieldName: key, type: text, props: props});
	}
}

export function foreignId(props?: FieldMetaProps) {
	return function field(target: any, key: string) {
		var fields = getFields(target.constructor);
		fields.push({declaringClass: target.constructor, fieldName: key, type: foreignId, props: props || {}});
	}
}

export function joinMany(linkedClass: Function, props?: FieldMetaProps) {
	props = props || {};
	props.linkedClass = linkedClass;
	return function field(target: any, key: string) {
		var fields = getFields(target.constructor);
		fields.push({declaringClass: target.constructor, fieldName: key, type: joinMany, props: props});
	}
}

export function timestamp(props?: FieldMetaProps) {
	return function field(target: any, key: string) {
		var fields = getFields(target.constructor);
		fields.push({declaringClass: target.constructor, fieldName: key, type: timestamp, props: props || {}});
	}
}

export function joinOne(linkedClass: Function, props?: FieldMetaProps) {
	props = props || {};
	props.linkedClass = linkedClass;
	return function field(target: any, key: string) {
		var fields = getFields(target.constructor);
		fields.push({declaringClass: target.constructor, fieldName: key, type: joinOne, props});
	}
}
