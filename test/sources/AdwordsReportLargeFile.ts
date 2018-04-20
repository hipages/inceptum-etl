import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as moment from 'moment';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { AdwordsReportLargeFile } from '../../src/sources/AdwordsReportLargeFile';
import { SourcePlugin } from '../../src/sources/SourcePlugin';

const adwordsConfig = utilConfig.get('etls.test_14.source');
const savePointConfig = utilConfig.get('etls.test_14.savepoint.savepoint');
// tslint:disable-next-line
const yesterday = moment().subtract(1, 'days');
const today = moment();

class HelperAdwordsReportLargeFile extends AdwordsReportLargeFile {
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

  public getLastDay(): string {
    return this.lastDay;
  }

  public getLastLine(): string {
    return this.lastLine;
  }

  public getCurrentLineNumber(): number {
    return this.currentLineNumber;
  }

  protected async fileInitCurrentSavePoint() {
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

  // Overwrite getAdwordsReport to test changing savepoint
  // tslint:disable-next-line:prefer-function-over-method
  protected async getAdwordsReport(savePoint: object) {
    const x = 1;
  }

  /**
   * This method can be overwritten to set the required data to fetch the next batch
   */
  protected async initCurrentSavePoint() {
    // tslint:disable-next-line
    const start = moment(this.initialSavePoint['endDate']).add(1, 'days');
    const currentSavePoint = {
      startDate: start.isBefore(this.lastDay) ? start.format('YYYYMMDD') : this.lastDay,
      endDate: this.lastDay,
      currentDate: moment().toISOString(),
    };
    await this.getAdwordsReport(currentSavePoint);
    await this.fileInitCurrentSavePoint();
    this.currentSavePoint = {
      ...this.currentSavePoint,
      ...currentSavePoint,
    };
  }

  public exposeStringToSavePoint(savePoint: string) {
    return this.stringToSavePoint(savePoint);
  }
  public exposeSavePointToString(savePoint: object) {
    return this.savePointToString(savePoint);
  }
}

suite('AdwordsReportLargeFile', () => {
  const savePointManager = new StaticSavepointManager(savePointConfig);

  suite('Test the helper:', () => {
    test('reader', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      source.fileReader.next().must.be.equal(`"line_1 one","line_1 two","line_1 three"`);
      source.line.must.be.eql(1);
    });

    test('lastLine', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.getLastLine().must.be.equal(`"line_1 one","line_1 two","line_1 three"`);
      source.getCurrentLineNumber().must.be.eql(1);
    });
  });

