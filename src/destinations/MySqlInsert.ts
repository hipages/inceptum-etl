import * as fs from 'fs';
import * as moment from 'moment';
import * as lodash from 'lodash';
import { join as joinPath } from 'path';
import { LogManager } from 'inceptum';
import { MySQLClient, DBTransaction } from 'inceptum';
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
    deleteAllRecordsBeforeLoad: boolean,
}

export class MySqlInsert extends EtlDestination {
    protected mySqlClient: MySQLClient;
    protected tableName: string;
    protected bulkDeleteMatchFields: Array<string>;
    protected deleteAllRecordsBeforeLoad: boolean;

    /**
     * Upload data to MySQL database table
     */
    constructor(mySqlClient: MySQLClient, tableDetails: MySQLConfig) {
        super();
        this.mySqlClient = mySqlClient;
        this.tableName = tableDetails.tableName;
        this.bulkDeleteMatchFields = tableDetails.bulkDeleteMatchFields;
        this.deleteAllRecordsBeforeLoad = !tableDetails.bulkDeleteMatchFields && tableDetails.deleteAllRecordsBeforeLoad;
    }

    public getMySqlClient(): MySQLClient {
        return this.mySqlClient;
    }

    public getTableName(): string {
        return this.tableName;
    }

    public getBulkDeleteMatchFields(): Array<string> {
        return this.bulkDeleteMatchFields;
    }

    public getDeleteAllRecordsBeforeLoad(): boolean {
        return this.deleteAllRecordsBeforeLoad;
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
        const deleteAllRecords = this.deleteAllRecordsBeforeLoad && (batch.getBatchNumber() === 1);
        return await this.mySqlClient.runInTransaction(false, async (transaction: DBTransaction<any>) => {
            if (deleteAllRecords) {
                log.debug(`Delete all records from table : ${this.tableName}`);
                await transaction.query(`delete from ${this.tableName}`);
            }
            // If is an empty batch do not process
            if (!fieldList || fieldList.length === 0) {
                log.error(`Process empty batch`);
                return;
            }
            return await this.processRecordInTransaction(fieldList, transaction);
        });
    }

    public async processRecordInTransaction(fieldList: Array<Object>, transaction: DBTransaction<any>): Promise<void> {
        // Delete existing values
        if (this.bulkDeleteMatchFields && this.bulkDeleteMatchFields.length > 0) {
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
        const deleteQuery = {
            queryValues: [],
            query: '',
        };
        if (deleteFields.length === 1) {
            const field = deleteFields.pop();
            deleteQuery.queryValues = this.getFieldListValues(inputs, field);
            const maskText = deleteQuery.queryValues.map(() => '?');
            deleteQuery.query = `DELETE FROM ${this.tableName} WHERE ${field} in (${maskText.join(',')})`;
        } else if (deleteFields.length > 1) {
            const deleteValuesObjects = this.arrayOfObjectToListValues(inputs, deleteFields);
            let query = '';
            deleteValuesObjects.forEach((deleteValue: object) => {
                if (query.length !== 0) {
                    query = `${query} or `;
                }
                const deleteSentence = Object.keys(deleteValue).map((field) => {
                    deleteQuery.queryValues.push(deleteValue[field]);
                    return `${field} = ?`;
                });
                query = `${query}(${deleteSentence.join(' and ')})`;
            });
            deleteQuery.query = `DELETE FROM ${this.tableName} WHERE ${query}`;
        }
        return deleteQuery;
    }

    /**
     * Get field and the list of values to use in delete statement
     * @param {Array<Object>} inputs
     * @param {string} deleteField
     * @returns {Array<any>}
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected getFieldListValues(inputs: Array<object>, deleteField: string): Array<any> {
        const values = [];
        inputs.forEach( (input) => {
            if (input.hasOwnProperty(deleteField)) {
                values.push(input[deleteField]);
            }
        });
        return [... new Set(values)];
    }

    /**
     * Get fields values to use in delete statement
     * @param {Array<Object>} inputs
     * @returns {Array<Object>}
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected arrayOfObjectToListValues(inputs: Array<object>, deleteFields: Array<string>): Array<Object> {
        const values = [];

        inputs.forEach( (input, index) => {
            const value = {};
            // Get the fields list, array of values and mark text
            deleteFields.forEach( (field) => {
                if (input.hasOwnProperty(field)) {
                    value[field] = input[field];
                }
            });
            values.push(value);
        });

        return lodash.uniqWith(values, lodash.isEqual);
    }
}
