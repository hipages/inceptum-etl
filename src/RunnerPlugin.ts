import { Plugin, InceptumApp, Context, BaseSingletonDefinition } from 'inceptum';
import { EtlRunner } from './EtlRunner';

export class RunnerPlugin implements Plugin {
  public etlName: string;
  public name = 'RunnerPlugin';
  private etlObjectName = 'EtlRunner';

  constructor(etlName: string) {
    this.etlName = etlName;
  }

  public getEtlObjectName() {
      return this.etlObjectName;
  }

  willStart(app: InceptumApp) {
    const context = app.getContext();
       const singletonDefinition = new BaseSingletonDefinition<any>(EtlRunner, this.getEtlObjectName());
        singletonDefinition.setPropertyByRef('config', 'EtlConfig');
        context.registerSingletons(singletonDefinition);
  }
}
