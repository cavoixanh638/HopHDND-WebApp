import type {CSSProperties,ReactNode} from 'react';
import type {Item,TextField} from '../../../shared/types';
import {compactTypeTone,type CompactPair} from './compact-columns';
import {normalizeSearch} from '../../domain/search';
import {isNotRequiredStatus} from '../../domain/status-contract';

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
   const hasDepartment=includes('department')&&!!item.department.trim();
   const hasType=includes('type')&&!!item.type.trim();
   // A cleared but writable member must remain reachable as its OWN editor.
   const showDepartment=hasDepartment||(includes('department')&&editable('department'));
   const showType=hasType||(includes('type')&&editable('type'));
   const hasSourceMetadata=hasDepartment||hasType;
   const metadataEditable=(includes('department')&&editable('department'))||
     (includes('type')&&editable('type'));
   return <div className="compact-document-group">
     {includes('content')&&<div className="compact-document-content"
       {...memberAttributes('content')}>{shown('content')}</div>}
     {(showDepartment||showType)&&<div className="compact-document-heading"
       data-source-metadata={hasSourceMetadata?'true':'false'}
       data-metadata-mode={metadataEditable?'editable':'readonly'}>
       {!metadataEditable&&hasSourceMetadata&&<span className="compact-document-meta-mark" aria-hidden="true">(</span>}
       {showDepartment&&<span className="compact-document-department"
         data-editable={editable('department')?'true':undefined}
         {...memberAttributes('department')}>{shown('department')}</span>}
       {!metadataEditable&&hasDepartment&&hasType&&<span className="compact-document-meta-separator" aria-hidden="true"> - </span>}
       {showType&&<span className="compact-document-badge" data-kind={compactTypeTone(item.type)}
         data-editable={editable('type')?'true':undefined}
         {...memberAttributes('type')}>{shown('type')}</span>}
       {!metadataEditable&&hasSourceMetadata&&<span className="compact-document-meta-mark" aria-hidden="true">)</span>}
     </div>}
   </div>;
 }
 if(pair.variant==='partyTogether'){
   const levelEditable=includes('partyLevel')&&editable('partyLevel');
   // All rows use the SAME track geometry, based exclusively on the
   // party-level permission. Status grants never shift their sibling rails.
   const stages:{key:TextField;label:string}[]=[
     {key:'progressParty',label:'Thành ủy'},
     {key:'progressBuild',label:'Trình Xây dựng NQ'},
     {key:'progressCouncil',label:'Trình ban hành NQ'}
   ];
   return <div className="compact-stages" data-rev2="true"
     data-level-layout={levelEditable?'editable':'readonly'}>
     {stages.filter(s=>includes(s.key)||(s.key==='progressParty'&&includes('partyLevel'))).map(stage=>{
       const isParty=stage.key==='progressParty';
       const levelIncluded=isParty&&includes('partyLevel');
       const levelNotRequired=levelIncluded&&!levelEditable&&
         isNotRequiredStatus('partyLevel',item.partyLevel);
       const showLevel=levelIncluded&&!levelNotRequired&&
         (!!item.partyLevel||levelEditable);
       const stageTone=compactStageVisualTone(item[stage.key],tone(stage.key));
       return <div className="compact-stage-row" key={stage.key}
         data-stage-field={stage.key}
         data-level-editable={isParty&&levelEditable?'true':undefined}
         data-level-not-required={levelNotRequired?'true':undefined}
         data-progress-tone={stageTone}>
         <span className="compact-stage-label">
           <span className="compact-stage-title">{stage.label}
             {showLevel&&!levelEditable&&<>
               {' '}<span className="compact-stage-level" {...memberAttributes('partyLevel')}>
                 <span className="compact-stage-level-open" aria-hidden="true">(</span>
                 {shown('partyLevel')}
                 <span className="compact-stage-level-close" aria-hidden="true">)</span>
               </span>
             </>}
           </span>
         </span>
         {showLevel&&levelEditable&&<span className="compact-stage-level"
           data-level-editor="true" {...memberAttributes('partyLevel')}>
           {shown('partyLevel')}
         </span>}
         {includes(stage.key)&&<span className="compact-stage-state" data-progress-tone={stageTone}
           data-editable={editable(stage.key)?'true':undefined}
           {...memberAttributes(stage.key)}>{shown(stage.key)}</span>}
       </div>;
     })}
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
