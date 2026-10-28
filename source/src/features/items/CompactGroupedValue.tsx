import type {ReactNode} from 'react';
import type {Item,TextField} from '../../../shared/types';
import {compactTypeTone,type CompactPair} from './compact-columns';

type Props={
 item:Item;pair:CompactPair;field:(key:TextField)=>ReactNode;
 tone:(key:TextField)=>string|undefined;editable?:(key:TextField)=>boolean;cvRoomInline?:boolean;
};
/** Single UI-only renderer for list/report drill-down. Source fields, editors,
 * access checks, leases and filters are supplied independently by each host. */
export function CompactGroupedValue({item,pair,field,tone,editable=()=>false,cvRoomInline=false}:Props){
 const includes=(key:string)=>pair.memberFields.includes(key);
 const shown=(key:TextField)=>field(key);
 if(pair.variant==='contentDetails'){
   const header=includes('type')&&(!!item.type||editable('type'))||
     includes('department')&&(!!item.department||editable('department'));
   return <div className="compact-document-group">
     {header&&<div className="compact-document-heading">
       {includes('type')&&(!!item.type||editable('type'))&&<span className="compact-document-badge"
          data-kind={compactTypeTone(item.type)}>{shown('type')}</span>}
       {includes('department')&&(!!item.department||editable('department'))&&
         <strong className="compact-document-department">{shown('department')}</strong>}
     </div>}
     {includes('content')&&<div className="compact-document-content">{shown('content')}</div>}
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
       <div className="compact-stage-row" key={stage.key}>
         <span className="compact-stage-label">
           <span className="compact-stage-number">{stage.number}</span>
           <span>{stage.label}{stage.key==='progressParty'&&includes('partyLevel')&&(!!item.partyLevel||editable('partyLevel'))&&
             <span className="compact-stage-level"> ({shown('partyLevel')})</span>}</span>
         </span>
         {includes(stage.key)&&<span className="compact-stage-state"
            data-progress-tone={tone(stage.key)}>
           {shown(stage.key)}
         </span>}
       </div>)}
   </div>;
 }
 if(pair.variant==='teamTogether'&&cvRoomInline&&includes('room')&&includes('specialist')){
   const leadFields=(['ubndLeader','vpLeader'] as TextField[]).filter(includes);
   return <div className="compact-pair-lines">
     {leadFields.map((k,index)=><div key={k}>
       <span className="compact-pair-tag">{index===0?'UBND':'VP'}</span>{shown(k)}
     </div>)}
     <div className="compact-cv-room-line">
       <span className="compact-pair-tag">{item.specialist?'CV':'Phòng'}</span>
       {(item.specialist||editable('specialist'))&&shown('specialist')}
       {(!!item.room||editable('room'))&&<span className="compact-cv-room-name">
         {item.specialist?' (':''}{shown('room')}{item.specialist?')':''}
       </span>}
       {!item.room&&!item.specialist&&!editable('specialist')&&!editable('room')&&shown('specialist')}
     </div>
   </div>;
 }
 return <div className="compact-pair-lines">
   {pair.memberFields.map((key,index)=><div key={key}>
     <span className="compact-pair-tag">{pair.tags[index]}</span>
     {shown(key as TextField)}
   </div>)}
 </div>;
}
