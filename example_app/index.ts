import { LogManager, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import * as program from 'commander';
import { SourceConfigManager } from '../src/sources/SourceConfigManager';
import { TransformerConfigManager } from '../src/transformers/TransformerConfigManager';
import { DestinationConfigManager } from '../src/destinations/DestinationConfigManager';
import { ConfigConfigManager } from '../src/ConfigConfigManager';
import { RunnerConfigManager } from '../src/RunnerConfigManager';
import { SavepointConfigManager } from '../src/savepoints/SavepointConfigManager';

program.version('0.1.0')
  .usage('[options] <etlName>')
  .option('-v', 'verbose')
  .parse(process.argv);

if (program.args.length === 0) {
  // tslint:disable-next-line:no-console
  console.log('Please specify an etl to execute');
  // tslint:disable-next-line:no-console
  console.log(program.usage());
  process.exit(1);
}

const etlName = program.args[0];

const app = new InceptumApp();

const logger = LogManager.getLogger(__filename);

const validEtls = app.getConfig('app.validEtls', []);

if (validEtls.indexOf(etlName) < 0) {
  // tslint:disable-next-line:no-console
  console.log(`Unknown etl name: ${etlName}. Valid etls: ${validEtls.join(', ')}`);
  // tslint:disable-next-line:no-console
  console.log(program.usage());
  process.exit(1);
}

logger.info(`Starting execution of ETL: ${etlName}`);

// Load all the objects required: Savepoint, Destination, Transformer, Source, Config and runner
const context = app.getContext();
SavepointConfigManager.registerSingletons(etlName, context);
DestinationConfigManager.registerSingletons(etlName, context);
TransformerConfigManager.registerSingletons(etlName, context);
SourceConfigManager.registerSingletons(etlName, context);
ConfigConfigManager.registerSingletons(etlName, context);
RunnerConfigManager.registerSingletons(etlName, context);

const f = async () => {
  await app.start();

  // Runn the ETL
  const etlRunner = await context.getObjectByName('EtlRunner');
  etlRunner.executeEtl()
      .then(function(val) {
          // log success
          logger.info(`Finished all good`);
      })
      .catch(function(err) {
          // log err.message);
          logger.fatal(`Finished Error:${err.message}`);
      });
  // tslint:disable-next-line:no-console
  console.log('The runner is', etlRunner);
  await app.stop();
};
f();
