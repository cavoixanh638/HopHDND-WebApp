export const SPARK_PROJECT:string;
export const SPARK_DATABASE:string;
export function canonical(value:unknown):string;
export function verifySparkRelease(file:string,options:{
  checkout:string;sourceSha:string;clean:boolean;
  liveRoot:unknown;liveRules:unknown;now?:number;
}):{sourceSha:string;rulesSha256:string;backupSha256:string;verifiedAt:string};
