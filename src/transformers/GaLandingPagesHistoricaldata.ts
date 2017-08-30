import * as fs from 'fs';
import { join as joinPath } from 'path';
import * as lodash from 'lodash';
import * as moment from 'moment';
import { toObject as csvToObject } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';
import { EtlTransformer } from '../EtlTransformer';
import { S3Bucket } from '../destinations/S3Bucket';

const log = LogManager.getLogger();

export class GaLandingPagesHistoricaldata extends EtlTransformer {
    private thisCSV: any; // TODO: need to remove this at some stage
    // protected properties
    protected fileType = 'json';
    protected S3Bucket: S3Bucket;
    protected etlName: string;
    // private properties
    private regexPath: string;
    private bucket: string;
    private fieldsToReplace: string[];

    constructor(etlName: string, tempDirectory: string, regexPath: string, bucket: string, fieldsToReplace: string[]) {
        super();
        this.regexPath =  regexPath;
        this.bucket = bucket.trim();
        this.fieldsToReplace = (typeof fieldsToReplace === 'string') ? [fieldsToReplace] : fieldsToReplace;
        const baseFileName = etlName.replace(/ /g, '');
        const directory = joinPath(tempDirectory, baseFileName);
        if (!fs.existsSync(directory)) {
            log.info(`Saving batch directory does not exist:${directory}. Will create`);
            fs.mkdirSync(directory);
        }
        this.S3Bucket = new S3Bucket(this.fileType, this.bucket, directory, baseFileName, true);
    }

    /**
     * @static check if input string is a URL or not
     * @param {string} url
     * @returns {Boolean}
     * @memberof GaLandingPagesHistoricaldata
     */
    static isURL(url: string): Boolean {
        const pattern = new RegExp('((http|https)(:\/\/))?([a-zA-Z0-9]+[.]{1}){2}[a-zA-z0-9]+(\/{1}[a-zA-Z0-9]+)*\/?', 'i');
        if (!pattern.test(url)) {
            return false;
        }
        return true;
    }

    // tslint:disable-next-line
    private async downloadFromS3 (): Promise<any> {
        const currentFile = await this.S3Bucket.fetch(this.regexPath);
        Promise.resolve(fs.readFileSync(joinPath(currentFile), { encoding : 'utf8'}));
    }

    /**
     * Get batch of records and loop through each record in the batch
     * @param {EtlBatch} batch
     * @memberof GaLandingPagesHistoricaldata
     */
    public async transform(batch: EtlBatch): Promise<void> {
        batch.getRecords().map((record) => {
            this.transformBatchRecord(record);
        });
    }

    /**
     * @public loop through each element in record and if has property then regex match the value against the rule
     * @param {EtlBatchRecord} record
     * @memberof GaLandingPagesHistoricaldata
     */
    // tslint:disable-next-line:prefer-function-over-method
    protected transformBatchRecord(record: EtlBatchRecord) {
        const transformedData = {};
        const data = record.getData();
        // Map the fields
        this.fieldsToReplace.map(
            (field) => {
                if (data.hasOwnProperty(field)) {
                    data[field] = this.regexReplace(data[field]);
                }
            },
        );
        record.setTransformedData(data);
    }

    /**
     * @private get regex object from file or from url
     * @param {any} path
     * @returns
     * @memberof ValueMapping
     */
    protected getRegex(): any {
        // check if URL
        if (GaLandingPagesHistoricaldata.isURL(this.regexPath)) {
             return this.downloadFromS3();
        } else {
            return fs.readFileSync(this.regexPath, { encoding : 'utf8'});
        }
    }

    protected regexReplace(landingPagePath: string): string {
        const regexCollection = JSON.parse(this.getRegex());
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
