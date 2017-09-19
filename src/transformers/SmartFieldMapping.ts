import { Logger } from 'aws-sdk/lib/config';
import * as fs from 'fs';
import { join as joinPath } from 'path';
import * as request from 'request-promise';
import * as lodash from 'lodash';
import * as moment from 'moment';
import { toObject as csvToObject } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';
import { EtlTransformer } from '../EtlTransformer';
import { S3Bucket } from '../destinations/S3Bucket';

const log = LogManager.getLogger();

export class SmartFieldMapping extends EtlTransformer {
    protected fileType = 'json';
    protected etlName: string;
    protected tempDirectory: string;
    protected regexPath: string;
    protected bucket: string;
    protected fieldsMapping: object;
    protected regexCollection: object;

    constructor(etlName: string, tempDirectory: string, regexPath: string, bucket: string, fieldsMapping: object) {
        super();
        this.etlName = etlName;
        this.tempDirectory = tempDirectory;
        this.regexPath =  regexPath;
        this.bucket = bucket.trim();
        this.fieldsMapping = {...fieldsMapping};
    }

    /**
     * @static check if input string is a URL or not
     * @param {string} url
     * @returns {Boolean}
     * @memberof SmartFieldMapping
     */
    static isURL(url: string): Boolean {
        const pattern = new RegExp('((http|https)(:\/\/))?([a-zA-Z0-9]+[.]{1}){2}[a-zA-z0-9]+(\/{1}[a-zA-Z0-9]+)*\/?', 'i');
        if (!pattern.test(url)) {
            return false;
        }
        return true;
    }

    /**
     * @static this will determine if input URL came from S3 or not
     * @param {string} url
     * @returns {Boolean}
     * @memberof SmartFieldMapping
     */
    static isS3URL(url: string): Boolean {
        const pattern = new RegExp('(s3-|s3\.)?(.*)\.amazonaws\.com', 'i');
        if (!pattern.test(url)) {
            return false;
        }
        return true;
    }
    /**
     * @protected
     * @returns {Promise<any>}
     * @memberof SmartFieldMapping
     */
    // tslint:disable-next-line
    protected async downloadFromS3 (): Promise<any> {
        const baseFileName = this.etlName.replace(/ /g, '');
        const directory = joinPath(this.tempDirectory, baseFileName);
        if (!fs.existsSync(directory)) {
            log.info(`Transformer temp directory does not exist:${directory}. Will create`);
            fs.mkdirSync(directory);
        }
        const S3BucketObj = new S3Bucket(this.fileType, this.bucket, directory, baseFileName);
        const currentFile = await S3BucketObj.fetch(this.regexPath);
        return Promise.resolve(fs.readFileSync(joinPath(currentFile), { encoding : 'utf8'}));
    }
    /**
     * @protected
     * @returns any
     * @memberof SmartFieldMapping
     */
    protected  getRegexFromUrl(): any {
        // The file is in a S3 bucket
        if (SmartFieldMapping.isS3URL(this.regexPath)) {
            return this.downloadFromS3().then( (body) => body )
            .catch((err) => {
                // Request failed due to technical reasons...
                log.fatal(`Transformer can't read regex file ${this.regexPath}`);
                throw(err);
            });
        }
        // Its a url request the file
        return request({ uri: this.regexPath }).then((body) => {
            // Request succeeded but might as well be a 404
            // Usually combined with resolveWithFullResponse = true to check response.statusCode
            return body;
        })
        .catch((err) => {
            // Request failed due to technical reasons...
            log.fatal(`Transformer can't read regex file ${this.regexPath}`);
            throw(err);
        });
    }

    /**
     * Get batch of records and loop through each record in the batch
     * @param {EtlBatch} batch
     * @memberof SmartFieldMapping
     */
    public async transform(batch: EtlBatch): Promise<void> {
        batch.getRecords().map((record) => {
            this.transformBatchRecord(record);
        });
    }

