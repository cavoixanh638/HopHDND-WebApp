import fs from 'node:fs';
// The legacy Functions candidate evolves independently from the deployed Spark
// contract. Keep its reviewed Spark input explicit so legacy-only exceptions
// cannot propagate into production Rules through regeneration.
// Spark rule changes update this base and regenerate the output together;
// simple-admin CI checks that regeneration produces no unexpected drift.
const rules=JSON.parse(fs.readFileSync('firebase/database.spark-base.rules.json','utf8'));
const googleAdmin="(auth != null && auth.token.email === 'cavoixanh638@gmail.com' && auth.token.email_verified === true && auth.token.firebase.sign_in_provider === 'google.com')";
const binding="root.child('hdnd/sparkSessions').child(auth.uid)";
const bound=`(${binding}.exists() && ${binding}.child('expiresAt').val() > now)`;
const sessionAdmin=`(auth != null && auth.token.firebase.sign_in_provider === 'anonymous' && ${bound} && ${binding}.child('admin').val() === true)`;
function convert(node){
  for(const [key,value] of Object.entries(node)){
    if(typeof value==='object')convert(value);
    else if(typeof value==='string')node[key]=value
      .replaceAll('(auth != null && auth.token.cellService === true)',"(auth != null && auth.token.firebase.sign_in_provider === 'anonymous')")
      .replaceAll('(auth != null && auth.token.cellService === true && auth.uid != null)',"(auth != null && auth.token.firebase.sign_in_provider === 'anonymous' && auth.uid != null)")
      .replaceAll(googleAdmin,`(${googleAdmin} || ${sessionAdmin})`)
      .replaceAll("auth != null && auth.token.email_verified === true && auth.token.firebase.sign_in_provider === 'google.com'", "auth != null && auth.token.firebase.sign_in_provider === 'google.com' && auth.token.email_verified === true")
      .replaceAll("auth != null && auth.token.email ===", "auth != null && auth.token.firebase.sign_in_provider === 'google.com' && auth.token.email ===");
  }
}
const h=rules.rules.hdnd;
// Only cell/lease subtrees use the bound tab identity. Administration retains
// verified Google Auth. The service-protected parent boundary stays closed.
for(const node of [h.items.$id,h.editLocks.$id.$field,h.datasetV2.generations.$generation.items.$id,h.datasetV2.leases.$generation.$id.$field])convert(node);
const staff=`(${binding}.child('admin').val() === true || root.child('hdnd/editors').child(${binding}.child('ownerUid').val()).val() === true)`;
const sessionAllowed=`(!${binding}.exists() || (${bound} && ${staff}))`;
for(const node of [h.items.$id,h.editLocks.$id.$field,h.datasetV2.generations.$generation.items.$id,h.datasetV2.leases.$generation.$id.$field])node['.write']=`(${sessionAllowed}) && (${node['.write']})`;
for(const node of [h.editLocks.$id.$field,h.datasetV2.leases.$generation.$id.$field])node['.read']=`(${sessionAdmin}) || (${node['.read']})`;
for(const versioned of [false,true]){
  const row=versioned?h.datasetV2.generations.$generation.items.$id:h.items.$id;
  const lease=versioned?h.datasetV2.leases.$generation.$id.$field:h.editLocks.$id.$field;
  const epoch=versioned?"root.child('hdnd/datasetV2/active/generationId').val() === $generation":"!root.child('hdnd/datasetV2/active').exists()";
  const item=versioned?"root.child('hdnd/datasetV2/generations').child($generation).child('items').child($id)":"root.child('hdnd/items').child($id)";
  const grants=versioned?"root.child('hdnd/datasetV2/permissions').child($generation)":"root.child('hdnd/permissions')";
  const levelGrant=`(${grants}.child('cells').child($id).child('partyLevel').exists() ? ${grants}.child('cells').child($id).child('partyLevel').val() === true : (${grants}.child('rows').child($id).exists() ? ${grants}.child('rows').child($id).val() === true : ${grants}.child('columns/partyLevel').val() === true))`;
  // Imports and immutable generation copies retain their exact approved source
  // values, including historical aliases. Only existing-row edits canonicalize.
  // Their write authorization stays at the original empty-primary Google-admin
  // and protected parent-CAS boundaries; this adds no public creation path.
  const partyContractStart=row['.validate'].lastIndexOf(" && (newData.child('partyLevel').val() === data.child('partyLevel').val() ||");
  if(partyContractStart<0)throw Error('Missing integrated party contract');
  row['.validate']=row['.validate'].slice(0,partyContractStart)+` && (!data.exists() || (${row['.validate'].slice(partyContractStart+4)}))`;
  const sourceCreation=`(!data.parent().exists() && ${googleAdmin} && newData.isString() && newData.val().length <= 20000)`;
  row.progressParty['.validate']=`(${sourceCreation} || (${row.progressParty['.validate'].replaceAll(levelGrant,`(${sessionAdmin} || ${levelGrant})`)})) && (!data.parent().exists() || newData.val() === data.val() || ${['Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'].map(v=>`newData.val() === '${v}'`).join(' || ')})`;
  const grant=`(${sessionAdmin} || (${grants}.child('cells').child($id).child($field).exists() ? ${grants}.child('cells').child($id).child($field).val() === true : (${grants}.child('rows').child($id).exists() ? ${grants}.child('rows').child($id).val() === true : ${grants}.child('columns').child($field).val() === true)))`;
  const identity=`auth != null && auth.token.firebase.sign_in_provider === 'anonymous' && ${sessionAllowed}`;
  const notPaused=`(root.child('hdnd/control/editingLocked').val() !== true || ${sessionAdmin})`;
  const owned="data.exists() && data.child('uid').val() === auth.uid && newData.child('token').val() === data.child('token').val()";
  const release=`(${owned} && newData.child('expiresAt').val() === 0)`;
  const mode="root.child('hdnd/freezeControl/mode').val()";
  const draining=`(${mode} === 'DRAINING' && ${owned} && data.child('acquiredAt').val() < root.child('hdnd/freezeControl/changedAt').val() && now < root.child('hdnd/freezeControl/deadline').val())`;
  row['.write']=`${identity} && (${epoch}) && data.exists() && newData.exists() && ${mode} !== 'FROZEN' && ${notPaused}`;
  lease['.write']=`${identity} && (${epoch}) && ${item}.exists() && newData.exists() && ${mode} !== 'FROZEN' && (!data.exists() || data.child('expiresAt').val() <= now || (${owned})) && (${release} || (${notPaused} && ${grant} && (!root.child('hdnd/freezeControl/mode').exists() || ${mode} === 'OPEN' || ${draining})))`;
}
// SIMPLE OWNER MAINTENANCE (legacy primary only): directly replace/clear
// /hdnd/items from the existing verified Google Admin. No R2, Worker, paid
// hosting or privileged browser credential. Never grant parent /hdnd writes.
// A freeze + absent V2 pointer are required. Ordinary per-cell editing rules
// for staff and visitors are unchanged; validation bypass is Admin/FROZEN only.
const maintenancePermit="root.child('hdnd/simpleMaintenancePermit')";
const simpleAdminMaintenance=`(${googleAdmin} && root.child('hdnd/freezeControl/mode').val() === 'FROZEN' && !root.child('hdnd/datasetV2/active').exists() && ${maintenancePermit}.child('uid').val() === auth.uid && ${maintenancePermit}.child('token').isString() && ${maintenancePermit}.child('expiresAt').val() > now)`;
h.simpleMaintenancePermit={
  '.read':googleAdmin,
  // A short-lived capability is available only to the existing Google Admin.
  // Normal FROZEN tests and per-cell rules cannot bypass the lock without it.
  '.write':`${googleAdmin} && ((newData.exists() && newData.child('uid').val() === auth.uid && newData.child('token').isString() && newData.child('token').val().matches(/^[0-9a-f-]{36}$/) && newData.child('expiresAt').isNumber() && newData.child('expiresAt').val() > now && newData.child('expiresAt').val() <= now + 60000 && (!data.exists() || data.child('expiresAt').val() <= now)) || (!newData.exists() && data.child('uid').val() === auth.uid))`,
  '.validate':"newData.hasChildren(['uid','token','expiresAt'])",
  uid:{'.validate':"newData.isString()"},
  token:{'.validate':"newData.isString()"},
  expiresAt:{'.validate':"newData.isNumber()"},
  '$other':{'.validate':false}
};
h.items['.write']=`(${h.items['.write']}) || ${simpleAdminMaintenance}`;
function allowOnlyAdminFrozenReplacementValidation(node){
  for(const [key,value] of Object.entries(node)){
    if(key==='.validate'&&typeof value==='string'){
      node[key]=`(${simpleAdminMaintenance}) || (${value})`;
    }else if(value&&typeof value==='object'){
      allowOnlyAdminFrozenReplacementValidation(value);
    }
  }
}
allowOnlyAdminFrozenReplacementValidation(h.items);

