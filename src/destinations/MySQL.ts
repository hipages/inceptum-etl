import * as fs from 'fs';
import * as moment from 'moment';
import { join as joinPath } from 'path';
import { LogManager } from 'inceptum';
import { DBClient, DBTransaction } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestination } from '../EtlDestination';
import { S3Bucket } from './S3Bucket';

const log = LogManager.getLogger();

export interface MysqlQueryHelper {
    queryText: string,
    maskText?: string,
    queryValues: Array<string | number>,
    onDuplicate: string,
}

export interface MysqlQueryBuilderHelper {
    query: string,
    queryValues: Array<string | number>,
}

export interface MySqlInsertResult {
    fieldCount: number,
    affectedRows: number,
    insertId: number,
    serverStatus: number,
    warningCount: number,
    message: string,
    protocol41: boolean,
    changedRows: number,
}

export interface MySqlUpdateResult {
    fieldCount: number,
    affectedRows: number,
    insertId: number,
    serverStatus: number,
    warningCount: number,
    message: string,
    protocol41: boolean,
    changedRows: number,
}

export interface MySqlDeleteResult {
    fieldCount: number,
    affectedRows: number,
    insertId: number,
    serverStatus: number,
    warningCount: number,
    message: string,
    protocol41: boolean,
    changedRows: number,
}

export interface MySQLConfig {
    tableName: string,
    bulkDeleteMatchFields: Array<string>,
}

export class MySQL extends EtlDestination {
    protected mySqlClient: DBClient;
    protected etlName: string;
    protected tableName: string;
    protected bulkDeleteMatchFields: Array<string>;

    /**
     * Upload data to MySQL database table
     */
    constructor(mySqlClient: DBClient, config: MySQLConfig) {
        super();
        this.mySqlClient = mySqlClient;
        this.tableName = config.tableName;
        this.bulkDeleteMatchFields = config.bulkDeleteMatchFields;
    }

    /**
     * Stores the batch records in a file
     * @param batch
     */
    public async store(batch: EtlBatch): Promise<void> {
        try {
            await this.processRecords(batch);
            log.debug(`finish uploading: ${batch.getBatchNumber()}`);
        } catch (error) {
            await batch.setState(EtlState.ERROR);
            throw(error);
        }
    }

    public async processRecords(batch: EtlBatch): Promise<boolean> {
        const fieldList = batch.getTransformedRecords().map( (record) => record.getTransformedData() );
        return await this.mySqlClient.runInTransaction(false, async (transaction: DBTransaction) => {
            return await this.processRecordInTransaction(fieldList, transaction);
        });
    }

    public async processRecordInTransaction(fieldList: Array<Object>, transaction: DBTransaction): Promise<void> {
        // Delete existing values
        if (this.bulkDeleteMatchFields) {
            const deleteHelper = this.getQueryToDeleteRows(fieldList, this.bulkDeleteMatchFields);
            const deleted = await transaction.query(deleteHelper.query, ...deleteHelper.queryValues);
        }

        // Run the insert
        const mysqlHelper = this.getQueryToAddMultipleRows(fieldList);
        const stored = await transaction.query(mysqlHelper.query, ...mysqlHelper.queryValues);
        log.debug(`Updated table : ${this.tableName}`);
    }

    /**
     * Add multiple rows into a table
     * @param {Array<Object>} fieldsToInsert
     * @returns {MysqlQueryBuilderHelper}
     */
    public getQueryToAddMultipleRows(fieldsToInsert: Array<object>): MysqlQueryBuilderHelper {
        const fieldsHelper = this.arrayOfObjectToInsertQuery(fieldsToInsert);

        return {
            query: `INSERT INTO ${this.tableName} (${fieldsHelper.queryText}) VALUES ${fieldsHelper.maskText} ${fieldsHelper.onDuplicate}`,
            queryValues: fieldsHelper.queryValues,
        };
    }

    /**
     * Converts an array of objects in VALUES for INSERT query
     * @param {Array<Object>} inputs
     * @returns {MysqlQueryHelper}
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected arrayOfObjectToInsertQuery(inputs: Array<object>): MysqlQueryHelper {
        const queryValues = [];
        let inputText = '';
        let maskText = '';
        let onDuplicate = ' ON DUPLICATE KEY UPDATE ';

        inputs.forEach( (input, index) => {
            maskText += '(';

            // Get the fields list, array of values and mark text
            Object.keys(input).forEach( (field) => {
                // Only the first row
                if (index === 0) {
                    inputText += `\`${field}\`,`;
                    onDuplicate += ` ${field}=VALUES(${field}),`;
                }
                queryValues.push(input[field]);
                maskText += '?,';
            });
            maskText = `${maskText.slice(0, -1)}),`;
        });

        // Clean last comma , and return
        return {
            queryValues,
            queryText: inputText.slice(0, -1),
            maskText: maskText.slice(0, -1),
            onDuplicate: onDuplicate.slice(0, -1),
        };
    }

    /**
     * Get the query and bind values for bulk delete
     * @param {Array<Object>} inputs
     * @param {Array<string>} deleteFields
     * @returns {MysqlQueryBuilderHelper}
     */
    public getQueryToDeleteRows(inputs: Array<object>, deleteFields: Array<string>): MysqlQueryBuilderHelper {
        const deleteValuesObject = this.arrayOfObjectToListValues(inputs, deleteFields);
        const queryValues = [];
        const query = deleteFields.reduce((sentence, field) => {
            if (deleteValuesObject.hasOwnProperty(field)) {
                if (sentence.length !== 0) {
                    sentence = `${sentence} and`;
                }
                const maskText = deleteValuesObject[field].map((deleteValue) => {
                    queryValues.push(deleteValue);
                    return '?';
                });
                sentence = `${sentence} ${this.tableName}.${field} in (${maskText.join(',')}) `;
            }
            return `${sentence}`;
        }, '');

        return {
            queryValues,
            query: `DELETE FROM ${this.tableName} WHERE ${query}`,
        };
    }

    /**
     * Converts an array of objects in VALUES for INSERT query
     * @param {Array<Object>} inputs
     * @returns {Object}
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected arrayOfObjectToListValues(inputs: Array<object>, deleteFields: Array<string>): Object {
        const values = {};

        inputs.forEach( (input, index) => {
            // Get the fields list, array of values and mark text
            deleteFields.forEach( (field) => {
                if (input.hasOwnProperty(field)) {
                    if (!values.hasOwnProperty(field)) {
                        values[field] = [];
                    }
                    values[field].push(input[field]);
                }
            });
        });

        // Get unique values
        Object.keys(values).forEach( (field) => {
            values[field] = [... new Set(values[field])];
        });

        return values;
    }
}
