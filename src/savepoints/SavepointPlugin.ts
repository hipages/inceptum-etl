import { Plugin, InceptumApp, BaseSingletonDefinition, Context } from 'inceptum';
import { MySQLSavepointManager } from './MySQLSavepointManager';
import { StaticSavepointManager } from './StaticSavepointManager';

export class SavepointPlugin implements Plugin {
  etlName: string;
  name: 'SavepointPlugin';

  constructor(etlName: string) {
    this.etlName = etlName;
  }

  getName() {
    return this.name;
  }

  // tslint:disable-next-line:prefer-function-over-method
  willStart(app: InceptumApp) {
    if (!app.hasConfig('savepoint')) {
      throw new Error('PostgresPlugin has been registered but could not find config using key "postgres"');
    }

    const context = app.getContext();

    const savepoints = context.getConfig('savepoints');
    Object.keys(savepoints).forEach((savepointType) => {
        if (context.hasConfig(`savepoints.${savepointType}.${this.etlName}`)) {
          SavepointPlugin.registerSavepointSingleton(this.etlName, savepointType, savepoints[savepointType][this.etlName], context);
        }
    });
  }

  static registerSavepointSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
    switch (savepointType) {
      case 'mysql' :
      {
          const singletonDefinition = new BaseSingletonDefinition<any>(MySQLSavepointManager, 'EtlSavepointManager');
          singletonDefinition.constructorParamByRef(savepointConfig['dbClient']);
          singletonDefinition.constructorParamByValue(etlName);
          context.registerSingletons(singletonDefinition);
      }
          break;
      case 'static' :
      {
          const singletonDefinition = new BaseSingletonDefinition<any>(StaticSavepointManager, 'EtlSavepointManager');
          singletonDefinition.constructorParamByValue(savepointConfig['savepoint']);
          context.registerSingletons(singletonDefinition);
      }
          break;
      default:
          throw new Error(`Unknown savepoint type: ${savepointType}`);
  }
}
}
