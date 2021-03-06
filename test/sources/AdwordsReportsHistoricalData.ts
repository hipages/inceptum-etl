import { must } from 'must';
import * as utilConfig from 'config';
import { suite, test, slow, timeout, skip } from 'mocha-typescript';
import * as moment from 'moment';
import BaseApp from 'inceptum/dist/app/BaseApp';
import { EtlBatch, EtlState } from '../../src/EtlBatch';
import { StaticSavepointManager } from '../../src/savepoints/StaticSavepointManager';
import { AdwordsReportsHistoricalData } from '../../src/sources/AdwordsReportsHistoricalData';
import { SourcePlugin } from '../../src/sources/SourcePlugin';

const adwordsConfig = utilConfig.get('etls.test_12.source');
const savePointConfig = utilConfig.get('etls.test_12.savepoint.savepoint');
// tslint:disable-next-line
const yesterday = moment().subtract(1, 'days');
const today = moment();

class HelperAdwordsReports extends AdwordsReportsHistoricalData {
  // Overrite getNextBatch to test changing savepoint
  public async getNextBatch(): Promise<EtlBatch> {
    if (this.hasNextBatch()) {
      this.currentSavePoint = this.getNextSavePoint();
    }
    const batch =  new EtlBatch([], this.currentSavePoint['currentBatch'], this.totalBatches, this.getCurrentBatchIdentifier());
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
}

suite('AdwordsReportsHistoricalData', () => {
  suite('Test public methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test initial savepoint formated', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.getInitialSavepoint().must.be.equal('{"startDate":"20170901","endDate":"20170910","paceAmount":1,"paceTime":"months","finalDate":"20170701","currentBatch":1,"totalBatches":1,"currentDate":"2017-08-01T01:14:37.995Z"}');
      source.getInitialSavepointObject().must.be.eql({startDate: '20170901', endDate: '20170910', paceAmount: 1, paceTime: 'months', finalDate: '20170701', currentBatch: 1, totalBatches: 1, currentDate: '2017-08-01T01:14:37.995Z'});
    });
    test('Test initial savepoint manager', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const manager = source.getSavepointManager();
      manager.must.be.equal(savePointManager);
    });
    test('Test empty savepoint', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      await source.initSavePoint(new StaticSavepointManager(''));
      const savePoint = source.getInitialSavepointObject();
      savePoint['startDate'].must.be.equal(yesterday.format('YYYYMMDD'));
      savePoint['endDate'].must.be.equal(today.format('YYYYMMDD'));
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('days');
      savePoint['finalDate'].must.be.equal(yesterday.format('YYYYMMDD'));
    });
    test('Test defaultSavePoint', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.defaultSavePoint();
      savePoint['startDate'].must.be.equal(yesterday.format('YYYYMMDD'));
      savePoint['endDate'].must.be.equal(today.format('YYYYMMDD'));
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('days');
      savePoint['finalDate'].must.be.equal(yesterday.format('YYYYMMDD'));
    });
    test('Test current savePoint', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('20170801');
      savePoint['endDate'].must.be.equal('20170831');
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('months');
      savePoint['finalDate'].must.be.equal('20170701');
      savePoint['currentBatch'].must.be.equal(0);
      savePoint['totalBatches'].must.be.equal(2);
    });
    test('Test hasNextBatch', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      await source.initSavePoint(savePointManager);
      source.hasNextBatch().must.be.true();
    });
    test('Test query in config', async () => {
      const source = new AdwordsReportsHistoricalData(adwordsConfig);
      source.getQuery().must.be.equal('SELECT AccountDescriptiveName, AccountTimeZone, CampaignName, CampaignId, AdGroupName, AdGroupId, Criteria, Id, KeywordMatchType, Status, Date, Device, Impressions, Clicks, Conversions, Cost, Ctr, AverageCpc, ConversionRate, CpcBid,  CpcBidSource, QualityScore, HasQualityScore, CreativeQualityScore, CriteriaDestinationUrl, AveragePosition, FirstPageCpc, FirstPositionCpc, TopOfPageCpc, IsNegative, SearchExactMatchImpressionShare, SearchImpressionShare, SearchRankLostImpressionShare, BidType FROM   KEYWORDS_PERFORMANCE_REPORT WHERE  Clicks > 0');
    });
  });

  suite('Test private methods:', () => {
    const savePointManager = new StaticSavepointManager(savePointConfig);
    test('Test stringToSavePoint', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePoint = source.exposeStringToSavePoint(savePointConfig);
      savePoint['startDate'].must.be.equal('20170901');
      savePoint['endDate'].must.be.equal('20170910');
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('months');
      savePoint['finalDate'].must.be.equal('20170701');
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(1);
   });
    test('Test savePointToString', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
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
    test('Test change state', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const batch = await source.getNextBatch();
      await batch.setState(EtlState.ERROR);
      source.getErrorFound().must.be.true();
    });
    test('Test getNextSavePoint', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      const savePointInit = source.getCurrentSavepointObject();
      savePointInit['startDate'].must.be.equal('20170801');
      savePointInit['endDate'].must.be.equal('20170831');
      savePointInit['paceAmount'].must.be.equal(1);
      savePointInit['paceTime'].must.be.equal('months');
      savePointInit['finalDate'].must.be.equal('20170701');
      savePointInit['currentBatch'].must.be.equal(0);
      savePointInit['totalBatches'].must.be.equal(2);

      let savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('20170801');
      savePoint['endDate'].must.be.equal('20170831');
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('months');
      savePoint['finalDate'].must.be.equal('20170701');
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(2);
      await source.getNextBatch();

      await source.getNextBatch();
      savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('20170801');
      savePoint['endDate'].must.be.equal('20170831');
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('months');
      savePoint['finalDate'].must.be.equal('20170701');
      savePoint['currentBatch'].must.be.equal(2);
      savePoint['totalBatches'].must.be.equal(2);

      await source.getNextBatch();
      savePoint = source.getCurrentSavepointObject();
      savePoint['startDate'].must.be.equal('20170701');
      savePoint['endDate'].must.be.equal('20170731');
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('months');
      savePoint['finalDate'].must.be.equal('20170701');
      savePoint['currentBatch'].must.be.equal(1);
      savePoint['totalBatches'].must.be.equal(2);

      savePoint = source.exposeGetNextSavePoint();
      savePoint['startDate'].must.be.equal('20170701');
      savePoint['endDate'].must.be.equal('20170731');
      savePoint['paceAmount'].must.be.equal(1);
      savePoint['paceTime'].must.be.equal('months');
      savePoint['finalDate'].must.be.equal('20170701');
      savePoint['currentBatch'].must.be.equal(2);
      savePoint['totalBatches'].must.be.equal(2);
    });
    test('Test update savepoint', async () => {
      const source = new HelperAdwordsReports(adwordsConfig);
      await source.initSavePoint(savePointManager);
      // Emulates 2 batches call
      await source.getNextBatch();
      await source.getNextBatch();
      await source.stateChanged(EtlState.SAVE_ENDED);
      const current = source.getCurrentSavepoint();
      const finalSavePoint = await savePointManager.getSavePoint();
      finalSavePoint.must.be.equal(current);
      const sourceSave = source.getCurrentSavepointObject();
      sourceSave['startDate'].must.be.equal('20170801');
      sourceSave['endDate'].must.be.equal('20170831');
      sourceSave['paceAmount'].must.be.equal(1);
      sourceSave['paceTime'].must.be.equal('months');
      sourceSave['finalDate'].must.be.equal('20170701');
      sourceSave['currentBatch'].must.be.equal(2);
      sourceSave['totalBatches'].must.be.equal(2);
    });
  });

  suite('Test using the plugin to ensure the parameters are passed:', () => {
    const app = new BaseApp();
    const context = app.getContext();
    const pluginObj = new SourcePlugin('test_12');
    app.use(pluginObj);

    test('Test the type of object:', async () => {
      await app.start();
      const source = await context.getObjectByName('EtlSource');
      source.must.be.instanceof(AdwordsReportsHistoricalData);
      await app.stop();
    });
    test('Test configuration: getAccount', async () => {
      const source = await context.getObjectByName('EtlSource');
      source.getAccount().must.be.equal('THE_ACCOUNT_NAME');
    });
    test('Test configuration: getTotalBatches', async () => {
      const source = await context.getObjectByName('EtlSource');
      source.getTotalBatches().must.be.equal(2);
    });
    test('Test configuration: getAccountList', async () => {
      const source = await context.getObjectByName('EtlSource');
      source.getAccountList().must.be.eql([
            {name: 'ADWORDS_ACOUNT_NAME_1', id: 'ADWORDS_ACOUNT_ID_1'},
            {name: 'ADWORDS_ACOUNT_NAME_2', id: 'ADWORDS_ACOUNT_ID_2'},
        ]);
    });
    test('Test configuration: getQuery', async () => {
      const source = await context.getObjectByName('EtlSource');
      source.getQuery().must.be.equal('SELECT AccountDescriptiveName, AccountTimeZone, CampaignName, CampaignId, AdGroupName, AdGroupId, Criteria, Id, KeywordMatchType, Status, Date, Device, Impressions, Clicks, Conversions, Cost, Ctr, AverageCpc, ConversionRate, CpcBid,  CpcBidSource, QualityScore, HasQualityScore, CreativeQualityScore, CriteriaDestinationUrl, AveragePosition, FirstPageCpc, FirstPositionCpc, TopOfPageCpc, IsNegative, SearchExactMatchImpressionShare, SearchImpressionShare, SearchRankLostImpressionShare, BidType FROM   KEYWORDS_PERFORMANCE_REPORT WHERE  Clicks > 0');
    });
    test('Test configuration: getConfigAdwords', async () => {
      const source = await context.getObjectByName('EtlSource');
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
  });
});
