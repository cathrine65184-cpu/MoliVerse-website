"use client";
import { useState } from "react";
import { startGuardianActivation } from "@/lib/family";

export default function ExplorerSetup() {
  const [nickname, setNickname] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [ageBand, setAgeBand] = useState("6–7");
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const { error } = await startGuardianActivation({ nickname: nickname.trim(), guardianEmail: guardianEmail.trim(), ageBand, targetLanguage, origin: location.origin });
      if (error) throw error;
      setMessage("We sent a one-time activation link to the guardian’s email. The Explorer stays inactive until the guardian signs in and confirms AI conversations.");
    } catch {
      setMessage("We could not send the invitation. Check the email and try again.");
    } finally { setBusy(false); }
  }
  return <section id="setup" className="glass-card mx-auto mt-12 max-w-2xl p-6 sm:p-8">
    <h2 className="font-display text-2xl font-semibold text-white">Set up an Explorer</h2>
    <p className="mt-3 text-sm leading-relaxed text-slate-300">A parent or guardian confirms access once by email. After activation, your child can talk with Moli without asking again. The guardian can turn AI off later.</p>
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm text-white">Explorer nickname<input required maxLength={30} value={nickname} onChange={e=>setNickname(e.target.value)} className="rounded-xl border border-white/20 bg-white/10 p-3 text-white"/></label>
      <label className="grid gap-2 text-sm text-white">Guardian email<input required type="email" value={guardianEmail} onChange={e=>setGuardianEmail(e.target.value)} className="rounded-xl border border-white/20 bg-white/10 p-3 text-white"/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm text-white">Age range<select value={ageBand} onChange={e=>setAgeBand(e.target.value)} className="rounded-xl border border-white/20 bg-slate-800 p-3 text-white"><option>6–7</option><option>8–10</option><option>11–13</option><option>14+</option></select></label><label className="grid gap-2 text-sm text-white">Learning language<select value={targetLanguage} onChange={e=>setTargetLanguage(e.target.value)} className="rounded-xl border border-white/20 bg-slate-800 p-3 text-white"><option>English</option><option>French</option><option>Spanish</option><option>Portuguese</option><option>German</option><option>Chinese</option></select></label></div>
      <button disabled={busy} className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{busy?"Sending…":"Send one-time guardian invitation"}</button>
    </form>
    {message&&<p role="status" className="mt-4 text-sm text-amber-100">{message}</p>}
  </section>;
}
