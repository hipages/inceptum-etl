import { must } from 'must';
import * as utilConfig from 'config';
import * as sinon from 'sinon';
import * as moment from 'moment';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import { InceptumApp } from 'inceptum';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { ReadCsvFile, ReadCsvFileConfig } from '../../src/sources/ReadCsvFile';
import { SourcePlugin } from '../../src/sources/SourcePlugin';

const sourceConfig = utilConfig.get('etls.test_13.source');
const savePointConfig = utilConfig.get('etls.test_13.savepoint.savepoint');
// tslint:disable-next-line
const yesterday = moment().subtract(1, 'days');
const today = moment();

class HelperReadCsvFile extends ReadCsvFile {
  // emulate fileReader
  line = 0;
  lines =  [`"line_1 one","line_1 two","line_1 three"`,
  `"line_2 one","line_2 two","line_2 three"`,
  `"line_3 one","line_3 two","line_3 three"`,
  `"line_4 one","line_4 two","line_4 three"`,
  ];
  public fileReader = {
    next: () => {
      const r = (this.line <= this.lines.length) ? this.lines[this.line] : false;
      this.line++;
      return r;
    },
  };

  protected async initCurrentSavePoint() {
    if (this.fileHasHeader) {
      this.headers = ['one', 'two', 'three'];
    }
    this.currentSavePoint = {
      blockSize: Number(this.initialSavePoint['blockSize']) || this.defaultBlockSize,
      line: Number(this.initialSavePoint['line']) || 0,
      batchNumber: Number(this.initialSavePoint['batchNumber']) || 0,
    };
    // Keep the last line read to know if has next batch
    this.lastLine = this.fileReader.next();
    if (this.lastLine) {
      this.currentLineNumber = 1;
    }
  }

  public getLastLine(): string {
    return this.lastLine;
  }

  public getCurrentLineNumber(): number {
    return this.currentLineNumber;
  }

  public exposeStringToSavePoint(savePoint: string) {
    return this.stringToSavePoint(savePoint);
  }
  public exposeSavePointToString(savePoint: object) {
    return this.savePointToString(savePoint);
  }
}

suite('ReadCsvFile', () => {
  const savePointManager = new StaticSavepointManager(savePointConfig);

  suite('Test the helper:', () => {
    test('reader', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      source.fileReader.next().must.be.equal(`"line_1 one","line_1 two","line_1 three"`);
      source.line.must.be.eql(1);
    });

    test('lastLine', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      source.getLastLine().must.be.equal(`"line_1 one","line_1 two","line_1 three"`);
      source.getCurrentLineNumber().must.be.eql(1);
    });
  });

  suite('Test public methods:', () => {
    test('initial savepoint formated', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('{"blockSize":2,"line":0,"batchNumber":0}');
      source.getInitialSavepointObject().must.be.eql({blockSize: 2, line: 0, batchNumber: 0});
    });
    test('initial savepoint manager', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('empty savepoint', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
      savePoint['blockSize'].must.be.equal(1000);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('defaultSavePoint', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['blockSize'].must.be.equal(1000);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('current savePoint', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['blockSize'].must.be.equal(2);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('hasNextBatch', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
    test('loadHeader', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      const h = await source.loadHeader(`"one","two","three"`);
      h.must.be.eql(['one', 'two', 'three']);
    });
    test('getCurrentBatchIdentifier', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      source.getCurrentBatchIdentifier().must.be.eql(`0`);
    });

  });

  suite('Test private methods:', () => {
    test('stringToSavePoint', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['blockSize'].must.be.equal(2);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
   });
    test('savePointToString', async () => {
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeSavePointToString({
        blockSize: 300,
        line: 10,
        batchNumber: 3,
      });
      savePoint.must.be.equal('{"blockSize":300,"line":10,"batchNumber":3}');
    });
  });

  suite('Test process:', () => {
    test('batch build', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(manager);
      const batch = await source.getNextBatch();
      batch.getBatchIdentifier().must.be.equal('1');
      batch.getNumRecords().must.be.equal(2);
      const records = batch.getRecords();
      let record = records[0];
      record['state'].must.be.eql(EtlState.CREATED);
      record['data'].must.be.eql({
          header_1: 'line_1 one',
          header_2: 'line_1 two',
          header_3: 'line_1 three',
        });
      record = records[1];
      record['state'].must.be.eql(EtlState.CREATED);
      record['data'].must.be.eql({
          header_1: 'line_2 one',
          header_2: 'line_2 two',
          header_3: 'line_2 three',
        });
    });
    test('Test change state', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(manager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('Test update savepoint when finished', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(manager);
      // Emulates 2 batches call
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await manager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['blockSize'].must.be.equal(2);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('Test update savepoint', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperReadCsvFile(sourceConfig);
      await source.initSavePoint(manager);
      // Emulates 1 batch call
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['blockSize'].must.be.equal(2);
      savePoint['line'].must.be.equal(2);
      savePoint['batchNumber'].must.be.equal(1);
    });

  });

  suite('Tes using the plugin to ensure the parameters are passed:', async () => {
    const app = new InceptumApp();
    const context = app.getContext();
    const pluginObj = new SourcePlugin('test_13');
    app.use(pluginObj);
    await app.start();
    const source = await context.getObjectByName('EtlSource');

    test('type of object:', async () => {
        source.must.be.instanceof(ReadCsvFile);
    });
    test('configuration: getFileName', async () => {
        source.getFileName().must.be.equal('./this/is/an/example.txt');
    });
    test('configuration: getFileHasHeader', async () => {
        source.getFileHasHeader().must.be.false();
    });
    test('configuration: getHeaders', async () => {
      source.getHeaders().must.be.eql(['header_1', 'header_2', 'header_3']);
    });
  });
});
