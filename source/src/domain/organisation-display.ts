import uiPresentation from '../presentation/ui-presentation.json';

/** Read-only presentation aliases. The source string remains the selection,
 * exact filter key, report identity, audit value and persisted source value.
 * Future label-only changes belong in ui-presentation.json, not picker/CAS. */
export function displayOrganisationName(field:string,value:string):string{
  const key=value.trim().normalize('NFC');
  return uiPresentation.organisationAliases.find(alias=>
    alias.fields.includes(field)&&alias.source===key)?.label??value;
}
export function organisationSearchText(field:string,value:string):string{
  const shown=displayOrganisationName(field,value);
  return shown===value?value:value+' '+shown;
}
