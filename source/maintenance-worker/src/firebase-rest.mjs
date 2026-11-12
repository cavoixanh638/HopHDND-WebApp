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
    // Limit the RAW UTF-8 response bytes while streaming, not JS UTF-16 code
    // units (multibyte characters may be much larger than string.length).
    // Never materialize an unbounded remote JSON body in Worker memory.
    const declared=Number(response.headers.get('content-length'));
    requireCondition(!Number.isFinite(declared)||declared<=MAX_GET_BYTES,
      'FIREBASE_DATASET_TOO_LARGE_FOR_WORKER_FREE');
    requireCondition(response.body&&typeof response.body.getReader==='function',
      'FIREBASE_RESPONSE_STREAM_UNAVAILABLE');
    const reader=response.body.getReader(),chunks=[];
    let byteCount=0;
    try{
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        byteCount+=value.byteLength;
        if(byteCount>MAX_GET_BYTES){
          await reader.cancel().catch(()=>{});
          throw Error('FIREBASE_DATASET_TOO_LARGE_FOR_WORKER_FREE');
        }
        chunks.push(value);
      }
    }finally{reader.releaseLock();}
    const joined=new Uint8Array(byteCount);
    let offset=0;
    for(const chunk of chunks){joined.set(chunk,offset);offset+=chunk.byteLength;}
    let data;
    try{
      const text=new TextDecoder('utf-8',{fatal:true}).decode(joined);
      data=text?JSON.parse(text):null;
    }catch{throw Error('INVALID_FIREBASE_JSON');}
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
