import { LogManager } from 'inceptum';
import { EtlTransformer } from '../EtlTransformer';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';

const log = LogManager.getLogger();

export class GATransactions extends EtlTransformer {
    private fieldsMapping: object;

    constructor(fieldsMapping: object) {
        super();
        // fieldsMapping: should have the mapping of fields name from source to destination in the required order.
        this.fieldsMapping = fieldsMapping;
    }

    public async transform(batch: EtlBatch) {
        batch.getRecords().map((record) => {
            this.transformBatchRecord(record);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    public async transformBatchRecord(record: EtlBatchRecord) {
        const transformedData = {};
        const data = record.getData();
        const transId = data['transactionId'];
        const jobId = transId.replace('JOB', '');
        const transformations = {
            job_id: Number(jobId),
            partner_job_id: Number(jobId),
        };

        // Map the fields
        Object.keys(this.fieldsMapping).map((destinationField) => {
            const sourceField = this.fieldsMapping[destinationField];
            transformedData[destinationField] = data[sourceField] || transformations[sourceField] || 'Error Found';
            if (!data[sourceField] && !transformations[sourceField]) {
                log.info(`Field not transformed: ${sourceField} to ${destinationField}`);
            }
        });
        record.setTransformedData(transformedData);
    }
}

