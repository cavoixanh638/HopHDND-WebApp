import type {Changes,EditableField} from '../../shared/types';

/** RELEASE GATE: keep disabled in ordinary production builds until the exact
 * paired Spark RTDB Rules revision has been independently deployed/verified.
 * This is deliberately not an end-user URL flag or a localStorage override. */
const enabled=import.meta.env.VITE_FIREBASE_WRITE_MODE==='spark'&&
  import.meta.env.VITE_FIREBASE_STATUS_CAS==='true';

// Only discrete picker fields. Text and assignment editing keep their leases.
// The dependent progressParty update from partyLevel is server-CAS-derived.
export const DIRECT_STATUS_CAS_FIELDS:ReadonlySet<EditableField>=new Set([
  'partyLevel','progressParty','progressBuild','progressCouncil','isDropped'
]);

export function directStatusCasField(field:EditableField|undefined,versioned=false):boolean{
  return enabled&&!versioned&&!!field&&DIRECT_STATUS_CAS_FIELDS.has(field);
}

export function directStatusCasPatch(changes:Changes,versioned=false):boolean{
  const fields=Object.keys(changes) as EditableField[];
  return fields.length===1&&directStatusCasField(fields[0],versioned);
}
