import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { EtlRunner } from './EtlRunner';

export class RunnerPlugin implements Plugin {
  etlName: string;
  name: 'RunnerPlugin';

  constructor(etlName: string) {
    this.etlName = etlName;
  }

  getName() {
    return this.name;
  }

  static willStart(app: InceptumApp) {
    const context = app.getContext();
       const singletonDefinition = new BaseSingletonDefinition<any>(EtlRunner, 'EtlRunner');
        singletonDefinition.setPropertyByRef('config', 'EtlConfig');
        context.registerSingletons(singletonDefinition);
  }
}
