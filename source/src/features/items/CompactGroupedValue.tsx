import type {CSSProperties,ReactNode} from 'react';
import type {Item,TextField} from '../../../shared/types';
import {compactTypeTone,type CompactPair} from './compact-columns';
import {normalizeSearch} from '../../domain/search';

type MemberHighlight={color:string;backgroundColor:string}|undefined;
/** R05 is presentation-only. Never reuse the report's completed bucket for
 * a stage whose source explicitly says it is not required. */
export function compactStageVisualTone(value:unknown,statusTone:string|undefined):string{
 const normalized=normalizeSearch(String(value??'')).replace(/\s+/gu,' ').trim();
 if(/^(?:khong phai (?:trinh|xin y kien)|khong xin y kien)(?:$| )/u.test(normalized))
   return 'neutral';
 return statusTone??'neutral';
}
type Props={
 item:Item;pair:CompactPair;field:(key:TextField)=>ReactNode;
 tone:(key:TextField)=>string|undefined;editable?:(key:TextField)=>boolean;
 /** Only source fields that belong to the visible group can be highlighted. */
 highlight?:(key:TextField)=>MemberHighlight;cvRoomInline?:boolean;
};
/** Shared render for list + popup; source permissions, leases and conditional
 * highlights are evaluated per FIELD, never inherited from the group anchor. */
export function CompactGroupedValue({item,pair,field,tone,editable=()=>false,
  highlight=()=>undefined,cvRoomInline=false}:Props){
 const includes=(key:string)=>pair.memberFields.includes(key);
 const shown=(key:TextField)=>field(key);
 const memberStyle=(key:TextField):CSSProperties|undefined=>{
   const match=highlight(key);
   return match?{...match,'--member-highlight-bg':match.backgroundColor,
     '--member-highlight-text':match.color,
     '--workflow-bg':match.backgroundColor,'--workflow-text':match.color} as CSSProperties:undefined;
 };
 const memberAttributes=(key:TextField)=>({
   style:memberStyle(key), 'data-highlighted':highlight(key)?'true':undefined
 });
 if(pair.variant==='contentDetails'){
   const header=includes('type')&&(!!item.type||editable('type'))||
     includes('department')&&(!!item.department||editable('department'));
   return <div className="compact-document-group">
     {header&&<div className="compact-document-heading">
       {includes('type')&&(!!item.type||editable('type'))&&
         <span className="compact-document-badge" data-kind={compactTypeTone(item.type)}
           data-editable={editable('type')?'true':undefined}
           {...memberAttributes('type')}>{shown('type')}</span>}
       {includes('department')&&(!!item.department||editable('department'))&&
         <strong className="compact-document-department" {...memberAttributes('department')}>
           {shown('department')}
         </strong>}
     </div>}
     {includes('content')&&<div className="compact-document-content"
       {...memberAttributes('content')}>{shown('content')}</div>}
   </div>;
 }
 if(pair.variant==='partyTogether'){
   const stages:{key:TextField;label:string;number:number}[]=[
     {key:'progressParty',label:'Thành ủy',number:1},
     {key:'progressBuild',label:'Xây dựng NQ',number:2},
     {key:'progressCouncil',label:'Ban hành NQ',number:3}
   ];
   return <div className="compact-stages">
     {stages.filter(s=>includes(s.key)||(s.key==='progressParty'&&includes('partyLevel'))).map(stage=>
       <div className="compact-stage-row" key={stage.key}
         data-stage-field={stage.key}
         data-progress-tone={compactStageVisualTone(item[stage.key],tone(stage.key))}>
         <span className="compact-stage-label">
           <span className="compact-stage-number">{stage.number}</span>
           <span className="compact-stage-title">{stage.label}{stage.key==='progressParty'&&includes('partyLevel')&&
             (!!item.partyLevel||editable('partyLevel'))&&
             <span className="compact-stage-level" {...memberAttributes('partyLevel')}>
               <span className="compact-stage-level-open" aria-hidden="true">(</span>
               {shown('partyLevel')}
               <span className="compact-stage-level-close" aria-hidden="true">)</span>
             </span>}</span>
         </span>
         {includes(stage.key)&&<span className="compact-stage-state" data-progress-tone={compactStageVisualTone(item[stage.key],tone(stage.key))}
           data-editable={editable(stage.key)?'true':undefined}
           {...memberAttributes(stage.key)}>{shown(stage.key)}</span>}
       </div>)}
   </div>;
 }
 if(pair.variant==='teamTogether'&&cvRoomInline&&includes('room')&&includes('specialist')){
   const leadFields=(['ubndLeader','vpLeader'] as TextField[]).filter(includes);
   return <div className="compact-pair-lines">
     {leadFields.map((key,index)=><div key={key}>
       <span className="compact-pair-tag">{index===0?'UBND':'VP'}</span>
       <span className="compact-highlight-member" {...memberAttributes(key)}>{shown(key)}</span>
     </div>)}
     <div className="compact-cv-room-line">
       <span className="compact-pair-tag">{item.specialist?'CV':'Phòng'}</span>
       {(item.specialist||editable('specialist'))&&<span className="compact-highlight-member"
         {...memberAttributes('specialist')}>{shown('specialist')}</span>}
       {(!!item.room||editable('room'))&&<span className="compact-cv-room-name"
         {...memberAttributes('room')}>
         {item.specialist?' (':''}{shown('room')}{item.specialist?')':''}
       </span>}
       {!item.room&&!item.specialist&&!editable('specialist')&&!editable('room')&&shown('specialist')}
     </div>
   </div>;
 }
 return <div className="compact-pair-lines">
   {pair.memberFields.map((key,index)=><div key={key}>
     <span className="compact-pair-tag">{pair.tags[index]}</span>
     <span className="compact-highlight-member" {...memberAttributes(key as TextField)}>
       {shown(key as TextField)}
     </span>
   </div>)}
 </div>;
}
