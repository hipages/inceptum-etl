import { EtlTransformer } from '../EtlTransformer';
import { EtlBatchRecord, EtlBatch } from '../EtlBatch';


export class GATransactions extends EtlTransformer {
    public async transform(batch: EtlBatch) {
        batch.getRecords().map((record) => {
            this.transformBatchRecord(record);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async transformBatchRecord(record: EtlBatchRecord) {
        const transformedData = {};
        const data = record.getData();
        const transId = data['transactionid'];
        const jobId = transId.replace('JOB', '');

        transformedData['job_id'] = Number(jobId);
        transformedData['partner_job_id'] = Number(jobId);
        transformedData['transaction_id'] = transId;
        transformedData['campaign'] = data['campaign'];
        transformedData['source'] = data['source'];
        transformedData['ad_group'] = data['adgroup'];
        transformedData['medium'] = data['medium'];
        transformedData['keyword'] = data['keyword'];
        transformedData['landing_page_path'] = data['landingpagepath'];
        transformedData['ad_matched_query'] = data['admatchedquery'];
        transformedData['device_category'] = data['devicecategory'];
        transformedData['browser'] = data['browser'];
        transformedData['browser_version'] = data['browserversion'];
        transformedData['browser_size'] = data['browsersize'];

        record.setTransformedData(transformedData);
    }
}

