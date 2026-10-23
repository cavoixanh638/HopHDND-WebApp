/**
 * Keep the report overview and source loading in the first JavaScript chunk.
 * Accounts, admin settings, editing, full item list and detail dialogs are
 * fetched only after the user opens them. Page permissions remain in App.
 */
import {lazy} from 'react';

const loadItemList=()=>import('../features/items/ItemList');
export const ItemList=lazy(()=>loadItemList().then(module=>({default:module.ItemList})));
export function prefetchItemList():void{void loadItemList().catch(()=>{});}

export const ReportDetailGrid=lazy(()=>import('../features/reports/ReportDetailGrid')
  .then(module=>({default:module.ReportDetailGrid})));
export const HistoryDialog=lazy(()=>import('../features/history/HistoryDialog')
  .then(module=>({default:module.HistoryDialog})));
export const ReportSettings=lazy(()=>import('../features/settings/ReportSettings')
  .then(module=>({default:module.ReportSettings})));
export const CatalogSettings=lazy(()=>import('../features/catalogs/CatalogSettings')
  .then(module=>({default:module.CatalogSettings})));
export const ConnectionPanel=lazy(()=>import('../features/settings/ConnectionPanel')
  .then(module=>({default:module.ConnectionPanel})));
export const SyncPanel=lazy(()=>import('../features/settings/SyncPanel')
  .then(module=>({default:module.SyncPanel})));
export const FirebasePanel=lazy(()=>import('../features/settings/FirebasePanel')
  .then(module=>({default:module.FirebasePanel})));
export const ApprovalReviewPanel=lazy(()=>import('../features/settings/ApprovalReviewPanel')
  .then(module=>({default:module.ApprovalReviewPanel})));
