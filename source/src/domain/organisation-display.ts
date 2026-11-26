/** Presentation-only alias: the original organisation remains the selection,
 * filter key, report identity, audit value and persisted source value. */
const longName='Các phòng thuộc VP UBND TP';
export function displayOrganisationName(field:string,value:string):string{
  return (field==='department'||field==='room')&&value.trim().normalize('NFC')===longName?'VPUB TP':value;
}
export function organisationSearchText(field:string,value:string):string{
  const shown=displayOrganisationName(field,value);
  return shown===value?value:value+' '+shown;
}
