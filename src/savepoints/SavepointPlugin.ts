import { Plugin, InceptumApp, BaseSingletonDefinition, Context } from 'inceptum';
import { MySQLSavepointManager } from './MySQLSavepointManager';
import { StaticSavepointManager } from './StaticSavepointManager';

export class SavepointPlugin implements Plugin {
  public etlName: string;
  public name = 'SavepointPlugin';
  private etlObjectName = 'EtlSavepointManager';

  constructor(etlName: string) {
    this.etlName = etlName;
  }

  public getEtlObjectName() {
    return this.etlObjectName;
  }

  // tslint:disable-next-line:prefer-function-over-method
  public willStart(app: InceptumApp) {
    if (!app.hasConfig('savepoints')) {
      throw new Error('SavepointPlugin has been registered but could not find config using key "savepoints"');
    }

    const savepoints = app.getConfig('savepoints', {});
    Object.keys(savepoints).forEach((savepointType) => {
        if (app.hasConfig(`savepoints.${savepointType}.${this.etlName}`)) {
          this.registerSavepointSingleton(this.etlName, savepointType, savepoints[savepointType][this.etlName], app.getContext());
        }
    });
  }

  protected registerSavepointSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
    switch (savepointType) {
      case 'mysql' :
      {
          const singletonDefinition = new BaseSingletonDefinition<any>(MySQLSavepointManager, this.getEtlObjectName());
          singletonDefinition.constructorParamByRef(savepointConfig['dbClient']);
          singletonDefinition.constructorParamByValue(etlName);
          context.registerSingletons(singletonDefinition);
      }
          break;
      case 'static' :
      {
          const singletonDefinition = new BaseSingletonDefinition<any>(StaticSavepointManager, this.getEtlObjectName());
          singletonDefinition.constructorParamByValue(savepointConfig['savepoint']);
          context.registerSingletons(singletonDefinition);
      }
          break;
      default:
          throw new Error(`Unknown savepoint type: ${savepointType}`);
  }
}
}
