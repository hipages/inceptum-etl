Inceptum ETL
====

Inceptum ETL is a tool designed to facilitate the creation and management of Extract, Transform, Load (ETL) scripts.

Inceptum ETL is what we use at [hipages](https://www.hipages.com.au) for our internal projects.

Benefits
-------

In this project we're managing all the basics that are needed for an ETL project:

- Language: typescript
- Base: [typescript base](https://github.com/hipages/typescript-base)
- Supported technologies: Mysql, Postgres, Redis, and Elasticsearch
- Easy to extend
- Easy to upgrade

One of the most valuable features that comes with Inceptum based projects is the ability to easily upgrade to the newest Inceptum version with just a few simple `git` commands. As we continue to refine our standard your projects benefit as well.

Dependencies
-------

- [Inceptum](https://www.npmjs.com/package/inceptum)
- [Bluebird](https://www.npmjs.com/package/bluebird)
- [Commander](https://www.npmjs.com/package/commander)
- [Config](https://www.npmjs.com/package/config)
- [Csvjson](https://www.npmjs.com/package/csvjson)
- [Moment](https://www.npmjs.com/package/moment)
- [Node-adwords](https://www.npmjs.com/package/node-adwords)
- [S3](https://www.npmjs.com/package/s3)

How it works
-------

Inceptum-etl has been designed to follow the Extract, Transform, Load paradigm:

- To extract data we create "sources"
- To transform data we create "transformers"
- To load data we create "destinations"

Now the extra parts:
- "savepoints" add fault tolerance to the etl and manage the starting point
- "configuration" puts all the pieces together
- "runner" runs the ETL

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
- Elasticsearch

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

Starting a new project from scratch is easy!

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

Example
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

