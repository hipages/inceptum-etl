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
    // Savepoint in etls object: etls = { etl_name: { source, transformer, destination, savepoint, config} }
    const configPath = `etls.${this.etlName}.savepoint`;
    if (app.hasConfig(configPath)) {
      const { type, ...options } = app.getConfig(configPath, null);
      app.getContext().getLogger().debug(`Registering ${type} savepoint for ${this.etlName}`);
      this.registerSavepointSingleton(this.etlName, type, options, app.getContext());
      return;
    }

    if (!app.hasConfig('savepoints')) {
      throw new Error('SavepointPlugin has been registered but could not find config using key "savepoints"');
    }
    const savepoints = app.getConfig('savepoints', {});

    // Savepoint in generalConfig object:  generalConfig = { source, transformer, destination, savepoint }
    // savepoints = { type, ... }
    if (app.hasConfig(`generalConfig.savepoint.type`)) {
      const type = app.getConfig('etlOptions.savepoint.type', '');
      if (app.hasConfig(`savepoints.${type}`)) {
        app.getContext().getLogger().debug(`Registering ${type} savepoint for ${this.etlName}`);
        this.registerSavepointSingleton(this.etlName, type, savepoints[type], app.getContext());
        return;
      }
    }

    // Etl in savepoints object:  savepoints = { etl_name, ... }
    Object.keys(savepoints).forEach((savepointType) => {
      if (app.hasConfig(`savepoints.${savepointType}.${this.etlName}`)) {
        this.registerSavepointSingleton(this.etlName, savepointType, savepoints[savepointType][this.etlName], app.getContext());
      }
    });
  }

  protected registerSavepointSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
    switch (savepointType) {
      case 'mysql':
        {
          const singletonDefinition = new BaseSingletonDefinition<any>(MySQLSavepointManager, this.getEtlObjectName());
          singletonDefinition.constructorParamByRef(savepointConfig['dbClient']);
          singletonDefinition.constructorParamByValue(etlName);
          context.registerSingletons(singletonDefinition);
        }
        break;
      case 'static':
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
