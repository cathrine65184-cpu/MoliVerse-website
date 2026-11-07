"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Check, Eye, EyeOff, GraduationCap, Leaf, Loader2, LockKeyhole, Mail, ShieldCheck, Sparkles, Sprout, UserRound } from "lucide-react";
import { supabase, getMyProfile, type Profile } from "@/lib/supabase";

import { accountCopy } from "./copy";
import { withBasePath } from "@/lib/paths";
import "./account.css";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<Profile | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatorReturn,setCreatorReturn] = useState(false);
  const [profileMissing,setProfileMissing] = useState(false);
  const [notice,setNotice] = useState("");

  const [visible,setVisible] = useState(false);
  const [locale,setLocale] = useState<keyof typeof accountCopy>("en");
  const t = accountCopy[locale];
  useEffect(()=>{
    const sync=()=>{const lang=document.documentElement.lang.split("-")[0];setLocale(Object.hasOwn(accountCopy,lang)?lang as keyof typeof accountCopy:"en")};
    sync();const observer=new MutationObserver(sync);observer.observe(document.documentElement,{attributes:true,attributeFilter:["lang"]});return ()=>observer.disconnect();
  },[]);

  useEffect(() => {
    const params=new URLSearchParams(location.search);
    setCreatorReturn(params.get("next")==="creator");
    if(params.get("role")==="teacher")setRole("teacher");
    if(params.get("mode")==="login")setMode("login");
    getMyProfile().then((p) => {
      setMe(p);
      if(!p)void supabase.auth.getUser().then(({data})=>{if(data.user){setProfileMissing(true);setName(typeof data.user.user_metadata?.display_name==="string"?data.user.user_metadata.display_name:"");setRole(data.user.user_metadata?.account_role==="teacher"?"teacher":"student");}});
    }).catch(()=>setMe(null)).finally(()=>setChecking(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if(profileMissing){
        const {data:{user}}=await supabase.auth.getUser();
        if(!user)throw Error("Please sign in again.");
        const {error:err}=await supabase.from("profiles").insert({id:user.id,role,name:name.trim()});
        if(err)throw err;
        router.push(creatorReturn?"/teach/creator/":role==="teacher"?"/teach/":"/learn/");return;
      }
      if (mode === "signup") {
        if (!name.trim()) throw new Error("Please enter your name.");
        const { data, error: err } = await supabase.auth.signUp({ email, password, options:{data:{account_role:role,display_name:name.trim()},...(creatorReturn?{emailRedirectTo:location.origin+withBasePath("/account/?next=creator&role=teacher")}: {})} });
        if (err) throw err;
        const uid = data.user?.id;
        if (!uid) throw new Error("We could not create your account. Please try again.");
        if(!data.session){setNotice("Check your email to confirm your account, then sign in to finish setup. Creator Moli requires a separate adult verification check.");setMode("login");setPassword("");return;}
        const { error: perr } = await supabase.from("profiles").insert({
          id: uid,
          role,
          name: name.trim(),
        });
        if (perr) throw perr;
        router.push(creatorReturn ? "/teach/creator/" : role === "teacher" ? "/teach/" : "/learn/");
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        const p = await getMyProfile();
        if(!p){setProfileMissing(true);return;}
        router.push(creatorReturn ? "/teach/creator/" : p.role === "teacher" ? "/teach/" : "/learn/");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.includes("already registered")
          ? t.taken
          : msg.includes("Invalid login")
            ? t.invalid
            : msg.includes("at least 6")
              ? t.tooShort
              : msg
      );
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setMe(null);
    setProfileMissing(false);
  }

  const signup = mode === "signup";
  return <main className="account-field" data-no-translate>
    <div className="account-wrap">
      <Link className="account-brand" href="/"><ArrowLeft aria-hidden/><Sprout aria-hidden/> MoliVerse</Link>
      <div className="account-landmark" aria-hidden="true"><span>✦</span><img src={withBasePath("/moli-cutout.png")} alt=""/></div>
      <section className="account-paper" aria-busy={checking || busy}>
        {checking ? <p role="status" className="account-loading"><Loader2 aria-hidden/>{t.loading}</p> : me ? <>
          <header className="account-intro"><Sprout aria-hidden/><div><h1>{t.welcome}</h1><p>{me.name}</p></div></header>
          <div className="account-member">
            {creatorReturn&&<Link className="account-primary" href="/teach/creator/">Continue to Creator Moli →</Link>}
            {me.avatar_url && <img src={me.avatar_url} alt=""/>}
            <Link className="account-primary" href={me.role==="teacher"?"/teach/":"/learn/"}>{me.role==="teacher"?t.studio:t.play}</Link>
            {me.role==="teacher" && <Link href="/chat/">{t.chat}</Link>}
            <button type="button" onClick={signOut}>{t.out}</button>
          </div>
        </> : <>
          <header className="account-intro"><Leaf aria-hidden/><div><h1>{signup?t.join:t.welcome}<i aria-hidden>✦</i></h1><p>{signup?t.invite:t.loginHint}</p></div></header>
          <form onSubmit={submit}>
            {(signup||profileMissing) && <fieldset className="account-roles"><legend className="sr-only">{t.role}</legend>
              {(["student","teacher"] as const).map(value=><label className="account-role" key={value}>
                <input type="radio" name="role" checked={role===value} onChange={()=>setRole(value)}/>
                <span className="role-face">{role===value&&<Check className="role-check" aria-hidden/>}
                  <span className="role-icon">{value==="student"?<BookOpen aria-hidden/>:<GraduationCap aria-hidden/>}</span>
                  <strong>{value==="student"?t.learner:t.educator}</strong><small>{value==="student"?t.learnerNote:t.educatorNote}</small>
                </span>
              </label>)}
            </fieldset>}
            {(signup||profileMissing)&&<label className="account-input"><UserRound aria-hidden/><input aria-label={role==="teacher"?t.name:t.explorer} placeholder={role==="teacher"?t.name:t.explorer} autoComplete="nickname" required value={name} onChange={e=>setName(e.target.value)}/></label>}
            {!profileMissing&&<><label className="account-input"><Mail aria-hidden/><input type="email" aria-label={t.email} placeholder={t.email} autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <div className="account-input"><LockKeyhole aria-hidden/><input type={visible?"text":"password"} aria-label={t.password} placeholder={signup?t.newPassword:t.password} required minLength={signup?6:undefined} autoComplete={signup?"new-password":"current-password"} value={password} onChange={e=>setPassword(e.target.value)}/>
              <button type="button" aria-label={visible?t.hide:t.show} aria-pressed={visible} onClick={()=>setVisible(!visible)}>{visible?<EyeOff aria-hidden/>:<Eye aria-hidden/>}</button>
            </div></>}
            {notice&&<p role="status">{notice}</p>}
            {creatorReturn&&<p>Creating a creator account does not verify adulthood or grant permission to publish. These checks happen separately.</p>}
            {error&&<p role="alert" className="account-error">{error}</p>}
            <button className="account-primary" disabled={busy} type="submit">{busy?<Loader2 className="animate-spin" aria-hidden/>:<Sparkles aria-hidden/>}{profileMissing?"Finish account setup":signup?(role==="teacher"?t.createEducator:t.createLearner):t.signIn}</button>
          </form>
          <p className="account-switch"><span>{signup?t.already:t.newHere} <button type="button" disabled={busy} onClick={()=>{setMode(signup?"login":"signup");setPassword("");setVisible(false);setError(null)}}>{signup?t.signIn:t.register}</button></span></p>
        </>}
      </section>
      <footer className="account-privacy"><p><ShieldCheck aria-hidden/>{t.security}</p><p>{t.family}</p></footer>
    </div>
  </main>;
}
