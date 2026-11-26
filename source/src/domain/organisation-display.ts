import uiPresentation from '../presentation/ui-presentation.json';

export type OrganisationAlias={fields:readonly string[];source:string;label:string};

/** Pure read-only projection; fixtures can test the contract independently
 * of the current display wording and the number of configured aliases. */
export function resolveOrganisationAlias(field:string,value:string,aliases:readonly OrganisationAlias[]):string{
  const key=value.trim().normalize('NFC');
  return aliases.find(alias=>alias.fields.includes(field)&&alias.source===key)?.label??value;
}

/** The original organisation remains the selection, exact filter key,
 * report identity, audit value and persisted source value. */
export function displayOrganisationName(field:string,value:string):string{
  return resolveOrganisationAlias(field,value,uiPresentation.organisationAliases);
}
export function organisationSearchText(field:string,value:string):string{
  const shown=displayOrganisationName(field,value);
  return shown===value?value:value+' '+shown;
}
