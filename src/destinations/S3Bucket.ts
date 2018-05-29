import * as fs from 'fs';
// import individual service
import * as S3 from 's3';
// import * as S3 from'aws-sdk/clients/s3';
import * as lodash from 'lodash';
import { join as joinPath } from 'path';
import { basename } from 'path';
import { LogManager } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestination } from '../EtlDestination';
import { JsonFile } from './JsonFile';
import { CsvFile } from './CsvFile';

const log = LogManager.getLogger(__filename);

// tslint:disable-next-line
const uploadToS3 = (client: any, loadParams: object): Promise<any> => new Promise((resolve, reject) => {
    const uploader = client.uploadFile(loadParams);
    uploader.on('end', resolve);
    uploader.on('error', reject);
    uploader.on('progress', function() {
        log.debug(`uploading to S3 progress:, ${uploader.progressMd5Amount}, ${uploader.progressAmount}, ${uploader.progressTotal}`);
    });
});

// tslint:disable-next-line
const downloadFromS3 = (client: any, loadParams: object): Promise<any> => new Promise((resolve, reject) => {
    const downloader = client.downloadFile(loadParams);
    downloader.on('error', Promise.reject);
    downloader.on('end', Promise.resolve);
    downloader.on('progress', () => {
      log.debug(`downloading from S3 progress:, ${downloader.progressAmount}, ${downloader.progressTotal}`);
    });
});

// tslint:disable-next-line
const deleteFromS3 = (client: any, deleteParams: object): Promise<any> => new Promise((resolve, reject) => {
    const remover = client.deleteObjects(deleteParams);
    remover.on('end', resolve);
    remover.on('error', reject);
});

export class S3Bucket extends EtlDestination {
  protected sourceObj: JsonFile|CsvFile;
  protected bucket: string;
  protected s3Client: S3;
  protected tempDirectory: string;
  protected baseFileName: string;

  /**
   * Set all settings to connect to S3
   * @param fileType string csv|jsom
   * @param bucket the bucket in S3
   * @param tempDirectory the directory to save the files
   * @param baseFileName the base file name to use to create the file name.
   * @param singleObjects save each record in the batch as JSON objects
   */
  constructor(fileType: string, bucket: string, tempDirectory: string, baseFileName: string, singleObjects= false) {
    super();
    this.sourceObj = (fileType === 'json') ?
                    new JsonFile(tempDirectory, baseFileName, true, singleObjects) :
                    new CsvFile(tempDirectory, baseFileName, true);
    this.bucket = bucket.trim();
    this.tempDirectory = tempDirectory.trim();
    this.baseFileName = baseFileName.trim();

    const options = {
        maxAsyncS3: 20,     // this is the default
        s3RetryCount: 3,    // this is the default
        s3RetryDelay: 1000, // this is the default
        multipartUploadThreshold: 20971520, // this is the default (20 MB)
        multipartUploadSize: 15728640, // this is the default (15 MB)
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
   * Stores the batch records in a file
   * @param batch
   */
  public async store(batch: EtlBatch): Promise<string> {
    const localFile = await this.sourceObj.store(batch);
    const key = basename(localFile);
    if (batch.getState() !== EtlState.ERROR) {
        const loadParams = {
            localFile,
            s3Params: {
                Bucket: this.bucket,
                Key: key,
            },
        };
        const loader = await uploadToS3(this.s3Client, loadParams);
        // Delete the file
        fs.unlinkSync(localFile);
        log.debug(`finish uploading: ${key}`);
    } else {
        // log error
        log.error(`Error saving batch in file. No uploaded: ${batch.getBatchFullIdentifcation()}`);
    }
    return key;
  }

  public async fetch(filePath: string): Promise<string> {
    const tempFile = joinPath(this.tempDirectory , `/${this.baseFileName}_${lodash.uniqueId()}.json`);
    const loadParams = {
      tempFile,
      s3Params: {
        Bucket: this.bucket,
        Key: filePath,
      },
    };
    const downloader = await downloadFromS3(this.s3Client, loadParams);
    log.debug(`finish downloading: ${tempFile}`);
    return tempFile;
  }

  /**
   * Delete a file from a bucket
   * @param batch
   */
  public async deleteFromS3(key: string): Promise<any> {
    const s3Params = {
            Bucket: this.bucket,
            Delete: {
                Objects: [ { Key: key } ],
                Quiet: false,
            },
        };
    const deleted = await deleteFromS3(this.s3Client, s3Params);
    log.debug(`finish deleting: ${key}`);
    return deleted;
  }
}
