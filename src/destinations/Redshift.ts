import * as fs from 'fs';
import { join as joinPath } from 'path';
import { LogManager } from 'inceptum';
import { DBClient, DBTransaction } from 'inceptum';
import { EtlBatch, EtlState } from '../EtlBatch';
import { EtlConfig } from '../EtlConfig';
import { EtlDestination } from '../EtlDestination';
import { S3Bucket } from './S3Bucket';

const log = LogManager.getLogger();

export class Redshift extends EtlDestination {
    protected pgClient: DBClient;
    protected etlName: string;
    protected iamRole: string;
    protected s3Bucket: S3Bucket;
    protected bucket: string;
    protected tableCopyName: string;
    protected tableName: string;
    protected bulkDeleteMatchFields: Array<string>;
    protected fileType = 'json';
    protected fileTypeOptions = {
        csv : `HEADER QUOTE '"' CSV`,
        json : `json 'auto'`,
    };

    /**
     * Upload a S3 bucket directory into a Redshift table via copy
     */
    constructor(pgClient: DBClient, etlName: string, bucket: string, tempDirectory: string,
        tableCopyName: string, tableName: string, bulkDeleteMatchFields: Array<string>, iamRole: '') {
        super();
        this.iamRole = iamRole; // If Redshift is not auth in S3 'arn:aws:iam::0123456789012:role/MyRedshiftRole';
        this.pgClient = pgClient;
        this.bucket = bucket;
        this.tableCopyName = tableCopyName;
        this.tableName = tableName;
        this.bulkDeleteMatchFields = bulkDeleteMatchFields;
        const baseFileName = etlName.replace(/ /g, '');
        const directory = joinPath(tempDirectory, baseFileName);
        if (!fs.existsSync(directory)) {
            fs.mkdirSync(directory);
            log.error(`Error saving batch directory does not exist:${directory}`);
        }
        this.s3Bucket = new S3Bucket(this.fileType, bucket, directory, baseFileName, true);
    }

    /**
     * Stores the batch records in a file
     * @param batch
     */
    public async store(batch: EtlBatch): Promise<void> {
        const key = await this.s3Bucket.store(batch);
        const filePathInS3 = joinPath(`${this.bucket}`, key);
        if (batch.getState() !== EtlState.ERROR) {
            const stored = await this.processRecord(`s3://${filePathInS3}`);
            if (!stored) {
                await batch.setState(EtlState.ERROR);
                log.debug(`Error storing file`);
            }
            log.debug(`finish uploading: ${filePathInS3}`);
            await this.s3Bucket.deleteFromS3(key);
        }
    }

