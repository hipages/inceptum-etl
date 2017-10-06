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
- Adwords reports
- Adwords report historical data
- Google analytics transactions
- Google analytics landing pages
- MySQL data

### Available transformers
- Simple copy
- Split adwords campaign
- Field mapping
- Smart field mapping

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

Use one config file: default.yml, development.yml and production.yml
```
app:
  name: Inceptum Etl
  validEtls:
    - ETL_UNIQUE_NAME
    - ETL_UNIQUE_NAME_2
   
generalConfig:
  source:
    maxRetries: 3
    timeoutMillis: 5000
  transformer:
    minSuccessPercentage: 1
    timeoutMillis: 5000
  destination:
    maxRetries: 3
    timeoutMillis: 5000
    batchSize: 1

etls:
    ETL_UNIQUE_NAME:
      source:
        type: source_name
        source_parameters
      transformer:
        type: transformer_name
        transformer_parameters
      destination:
        type: destination_name
        destination_parameters
      savepoint:
        type: savepoint_name
        savepoint_parameters

    ETL_UNIQUE_NAME_2:
      source:
        type: source_name
        source_parameters
      transformer:
        type: transformer_name
        transformer_parameters
      destination:
        type: destination_name
        destination_parameters
      savepoint:
        type: savepoint_name
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
```

Use a default.yml config file and a separated config for each etl

The default values are in:
default.yml, development.mnt.yml and production.yml
```
app:
  name: Inceptum Etl
  validEtls:
    - ETL_UNIQUE_NAME
    - ETL_UNIQUE_NAME_2
    
generalConfig:
  source:
    maxRetries: 3
    timeoutMillis: 5000
  transformer:
    minSuccessPercentage: 1
    timeoutMillis: 5000
  destination:
    maxRetries: 3
    timeoutMillis: 5000
    batchSize: 1

# General values
sources:
  source_name:
    source_parameters
  source_name_2:
    source_parameters

transformers:
  transformer_name:
    transformer_parameters
  transformer_name_2:
    transformer_parameters

destinations:
  destination_name:
    destination_parameters
  destination_name_2:
    destination_parameters

savepoints:
  savepoint_name:
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
```

Set the variable NODE_APP_INSTANCE with the name of the etl

development-{etl_name}.yml, production-{etl_name}.yml

```
generalConfig:
  source:
    type: source_name
  transformer:
    type: transformer_name_2
  destination:
    type: destination_name_2
  savepoint:
    type: savepoint_name

# Overwrite the required source, transformer, destination or savepoint as required
sources:
  source_name:
    etl_source_parameters

destinations:
  destination_name_2:
    etl_destination_parameters

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

```
