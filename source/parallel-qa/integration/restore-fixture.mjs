// Synthetic full-root fixture for the shared CI restore contract; no network.
import {writeFileSync} from 'node:fs';
import {join, isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const directory = process.argv[2];
if (!directory || !isAbsolute(directory)) throw Error('Absolute temporary directory required');
const fields = ['content','department','type','partyLevel','progressParty','progressBuild',
  'progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note'];
const row = {recordId:'demo-1',displayCode:'DEMO-1',stt:1,revision:1,
  ...Object.fromEntries(fields.map(field => [field, field === 'content' ? 'Synthetic restore only' : '']))};
const bytes = Buffer.from(JSON.stringify({hdnd:{items:{'demo-1':row},
  profile:{dataSource:'primary'},permissions:{columns:{note:true}}}})+'\n');
const filename = 'hophdnd-demo-restore.json';
writeFileSync(join(directory, filename), bytes);
writeFileSync(join(directory, 'hophdnd-demo-restore.manifest.json'), JSON.stringify({
  projectId:'demo-hdnd',instanceId:'demo-hdnd',rtdbFile:filename,
  rtdbSha256:createHash('sha256').update(bytes).digest('hex'),rtdbBytes:bytes.length,
  hdndItemsCount:1,hdndMirrorsCount:0,rootKeysCount:1,
  stability:'Two successive exports matched byte-for-byte',syntheticFixture:true
})+'\n');