// Drafts bind to the OPEN primary maintenance epoch in their read baseline.
// A client cannot carry an old proposal across freeze/replace/reopen; check
// this again against server root state at the actual transaction commit.
const primaryEpoch="(root.child('hdnd/freezeControl/epoch').exists() ? root.child('hdnd/freezeControl/epoch').val() : 0)";
// Direct-CAS status path: release gated, legacy primary only, no pre-open lease.
function appendDirectStatusRules(h){
  // This is intentionally called AFTER the legacy admin-maintenance wrapper.
  // Appending a narrow alternative here preserves all prior lease branches.
  const row=h.items.$id;
  const identity="(auth != null && auth.token.firebase.sign_in_provider === 'anonymous')";
  const binding="root.child('hdnd/sparkSessions').child(auth.uid)";
  const bound="("+binding+".exists() && "+binding+".child('expiresAt').val() > now)";
  const admin="("+identity+" && "+bound+" && "+binding+".child('admin').val() === true)";
  const staff="("+binding+".child('admin').val() === true || root.child('hdnd/editors').child("+binding+".child('ownerUid').val()).val() === true)";
  const session="(!"+binding+".exists() || ("+bound+" && "+staff+"))";
  const base="("+[
    identity,session,"data.parent().exists()",
    "newData.parent().child('history').child((newData.parent().child('revision').val() % 50) + '').child('maintenanceEpoch').isNumber()",
    "newData.parent().child('history').child((newData.parent().child('revision').val() % 50) + '').child('maintenanceEpoch').val() === "+primaryEpoch,
    "!root.child('hdnd/datasetV2/active').exists()",
    "(root.child('hdnd/freezeControl/mode').val() === 'OPEN' || !root.child('hdnd/freezeControl/mode').exists())",
    "(root.child('hdnd/control/editingLocked').val() !== true || "+admin+")"
  ].join(" && ")+")";
  const perms="root.child('hdnd/permissions')";
  const grant=(field)=>"("+admin+" || ("+perms+".child('cells').child($id).child('"+field+"').exists() ? "+perms+".child('cells').child($id).child('"+field+"').val() === true : ("+perms+".child('rows').child($id).exists() ? "+perms+".child('rows').child($id).val() === true : "+perms+".child('columns').child('"+field+"').val() === true)))";
  const unlocked=(field)=>"(!root.child('hdnd/editLocks').child($id).child('"+field+"').exists() || root.child('hdnd/editLocks').child($id).child('"+field+"').child('expiresAt').val() <= now)";
  const oldLevel="data.parent().child('partyLevel').val()",newLevel="newData.parent().child('partyLevel').val()";
  const statusEnum=['Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'].map(v=>"newData.val() === '"+v+"'").join(" || ");
  const buildEnum=['Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'].map(v=>"newData.val() === '"+v+"'").join(" || ");
  const councilEnum=['Sở chưa trình','VP đang xử lý','Hoàn thành'].map(v=>"newData.val() === '"+v+"'").join(" || ");
  const levelEnum=['Không','TTTU','BTV','BCH'].map(v=>"newData.val() === '"+v+"'").join(" || ");
  const nonNo="("+newLevel+" === 'TTTU' || "+newLevel+" === 'BTV' || "+newLevel+" === 'BCH')";
  const allow={
    partyLevel:"newData.isString() && ("+levelEnum+") && "+grant('partyLevel')+" && "+unlocked('partyLevel'),
    progressParty:"newData.isString() && ("+statusEnum+") && (("+
      newLevel+" === "+oldLevel+" && "+newLevel+" !== 'Không' && "+oldLevel+" !== 'Không phải trình' && newData.val() !== 'Không phải trình' && "+grant('progressParty')+" && "+unlocked('progressParty')+
      ") || ("+newLevel+" !== "+oldLevel+" && (("+newLevel+" === 'Không' && newData.val() === 'Không phải trình') || (("+oldLevel+" === 'Không' || "+oldLevel+" === 'Không phải trình') && "+nonNo+" && newData.val() === 'Sở chưa trình')) && "+grant('partyLevel')+" && "+unlocked('partyLevel')+" && "+unlocked('progressParty')+"))",
    progressBuild:"newData.isString() && ("+buildEnum+") && "+grant('progressBuild')+" && "+unlocked('progressBuild'),
    progressCouncil:"newData.isString() && ("+councilEnum+") && "+grant('progressCouncil')+" && "+unlocked('progressCouncil'),
    isDropped:"newData.isBoolean() && "+grant('isDropped')+" && "+unlocked('isDropped')
  };
  for(const [field,check] of Object.entries(allow)){
    if(typeof row[field]?.['.validate']!=='string')throw Error('Spark direct-CAS requires existing field rule '+field);
    row[field]['.validate']='('+row[field]['.validate']+') || ('+base+' && newData.val() !== data.val() && '+check+')';
  }
}
appendDirectStatusRules(h);

