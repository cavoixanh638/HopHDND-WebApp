import type {Item} from '../../shared/types';
import {EDITABLE_FIELDS} from '../domain/items';

/**
 * Cheap, read-only fingerprint of the LIVE business rows shown at preview time.
 * Includes field values as well as revision, because legacy and local sources
 * might contain changed values without a synchronized revision increment.
 * Sorting avoids false invalidations after Firebase changes key iteration order.
 */
export function datasetPreviewFingerprint(rows:readonly Item[]):string {
  return JSON.stringify(rows.map(row=>
    [row.recordId,row.displayCode,row.stt,row.revision,row.archivedAt??null,
      ...EDITABLE_FIELDS.map(field=>row[field])]
  ).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'en')));
}
