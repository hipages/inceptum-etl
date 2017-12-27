import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as moment from 'moment';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { GoogleAnalyticsReporting } from '../../src/sources/GoogleAnalyticsReporting';

const gaConfig = utilConfig.get('etls.test_15.source');
const savePointConfig = utilConfig.get('etls.test_5.savepoint.savepoint');
// tslint:disable-next-line
const twoDaysAgo = moment().subtract(2, 'days');
const oneDaysAgo = moment().subtract(1, 'days');
const lastDay = moment();

const reportRequest = {
  key: 'ga:transactionId',
  keyStringPart: 'JOB',
  dimensions: [ {
    'ga:transactionId': 'transactionId',
    'ga:campaign': 'campaign',
    'ga:adGroup': 'adGroup',
    'ga:source': 'source',
    'ga:medium': 'medium',
    'ga:keyword': 'keyword',
    'ga:landingPagePath': 'landingPagePath',
    'ga:adMatchedQuery': 'adMatchedQuery',
    'ga:deviceCategory': 'deviceCategory',
  },
  {
    'ga:browser': 'browser',
    'ga:browserVersion': 'browserVersion',
    'ga:browserSize': 'browserSize',
  },
  {
    'ga:dimension15': 'dimension15',
  },
  {
    'ga:landingContentGroup5': 'landingContentGroup5',
  },
  ],
  metric: 'ga:transactions',
  filters: 'ga:transactionId=~^JOB*',
  orderBys: ['ga:transactionId'], // 'ga:dateHourMinute'
};

const dimensionGroups = [
    [ 'ga:transactionId',
      'ga:campaign',
      'ga:adGroup',
      'ga:source',
      'ga:medium',
      'ga:keyword',
      'ga:landingPagePath',
      'ga:adMatchedQuery',
      'ga:deviceCategory',
    ],
    [
      'ga:browser',
      'ga:browserVersion',
      'ga:browserSize',
      'ga:transactionId',
    ],
    [
      'ga:dimension15',
      'ga:transactionId',
    ],
    [
      'ga:landingContentGroup5',
      'ga:transactionId',
    ],
];

const testObject = {
  reports: [
      {
          columnHeader: {
              dimensions: [
                  'ga:transactionId',
                  'ga:browser',
                  'ga:deviceCategory',
                  'ga:browserVersion',
                  'ga:browserSize',
                  'ga:adMatchedQuery',
              ],
              metricHeader: {
                  metricHeaderEntries: [
                      {
                          name: 'ga:transactions',
                          type: 'INTEGER',
                      },
                  ],
              },
          },
          data: {
              rows: [
                  {
                      dimensions: [
                          'JOB3649837',
                          'Chrome',
                          'tablet',
                          '59.0.3071.125',
                          '1100x1290',
                          '(not set)',
                      ],
                      metrics: [
                          {
                              values: [
                                  '1',
                              ],
                          },
                      ],
                  },
                  {
                      dimensions: [
                          'JOB3664260',
                          'Chrome',
                          'mobile',
                          '49.0.2623.91',
                          '360x560',
                          '(not set)',
                      ],
                      metrics: [
                          {
                              values: [
                                  '1',
                              ],
                          },
                      ],
                  },
                  {
                      dimensions: [
                          'JOB3670766',
                          'Chrome',
                          'mobile',
                          '59.0.3071.125',
                          '380x560',
                          'hipages',
                      ],
                      metrics: [
                          {
                              values: [
                                  '1',
                              ],
                          },
                      ],
                  },
              ],
              totals: [
                  {
                      values: [
                          '3882',
                      ],
                  },
              ],
              rowCount: 3849,
              minimums: [
                  {
                      values: [
                          '1',
                      ],
                  },
              ],
              maximums: [
                  {
                      values: [
                          '5',
                      ],
                  },
              ],
              isDataGolden: true,
          },
          nextPageToken: 1001,
      },
  ],
};

class HelperGoogleAnalyticsReporting extends GoogleAnalyticsReporting {
  // Overwrite getNextBatch to test changing savepoint
  public async getNextBatch(): Promise<EtlBatch> {
    if (this.hasNextBatch()) {
      this.currentSavePoint = this.getNextSavePoint();
    }
    const batch =  new EtlBatch([], this.currentSavePoint['currentBatch'], this.currentSavePoint['totalBatches'], `${this.currentSavePoint['startDate']}:${this.currentSavePoint['endDate']}:${this.currentSavePoint['currentBatch']}`);
    batch.registerStateListener(this);
    return batch;
  }
  public exposeGetNextSavePoint() {
    return this.getNextSavePoint();
  }
  public exposeStringToSavePoint(savePoint: string) {
    return this.stringToSavePoint(savePoint);
  }
  public exposeSavePointToString(savePoint: object) {
    return this.savePointToString(savePoint);
  }
  public getReportRequest(): object {
    return this.reportRequest;
  }
  public getDateRanges(): object {
    return this.dateRanges;
  }
  public getLastKey(result, key) {
    return super.getLastKey(result, key);
  }
  public exposeConstructDimensions() {
    return HelperGoogleAnalyticsReporting.constructDimensions(this.reportRequest['dimensions'], this.reportRequest['key']);
  }
  public exposeSetRowCount(results) {
    this.setRowCount(results);
    return this.rowCount;
  }
  public exposeSetNextPageToken(results, lastKey, maxResults) {
    this.MAX_RESULTS = maxResults;
    this.setNextPageToken(results, lastKey);
    return this.nextPageToken;
  }
//   public exposeSavePointToString(savePoint: object) {
//     return this.setNextPageToken(savePoint);
//   }
//   public exposeSavePointToString(savePoint: object) {
//     return this.savePointToString(savePoint);
//   }

}

