// deno-lint-ignore-file no-explicit-any
const chain = (result: any) => { const o: any = { eq: (_c?: string, _v?: unknown) => o, single: async () => ({ data: result }), maybeSingle: async () => ({ data: result }) }; return o; };
export function createClient(_url: string, _key: string, _opts: unknown) {
  const f = (globalThis as any).__fake;
  return { auth: { getUser: async () => ({ data: { user: f.user } }) }, from: (table: string) => ({ select: (_columns?: string) => chain(table === 'profiles' ? f.profile : f.owned) }) };
}
