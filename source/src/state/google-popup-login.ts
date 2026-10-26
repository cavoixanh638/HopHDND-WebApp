import {GoogleAuthProvider,browserPopupRedirectResolver,browserLocalPersistence,setPersistence,signInWithPopup,type Auth} from 'firebase/auth';

/** Only administrator-initiated login loads the Google popup/redirect UI. */
export async function loginWithGooglePopup(auth:Auth):Promise<void>{
  // Google administrator login may persist across page reloads. Anonymous
  // editor sessions are deliberately transient and tab-specific.
  // Only persist AFTER successful Google login. A cancelled popup must NOT
  // accidentally persist the current anonymous editor UID across tabs.
  await signInWithPopup(auth,new GoogleAuthProvider(),browserPopupRedirectResolver);
  await setPersistence(auth,browserLocalPersistence);
}
