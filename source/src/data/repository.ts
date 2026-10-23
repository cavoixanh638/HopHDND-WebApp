import type { AuditEntry, Item, Patch, SaveResult } from '../../shared/types';
export interface Repository {
  readonly sourceKind?: 'demo' | 'google' | 'firebase';
  readonly readOnly?: boolean;
  /** Editing a local draft is independent of permission to commit the source. */
  readonly canDraft?: boolean;
  /** Optional previously validated, authenticated viewer cache. Never permits writes. */
  cachedRows?():Item[]|null;
  list(): Promise<Item[]>;
  save(patches: Patch[]): Promise<SaveResult[]>;
  history(recordId: string,sourceCode?:string): Promise<AuditEntry[]>;
  /** True only when subscribe() supplies its own initial full snapshot. */
  readonly subscribeInitial?: boolean;
  subscribe?(next:(items:Item[])=>void,error:(cause:Error)=>void):()=>void;
}