    /**
     * @public loop through each element in record and if has property then regex match the value against the rule
     * @param {EtlBatchRecord} record
     * @memberof SmartFieldMapping
     */
    // tslint:disable-next-line:prefer-function-over-method
    public transformBatchRecord(record: EtlBatchRecord) {
        const input = record.getData();
        // const transformedData = Object.create(null);
        const transformedData = {...input};
        // Map the fields
        let errorFound = false;
        try {
            Object.keys(this.fieldsMapping).map(
                (field) => {
                    if (this.fieldsMapping[field].hasOwnProperty('action') && this.fieldsMapping[field]['action'] && typeof this[this.fieldsMapping[field]['action']] === 'function') {
                        Object.assign(transformedData, this[this.fieldsMapping[field]['action']](transformedData, input, this.fieldsMapping[field], field));
                    }
                },
            );
        } catch (e) {
            log.debug(e);
            errorFound = true;
        }
        record.setTransformedData(transformedData);
        if (errorFound) {
            record.setState(EtlState.ERROR);
        }
    }
    /**
     * @protected
     * @param {object} [transformedData={}]
     * @param {object} input
     * @param {object} fields
     * @param {string} key
     * @returns {object}
     * @memberof SmartFieldMapping
     */
    protected add(transformedData: object = {}, input: object, fields: object, key: string): object {
        transformedData[key] = (this.fetchValue(fields, input)) ? this.fetchValue(fields, input) : null;
        return transformedData;
    }
    /**
     * @protected
     * @param {object} [transformedData={}]
     * @param {object} input
     * @param {object} fields
     * @param {string} key
     * @returns {object}
     * @memberof SmartFieldMapping
     */
    protected replace(transformedData: object = {}, input: object, fields: object, key: string): object {
        transformedData[key] = (this.fetchValue(fields, input)) ? this.fetchValue(fields, input) : null;
        if (transformedData.hasOwnProperty(fields['field'])) {
            delete transformedData[fields['field']];
        }
        return transformedData;
    }
    /**
     * @protected
     * @param {object} [transformedData={}]
     * @param {object} input
     * @param {object} fields
     * @param {string} key
     * @returns {object}
     * @memberof SmartFieldMapping
     */
    protected regexAdd(transformedData: object = {}, input: object, fields: object, key: string): object {
        const currentValue = (this.fetchValue(fields, input)) ? this.fetchValue(fields, input).toString() : '';
        transformedData[key] = this.regexReplace(currentValue);
        return transformedData;
    }
    /**
     * @protected
     * @param {object} [transformedData={}]
     * @param {object} input
     * @param {object} fields
     * @param {string} key
     * @returns {object}
     * @memberof SmartFieldMapping
     */
    protected convertDateTimeToUTC(transformedData: object = {}, input: object, fields: object, key: string): object {
         const value = (this.fetchValue(fields, input)) ? this.fetchValue(fields, input) : false;
        transformedData[key] = value ? moment(value).utc().format('YYYY-MM-DD HH:mm:ss') : '';
        if ((key !== fields['field']) && transformedData.hasOwnProperty(fields['field'])) {
            delete transformedData[fields['field']];
        }
        return transformedData;
    }
    /**
     * @protected
     * @param {object} obj
     * @param {object} [input]
     * @returns {string}
     * @memberof SmartFieldMapping
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected fetchValue(obj: object, input?: object): string  {
        return (obj.hasOwnProperty('field')) ?  input[obj['field']] || false : obj['value'] || false;
    }

    /**
     * @protected get regex object from file or from url
     * @param {any} path
     * @returns
     * @memberof ValueMapping
     */
    protected getRegex(): object {
        if (typeof this.regexCollection === 'undefined') {
            let regexCollection = '{}';
            // check if URL
            if (SmartFieldMapping.isURL(this.regexPath)) {
                regexCollection = this.getRegexFromUrl();
            } else {
                regexCollection = fs.readFileSync(this.regexPath, { encoding : 'utf8'});
            }
            this.regexCollection = JSON.parse(regexCollection);
        }
        return this.regexCollection;
    }
    /**
     * @protected
     * @param {string} landingPagePath
     * @returns {string}
     * @memberof SmartFieldMapping
     */
    protected regexReplace(landingPagePath: string): string {
        const regexCollection = this.getRegex();
        for (const key in regexCollection) {
            if (regexCollection.hasOwnProperty(key)) {
                if (new RegExp(key).exec(landingPagePath) !== null) {
                    return  regexCollection[key];
                }
            }
        }
        return 'Others';
    }
}