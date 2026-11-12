export interface SignedBackupContext {
  projectId:string;
  databaseURL:string;
}
export interface SignOptions extends SignedBackupContext {
  keyId:string;
  secret:string|Buffer;
}
export interface VerifyOptions extends SignedBackupContext {
  keyRing:Record<string,string|Buffer>;
}
export const SERVER_BACKUP_PATHS:readonly string[];
export function sealServerBackup(payload:Record<string,unknown>,
  options:SignOptions):Record<string,any>;
export function verifyServerBackup(envelope:Record<string,any>,
  options:VerifyOptions):{payload:Record<string,any>;sha256:string;keyId:string};
