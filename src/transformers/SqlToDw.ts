import * as fs from 'fs';
import * as S3 from 's3';
import { join as joinPath } from 'path';
import * as lodash from 'lodash';
import * as moment from 'moment';
import { toObject as csvToObject } from 'csvjson';
import { LogManager } from 'inceptum';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';
import { EtlTransformer } from '../EtlTransformer';

const log = LogManager.getLogger();

export class SqlToDw extends EtlTransformer {
    private thisCSV: any;
    private regexPath: string;
    private bucket: string;
    private fieldsToReplace: string[];
    private s3Client: S3;

    constructor(regexPath: string, bucket: string, fieldsToReplace: string[]) {
        super();
        this.regexPath =  regexPath;
        this.bucket = bucket.trim();
        this.fieldsToReplace = (typeof fieldsToReplace === 'string') ? [fieldsToReplace] : fieldsToReplace;
        const options = {
            maxAsyncS3: 20,                     // this is the default
            s3RetryCount: 3,                    // this is the default
            s3RetryDelay: 1000,                 // this is the default
            multipartUploadThreshold: 20971520, // this is the default (20 MB)
            multipartUploadSize: 15728640,      // this is the default (15 MB)
            // If not using the credential stored in ./aws/credencials file use the follow:
            // s3Options: {
            //     accessKeyId: 'ACCESS_KEY',
            //     secretAccessKey: 'ACCESS_SECRET',
            //     // any other options are passed to new AWS.S3()
            //     // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
            // },
        };
        this.s3Client = S3.createClient(options);
    }

    /**
     * @static check if input string is a URL or not
     * @param {string} url
     * @returns {Boolean}
     * @memberof SqlToDw
     */
    static isURL(url: string): Boolean {
        const pattern = new RegExp('((http|https)(:\/\/))?([a-zA-Z0-9]+[.]{1}){2}[a-zA-z0-9]+(\/{1}[a-zA-Z0-9]+)*\/?', 'i');
        if (!pattern.test(url)) {
            return false;
        }
        return true;
    }

    // tslint:disable-next-line
    private downloadFromS3 (client: any, loadParams: object): void {
          const downloader = client.downloadFile(loadParams);
          downloader.on('error', Promise.reject);
          downloader.on('progress', () => {
            log.debug(`downloading from S3 progress:, ${downloader.progressAmount}, ${downloader.progressTotal}`);
          });
          downloader.on('end', Promise.resolve);
    }

    /**
     * Get batch of records and loop through each record in the batch
     * @param {EtlBatch} batch
     * @memberof SqlToDw
     */
    public async transform(batch: EtlBatch): Promise<void> {
        batch.getRecords().map((record) => {
            this.transformBatchRecord(record);
        });
    }

    /**
     * @public loop through each element in record and if has property then regex match the value against the rule
     * @param {EtlBatchRecord} record
     * @memberof SqlToDw
     */
    // tslint:disable-next-line:prefer-function-over-method
    private async transformBatchRecord(record: EtlBatchRecord) {
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
     * @private
     * @param {any} path
     * @returns
     * @memberof ValueMapping
     */
    private getRegex(): any {
        // check if URL
        if (SqlToDw.isURL(this.regexPath)) {
            const tempFile = joinPath(__dirname, `../../${lodash.uniqueId()}.json`);
            const loadParams = {
                tempFile,
                s3Params: {
                    Bucket: this.bucket,
                    Key: this.regexPath,
                },
            };
            const loader = this.downloadFromS3(this.s3Client, loadParams);
            const currentFile = tempFile;
            fs.unlinkSync(tempFile);
            return fs.readFileSync(joinPath(currentFile), { encoding : 'utf8'});
        } else {
            return fs.readFileSync(this.regexPath, { encoding : 'utf8'});
        }
    }

    private regexReplace(landingPagePath: string): string {
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