    public async processRecord(filePathInS3: string): Promise<boolean> {
        // Run the copy
        const iamRole = (this.iamRole && this.iamRole.length > 0) ? `iam_role '${this.iamRole}'` : '';
        const sql = `copy ${this.tableCopyName}
            from '${filePathInS3}'
            ${iamRole}
            ${this.fileTypeOptions[this.fileType]};`;
        log.debug(`copy the file: ${sql}`);

        const stored = await this.pgClient.runInTransaction(false, (transaction: DBTransaction) => {
            return transaction.query(sql)
            .then((resp) => {
                log.debug(`Copy file to temp table : ${filePathInS3}`);
                return true;
            }).catch((error) => {
                log.fatal(error);
                return false;
            });
        });
        if (!stored) {
            return false;
        }

        // Verifying That the Data Was Loaded Correctly
        // After the load operation is complete, query the STL_LOAD_COMMITS system table to verify that the expected files were loaded. You should execute the COPY command and load verification within the same transaction so that if there is problem with the load you can roll back the entire transaction.
        // The following query returns entries for loading the tables in the TICKIT database:
        //
        // select query, trim(filename) as filename, curtime, status
        // from stl_load_commits
        // where filename like '%tickit%' order by query;
        //  query |           btrim           |          curtime           | status
        // -------+---------------------------+----------------------------+--------
        //  22475 | tickit/allusers_pipe.txt  | 2013-02-08 20:58:23.274186 |      1
        //  22478 | tickit/venue_pipe.txt     | 2013-02-08 20:58:25.070604 |      1
        //  22480 | tickit/category_pipe.txt  | 2013-02-08 20:58:27.333472 |      1
        //  22482 | tickit/date2008_pipe.txt  | 2013-02-08 20:58:28.608305 |      1
        //  22485 | tickit/allevents_pipe.txt | 2013-02-08 20:58:29.99489  |      1
        //  22487 | tickit/listings_pipe.txt  | 2013-02-08 20:58:37.632939 |      1
        //  22489 | tickit/sales_tab.txt      | 2013-02-08 20:58:37.632939 |      1
        // (6 rows)
        // The fact that a record is written to the log file for this system table does not mean that the load
        // committed successfully as part of its containing transaction. To verify load commits, query the
        // STL_UTILITYTEXT table and look for the COMMIT record that corresponds with a COPY transaction. For example,
        // this query joins STL_LOAD_COMMITS and STL_QUERY based on a subquery against STL_UTILITYTEXT:
        //
        // select l.query,rtrim(l.filename),q.xid
        // from stl_load_commits l, stl_query q
        // where l.query=q.query
        // and exists
        // (select xid from stl_utilitytext where xid=q.xid and rtrim("text")='COMMIT');
        //
        //  query |           rtrim           |  xid
        // -------+---------------------------+-------
        //  22600 | tickit/date2008_pipe.txt  | 68311
        //  22480 | tickit/category_pipe.txt  | 68066
        //   7508 | allusers_pipe.txt         | 23365
        //   7552 | category_pipe.txt         | 23415
        //   7576 | allevents_pipe.txt        | 23429
        //   7516 | venue_pipe.txt            | 23390
        //   7604 | listings_pipe.txt         | 23445
        //  22596 | tickit/venue_pipe.txt     | 68309
        //  22605 | tickit/listings_pipe.txt  | 68316
        //  22593 | tickit/allusers_pipe.txt  | 68305
        //  22485 | tickit/allevents_pipe.txt | 68071
        //   7561 | allevents_pipe.txt        | 23429
        //   7541 | category_pipe.txt         | 23415
        //   7558 | date2008_pipe.txt         | 23428
        //  22478 | tickit/venue_pipe.txt     | 68065
        //    526 | date2008_pipe.txt         |  2572
        //   7466 | allusers_pipe.txt         | 23365
        //  22482 | tickit/date2008_pipe.txt  | 68067
        //  22598 | tickit/category_pipe.txt  | 68310
        //  22603 | tickit/allevents_pipe.txt | 68315
        //  22475 | tickit/allusers_pipe.txt  | 68061
        //    547 | date2008_pipe.txt         |  2572
        //  22487 | tickit/listings_pipe.txt  | 68072
        //   7531 | venue_pipe.txt            | 23390
        //   7583 | listings_pipe.txt         | 23445
        // (25 rows)
        // const sqlVerify = `SELECT count(*) AS total_record,
        //     sum(case WHEN t.xid IS NULL THEN 0
        //              ELSE 1
        //             END) AS total_commits
        //     FROM stl_load_commits l
        //     INNER JOIN stl_query q ON l.query = q.query
        //     LEFT JOIN stl_utilitytext t ON t.xid = q.xid and rtrim("text") = 'COMMIT'
        //     where l.filename = '${filePathInS3}';`;
        // const verified = await this.pgClient.runInTransaction(true, (transaction: DBTransaction) => {
        //     return transaction.query(sqlVerify)
        //     .then((rows) => {
        //         if (rows === null || rows.length === 0 || !rows[0].hasOwnProperty('total_record')
        //             || !rows[0].hasOwnProperty('total_commits')) {
        //             return false;
        //         }
        //         // if total_record !== total_commits  it is an error
        //         return rows[0]['total_record'] === rows[0]['total_commits'];
        //     }).catch((error) => {
        //         log.fatal(error);
        //         return false;
        //     });
        // });
        const sqlVerify = `select * from stl_load_errors order by starttime desc;`;
        const verified = await this.pgClient.runInTransaction(true, (transaction: DBTransaction) => {
            return transaction.query(sqlVerify)
            .then((rows) => {
                if (rows === null || rows.length === 0) {
                    return true;
                }
                log.fatal(rows);
                return false;
            }).catch((error) => {
                log.fatal(error);
                return false;
            });
        });

        let result = verified;
        if (verified) {
            // Performing a Merge Operation by Replacing Existing Rows

            // Use an inner join with the staging table to delete the rows from the target table that are being updated.
            // Put the delete and insert operations in a single transaction block so that if there is a problem, everything will be rolled back.

            // begin transaction;
            const where = this.bulkDeleteMatchFields.reduce((sentence, field) => {
                if (sentence.length !== 0) {
                    sentence = `${sentence} and`;
                }
                return `${sentence} ${this.tableName}.${field} = C.${field} `;
            }, '');

            const deleteSQL = `DELETE from ${this.tableName}
            USING (SELECT DISTINCT ${this.bulkDeleteMatchFields.join(', ')} from ${this.tableCopyName} ) as C
            where ${where};`;
            const deleted = await this.pgClient.runInTransaction(false, (transaction: DBTransaction) => {
                return transaction.query(deleteSQL)
                .then((rows) => {
                    return true;
                }).catch((error) => {
                    log.fatal(error);
                    return false;
                });
            });

            // Insert all of the rows from the staging table.
            const insertSQL = `insert into ${this.tableName}
                select * from ${this.tableCopyName};`;
            log.debug(insertSQL);

            const inserted = await this.pgClient.runInTransaction(false, (transaction: DBTransaction) => {
                return transaction.query(insertSQL)
                .then((resp) => {
                   return true;
                }).catch((error) => {
                    log.fatal(error);
                    return false;
                });
            });
            result = deleted && inserted;
        } else { // Delete the temp database
            result = false;
        }
        // Drop the staging table.
        const truncateSQL = `delete from ${this.tableCopyName}`;
        result = await this.pgClient.runInTransaction(false, (transaction: DBTransaction) => {
            return transaction.query(truncateSQL)
            .then((resp) => {
                return true;
            }).catch((error) => {
                log.fatal(error);
                return false;
            });
        });

        return result;
    }
}