// RTDB does not run a leaf .validate rule when that leaf is deleted. Preserve
// complete older audit payloads at the still-existing slot parent instead.
// The current revision's ring slot may be replaced after 50 commits; the
// existing verified-Admin/FROZEN maintenance route retains its restore rights.
const legacyAuditFields=['content','department','type','partyLevel','progressParty',
  'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader',
  'specificProgress','note','documentKind','isDropped'];
const preserveOldAudit=['changes','oldValues'].flatMap(section=>
  legacyAuditFields.map(field=>
    `newData.child('${section}/${field}').val() === data.child('${section}/${field}').val()`)
).join(' && ');
const auditSlot=h.items.$id.history.$slot;
const preserveEpoch="newData.child('maintenanceEpoch').val() === data.child('maintenanceEpoch').val()";
auditSlot.maintenanceEpoch={'.validate':`(${simpleAdminMaintenance}) || (newData.isNumber() && newData.val() >= 0 && newData.val() % 1 === 0 && ($slot === (newData.parent().parent().parent().child('revision').val() % 50) + '' ? newData.val() === ${primaryEpoch} : newData.val() === data.val()))`};
auditSlot['.validate']=`(${auditSlot['.validate']}) && (${simpleAdminMaintenance} || $slot === (newData.parent().parent().child('revision').val() % 50) + '' || (${preserveOldAudit} && ${preserveEpoch}))`;

