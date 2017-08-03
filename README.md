Inceptum Etl
====

This is a base project you can use to create your own ETLs.
This is what we use at [hipages](https://www.hipages.com.au) for our internal projects.

Benefits
-------

In this project we're managing all the basics that are needed for a ETL project:
- lenguage: typescript
- base on: [typescript base](https://github.com/hipages/typescript-base)
- easy to extend

But beyond all that the real benefit is that as we refine our standard more and more it'll be very easy to update all your projects to the latest version with a simple couple of `git` commands.

Dependencies
-------

- inceptum(https://www.npmjs.com/package/inceptum)
- bluebird(https://www.npmjs.com/package/bluebird)
- commander(https://www.npmjs.com/package/commander)
- config(https://www.npmjs.com/package/config)
- csvjson(https://www.npmjs.com/package/csvjson)
- moment(https://www.npmjs.com/package/moment)
- node-adwords(https://www.npmjs.com/package/node-adwords)
- s3(https://www.npmjs.com/package/s3)

How its works
-------

The inceptum-etl has been design following the Extract, Transform, Load paradigm:

- To extract data we create "sources"
- To transform data we create "transformers"
- To load data we create "destinations"

Now the extra parts :
- "savepoints" to manage the point the etl needs to start from
- "configuration" to put all the pieces together
- "runner" to finally run the ETL  

### Available sources
- Adwords keywords performance report
- Adwords clicks performance report

### Available transformers
- Simple copy
- Split adwords campaign

### Available destinations
- CSV file
- JSON file
- Amazon S3
- Redshift

### Available savepoints
- MySQL table
- Static value

Every part of the ETL is set up via the config file ( default.yml )
```
app:
  name: Inceptum Etl
  validEtls:
    - ETL_UNIQUE_NAME
    - ETL_UNIQUE_NAME_2
    
etlOptions:
  ETL_UNIQUE_NAME:
    source:
      source_retry_parameters
    transformers:
      source_retry_parameters
    destinations:
      source_retry_parameters
  ETL_UNIQUE_NAME_2:
    source:
      source_retry_parameters
    transformers:
      source_retry_parameters
    destinations:
      source_retry_parameters

sources:
  source_name:
    ETL_UNIQUE_NAME:
      source_parameters
    ETL_UNIQUE_NAME_2:
      source_parameters

transformers:
  transformer_name:
    ETL_UNIQUE_NAME:
      transformer_parameters
    ETL_UNIQUE_NAME_2:
      transformer_parameters

destinations:
  destination_name:
    ETL_UNIQUE_NAME:
      destination_parameters
    ETL_UNIQUE_NAME_2:
      destination_parameters

savepoints:
  savepoint_name:
    ETL_UNIQUE_NAME:
      savepoint_parameters
    ETL_UNIQUE_NAME_2:
      savepoint_parameters
# DATABASES
postgres:
  DATABASE_CLIENT_NAME:
    master:
      database_login_parameters
    slave:
      database_login_parameters

mysql:
  DATABASE_CLIENT_NAME:
    master:
      database_login_parameters
    slave:
      database_login_parameters
# LOG settings
logging:
  streams:
    console:
      type: console
    myredis:
      type: redis
    mainLogFile:
      type: file
      path: main.log
  loggers:
    - name: ROOT
      streams:
        console: debug
    - name: ioc/
      streams:
        console: debug
    - name: mysql/
      streams:
        console: debug

Context:
  ActiveProfiles: development
```


How to setup - Empty project
-------

The easiest way to use it is if you are starting a project from scratch. Simply follow these instructions:

```
$ mkdir project-name
$ cd project-name
$ git init
$ git remote add typescript-base git@github.com:hipages/typescript-base.git
$ git pull typescript-base master
$ vi package.json  # Edit the necessary elements of the project definition
$ yarn install # Or npm install... whatever you prefer... I prefer yarn
$ yarn add inceptum-elt # OR npm install
$ vi config/default.yml # set up your etl here
$ vi index.ts # the following code will run any etl
```

Code Example
-------
```
import { LogManager, InceptumApp, BaseSingletonDefinition } from 'inceptum';
import * as program from 'commander';
import { SourceConfigManager,
    TransformerConfigManager,
    DestinationConfigManager,
    ConfigConfigManager,
    RunnerConfigManager,
    SavepointConfigManager,
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
  try {
    await etlRunner.executeEtl();
    // log success
    logger.info(`Finished all good`);
  } catch (err) {
      // log err.message);
      logger.fatal(`Finished Error:${err.message}`);
  }
  // tslint:disable-next-line:no-console
  console.log('The runner is', etlRunner);
  await app.stop();
};
f();

```

