import * as fs from 'fs';
import * as S3 from 's3';
import { join as joinPath } from 'path';
import { basename } from 'path';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestination } from '../EtlDestination';
import { JsonFile } from './JsonFile';
import { CsvFile } from './CsvFile';

const log = LogManager.getLogger();

// tslint:disable-next-line
const uploadToS3 = (client: any, loadParams: object): Promise<any> => new Promise((resolve, reject) => {
    const uploader = client.uploadFile(loadParams);
    uploader.on('end', resolve);
    uploader.on('error', reject);
    uploader.on('progress', function() {
        log.debug(`uploading to S3 progress:, ${uploader.progressMd5Amount}, ${uploader.progressAmount}, ${uploader.progressTotal}`);
    });
});

export class S3Bucket extends EtlDestination {
  protected sourceObj: JsonFile|CsvFile;
  protected bucket: string;
  protected s3Client: S3;

  /**
   * Check that the directory value in the config exist and
   * set the directory name in the {@link:thisfileName} variable
   */
  constructor(sourceObj: JsonFile|CsvFile, bucket: string) {
    super();
    this.sourceObj = sourceObj;
    this.bucket = bucket.trim();
    const options = {
        maxAsyncS3: 20,     // this is the default
        s3RetryCount: 3,    // this is the default
        s3RetryDelay: 1000, // this is the default
        multipartUploadThreshold: 20971520, // this is the default (20 MB)
        multipartUploadSize: 15728640, // this is the default (15 MB)
        s3Options: {
            accessKeyId: 'AKIAIP74ASJ56ISBYJWQ',
            secretAccessKey: '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',
            // any other options are passed to new AWS.S3()
            // See: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
        },
    };
    this.s3Client = S3.createClient(options);
  }
  /**
   * Stores the batch records in a file
   * @param batch
   */
  public async store(batch: EtlBatch): Promise<void> {
    const fileToUpload = await this.sourceObj.store(batch);
    if (batch.getState() !== EtlState.ERROR) {
        const loadParams = {
            localFile: fileToUpload,
            s3Params: {
                Bucket: this.bucket,
                Key: basename(fileToUpload),
            },
        };
        const loader = await uploadToS3(this.s3Client, loadParams);
        log.debug(`finish uploading: ${basename(fileToUpload)}`);
    } else {
        // log error
        log.error(`Error saving batch in file. No aploaded:${batch.getBatchFullIdentifcation()}`);
    }
    return Promise.resolve();
  }
}
