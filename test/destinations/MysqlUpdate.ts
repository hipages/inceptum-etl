import { must } from 'must';
import { suite, test } from 'mocha-typescript';
import * as sinon from 'sinon';
import * as moment from 'moment';
import { DBClient, DBTransaction, MySQLClient } from 'inceptum';
import { EtlBatch } from '../../src/EtlBatch';
import { MySqlUpdate } from '../../src/destinations/MySqlUpdate';

@suite class MysqlUpdateTest {
  private destination: MySqlUpdate;
  private batch: EtlBatch;
  readonly transformedData = [
    {
      sign_up_id: 1,
      source: 'source1',
      medium: 'med1',
    },
    {
      sign_up_id: 2,
      source: 'source2',
      medium: 'med2',
    },
  ];

  before() {
    this.destination = new MySqlUpdate(undefined, {
      tableName: 'sign_ups',
      primaryKeyFieldName: 'sign_up_id',
      modifiedByDateFieldName: 'modified_by_date',
    });

    this.batch = new EtlBatch([{}, {}], 1, 1, 'batch-1');
    this.batch.getRecords()[0].setTransformedData(this.transformedData[0]);
    this.batch.getRecords()[1].setTransformedData(this.transformedData[1]);
  }

  getUpdateQueries() {
    return [
      {
        sql: 'UPDATE `sign_ups` SET `sign_up_id` = ?, `source` = ?, `medium` = ?, `modified_by_date` = ? WHERE `sign_up_id` = ?',
        bind: [this.transformedData[0].sign_up_id, this.transformedData[0].source, this.transformedData[0].medium, this.destination.getCurrentDateTime(), this.transformedData[0].sign_up_id],
      },
      {
        sql: 'UPDATE `sign_ups` SET `sign_up_id` = ?, `source` = ?, `medium` = ?, `modified_by_date` = ? WHERE `sign_up_id` = ?',
        bind: [this.transformedData[1].sign_up_id, this.transformedData[1].source, this.transformedData[1].medium, this.destination.getCurrentDateTime(), this.transformedData[1].sign_up_id],
      },
    ];
  }

  @test async store() {
    sinon.stub(moment(), 'format').returns('today');
    const processRecordsStub = sinon.stub(this.destination, 'processRecords');
    processRecordsStub.returns(null);

    await this.destination.store(this.batch);
    processRecordsStub.lastCall.args[0].must.eql(this.getUpdateQueries());

    processRecordsStub.resetBehavior();
  }

}
