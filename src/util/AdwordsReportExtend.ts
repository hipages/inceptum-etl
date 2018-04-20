import * as nodeAdwords from 'node-adwords';
import * as request from 'request';

export default class AdwordsReportExtend extends nodeAdwords.AdwordsReport {
  proxyUrl: string;

  constructor(config: any) {
    super(config);
    this.proxyUrl = config.proxy;
  }

  getReportAsync(apiVersion, report): Promise<any> {
    return new Promise((resolve, reject) => {
      report = report || {};
      apiVersion = apiVersion || nodeAdwords.AdwordsConstants.DEFAULT_ADWORDS_VERSION;

      const header = super.getHeaders(report.additionalHeaders, (error, headers) => {
        const req = request.defaults({ proxy: this.proxyUrl });

        req({
          uri: `https://adwords.google.com/api/adwords/reportdownload/${apiVersion}`,
          method: 'POST',
          headers,
          form: super.buildReportBody(report),
        }, (err, response, body) => {
          if (err || super.reportBodyContainsError(report, body)) {
            err = err || body;
            reject(err);
          }
          resolve(body);
        });
      });
    });
  }
}
