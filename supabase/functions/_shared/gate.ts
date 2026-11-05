// Shared access gate for educator-only AI functions that send story text to an AI service.
// One place decides who may do that, so the rules cannot drift between functions.

export const CLEARED_RIGHTS = ['original', 'public-domain', 'licensed'];

// deno-lint-ignore no-explicit-any
export async function checkEducatorAccess(client: any, demoStories: string[], body: any): Promise<{ status: number; message: string } | { status: 200; userId: string }> {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { status: 401, message: 'Sign in as an educator to use this.' };
  const { data: profile } = await client.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'teacher') return { status: 403, message: 'Educator access required.' };
  return { status: 200, userId: user.id as string };
}

// deno-lint-ignore no-explicit-any
export async function checkMaterialRights(client: any, userId: string, demoStories: string[], body: any): Promise<{ status: number; message: string } | null> {
  if (typeof body.contentId !== 'string' || body.contentId.length > 80) return { status: 400, message: 'Invalid story.' };
  if (demoStories.includes(body.contentId) && Number(body.version) === 1) return null;
  const { data: owned } = await client.from('learning_contents').select('id,owner_id,visibility,rights_status').eq('id', body.contentId).eq('version', Number(body.version)).maybeSingle();
  if (owned) {
    if (owned.owner_id !== userId) return { status: 403, message: 'This material is not available to this account.' };
    // The full story text is sent to an AI service, so only material the educator is entitled to share is allowed.
    if (!CLEARED_RIGHTS.includes(owned.rights_status)) return { status: 403, message: 'This material can only be used privately and is not sent to AI.' };
    return null;
  }
  if (body.localDraft === true) {
    // A draft that only exists on the educator's own device: the rights status is what the educator declared for it
    // (the same declaration a saved library row carries). Anything but a cleared status is never sent to AI.
    if (!CLEARED_RIGHTS.includes(body.declaredRights)) return { status: 403, message: 'Set the rights status to original, public domain or licensed before using AI. Private or unknown material is not sent.' };
    console.log('ai gate: local draft', userId, body.declaredRights);
    return null;
  }
  return { status: 403, message: 'This material is not available to this account.' };
}
