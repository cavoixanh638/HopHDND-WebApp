/**
 * Trusted publisher: no public HTTP endpoint and no browser write access.
 *
 * Deployment is SEPARATE from GitHub Pages and is blocked until owner approves
 * the actual Cloud backup, candidate Rules and release gate. Uses ADC provided
 * by Firebase Functions, never a service-account key committed to GitHub.
 */
import {createHash} from 'node:crypto';
import {getApps,initializeApp} from 'firebase-admin/app';
import {getDatabase} from 'firebase-admin/database';
import {onValueWritten} from 'firebase-functions/v2/database';
import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {buildAdminPublishedPublicView} from '../src/data/admin-published-public-view';
import {acceptsPublicViewWatermark,type PublicViewWatermark} from '../src/data/public-view-watermark';
import {validateItemLayout} from '../src/data/item-preferences';
import {validateReportLayout} from '../src/data/report-preferences';
import type {Item} from '../shared/types';

const PROJECT='hophdnd-8b7b2';
const INSTANCE='hophdnd-8b7b2-default-rtdb';
const REGION='asia-southeast1';
const URL='https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app';
const ADMIN_EMAIL='cavoixanh638@gmail.com';
if(process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT!==PROJECT) {
  throw new Error('Refusing public-view publisher on an unexpected Firebase project.');
}
const app=getApps()[0]??initializeApp({projectId:PROJECT,databaseURL:URL});
const db=getDatabase(app);
const sameObject=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** A parent-path transaction atomically updates public current + PRIVATE
 * metadata. Clients can read ONLY the current child under candidate Rules. */
export async function republishApprovedView():Promise<'published'|'unchanged'|'not-primary'>{
  const [profileResult,itemsResult]=await Promise.all([
    db.ref('hdnd/profile').get(),db.ref('hdnd/items').get()
  ]);
  const profile=profileResult.val() as {revision?:number;payload?:string}|null;
  if(!profile||!Number.isSafeInteger(profile.revision)||!profile.revision||
    typeof profile.payload!=='string')throw Error('Unverified admin layout; refusing to publish.');
  const stored=JSON.parse(profile.payload) as Record<string,unknown>;
  if(stored.dataSource!=='primary'){
    // If the administrator leaves Firebase primary, fail closed rather than
    // silently showing a previously published copy of a different source.
    const publicRef=db.ref('hdnd/publicViews');
    await publicRef.transaction(old=>{
      if(!old)return undefined;
      if(Number(old.meta?.profileRevision??0)>profile.revision!)return undefined;
      return {...old,current:null,meta:{profileRevision:profile.revision,recordRevisions:{},disabled:true}};
    },undefined,false);
    return 'not-primary';
  }
  const itemLayout=validateItemLayout(stored.items);
  const reports=validateReportLayout(stored.reports);
  const raw=itemsResult.val() as Record<string,Item>|null;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Object.keys(raw).length)
    throw Error('Primary records are empty; refusing to publish a misleading public view.');
  const watermark:PublicViewWatermark={profileRevision:profile.revision,
    recordRevisions:{}};
  const items:Item[]=[];
  for(const [id,item] of Object.entries(raw)){
    if(!item||item.recordId!==id||!Number.isSafeInteger(item.revision)||
      item.revision<1)throw Error('Invalid record identity/revision; publication stopped.');
    watermark.recordRevisions[id]=item.revision;
    items.push(item);
  }
  const sourceRevision=createHash('sha256')
    .update(JSON.stringify([watermark.profileRevision,
      Object.entries(watermark.recordRevisions).sort(([a],[b])=>a.localeCompare(b))]))
    .digest('hex');
  const published=buildAdminPublishedPublicView({
    items,itemLayout,reports,publishedLayoutRevision:profile.revision,
    sourceRevision,publishedAt:new Date().toISOString()
  });
  const result=await db.ref('hdnd/publicViews').transaction(current=>{
    const existing=current?.meta as PublicViewWatermark|undefined;
    if(existing&&!acceptsPublicViewWatermark(existing,watermark))return undefined;
    if(current?.current?.sourceRevision===sourceRevision &&
      current.current?.publishedLayoutRevision===profile.revision)return undefined;
    return {current:published,meta:watermark};
  },undefined,false);
  // A later source update is independently processed by its own database event.
  // Crucially, older events can never replace a newer committed projection.
  return result.committed?'published':'unchanged';
}

const options={region:REGION,instance:INSTANCE,memory:'512MiB' as const,
  timeoutSeconds:120,maxInstances:3};

export const onPrimaryItemWritten=onValueWritten({
  ...options,ref:'/hdnd/items/{recordId}'
},async()=>{await republishApprovedView();});

export const onAdminLayoutWritten=onValueWritten({
  ...options,ref:'/hdnd/profile'
},async()=>{await republishApprovedView();});

/** Optional operator recovery after a transient trigger error. A validated
 * Google administrator may request a rebuild; nobody can submit the payload.
 * The function ALWAYS reads the latest server-side data and layout itself. */
export const republishPublicViewOnDemand=onCall(
  {region:REGION,memory:'512MiB',timeoutSeconds:120,maxInstances:2},
  async request=>{
    const token=request.auth?.token;
    if(!token||token.email!==ADMIN_EMAIL||token.email_verified!==true||
      token.firebase?.sign_in_provider!=='google.com')
      throw new HttpsError('permission-denied','Google administrator required.');
    return {status:await republishApprovedView()};
  }
);
