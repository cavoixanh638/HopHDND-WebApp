import fs from 'node:fs';
const rules=JSON.parse(fs.readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
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
