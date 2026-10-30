import {GoogleAuthProvider,getIdTokenResult,signInWithCredential,type Auth,type User} from 'firebase/auth';
import {firebaseAdmin} from '../data/firebase-repository';

/**
 * PR95 TEST HARNESS ONLY: Firebase Authentication Emulator accepts literal
 * Google ID-token claims through its documented signInWithCredential path.
 * The returned User and ID token are issued by the Auth Emulator, not mocked.
 *
 * This module is never imported from the production app. The caller must use
 * Vite pages-test or Vitest mode, a demo Firebase project, localhost browser,
 * and a connected Auth Emulator. No production Google credential is involved.
 */
export async function signInAsEmulatorGoogleAdmin(auth:Auth):Promise<User> {
  const mode=import.meta.env.MODE;
  const browser=typeof window!=='undefined';
  if(mode!=='pages-test'&&mode!=='test')
    throw Error('PR95 Google admin test identity is not available outside test builds.');
  if(browser&&!['localhost','127.0.0.1'].includes(window.location.hostname))
    throw Error('PR95 Google admin test identity requires a loopback browser origin.');
  if(!auth.emulatorConfig||!auth.app.options.projectId?.startsWith('demo-hdnd'))
    throw Error('PR95 requires a connected demo Firebase Auth Emulator.');
  const assertion=JSON.stringify({
    sub:'pr95-emulator-google-admin',email:'cavoixanh638@gmail.com',
    email_verified:true,name:'PR95 local emulator administrator'
  });
  const credential=GoogleAuthProvider.credential(assertion);
  const result=await signInWithCredential(auth,credential);
  const user=result.user;
  const token=await getIdTokenResult(user,true);
  if(!firebaseAdmin(user)||token.signInProvider!=='google.com'||
    !user.providerData.some(p=>p.providerId==='google.com'))
    throw Error('Emulator Google identity not verified by SDK and token claims.');
  return user;
}
