import {GoogleAuthProvider,browserPopupRedirectResolver,signInWithPopup,type Auth} from 'firebase/auth';

/** Only administrator-initiated login loads the Google popup/redirect UI. */
export async function loginWithGooglePopup(auth:Auth):Promise<void>{
  await signInWithPopup(auth,new GoogleAuthProvider(),browserPopupRedirectResolver);
}
