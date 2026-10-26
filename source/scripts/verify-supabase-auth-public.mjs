// Read-only public Auth provider configuration probe, run from GH Actions QA.
// NEVER requests or prints Google Client Secret, service_role or user tokens.
// This probe does not log in a user, so it is not proof of end-to-end OAuth.
const project='https://uguhyunuzsdrkykqgdmq.supabase.co';
const key='sb_publishable_BEsiC_qU_lB__vjNiJxPeA_-9GBDhs3';
const abort=new AbortController();
const timer=setTimeout(()=>abort.abort(),8000);
try {
  const response=await fetch(project+'/auth/v1/settings',{
    headers:{apikey:key},signal:abort.signal
  });
  if(!response.ok){
    console.log('SUPABASE_AUTH_PROVIDER_UNVERIFIED HTTP_'+response.status);
  } else {
    const state=await response.json();
    const google=state?.external?.google===true;
    console.log('SUPABASE_STAGING_GOOGLE_PROVIDER_ENABLED='+google);
    console.log('SUPABASE_STAGING_PROVIDER_PROBE_ONLY_NO_LOGIN');
    if(!google)console.log('::warning::Google provider not enabled or settings not available in Supabase Auth.');
  }
}catch(error){
  console.log('SUPABASE_AUTH_PROVIDER_UNVERIFIED '+(error?.name==='AbortError'?'NETWORK_TIMEOUT':'NETWORK_UNAVAILABLE'));
}finally{clearTimeout(timer);}
