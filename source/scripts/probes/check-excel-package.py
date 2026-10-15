from pathlib import Path
import zipfile,re,xml.etree.ElementTree as E,json,hashlib
base=Path(__file__).resolve().parents[2]
src=base/'.private-probes/source.xlsx';out=base/'.private-probes/probe-edit.xlsx'
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(src) as z:
 parts={n:z.read(n) for n in z.namelist()}
 strings=[ ''.join(i.itertext()) for i in E.fromstring(parts['xl/sharedStrings.xml']).findall('s:si',ns)] if 'xl/sharedStrings.xml' in parts else []
 def value(c):
  if c is None:return ''
  v=c.find('s:v',ns)
  if c.attrib.get('t')=='s':return strings[int(v.text)] if v is not None else ''
  if c.attrib.get('t')=='inlineStr':return ''.join(c.find('s:is',ns).itertext())
  return v.text if v is not None and v.text else ''
 target='xl/worksheets/sheet1.xml';root=E.fromstring(parts[target])
 cells={c.attrib['r']:c for c in root.findall('.//s:c',ns)}
 row=next(int(c.attrib['r'][1:]) for c in cells.values() if re.fullmatch(r'A\d+',c.attrib['r']) and re.match(r'^(ID|NQ|BC)\d+',value(c),re.I))
 ref=f'C{row}';cell=cells[ref]
 if cell.find('s:f',ns) is not None:raise ValueError('Refuse to replace a formula')
 text='THU NGHIEM - KHONG DUNG NHAP LIEU'
 xml=parts[target].decode('utf-8')
 pattern=rf'<c\b([^>]*\br="{ref}"[^>]*)>.*?</c>'
 match=re.search(pattern,xml,re.S)
 if not match:raise ValueError('Cell shape unsupported; no write')
 attrs=re.sub(r'\s+t="[^"]*"','',match.group(1))
 edited=xml[:match.start()]+f'<c{attrs} t="inlineStr"><is><t>{text}</t></is></c>'+xml[match.end():]
 with zipfile.ZipFile(out,'w') as w:
  for info in z.infolist():w.writestr(info,edited.encode('utf-8') if info.filename==target else parts[info.filename])
with zipfile.ZipFile(out) as w:
 assert set(w.namelist())==set(parts)
 changed=[n for n in parts if w.read(n)!=parts[n]]
 assert changed==[target]
 oldroot=E.fromstring(parts[target]);newroot=E.fromstring(w.read(target))
 oldcells={c.attrib['r']:E.tostring(c) for c in oldroot.findall('.//s:c',ns)}
 newcells={c.attrib['r']:E.tostring(c) for c in newroot.findall('.//s:c',ns)}
 assert oldcells.keys()==newcells.keys()
 assert [r for r in oldcells if oldcells[r]!=newcells[r]]==[ref]
 formula_count=lambda values: sum(len(E.fromstring(data).findall('.//s:f',ns)) for name,data in values.items() if name.startswith('xl/worksheets/') and name.endswith('.xml'))
 assert formula_count(parts)==formula_count({name:w.read(name) for name in w.namelist()})
 report={'fileParts':len(parts),'changedPart':target,'changedCell':ref,'otherCellsUnchanged':True,'otherPartsUnchanged':True,'formulasPreserved':True,'formulaCells':formula_count(parts),'outputBytes':out.stat().st_size,'sourceSha256':hashlib.sha256(src.read_bytes()).hexdigest(),'outputSha256':hashlib.sha256(out.read_bytes()).hexdigest()}
 (base/'.private-probes/roundtrip.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
 print(json.dumps(report))
