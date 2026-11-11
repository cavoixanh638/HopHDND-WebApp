import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../../shared/types';
import type {FirebaseProfile} from '../../state/use-firebase';
import {BusinessExcelReplacementPanel} from './BusinessExcelReplacementPanel';

/**
 * The old technical-format import and Google Sheets transition importer are
 * retired from the actual UI. Keep the optional signature only while older
 * callers/tests move over; never invoke the old add-only import callback.
 *
 * Import activation is intentionally off until the new candidate RTDB Rules
 * and versioned-dataset concurrency proof have been independently approved.
 */
type Props={
  items:Item[];isAdmin:boolean;disabled:boolean;
  database?:Database;user?:User|null;replacementEnabled?:boolean;
  onClose:()=>void;
  profile:Omit<FirebaseProfile,'revision'>;
  onSaveProfile:(profile:Omit<FirebaseProfile,'revision'>)=>Promise<void>;
  onImport:(items:Item[])=>Promise<void>;
  importEnabled?:boolean;
  transitionSheetUrl?:string;
  initialSheetUrl?:string;
  onTransitionApply?:(changes:never[])=>Promise<number>;
  transitionDisabled?:boolean;
  onInitialImport?:(rows:Item[])=>Promise<number>;
  initialImportDisabled?:boolean;
};
export function ExcelTransferPanel({items,isAdmin,disabled,database,user,
  replacementEnabled=false,onClose}:Props){
  return <div className="business-excel-transfer">
    <div className="settings-mode-bar">
      <div><strong>Firebase — nhập dữ liệu từ file Excel nghiệp vụ</strong>
        <p>Không tải Google Sheets, không nhập nối dữ liệu mới vào dữ liệu cũ.</p></div>
      <button type="button" className="button ghost" onClick={onClose}>Về chế độ xem</button>
    </div>
    <BusinessExcelReplacementPanel items={items} database={database} user={user}
      isAdmin={isAdmin} disabled={disabled} replacementEnabled={replacementEnabled}/>
  </div>;
}
