// Pure codec: no network, authorization, or source-file access.
// Callers must commit the resulting package with a verified conditional write.
var HDNDExcelWriteCore=(function(){
  function fail(message){throw new Error(message);}
  function cleanXml(xml){if(typeof xml!=='string'||/<!DOCTYPE|<!ENTITY/i.test(xml)||/<\w+:(?:c|row|si|t)\b/.test(xml))fail('Unsupported XML shape; no changes made.');return xml;}
  function attr(xml,key){var re=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*(["\\\x27])(.*?)\\1');var m=xml.match(re);return m?decode(m[2]):null;}
  function decode(text){return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,function(_,name){if(name[0]==='#'){var n=name[1].toLowerCase()==='x'?parseInt(name.slice(2),16):parseInt(name.slice(1),10);if(!Number.isInteger(n)||n<0||n>0x10ffff||n>=0xd800&&n<=0xdfff||n<32&&![9,10,13].includes(n)||n===0xfffe||n===0xffff)fail('Invalid XML character.');return String.fromCodePoint(n);}return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name.toLowerCase()];});}
  function encode(text){if(typeof text!=='string'||text.length>20000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/.test(text))fail('Invalid text value.');for(var i=0;i<text.length;i++){var c=text.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){var d=text.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))fail('Invalid Unicode value.');}else if(c>=0xdc00&&c<=0xdfff)fail('Invalid Unicode value.');}return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\r/g,'&#13;');}
  function plain(xml){xml=xml.replace(/<rPh\b[^>]*>[\s\S]*?<\/rPh>/g,'');return Array.from(xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)).map(function(m){return decode(m[1]);}).join('');}
  function sharedStrings(xml){if(!xml)return [];cleanXml(xml);return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)).map(function(m){return plain(m[1]);});}
  function address(ref){var m=String(ref).match(/^([A-Z]{1,3})([1-9]\d*)$/);if(!m)fail('Invalid cell address.');var col=0;for(var c of m[1])col=col*26+c.charCodeAt(0)-64;var row=Number(m[2]);if(col>16384||row>1048576)fail('Cell address out of range.');return {col:col,row:row};}
  function cells(xml,strings){cleanXml(xml);strings=strings||[];var result={};for(var m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){var ref=attr(m[1],'r');address(ref);if(result[ref])fail('Duplicate cell address.');var body=m[2]||'',type=attr(m[1],'t'),v=body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/),value=v?decode(v[1]):'';if(type==='s'){if(!/^\d+$/.test(value)||Number(value)>=strings.length)fail('Invalid shared string index.');value=strings[Number(value)];}else if(type==='inlineStr')value=plain(body);else if(type&&!['n','str','b','e'].includes(type))fail('Unsupported cell type.');result[ref]={value:value,formula:/<f\b/.test(body),attrs:m[1],start:m.index,end:m.index+m[0].length,raw:m[0]};}return result;}
  function worksheetPath(workbook,relationships,sheetName){cleanXml(workbook);cleanXml(relationships);var matches=Array.from(workbook.matchAll(/<sheet\b([^>]*?)\/?>/g)).filter(function(m){return attr(m[1],'name')===sheetName;});if(matches.length!==1)fail('Worksheet name must be unique.');var id=attr(matches[0][1],'r:id');if(!id)fail('Missing worksheet relationship.');var links=Array.from(relationships.matchAll(/<(?:[A-Za-z_][\w.-]*:)?Relationship\b([^>]*?)\/?>/g)).filter(function(m){return attr(m[1],'Id')===id;});if(links.length!==1||attr(links[0][1],'TargetMode')==='External'||!String(attr(links[0][1],'Type')).endsWith('/worksheet'))fail('Invalid worksheet relationship.');var target=attr(links[0][1],'Target');if(!target||target.includes('..')||target.includes('\\'))fail('Unsafe worksheet path.');var path=target[0]==='/'?target.slice(1):'xl/'+target;if(!/^xl\/worksheets\/[\w.-]+\.xml$/.test(path))fail('Unsupported worksheet path.');return path;}
  function patchWorksheet(xml,strings,patches){var current=cells(xml,strings);if(!Array.isArray(patches)||!patches.length||patches.length>1000)fail('Invalid patch list.');var edits=[],used={};for(var patch of patches){if(!patch||typeof patch.expected!=='string')fail('Expected cell value is required.');var a=address(patch.ref);if(a.col<3||a.col>16)fail('ID/STT and fields outside C–P are read-only.');if(used[patch.ref])fail('Duplicate patch.');used[patch.ref]=true;var existing=current[patch.ref];if(existing?.formula)fail('Formula cell cannot be edited.');if(existing&&/<extLst\b/.test(existing.raw))fail('Extended cell metadata cannot be edited.');if((existing?existing.value:'')!==patch.expected)fail('Cell conflict: '+patch.ref);for(var merged of xml.matchAll(/<mergeCell\b([^>]*)\/>/g)){var range=attr(merged[1],'ref')?.split(':');if(!range||range.length!==2)fail('Unsupported merge range.');var start=address(range[0]),end=address(range[1]);if(a.col>=start.col&&a.col<=end.col&&a.row>=start.row&&a.row<=end.row&&patch.ref!==range[0])fail('Merged non-anchor cell cannot be edited.');}
      var text=encode(patch.next);var attrs=existing?existing.attrs.replace(/\s+t\s*=\s*(["'])(.*?)\1/g,''):' r="'+patch.ref+'"';var replacement='<c'+attrs+' t="inlineStr"><is><t xml:space="preserve">'+text+'</t></is></c>';
      if(existing){edits.push({start:existing.start,end:existing.end,text:replacement,col:a.col});continue;}
      var rows=Array.from(xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)).filter(function(m){return typeof m[2]==='string'&&attr(m[1],'r')===String(a.row);});if(rows.length!==1)fail('Target row does not exist.');var row=rows[0],pos=row.index+row[0].length-6;for(var c of Object.keys(current)){var ca=address(c);if(ca.row===a.row&&ca.col>a.col&&current[c].start<pos)pos=current[c].start;}edits.push({start:pos,end:pos,text:replacement,col:a.col});
    }
    edits.sort(function(a,b){return b.start-a.start||b.col-a.col;});for(var edit of edits)xml=xml.slice(0,edit.start)+edit.text+xml.slice(edit.end);cells(xml,strings);return xml;
  }
  function normalized(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/\s+/g,' ').trim();}
  function recordPatches(xml,strings,records){
    var data=cells(xml,strings),map={content:'C',department:'D',type:'E',partyLevel:'F',progressParty:'G',progressBuild:'H',progressCouncil:'I',specialist:'J',room:'K',vpLeader:'L',ubndLeader:'M',specificProgress:'N',note:'O',isDropped:'P'};
    var header=Array.from({length:10},function(_,i){return i+1;}).find(function(row){return normalized(data['C'+row]?.value).includes('noi dung')&&normalized(data['D'+row]?.value).includes('so');});
    if(!header)fail('Unsupported data headers; no write.');
    if(!Array.isArray(records)||!records.length||records.length>100)fail('Invalid record batch.');
    var result=[],used={};
    for(var record of records){
      if(!record||typeof record.code!=='string'||!record.code.trim()||used[record.code])fail('Stable unique legacy code is required.');used[record.code]=true;
      var refs=Object.keys(data).filter(function(ref){return /^A\d+$/.test(ref)&&address(ref).row>header&&data[ref].value.trim()===record.code;});
      if(refs.length!==1)fail('Legacy code missing or duplicated; no write.');var row=address(refs[0]).row;
      if(!record.changes||typeof record.changes!=='object'||Array.isArray(record.changes)||!Object.keys(record.changes).length||!record.baseValues||typeof record.baseValues!=='object')fail('Invalid record changes.');
      for(var field of Object.keys(record.changes)){
        if(!Object.prototype.hasOwnProperty.call(map,field)||!Object.prototype.hasOwnProperty.call(record.baseValues,field))fail('Field not editable or baseline missing.');
        var ref=map[field]+row,raw=data[ref]?.value||'',semantic=raw.trim(),expected=record.baseValues[field],next=record.changes[field];
        if(field==='isDropped'){semantic=['rut','x','true','1','khong trinh nua'].includes(normalized(raw));if(typeof next!=='boolean'||typeof expected!=='boolean')fail('Invalid drop state.');next=next?'Rút':'';}
        else {if(typeof next!=='string'||typeof expected!=='string')fail('Invalid field text.');if(['department','specialist','room','vpLeader','ubndLeader'].includes(field)&&!semantic)semantic='Chưa phân công';if(field==='content'&&!semantic)semantic='(Chưa có nội dung)';next=next.trim();if(field==='content'&&!next)fail('Content is required.');}
        if(semantic!==expected)fail('Record conflict: '+record.code+' / '+field);
        result.push({ref:ref,expected:raw,next:next});
      }
    }
    return result;
  }
  return {recordPatches:recordPatches,decode:decode,sharedStrings:sharedStrings,cells:cells,worksheetPath:worksheetPath,patchWorksheet:patchWorksheet};
})();

