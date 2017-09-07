import { LogManager } from 'inceptum';
import { EtlTransformer } from '../EtlTransformer';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';

const log = LogManager.getLogger();

export class GATransactions extends EtlTransformer {
    private fieldsMapping: object;

    constructor(fieldsMapping: object) {
        super();
        // fieldsMapping: should have the mapping of fields name { destination: source } in the required order.
        this.fieldsMapping = fieldsMapping;
    }

    public async transform(batch: EtlBatch) {
        batch.getRecords().map((record) => {
            this.transformBatchRecord(record);
        });
    }
    // tslint:disable-next-line:prefer-function-over-method
    public transformBatchRecord(record: EtlBatchRecord) {
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
            if (data.hasOwnProperty(sourceField) || transformations.hasOwnProperty(sourceField)) {
                transformedData[destinationField] = data.hasOwnProperty(sourceField) ? data[sourceField] : transformations[sourceField];
            } else {
                transformedData[destinationField] = '';
            }
        });
        record.setTransformedData(transformedData);
    }
}