  suite('Test public methods:', () => {
    test('initial savepoint formated', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('{"startDate":"20170731","endDate":"20170801","currentDate":"2017-08-01T01:14:37.995Z","blockSize":2,"line":0,"batchNumber":0}');
      source.getInitialSavepointObject().must.be.eql({
        blockSize: 2,
        line: 0,
        batchNumber: 0,
        startDate: '20170731',
        endDate: '20170801',
        currentDate: '2017-08-01T01:14:37.995Z',
      });
    });
    test('initial savepoint manager', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('empty savepoint', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
      savePoint['startDate'].must.be.equal(today.format('YYYYMMDD'));
      savePoint['endDate'].must.be.equal(today.format('YYYYMMDD'));
      savePoint['blockSize'].must.be.equal(1000);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('defaultSavePoint', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['startDate'].must.be.equal(today.format('YYYYMMDD'));
      savePoint['endDate'].must.be.equal(today.format('YYYYMMDD'));
      savePoint['blockSize'].must.be.equal(1000);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('current savePoint', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('20170802');
      savePoint['endDate'].must.be.equal(source.getLastDay());
      savePoint['blockSize'].must.be.equal(2);
      savePoint['line'].must.be.equal(0);
      savePoint['batchNumber'].must.be.equal(0);
    });
    test('hasNextBatch', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
    test('query in config', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      source.getQuery().must.be.equal('SELECT QueryMatchTypeWithVariant, Query, CampaignId, CampaignName, AdGroupId, AdGroupName, Clicks, Impressions, Ctr, AverageCpc, Cost,AveragePosition, Conversions, CostPerConversion, ConversionRate, AllConversions, ViewThroughConversions FROM SEARCH_QUERY_PERFORMANCE_REPORT ');
    });
  });

  suite('Test private methods:', () => {
    test('stringToSavePoint', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint.must.be.eql({
        startDate: '20170731',
        endDate: '20170801',
        currentDate: '2017-08-01T01:14:37.995Z',
        blockSize: 2,
        line: 0,
        batchNumber: 0,
      });
   });
    test('savePointToString', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeSavePointToString({
        startDate: '2017-08-10',
        endDate: '2017-08-12',
        blockSize: 1,
        line: 1,
        batchNumber: 10,
        currentDate: '2017-08-01T01:14:37.995Z',
      });
      savePoint.must.be.equal('{"startDate":"2017-08-10","endDate":"2017-08-12","blockSize":1,"line":1,"batchNumber":10,"currentDate":"2017-08-01T01:14:37.995Z"}');
    });
  });

  suite('Test batch:', () => {
    test('batch build', async () => {
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const batch = await source.getNextBatch();
      batch.getBatchIdentifier().must.be.equal('1');
      batch.getNumRecords().must.be.equal(2);
      const records = batch.getRecords();
      let record = records[0];
      record['state'].must.be.eql(EtlState.CREATED);
      record['data'].must.be.eql({
          one: 'line_1 one',
          two: 'line_1 two',
          three: 'line_1 three',
        });
      record = records[1];
      record['state'].must.be.eql(EtlState.CREATED);
      record['data'].must.be.eql({
          one: 'line_2 one',
          two: 'line_2 two',
          three: 'line_2 three',
        });
    });
    test('change state', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(manager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('update savepoint finish', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
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
      savePoint['startDate'].must.be.equal('20170802');
      savePoint['endDate'].must.be.equal(source.getLastDay());
    });
    test('update savepoint', async () => {
      const manager = new StaticSavepointManager(savePointConfig);
      const source = new HelperAdwordsReportLargeFile(adwordsConfig);
      await source.initSavePoint(manager);
      // Emulates 1 batch call
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['blockSize'].must.be.equal(2);
      savePoint['line'].must.be.equal(2);
      savePoint['batchNumber'].must.be.equal(1);
      savePoint['startDate'].must.be.equal('20170802');
      savePoint['endDate'].must.be.equal(source.getLastDay());
    });

  });

  suite('Test using the plugin to ensure the parameters are passed:', async () => {
    const app = new BaseApp();
    const context = app.getContext();
    const pluginObj = new SourcePlugin('test_14');
    let source: any;
    before('start', async () => {
      app.use(pluginObj);
      await app.start();
      source = await context.getObjectByName('EtlSource');
    });

    test('the type of object:', async () => {
        source.must.be.instanceof(AdwordsReportLargeFile);
    });
    test('configuration: getAccount', async () => {
        source.getAccount().must.be.equal('THE_ACCOUNT_NAME');
    });
    test('configuration: getQuery', async () => {
        source.getQuery().must.be.equal('SELECT QueryMatchTypeWithVariant, Query, CampaignId, CampaignName, AdGroupId, AdGroupName, Clicks, Impressions, Ctr, AverageCpc, Cost,AveragePosition, Conversions, CostPerConversion, ConversionRate, AllConversions, ViewThroughConversions FROM SEARCH_QUERY_PERFORMANCE_REPORT ');
    });
    test('configuration: getConfigAdwords', async () => {
        source.getConfigAdwords().must.be.eql({
            developerToken: 'DEVELOPER_TOKEN',
            userAgent: 'YOUR_PROJECT_NAME',
            clientCustomerId: 'ADWORDS_MCC_ACCOUNT_ID',
            client_id: 'ADWORDS_API_CLIENT_ID',
            client_secret: 'ADWORDS_API_CLIENT_SECRET',
            refresh_token: 'ADWORDS_API_REFRESHTOKEN',
            version: 'v201705',
            proxy: undefined,
        });
    });

    after('stop', async () => {
      await app.stop();
    });
  });
});
