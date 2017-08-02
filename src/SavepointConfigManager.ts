import { Context, BaseSingletonDefinition } from 'inceptum';
import { MySQLEtlSavepointManager } from './EtlSavepointManager';

export class SavepointConfigManager {
  static registerSingletons(etlName: string, context: Context) {
    if (!context.hasConfig(`savepoints`)) {
        return;
    }
    const savepoints = context.getConfig('savepoints');
    Object.keys(savepoints).forEach((savepointType) => {
        if (context.hasConfig(`savepoints.${savepointType}.${etlName}`)) {
            SavepointConfigManager.registerSavepointSingleton(etlName, savepointType, savepoints[savepointType][etlName], context);
        }
    });
  }

  static registerSavepointSingleton(etlName: string, savepointType: string, savepointConfig: object, context: Context) {
      switch (savepointType) {
        case 'mysql' :
        {
            const singletonDefinition = new BaseSingletonDefinition<any>(MySQLEtlSavepointManager, 'EtlSavepointManager');
            singletonDefinition.constructorParamByRef(savepointConfig['dbClient']);
            singletonDefinition.constructorParamByValue(etlName);
            context.registerSingletons(singletonDefinition);
        }
            break;
        default:
            throw new Error(`Unknown savepoint type: ${savepointType}`);
    }
  }
}