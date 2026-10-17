import {describe,it,expect} from 'vitest';
import {canonicalPermissions,samePermissions} from '../src/data/firebase-repository';

describe('Firebase rights CAS compares semantic values rather than JS key insertion order',()=>{
  it('accepts server-reordered rights and RTDB omitted empty nodes',()=>{
    const local={columns:{note:false,progressCouncil:true,content:true},rows:{'sheet:42:row:3':true,'sheet:42:row:4':false},cells:{'sheet:42:row:4':{content:false,note:true}}};
    const server={cells:{'sheet:42:row:4':{note:true,content:false}},rows:{'sheet:42:row:4':false,'sheet:42:row:3':true},columns:{content:true,progressCouncil:true,note:false}};
    expect(samePermissions(local,server)).toBe(true);
    expect(samePermissions({columns:{},rows:{},cells:{}},{columns:{}})).toBe(true);
    expect(canonicalPermissions(local)).toBe(canonicalPermissions(server));
  });
  it('does not silently merge actual conflict or confuse explicit deny with inheritance',()=>{
    expect(samePermissions({columns:{content:false}},{columns:{}})).toBe(false);
    expect(samePermissions({columns:{content:true}},{columns:{content:false}})).toBe(false);
    expect(samePermissions({columns:{},cells:{r1:{content:false}}},{columns:{}})).toBe(false);
  });
});