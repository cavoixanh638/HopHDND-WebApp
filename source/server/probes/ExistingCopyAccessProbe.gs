// Read-only permission check, fixed to the private Excel TEST COPY.
function checkExistingCopyAccess() {
  const scopes=['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/script.external_request'];
  const auth=ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL,scopes);
  console.log(JSON.stringify({driveAuthorization:String(auth.getAuthorizationStatus())}));
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,scopes);
  const testCopyId='19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7';
  const about=UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/about?fields=user(emailAddress)',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
  const identity=JSON.parse(about.getContentText());
  console.log(JSON.stringify({aboutStatus:about.getResponseCode(),accountMatchesCopyOwner:about.getResponseCode()===200&&identity.user?.emailAddress==='phucpixel2025@gmail.com'}));
  const response=UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+testCopyId+'?fields=id,title,mimeType,etag,headRevisionId',{headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken()},muteHttpExceptions:true});
  const status=response.getResponseCode();
  const data=JSON.parse(response.getContentText());
  const result={status,canRead:status===200&&data.id===testCopyId,mimeType:status===200?data.mimeType:null,hasEtag:status===200&&typeof data.etag==='string',errorReason:status===200?null:data.error?.errors?.[0]?.reason};
  console.log(JSON.stringify(result));return result;
}
