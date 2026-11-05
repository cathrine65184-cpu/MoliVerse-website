import { supabase } from './supabase';
import { mergeIngest, normalizeIngest, planIngest, type IngestResult } from './bookIngest';
import type { ImportedContentDraft } from './contentImportStorage';

export type IngestProgress = { done: number; total: number; failed: number };

/** Runs the book through the assistant one small window at a time. A failed window never loses the others. */
export async function runBookIngest(draft: ImportedContentDraft, onProgress: (p: IngestProgress) => void): Promise<{ result: IngestResult; failed: number; total: number; truncated: boolean; message: string }> {
  const plan = planIngest(draft);
  const total = plan.windows.length;
  if (!total) return { result: { vocab: [], games: [], summary: '', rejected: [] }, failed: 0, total: 0, truncated: false, message: 'There is no text to prepare yet.' };
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return { result: { vocab: [], games: [], summary: '', rejected: [] }, failed: total, total, truncated: plan.truncated, message: 'Sign in with an educator account to use the book assistant.' };

  const results: IngestResult[] = []; let failed = 0; let processed = 0; let message = '';
  onProgress({ done: 0, total, failed });
  for (const window of plan.windows) {
    const { data, error } = await supabase.functions.invoke('book-ingest', {
      body: { contentId: draft.id, version: draft.version, localDraft: true, declaredRights: draft.rightsStatus, title: plan.title, windowIndex: window.index, pages: window.pages, language: draft.language, ageRange: draft.suggestedAgeRange, level: draft.proficiencyLevel },
    });
    let payload = data as Partial<IngestResult> & { message?: string } | null;
    if (error) { try { payload = await (error as { context?: Response }).context?.json(); } catch { payload = null; } failed += 1; message = payload?.message || message || 'The book assistant could not be reached.'; if (payload && 'rejected' in payload) results.push({ vocab: [], games: [], summary: '', rejected: payload.rejected || [] }); }
    else results.push(normalizeIngest(payload, window, plan.title)); // checked again in the browser
    processed += 1; onProgress({ done: processed, total, failed });
    if (error && /Sign in|Educator access|Set the rights|not available/.test(message)) break; // the same refusal would repeat for every part
  }
  return { result: mergeIngest(results), failed, total, truncated: plan.truncated, message };
}
