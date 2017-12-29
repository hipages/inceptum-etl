import { must } from 'must';
import { suite, test } from 'mocha-typescript';
import * as sinon from 'sinon';
import * as moment from 'moment';
import { DBClient, DBTransaction } from 'inceptum';
import { TransactionManager } from 'inceptum/dist/transaction/TransactionManager';
import { EtlBatch } from '../../src/EtlBatch';
import { MySqlUpdate } from '../../src/destinations/MySqlUpdate';

class MysqlClient implements DBClient {
  runInTransaction = (readonly: boolean, func: (transaction: DBTransaction) => Promise<any>): Promise<any> => {
    return Promise.resolve();
  }
}

class HelperMySqlUpdate extends MySqlUpdate {
  getCurrentDateTime() {
    return this.currentDateTime;
  }
}

class HelperDBTransaction extends DBTransaction {
  query(sql: string, ...bindArrs: any[]): Promise<any> {
    return Promise.resolve({sql, bindArrs});
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected runQueryPrivate(sql: string, bindArrs?: any[]): Promise<any> {
    return Promise.resolve({sql, bindArrs});
  }
  // tslint:disable-next-line:prefer-function-over-method
  protected runQueryAssocPrivate(sql: string, bindObj?: object): Promise<any> {
    return Promise.resolve({sql, bindObj});
  }
  // tslint:disable-next-line:prefer-function-over-method
  doTransactionEnd(): Promise<void> {
    return Promise.resolve();
  }
}

@suite class MysqlUpdateTest {
  private dbClient: DBClient;
  private destination: HelperMySqlUpdate;
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
    this.dbClient = new MysqlClient();

    this.destination = new HelperMySqlUpdate(this.dbClient, {
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
  };

  @test async store() {
    sinon.stub(moment(), 'format').returns('today');
    const processRecordsStub = sinon.stub(this.destination, 'processRecords');
    processRecordsStub.returns(null);

    await this.destination.store(this.batch);
    processRecordsStub.lastCall.args[0].must.eql(this.getUpdateQueries());

    processRecordsStub.resetBehavior();
  }

  @test async processRecords() {
    const runInTransactionStub = sinon.stub(this.dbClient, 'runInTransaction');
    runInTransactionStub.returns(Promise.resolve());

    const transaction = TransactionManager.newTransaction(false);
    const helperDBTransaction = new HelperDBTransaction(transaction);
    const queryStub = sinon.stub(helperDBTransaction, 'query');
    queryStub.returns(Promise.resolve([]));

    const updateQueries = this.getUpdateQueries();

    await this.destination.processRecords(updateQueries);

    runInTransactionStub.calledOnce.must.be.true();

    const [, func] = runInTransactionStub.lastCall.args;
    await func(helperDBTransaction);

    queryStub.calledTwice.must.be.true();
    queryStub.firstCall.calledWithExactly(updateQueries[0].sql, ...updateQueries[0].bind).must.be.true();
    queryStub.secondCall.calledWithExactly(updateQueries[1].sql, ...updateQueries[1].bind).must.be.true();
  }
}
