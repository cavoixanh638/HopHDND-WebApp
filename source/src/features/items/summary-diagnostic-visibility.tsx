import {createContext,useContext,type ReactNode} from 'react';

/**
 * PR95 UI V5 L2 — presentation-only permission, deliberately fail closed.
 * This context is NOT an edit permission and must never be inferred from
 * canEditCell/canEditDraft, DOM classes, a URL or browser storage.
 *
 * Runtime App uses the existing verified adminTools gate. The synthetic full
 * preview supplies its explicit simulated administrator role separately.
 */
const SummaryDiagnosticVisibilityContext=createContext(false);

export function SummaryDiagnosticVisibilityProvider({
  enabled,children
}:{enabled:boolean;children:ReactNode}){
  return <SummaryDiagnosticVisibilityContext.Provider value={enabled}>
    {children}
  </SummaryDiagnosticVisibilityContext.Provider>;
}

/** Without an explicit verified provider, diagnostics are absent from DOM. */
export function useSummaryDiagnosticVisibility():boolean{
  return useContext(SummaryDiagnosticVisibilityContext);
}
