import type { AuditEntry, Item, Patch, SaveResult } from '../../shared/types';
export interface Repository {
  readonly sourceKind?: 'demo' | 'google' | 'firebase';
  readonly readOnly?: boolean;
  /** Editing a local draft is independent of permission to commit the source. */
  readonly canDraft?: boolean;
  list(): Promise<Item[]>;
  save(patches: Patch[]): Promise<SaveResult[]>;
  history(recordId: string,sourceCode?:string): Promise<AuditEntry[]>;
  subscribe?(next:(items:Item[])=>void,error:(cause:Error)=>void):()=>void;
}
