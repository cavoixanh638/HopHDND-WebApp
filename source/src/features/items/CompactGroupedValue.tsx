import './picker-parity-content.css';
import type {CSSProperties,ReactNode} from 'react';
import type {L03InlineWidthEditor} from './L03InlineWidthControl';
import {L03InlineWidthControl} from './L03InlineWidthControl';
import type {Item,TextField} from '../../../shared/types';
import {compactTypeTone,type CompactPair} from './compact-columns';
import {normalizeSearch} from '../../domain/search';
import {canonicalStatus,isNotRequiredStatus,excelStatusLabel} from '../../domain/status-contract';

/** Display-only transition for saved legacy labels until DATA's canonical catalog
 * lands. Never writes an Item or duplicates the domain's edit contract. */
export function compactPartyLevelLabel(raw:unknown):string{
 const canonical=canonicalStatus('partyLevel',raw);
 return excelStatusLabel('partyLevel',canonical);
}
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
 /** Optional verified-admin layout session; NEVER implies permission to edit Item. */
 l03InlineEditor?:L03InlineWidthEditor;
};
/** Shared render for list + popup; source permissions, leases and conditional
 * highlights are evaluated per FIELD, never inherited from the group anchor. */
export function CompactGroupedValue({item,pair,field,tone,editable=()=>false,
  highlight=()=>undefined,cvRoomInline=false,l03InlineEditor}:Props){
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
   return <div className="compact-document-group" data-ui-reference-group="L01">
     {includes('content')&&<div className="compact-document-content" data-ui-reference-part="content"
       {...memberAttributes('content')}>{shown('content')}</div>}
     {(showDepartment||showType)&&<div className="compact-document-heading"
       data-source-metadata={hasSourceMetadata?'true':'false'}
       data-metadata-mode={metadataEditable?'editable':'readonly'}>
       {!metadataEditable&&hasSourceMetadata&&<span className="compact-document-meta-mark" aria-hidden="true">(</span>}
       {showType&&<span className="compact-document-badge" data-ui-reference-part="type"
         data-ui-picker-skin={editable('type')?'standard':undefined}
         data-kind={compactTypeTone(item.type)}
         data-editable={editable('type')?'true':undefined}
         {...memberAttributes('type')}>{shown('type')}</span>}
       {!metadataEditable&&hasDepartment&&hasType&&<span className="compact-document-meta-separator" aria-hidden="true"> - </span>}
       {showDepartment&&<span className="compact-document-department" data-ui-reference-part="department"
         data-ui-picker-skin={editable('department')?'standard':undefined}
         data-editable={editable('department')?'true':undefined}
         {...memberAttributes('department')}>{shown('department')}</span>}
       {!metadataEditable&&hasSourceMetadata&&<span className="compact-document-meta-mark" aria-hidden="true">)</span>}
     </div>}
   </div>;
 }
 if(pair.variant==='partyTogether'){
   const sourceLevelEditable=includes('partyLevel')&&editable('partyLevel');
   const layoutSession=!!l03InlineEditor?.verifiedAdmin&&!!l03InlineEditor.layoutEditing&&
     !l03InlineEditor.dataEditing&&!l03InlineEditor.disabled;
   const previewMode=layoutSession?(l03InlineEditor?.previewMode??(sourceLevelEditable?'editable':'readonly')):
     (sourceLevelEditable?'editable':'readonly');
   const levelEditable=previewMode==='editable'&&includes('partyLevel');
   const levelNotRequired=isNotRequiredStatus('partyLevel',item.partyLevel);
   const levelText=compactPartyLevelLabel(item.partyLevel);
   // The source editor/lease remains field-scoped. Only the internal tracks
   // follow party-level permission; independent progress grants never move x.
   const stages:{key:TextField;label:string}[]=[
     {key:'progressParty',label:'Thành ủy'},
     {key:'progressBuild',label:'Trình Xây dựng NQ'},
     {key:'progressCouncil',label:'Trình ban hành NQ'}
   ];
   // The ordinary List and popup MUST preserve the original direct JSX tree.
   // The render-prop overlay is mounted only inside a verified Admin layout
   // session; it must never hide status pickers from normal app interactions.
   const stageRows=stages.filter(s=>includes(s.key)||(s.key==='progressParty'&&includes('partyLevel'))).map(stage=>{
       const isParty=stage.key==='progressParty';
       const levelIncluded=isParty&&includes('partyLevel');
       const showLevel=levelIncluded&&(levelEditable||(!levelNotRequired&&!!levelText));
       const statusNotRequired=isParty&&levelIncluded&&levelNotRequired;
       // A stored "Không" forces an inert UI projection even when this user
       // separately has progressParty edit rights. DATA owns its transaction.
       const statusEditable=!layoutSession&&editable(stage.key)&&!statusNotRequired;
       const stageValue=statusNotRequired?'Không phải trình':item[stage.key];
       const stageTone=compactStageVisualTone(stageValue,
         statusNotRequired?undefined:tone(stage.key));
       return <div className="compact-stage-row" key={stage.key}
         data-stage-field={stage.key}
         data-level-editable={isParty&&levelEditable?'true':undefined}
         data-level-not-required={statusNotRequired?'true':undefined}
         data-progress-tone={stageTone}>
         <span className="compact-stage-label"
           data-ui-reference-part={levelIncluded&&levelNotRequired&&!levelEditable?'partyLevel':undefined}>
           <span className="compact-stage-title">{stage.label}
             {showLevel&&!levelEditable&&<>
               {' '}<span className="compact-stage-level"
                 data-ui-reference-part="partyLevel" {...memberAttributes('partyLevel')}>
                 <span className="compact-stage-level-open" aria-hidden="true">(</span>
                 {levelText}
                 <span className="compact-stage-level-close" aria-hidden="true">)</span>
               </span>
             </>}
           </span>
         </span>
         {showLevel&&levelEditable&&<span className="compact-stage-level"
           data-ui-reference-part="partyLevel" data-ui-picker-skin={layoutSession?undefined:'standard'}
           data-level-editor="true" {...memberAttributes('partyLevel')}>
           {layoutSession?levelText:shown('partyLevel')}
         </span>}
         {includes(stage.key)&&<span className="compact-stage-state"
           data-ui-reference-part={stage.key}
           data-ui-picker-skin={statusEditable?'standard':undefined}
           data-progress-tone={stageTone}
           data-editable={statusEditable?'true':undefined}
           {...memberAttributes(stage.key)}>
           {statusNotRequired?
             <span className="workflow-status-value">Không phải trình</span>:
             layoutSession?stageValue:shown(stage.key)}
         </span>}
       </div>;
     });
   return layoutSession
     ?<L03InlineWidthControl actualMode={sourceLevelEditable?'editable':'readonly'}
       editor={l03InlineEditor}>{()=>stageRows}</L03InlineWidthControl>
     :<div className="compact-stages" data-rev2="true"
       data-ui-reference-group="L03"
       data-level-layout={levelEditable?'editable':'readonly'}>{stageRows}</div>;
 }
 if(pair.variant==='teamTogether'&&cvRoomInline&&includes('room')&&includes('specialist')){
   const leadFields=(['ubndLeader','vpLeader'] as TextField[]).filter(includes);
   return <div className="compact-pair-lines" data-ui-reference-group="L04">
     {leadFields.map(key=><div key={key}>
       <span className="compact-pair-tag">{key==='ubndLeader'?'UBND':'VP'}</span>
       <span className="compact-highlight-member" data-ui-reference-part={key} data-ui-picker-skin={editable(key)?'standard':undefined}
         {...memberAttributes(key)}>{shown(key)}</span>
     </div>)}
     <div className="compact-cv-room-line">
       <span className="compact-pair-tag">{item.specialist?'CV':'Phòng'}</span>
       <span className="compact-staff-inline-values">
       {(item.specialist||editable('specialist'))&&<span className="compact-highlight-member" data-ui-reference-part="specialist" data-ui-picker-skin={editable('specialist')?'standard':undefined}
         {...memberAttributes('specialist')}>{shown('specialist')}</span>}
       {(!!item.room||editable('room'))&&<span className="compact-cv-room-name" data-ui-reference-part="room"
         {...memberAttributes('room')}>
         {item.specialist?' (':''}{shown('room')}{item.specialist?')':''}
       </span>}
       {!item.room&&!item.specialist&&!editable('specialist')&&!editable('room')&&shown('specialist')}
       </span>
     </div>
   </div>;
 }
 return <div className="compact-pair-lines" data-ui-reference-group="L04">
   {pair.memberFields.map((key,index)=><div key={key}>
     <span className="compact-pair-tag">{pair.tags[index]}</span>
     <span className="compact-highlight-member" data-ui-reference-part={key} data-ui-picker-skin={editable(key as TextField)?'standard':undefined}
       {...memberAttributes(key as TextField)}>
       {shown(key as TextField)}
     </span>
   </div>)}
 </div>;
}
