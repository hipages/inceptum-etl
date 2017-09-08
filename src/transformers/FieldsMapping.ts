import * as moment from 'moment';
import { LogManager } from 'inceptum';
import { EtlTransformer } from '../EtlTransformer';
import { EtlBatchRecord, EtlBatch, EtlState } from '../EtlBatch';

const log = LogManager.getLogger();

export class FieldsMapping extends EtlTransformer {
    private fixedFields: object;
    private mappedFields: object;

    constructor(fixedFields: object, mappedFields: object) {
        super();
        this.fixedFields = fixedFields || {};
        if (typeof this.fixedFields !== 'object') {
            this.fixedFields = {};
        }
        // mappedFields: should have the mapping of fields name { destination: source } in the desired order.
        this.mappedFields = mappedFields;
    }

    public getFixedFields() {
        return this.fixedFields;
    }

    public getMappedFields() {
        return this.mappedFields;
    }

    public async transform(batch: EtlBatch) {
        // Replace date in fixed fields
        let fixedFields = {};
        if (this.fixedFields) {
            fixedFields = {...this.fixedFields};
            Object.keys(fixedFields).map((key) => {
                switch (fixedFields[key]) {
                    case 'UTC_TIMESTAMP' :   fixedFields[key] = moment.utc().format('YYYY-MM-DD HH:mm:ss');
                                        break;
                    case 'UTC_DATE' :   fixedFields[key] = moment.utc().format('YYYY-MM-DD');
                                        break;
                    case 'LOCAL_TIMESTAMP': fixedFields[key] = moment().format('YYYY-MM-DD HH:mm:ss');
                                            break;
                    case 'LOCAL_DATE':  fixedFields[key] = moment().format('YYYY-MM-DD');
                }
            });
        }

        batch.getRecords().forEach((record) => {
            this.transformBatchRecord(record, fixedFields);
        });
    }

    public transformBatchRecord(record: EtlBatchRecord, fixedFields: object) {
        const transformedData = {...fixedFields};
        const data = record.getData();

        // Map the fields
        Object.keys(this.mappedFields).forEach((destinationField) => {
            const sourceField = this.mappedFields[destinationField];
            transformedData[destinationField] = data.hasOwnProperty(sourceField)
                                                ? data[sourceField] : '';
        });
        record.setTransformedData(transformedData);
    }
}

