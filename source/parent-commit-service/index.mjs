import {onRequest} from 'firebase-functions/v2/https';
import {handleParentRequest} from './src/handler.mjs';
/** Production installation is a SEPARATE reviewed decision; no deploy here. */
export const parentDatasetCommit=onRequest({region:'us-central1',cors:false,
  timeoutSeconds:120,memory:'512MiB',maxInstances:10},handleParentRequest);