import { must } from 'must';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';

import { EtlBatch, EtlBatchRecord, EtlState, EtlStateListener } from '../src/EtlBatch';

class TestListener implements EtlStateListener {
    public value = false;
    public async stateChanged(newState: EtlState): Promise<void> {
        this.value = true;
        return Promise.resolve();
    }
}

suite('EtlBatch', () => {
  suite('EtlBatchRecord test', () => {
    test('Test create record', async () => {
      const record = new EtlBatchRecord({id: 1, name: 'part 1'});
      record.getState().must.be.equal(EtlState.CREATED);
      const data = record.getData();
      data.hasOwnProperty('id').must.true();
      data.hasOwnProperty('name').must.true();
      data['id'].must.be.equal(1);
      data['name'].must.be.equal('part 1');
    });
    test('Test state', async () => {
      const record = new EtlBatchRecord({id: 1, name: 'part 1'});
      record.setState(EtlState.ERROR);
      record.getState().must.be.equal(EtlState.ERROR);
    });
    test('Test transformed data', async () => {
      const record = new EtlBatchRecord({id: 1, name: 'part 1'});
      record.setTransformedData({id: 2, name: 'part 2'});
      const data = record.getTransformedData();
      data.hasOwnProperty('id').must.true();
      data.hasOwnProperty('name').must.true();
      data['id'].must.be.equal(2);
      data['name'].must.be.equal('part 2');
      record.getState().must.be.equal(EtlState.TRANSFORMED);
    });
  });
  suite('EtlBatchRecord test', () => {
    test('Test create batch', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}], 1, 4);
      batch.getNumRecords().must.be.equal(2);
      batch.getBatchNumber().must.be.equal(1);
      batch.getTotalBatches().must.be.equal(4);
    });
    test('Test addSourceRecords', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}]);
      batch.addSourceRecords([{id: 3, name: 'part 3'}, {id: 4, name: 'part 4'}]);
      batch.getNumRecords().must.be.equal(4);
    });
    test('Test addSourceRecord', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}]);
      batch.addSourceRecord({id: 3, name: 'part 3'});
      batch.getNumRecords().must.be.equal(3);
    });
    test('Test etl name', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}]);
      batch.setEtlName('test name');
      batch.getEtlName().must.be.equal('test name');
    });
    test('Test state and listener', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}]);
      const testListener = new TestListener();
      batch.registerStateListener(testListener);
      batch.setState(EtlState.SAVE_ENDED);
      batch.getState().must.be.equal(EtlState.SAVE_ENDED);
      testListener.value.must.be.true();
    });
    test('Test records with state', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}]);
      batch.getRecords().map( (record) => {
          const data = record.getData();
          if (data['id'] === 1) {
            record.setState(EtlState.ERROR);
          }
      });
      batch.getNumRecords().must.be.equal(2);
      batch.getNumRecordsWithState(EtlState.ERROR).must.be.equal(1);
      batch.getNumRecordsWithState(EtlState.CREATED).must.be.equal(1);
    });
    test('Test transformed records', async () => {
      const batch = new EtlBatch([{id: 1, name: 'part 1'}, {id: 2, name: 'part 2'}]);
      batch.getRecords().map( (record) => {
          const data = record.getData();
          if (data['id'] === 1) {
            record.setTransformedData({id: 3, name: 'part 3'});
          }
      });
      const trans = batch.getTransformedRecords();
      trans.length.must.be.equal(1);
      trans[0]['transformedData']['name'].must.be.equal('part 3');
    });
  });
});
