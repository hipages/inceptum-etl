import { Context, BaseSingletonDefinition } from 'inceptum';
import { EtlRunner } from './EtlRunner';

export class RunnerConfigManager {
  static registerSingletons(etlName: string, context: Context) {
       const singletonDefinition = new BaseSingletonDefinition<any>(EtlRunner, 'EtlRunner');
        singletonDefinition.setPropertyByRef('config', 'EtlConfig');
        context.registerSingletons(singletonDefinition);
  }
}