suite('GoogleAnalyticsReporting', () => {

  suite('Test public methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test initial savepoint manager', async () => {
      const source = new GoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test empty savepoint', async () => {
      const source = new GoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
      savePoint['startDate'].must.be.equal(twoDaysAgo.format('YYYY-MM-DD'));
      savePoint['endDate'].must.be.equal(oneDaysAgo.format('YYYY-MM-DD'));
    });
    test('Test defaultSavePoint', async () => {
      const source = new GoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['startDate'].must.be.equal(twoDaysAgo.format('YYYY-MM-DD'));
      savePoint['endDate'].must.be.equal(oneDaysAgo.format('YYYY-MM-DD'));
    });
    test('Test current savePoint', async () => {
      const source = new GoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('2017-08-11');
      savePoint['endDate'].must.be.equal('2017-08-12');
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(1);
    });
    test('Test hasNextBatch', async () => {
      const source = new GoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
  });

  suite('Test private methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test stringToSavePoint', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['startDate'].must.be.equal('2017-08-10');
      savePoint['endDate'].must.be.equal('2017-08-12');
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(1);
   });
    test('Test savePointToString', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeSavePointToString({
        startDate: '2017-08-10',
        endDate: '2017-08-12',
        currentBatch: 1,
        totalBatches: 1,
        currentDate: '2017-08-01T01:14:37.995Z',
      });
      savePoint.must.be.equal('{"startDate":"2017-08-10","endDate":"2017-08-12","currentBatch":1,"totalBatches":1,"currentDate":"2017-08-01T01:14:37.995Z"}');
    });
    test('Test getDateRanges', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const ranges = source.getDateRanges();
      ranges['startDate'].must.be.equal('2017-08-11');
      ranges['endDate'].must.be.equal('2017-08-11');
    });
    test('Test getMyDimensions', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      source.getReportRequest().must.be.eql(reportRequest);
    });
    test('Test change state', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('Test getNextSavePoint', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      const savePointInit = source.getCurrentSavepointObject();
      savePointInit['startDate'].must.be.equal('2017-08-11');
      savePointInit['endDate'].must.be.equal('2017-08-12');
      savePointInit['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(1);
      let savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('2017-08-11');
      savePoint['endDate'].must.be.equal('2017-08-12');
      savePoint['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(1);
      await source.getNextBatch();
      savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('2017-08-12');
      savePoint['endDate'].must.be.equal('2017-08-13');
      savePoint['currentBatch'].must.be.equal(1);
      savePointInit['totalBatches'].must.be.equal(1);
    });
    test('Test update savepoint', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const sourceSave = source.exposeStringToSavePoint(current);
      sourceSave['startDate'].must.be.equal('2017-08-12');
      sourceSave['endDate'].must.be.equal('2017-08-13');
      sourceSave['currentBatch'].must.be.equal(1);
      sourceSave['totalBatches'].must.be.equal(1);
    });
    test('Test lastKeys', async () => {
      const source = new HelperGoogleAnalyticsReporting(gaConfig);
      source.getLastKey([ testObject ], reportRequest.key).must.be.equal('JOB3670766');
    });
    test('Test constructDimensions', async () => {
        const source = new HelperGoogleAnalyticsReporting(gaConfig);
        source.exposeConstructDimensions().must.be.eql(dimensionGroups);
    });
    test('Test setRowCount', async () => {
        const source = new HelperGoogleAnalyticsReporting(gaConfig);
        source.exposeSetRowCount([testObject, testObject, testObject, testObject]).must.be.eql([3849, 3849, 3849, 3849]);
    });
    test('Test setNextPageToken more than one batch', async () => {
        const source = new HelperGoogleAnalyticsReporting(gaConfig);
        source.exposeSetNextPageToken([testObject, testObject, testObject, testObject], 'JOB3670766', 1000).must.be.eql([1001, 4, 4, 4]);
    });
    test('Test setNextPageToken one batch', async () => {
        const source = new HelperGoogleAnalyticsReporting(gaConfig);
        source.exposeSetNextPageToken([testObject, testObject, testObject, testObject], 'JOB3670766', 100000).must.be.eql([1001, 1001, 1001, 1001]);
    });
    test('Test setNextPageToken more than one result 2', async () => {
        const source = new HelperGoogleAnalyticsReporting(gaConfig);
        source.exposeSetNextPageToken([testObject, testObject, testObject, testObject], 'JOB3649836', 1000).must.be.eql([1001, 1, 1, 1]);
    });
  });
});
