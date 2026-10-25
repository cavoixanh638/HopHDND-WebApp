import {GoogleAuthProvider,browserPopupRedirectResolver,browserLocalPersistence,setPersistence,signInWithPopup,type Auth} from 'firebase/auth';

/** Only administrator-initiated login loads the Google popup/redirect UI. */
export async function loginWithGooglePopup(auth:Auth):Promise<void>{
  // Google administrator login may persist across page reloads. Anonymous
  // editor sessions are deliberately transient and tab-specific.
  await setPersistence(auth,browserLocalPersistence);
  await signInWithPopup(auth,new GoogleAuthProvider(),browserPopupRedirectResolver);
}
