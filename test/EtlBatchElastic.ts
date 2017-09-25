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

suite('EtlBatchElastic', () => {

  suite('Mapping', () => {
    test('Create Mapping', () => {
      
    });
  });

  suite('Index & Type', () => {
    test('Set Index', () => {
      
    });

    test('Set Type', () => {
      
    });
  });

});
