import { Context, BaseSingletonDefinition } from 'inceptum';
import { MySQLSavepointManager } from './MySQLSavepointManager';
import { StaticSavepointManager } from './StaticSavepointManager';

export class SavepointConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`savepoints`)) {
        return;
    }
    const savepoints = context.getConfig('savepoints');
    Object.keys(savepoints).forEach((savepointType) => {
        if (context.hasConfig(`savepoints.${savepointType}.${etlName}`)) {
            SavepointConfigManager.registerSavepointSingleton(etlName, savepointType, savepoints[savepointType][etlName], context, this);
        }
    });
  }

  /**
   * Register the save point in the context
   * @param etlName
   * @param savepointType
   * @param savepointConfig
   * @param context
   * @param self
   */
  static registerSavepointSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context, self: SavepointConfigManager) {
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
            self['extendedRegisterSingleton'](etlName, savepointType, savepointConfig, context);
    }
  }

  /**
   * Overload this function to extend the registration of savepoint in the context
   * @param etlName
   * @param savepointType
   * @param savepointConfig
   * @param context
   */
  static extendedRegisterSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
    throw new Error(`Unknown savepoint type: ${savepointType}`);
  }
}
