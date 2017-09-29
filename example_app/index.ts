import { LogManager, InceptumApp, Context } from 'inceptum';
import * as program from 'commander';
import { SourcePlugin,
  TransformerPlugin,
  DestinationPlugin,
  ConfigPlugin,
  RunnerPlugin,
  SavepointPlugin,
} from 'inceptum-etl';

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

// const etlPlugin = new EtlPlugin(etlName);
// app.use(etlPlugin);
const context = app.getContext();
app.use(new SavepointPlugin(etlName),
        new DestinationPlugin(etlName),
        new TransformerPlugin(etlName),
        new SourcePlugin(etlName),
        new ConfigPlugin(etlName),
        new RunnerPlugin(etlName),
      );

const f = async () => {
  await app.start();

  // Run the ETL
  const etlRunner = await context.getObjectByName('EtlRunner');
  try {
    await etlRunner.executeEtl()
        .then(function() {
            // log success
            logger.info(`Finished all good`);
        });
  } catch (err) {
    logger.fatal(err, `Finished Error:${err.message}`);
  }
  // tslint:disable-next-line:no-console
  console.log('The runner is', etlRunner);
  await app.stop();
};
f().catch( (err) => {
  logger.fatal(err, `Etl finished before starting :${err.message}`);
});
