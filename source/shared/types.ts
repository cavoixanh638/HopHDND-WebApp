export type DocumentKind = 'NQ' | 'BC' | 'UNCLASSIFIED';
export interface Item {
  recordId: string;
  displayCode: string;
  stt: number;
  documentKind: DocumentKind;
  content: string;
  department: string;
  type: string;
  partyLevel: string;
  progressParty: string;
  progressBuild: string;
  progressCouncil: string;
  specialist: string;
  room: string;
  vpLeader: string;
  ubndLeader: string;
  specificProgress: string;
  note: string;
  /** Optional source columns P/Q on the current A–R Excel file; read-only in WebApp. */
  partyMeeting?: string;
  examined?: string;
  isDropped: boolean;
  archivedAt: string | null;
  revision: number;
}
export type TextField = 'content' | 'department' | 'type' | 'partyLevel' | 'progressParty' | 'progressBuild' | 'progressCouncil' | 'specialist' | 'room' | 'vpLeader' | 'ubndLeader' | 'specificProgress' | 'note';
export type EditableField = TextField | 'documentKind' | 'isDropped';
export type Changes = Partial<Pick<Item, EditableField>>;
export interface Patch {
  recordId: string;
  /** Frozen original code from the edit baseline; never the formatted UI ID. */
  sourceCode?: string;
  baseRevision: number;
  baseValues: Changes;
  changes: Changes;
  operationId: string;
}
export interface AuditEntry {
  operationId: string;
  recordId: string;
  at: string;
  changes: Changes;
  oldValues: Changes;
}
export interface SaveResult {
  recordId: string;
  ok: boolean;
  item?: Item;
  error?: 'CONFLICT' | 'VALIDATION' | 'NOT_FOUND';
  message?: string;
}
export type GroupField = 'department' | 'room' | 'vpLeader' | 'ubndLeader';
export type StatusField = 'progressParty' | 'progressBuild' | 'progressCouncil';
export interface ReportConfig {
  id: string;
  title: string;
  source: 'all' | 'party' | 'nq' | 'bc';
  statusField: StatusField;
  columns: string[];
  hiddenColumns: string[];
  completed: string[];
}
