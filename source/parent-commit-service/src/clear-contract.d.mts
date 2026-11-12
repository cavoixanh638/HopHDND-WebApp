export const EMPTY_GENERATION_DIGEST:string;
export interface ClearContext {
  operationId:string;
  actorUid:string;
  expected:{generationId:string;operationId:string;revision:number;rowCount:number;digest:string};
  freeze:{mode:string;revision:number;epoch:number};
  activeLeases:number;
  backupVerified:boolean;
}
export function proposeClearGeneration(before:Record<string,any>,
  context:ClearContext):Record<string,any>;
