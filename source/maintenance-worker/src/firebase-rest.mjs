import {requireCondition} from './domain.mjs';
const MAX_GET_BYTES=3*1024*1024;
/** Firebase REST ETag conditional PUT is the CAS primitive (PATCH has NO
 * if-match support). Scope CAS to /hdnd, NOT / or unknown root siblings. */
export function firebaseRest({databaseURL,accessToken,fetchImpl=fetch}){
  requireCondition(typeof databaseURL==='string'&&/^https:\/\/[A-Za-z0-9.-]+\.firebasedatabase\.app$/.test(databaseURL),
    'INVALID_DATABASE_ORIGIN');
  requireCondition(typeof accessToken==='string'&&accessToken.length>20,'INVALID_DB_OAUTH_TOKEN');
  const url=path=>{
    requireCondition(/^(?:hdnd(?:\/[A-Za-z0-9_-]+)*|hdndReviews)$/.test(path),'INVALID_FIREBASE_PATH');
    return databaseURL+'/'+path+'.json';
  };
  async function request(path,{method='GET',etag=false,match,body}={}){
    const headers={Authorization:'Bearer '+accessToken,Accept:'application/json'};
    if(etag)headers['X-Firebase-ETag']='true';
    if(match)headers['if-match']=match;
    if(body!==undefined)headers['Content-Type']='application/json';
    const response=await fetchImpl(url(path),{method,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
    if(response.status===412)return {conflict:true,etag:response.headers.get('etag')};
    requireCondition(response.ok,'FIREBASE_REST_'+response.status);
    const text=await response.text();
    requireCondition(text.length<=MAX_GET_BYTES,'FIREBASE_DATASET_TOO_LARGE_FOR_WORKER_FREE');
    let data;
    try{data=text?JSON.parse(text):null}catch{throw Error('INVALID_FIREBASE_JSON');}
    return {data,etag:response.headers.get('etag'),conflict:false};
  }
  return {
    get:async path=>{const r=await request(path);return r.data;},
    getWithEtag:async path=>{
      const r=await request(path,{etag:true});requireCondition(typeof r.etag==='string','MISSING_FIREBASE_ETAG');return r;
    },
    putIfMatch:async(path,body,etag)=>{
      requireCondition(typeof etag==='string'&&etag.length>=1,'MISSING_EXPECTED_ETAG');
      return request(path,{method:'PUT',match:etag,body});
    }
  };
}