h.sparkSessions={
  $session:{
    '.read':`auth != null && (auth.uid === $session || ${googleAdmin} || data.child('ownerUid').val() === auth.uid || (!data.exists() && auth.token.firebase.sign_in_provider === 'google.com' && auth.token.email_verified === true))`,
    '.write':`auth != null && auth.token.firebase.sign_in_provider === 'google.com' && auth.token.email_verified === true && (${googleAdmin} || root.child('hdnd/editors').child(auth.uid).val() === true) && newData.exists() && newData.child('ownerUid').val() === auth.uid && (!data.exists() || data.child('ownerUid').val() === auth.uid)`,
    '.validate':`newData.hasChildren(['ownerUid','admin','createdAt','expiresAt']) && newData.child('admin').val() === ${googleAdmin} && (data.exists() ? newData.child('createdAt').val() === data.child('createdAt').val() : newData.child('createdAt').val() === now) && (newData.child('expiresAt').val() === 0 || (newData.child('expiresAt').val() > now && newData.child('expiresAt').val() <= now+1860000))`,
    ownerUid:{'.validate':'newData.isString()'},admin:{'.validate':'newData.isBoolean()'},createdAt:{'.validate':'newData.isNumber()'},expiresAt:{'.validate':'newData.isNumber()'},$other:{'.validate':false}
  }
};
fs.writeFileSync('firebase/database.spark.rules.json',JSON.stringify(rules,null,2)+'\n');
console.log('SPARK_RULES_BUILT',fs.statSync('firebase/database.spark.rules.json').size);
