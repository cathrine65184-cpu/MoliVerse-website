"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { activeExplorerId } from "@/lib/family";
import { withBasePath } from "@/lib/paths";
import { type Asset, clamp, official, orders, type Placed, validScene,starterScene } from "@/lib/platform/world";
import {sprites} from "@/lib/platform/roomArt";
import {entryForAsset} from "@/lib/platform/vocabulary";
import VocabularyCard from "./VocabularyCard";
import { media, readFile, rpc } from "@/lib/platform/client";
import "./platform.css";
import "./growing-world.css";

function Picture({ a }: { a: Asset }) {
  const clipId=useId();
  const sprite=a.source==="official"?sprites[a.id]:null;
  if(sprite)return <svg aria-hidden="true" viewBox={sprite.box.join(" ")}><defs><clipPath id={clipId}>{sprite.clip?<polygon points={sprite.clip}/>:<rect x={sprite.box[0]} y={sprite.box[1]} width={sprite.box[2]} height={sprite.box[3]}/>}</clipPath></defs><image clipPath={`url(#${clipId})`} href={withBasePath(`/room-art/${sprite.sheet}.png`)} width="1448" height="1086"/></svg>;
  if (a.thumb || a.icon === "moli" || a.icon === "valley") {
    return (
      <img
        src={a.thumb || withBasePath(a.icon === "moli" ? "/moli-cutout.png" : "/universe-valley.jpg")}
        alt=""
        draggable={false}
      />
    );
  }
  return <span aria-hidden>{a.icon}</span>;
}
function Order({ e, onEarn,onClose }: { e: string | null; onEarn: () => Promise<void>;onClose:()=>void }) {
  const [answers, set] = useState<string[]>([]),
    [nonce, fresh] = useState(() => crypto.randomUUID()),
    [info, msg] = useState(""),
    [busy, setBusy] = useState(false);
  async function send() {
    if (!e || answers.length !== 3) return;
    setBusy(true);
    try {
      const result = await rpc<{ score: number; earned: boolean }>("lb_practise", {
        e,
        nonce,
        activity_id: "apple-orders-v1",
        choices: answers,
      });
      msg(
        result.score + "/3 orders correct. " +
          (result.earned ? "The Apple basket is in your library." : "Try the three orders again."),
      );
      await onEarn();
    } catch (x) {
      msg((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="pv-panel">
      <small>Practise · French fruit stall</small>
      <h2>Une pomme</h2>
      <p>
        An apple. Look at the fruit, then name it in French. Complete three orders to earn a basket; this is
        practice, not a mastery score.
      </p>
      {answers.length < 3
        ? (
          <>
            <b>Order {answers.length + 1}: {orders[answers.length].question}</b>
            <div>
              {orders[answers.length].options.map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => set([...answers, id])}
                >
                  {label}
                </button>
              ))}
            </div>
          </>
        )
        : <button disabled={!e || busy} onClick={send}>Check orders with Moli</button>}
      {!e && (
        <p>
          Explore freely. Earning a collectible requires a guardian-linked active Explorer and permission to
          save.
        </p>
      )}
      <p role="status">{info}</p>
      <button onClick={onClose} disabled={busy}>Return to my room</button>
      <button
        disabled={busy}
        onClick={() => {
          set([]);
          fresh(crypto.randomUUID());
          msg("");
        }}
      >
        Try new orders
      </button>
    </section>
  );
}
type Preview = { preview: string; mime: string; ticket: string; expires: number };
function Studio({ e, uid, sessionOnly }: { e: string | null; uid: string | null; sessionOnly: boolean }) {
  const [assets, setAssets] = useState(official),
    [earned, rewards] = useState<string[]>([]),
    [attemptCount, count] = useState(0),
    [ready, setReady] = useState(false);
  const [assetCategory,setAssetCategory]=useState("All"),[language,setLanguage]=useState("fr"),[vocabAsset,setVocabAsset]=useState("");
  const [objects, scene] = useState<Placed[]>([]),
    [undo, past] = useState<Placed[][]>([]),
    [redo, future] = useState<Placed[][]>([]),
    [sel, select] = useState(""),
    [play, mode] = useState(false),
    [revision, rev] = useState(0),
    [dirty, mark] = useState(false),
    [info, msg] = useState(""),
    [busy, wait] = useState(false);
  const [source, tab] = useState("Official"),
    [name, nameIt] = useState(""),
    [cat, category] = useState("Decorations"),
    [idea, prompt] = useState(""),
    [preview, propose] = useState<Preview | null>(null),
    [suggestion, suggest] = useState(""),
    [practice, quiz] = useState(false),
    [feedback, notice] = useState(""),
    [erase, askErase] = useState(false);
  const [zoom, scale] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    plane = useRef<HTMLDivElement>(null);
  const [question, ask] = useState(""),
    [chat, converse] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const guide = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("moli") === "1" && guide.current) {
      guide.current.open = true;
      guide.current.scrollIntoView({ block: "nearest" });
    }
  }, []);
  const [recommendations, recommend] = useState<{ id: string; title: string }[]>([]);
  const [imageReady, capable] = useState(false), [artReady, enableArt] = useState(false);
  useEffect(() => {
    let live = true;
    if (e && source !== "Official") {
      media<{ images: boolean; art: boolean }>("capabilities", { explorer: e }).then((v) => {
        if (live) {
          capable(v.images);
          enableArt(v.art);
        }
      }).catch(() => {
        if (live) {
          capable(false);
          enableArt(false);
        }
      });
    }
    return () => {
      live = false;
    };
  }, [e, source]);
  const drag = useRef<{ id: string; x: number; y: number; before: Placed[] } | null>(null);
  const guestKey = "moliverse:free-room:v1:" + (uid || "guest");
  function change(next: Placed[]) {
    if (!validScene(next, assets)) return;
    past((u) => [...u.slice(-29), objects]);
    future([]);
    scene(next);
    mark(true);
  }
  function add(id: string,x=50,y=65) {
    if(!ready)return;
    const asset=assets.find(a=>a.id===id);if(!asset)return;
    if(asset.collectible&&!earned.includes(id)){quiz(true);return;}
    if (objects.length >= 60) {
      msg("Room is full (60 objects).");
      return;
    }
    const obj = { id: crypto.randomUUID(), asset: id, x:clamp(x,0,100), y:clamp(y,0,100), size: 20, angle: 0 };
    change([...objects, obj]);
    select(obj.id);
  }
  function edit(id: string, patch: Partial<Placed>) {
    change(objects.map((o) => o.id === id ? { ...o, ...patch } : o));
  }
  async function inventory() {
    if (!e) return official;
    const [a, r, attempt] = await Promise.all([
      supabase.from("lb_assets").select("id,name,category,source,icon,collectible").or(
        "source.eq.official,explorer.eq." + e,
      ),
      supabase.from("lb_rewards").select("asset").eq("explorer", e),
      supabase.from("lb_attempts").select("request_id", { head: true, count: "exact" }).eq("explorer", e),
    ]);
    if (a.error || r.error || attempt.error) {
      throw Error("Library unavailable. Check your connection or the platform migration.");
    }
    let list = (a.data || []) as Asset[];
    if (!list.length) throw Error("No approved assets available.");
    if (list.some((x) => x.source !== "official")) {
      try {
        const { items } = await media<{ items: { id: string; url: string }[] }>("asset_urls", {
          explorer: e,
        });
        list = list.map((a) => ({ ...a, thumb: items.find((i) => i.id === a.id)?.url }));
      } catch {
        list = list.filter((a) => a.source === "official");
      }
    }
    setAssets(list);
    rewards((r.data || []).map((x) => x.asset));
    count(attempt.count || 0);
    return list;
  }
  async function open() {
    setReady(false);
    try {
      const list = await inventory();
      let saved: unknown = starterScene().filter(o=>list.some(a=>a.id===o.asset)), version = 0;
      if (e) {
        const w = await supabase.from("lb_worlds").select("scene,revision").eq("explorer", e).maybeSingle();
        if (w.error) throw Error("Could not open the private room.");
        saved = w.data?.scene ?? saved;
        version = w.data?.revision || 0;
        const settings=await rpc<{language:string}>("lb_room_settings",{e,learning_language:null});setLanguage(settings.language);
      } else if (!sessionOnly) {
        try {
          const raw=localStorage.getItem(guestKey);if(raw!==null)saved=JSON.parse(raw);
          setLanguage(localStorage.getItem(guestKey+":language")==="en"?"en":"fr");
        } catch {
          saved = starterScene();
        }
      }
      if (!validScene(saved, list)) {
        throw Error("Some saved assets are unavailable. Restore permission before editing.");
      }
      scene(saved);
      rev(version);
      mark(false);
      past([]);
      future([]);
      setReady(true);
      msg("");
    } catch (x) {
      msg((x as Error).message);
    }
  }
  useEffect(() => {
    void open();
  }, [e]);
  async function job(fn: () => Promise<void>) {
    wait(true);
    try {
      await fn();
    } catch (x) {
      msg((x as Error).message);
    } finally {
      wait(false);
    }
  }
  async function save() {
    if (!ready) return;
    if (sessionOnly) {
      msg("Session only: Explorer saving permission is unavailable.");
      return;
    }
    await job(async () => {
      if (e) {rev(await rpc("lb_save_world", { e, expected: revision, objects }));await rpc("lb_room_settings",{e,learning_language:language});}
      else {localStorage.setItem(guestKey, JSON.stringify(objects));localStorage.setItem(guestKey+":language",language);}
      mark(false);
      msg(e ? "Private room saved to your Explorer." : "Room saved on this device.");
    });
  }
  async function upload(f: File) {
    if (!e) return;
    await job(async () => {
      if (!(await media<{ art: boolean }>("capabilities", { explorer: e })).art) {
        throw Error("Private artwork is not enabled for this Explorer.");
      }
      msg("Checking and scanning your image…");
      await media("art", {
        explorer: e,
        name: name || "My artwork",
        category: cat,
        data: await readFile(f),
        mime: f.type,
      });
      await inventory();
      msg("Your private artwork is ready.");
    });
  }
  const picked = objects.find((x) => x.id === sel), art = assets.find((a) => a.id === picked?.asset);
  const shown = assets.filter((a) =>(assetCategory==="All"||a.category===assetCategory)&&(
    source === "Official"
      ? a.source === "official"
      : source === "My Uploads"
      ? a.source === "upload"
      : a.source === "generated")
  );
  return (
    <main className="pv pv-growing">
      <Link href="/learn/">← Learning campus</Link>
      <small className="pv-growing-kicker">Learn · Practise · Unlock · Decorate · Revisit</small>
      <h1>My Growing World</h1>
      <p>Make a cosy place that feels like you. Move things, try a new word, and make room for a little discovery.</p>
      <p>
        {e
          ? "Guardian-linked Explorer · private cloud room"
          : sessionOnly
          ? "Explorer saving unavailable · session only"
          : "Guest room · saved only in this browser"}. Your starter furniture is free. Learning adds new keepsakes.
      </p>
      {!e && (
        <p>
          <Link href="/family/">Choose an Explorer in the family dashboard →</Link>
        </p>
      )}
      <p role="status">{info}</p>
      {!ready && <button onClick={open}>Reopen room</button>}
      <div className="pv-toolbar">
        <button
          onClick={() => {
            mode(!play);
            notice("");
            select("");
          }}
        >
          {play ? "Back to Build" : "Play my world"}
        </button>
        <button disabled={!ready || busy} onClick={save}>Save world{dirty ? " ·" : " "}</button>
        {!play && (
          <>
            <button
              disabled={!undo.length}
              onClick={() => {
                future([objects, ...redo]);
                scene(undo.at(-1)!);
                past(undo.slice(0, -1));
                mark(true);
              }}
            >
              Undo
            </button>
            <button
              disabled={!redo.length}
              onClick={() => {
                past([...undo, objects]);
                scene(redo[0]);
                future(redo.slice(1));
                mark(true);
              }}
            >
              Redo
            </button>
          </>
        )}
        <button onClick={() => quiz(!practice)}>French fruit orders</button>
        <label>Learning language<select value={language} onChange={ev=>{setLanguage(ev.target.value);setVocabAsset("");mark(true)}}><option value="fr">Français</option><option value="en">English</option></select></label>
      </div>
      {practice && (
        <Order
          e={e}
          onClose={()=>quiz(false)}
          onEarn={async () => {
            await inventory();
          }}
        />
      )}
      <div className="pv-world-layout">
        <section>
          <div className="pv-view" onDragOver={ev=>{if(!play)ev.preventDefault()}} onDrop={ev=>{ev.preventDefault();if(play)return;const rect=plane.current?.getBoundingClientRect();if(rect)add(ev.dataTransfer.getData("text/x-moli-asset"),(ev.clientX-rect.left)/rect.width*100,(ev.clientY-rect.top)/rect.height*100)}}>
            <div className="pv-room-window" aria-hidden="true"><i/><i/><i/><i/></div><div className="pv-room-floor" aria-hidden="true"/>
            <div
              className="pv-plane"
              ref={plane}
              style={{ transform: "translate(" + pan.x + "%, " + pan.y + "%) scale(" + zoom + ")" }}
            >
              {objects.map((o, i) => {
                const a = assets.find((v) => v.id === o.asset);
                if (!a) return null;
                return (
                  <button
                    key={o.id}
                    aria-label={a.name}
                    className="pv-piece"
                    data-picked={!play && sel === o.id}
                    style={{
                      left: o.x + "%",
                      top: o.y + "%",
                      width: o.size + "%",
                      transform: "translate(-50%,-50%) rotate(" + o.angle + "deg)",
                      zIndex: i + 1,
                    }}
                    onPointerDown={(ev) => {
                      if (play || !ready) return;
                      select(o.id);
                      drag.current = { id: o.id, x: ev.clientX, y: ev.clientY, before: objects };
                      ev.currentTarget.setPointerCapture(ev.pointerId);
                    }}
                    onPointerMove={(ev) => {
                      const d = drag.current;
                      if (!d || d.id !== o.id) return;
                      const rect = plane.current!.getBoundingClientRect(),
                        orig = d.before.find((a) => a.id === d.id)!;
                      scene(d.before.map((v) =>
                        v.id === d.id
                          ? {
                            ...v,
                            x: clamp(orig.x + (ev.clientX - d.x) / rect.width * 100, 0, 100),
                            y: clamp(orig.y + (ev.clientY - d.y) / rect.height * 100, 0, 100),
                          }
                          : v
                      ));
                    }}
                    onPointerUp={() => {
                      const d = drag.current;
                      drag.current = null;
                      if (d && JSON.stringify(d.before) !== JSON.stringify(objects)) {
                        past([...undo.slice(-29), d.before]);
                        future([]);
                        mark(true);
                      }
                    }}
                    onPointerCancel={() => {
                      if (drag.current) scene(drag.current.before);
                      drag.current = null;
                    }}
                    onKeyDown={ev=>{
                      if(play||!ready||!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(ev.key))return;
                      ev.preventDefault();select(o.id);const step=ev.shiftKey?5:1;
                      edit(o.id,{x:clamp(o.x+(ev.key==="ArrowLeft"?-step:ev.key==="ArrowRight"?step:0),0,100),y:clamp(o.y+(ev.key==="ArrowUp"?-step:ev.key==="ArrowDown"?step:0),0,100)});
                    }}
                    onClick={() => {
                      select(o.id);
                      if (play) {
                        if(entryForAsset(a.id,language))setVocabAsset(a.id);
                        notice(
                          a.id === "apple-basket"
                            ? "Une pomme · an apple. Would you like a new order?"
                            : a.id === "moli"
                            ? "Hi! What would you like to add to this place?"
                            : a.name + " is part of your world.",
                        );
                      }
                    }}
                  >
                    <Picture a={a} />
                  </button>
                );
              })}
            </div>
            {!objects.length && <span className="pv-empty">A fresh arrangement. Choose furniture from your collection.</span>}
          </div>
          <details className="pv-view-tools"><summary>Things in my room · {objects.length}</summary><p>Select a covered object here. In Build mode, arrow keys also move a focused object.</p><div className="pv-toolbar">{objects.map((o,i)=><button key={o.id} onClick={()=>{select(o.id);if(play&&entryForAsset(o.asset,language))setVocabAsset(o.asset)}}>{assets.find(a=>a.id===o.asset)?.name} {i+1}</button>)}</div></details>
          <details className="pv-view-tools"><summary>Look around the room</summary><div className="pv-toolbar">
            <label>
              Zoom<input
                type="range"
                min="1"
                max="2"
                step=".1"
                value={zoom}
                onChange={(ev) => scale(+ev.target.value)}
              />
            </label>
            {(["x", "y"] as const).map((k) => (
              <label key={k}>
                Pan {k}
                <input
                  type="range"
                  min="-40"
                  max="40"
                  value={pan[k]}
                  onChange={(ev) => setPan({ ...pan, [k]: +ev.target.value })}
                />
              </label>
            ))}
          </div></details>
          {play
            ? (
              <>
                <p role="status">{feedback}</p>
                {art?.id === "stars" && (
                  <button
                    onClick={async () => {
                      try {
                        const audio = new AudioContext();
                        await audio.resume();
                        const gain = audio.createGain(), osc = audio.createOscillator();
                        gain.connect(audio.destination);
                        osc.connect(gain);
                        const t = audio.currentTime;
                        osc.frequency.setValueAtTime(523, t);
                        osc.frequency.setValueAtTime(659, t + .16);
                        gain.gain.setValueAtTime(.07, t);
                        gain.gain.exponentialRampToValueAtTime(.001, t + .45);
                        osc.onended = () => {
                          void audio.close();
                        };
                        osc.start();
                        osc.stop(t + .45);
                      } catch {
                        notice("Sound is unavailable on this device.");
                      }
                    }}
                  >
                    Play the star chime
                  </button>
                )}
                {art?.id === "apple-basket" && (
                  <>
                    <button onClick={() => quiz(true)}>Practise this word</button>
                  </>
                )}
              </>
            )
            : picked && (
              <div className="pv-panel">
                <b>{art?.name}</b>
                {art&&entryForAsset(art.id,language)&&<button onClick={()=>setVocabAsset(art.id)}>Learn this word</button>}
                {(["x", "y", "size", "angle"] as const).map((k) => (
                  <label key={k}>
                    {{x:"Move left / right",y:"Move up / down",size:"Size",angle:"Turn"}[k]}
                    <input
                      type="range"
                      min={k === "angle" ? -180 : k === "size" ? 6 : 0}
                      max={k === "angle" ? 180 : k === "size" ? 50 : 100}
                      value={picked[k]}
                      onChange={(ev) => edit(sel, { [k]: +ev.target.value })}
                    />
                  </label>
                ))}
                <button
                  onClick={() => {
                    if (objects.length >= 60) return;
                    const copy = { ...picked, id: crypto.randomUUID(), x: clamp(picked.x + 5, 0, 100) };
                    change([...objects, copy]);
                    select(copy.id);
                  }}
                >
                  Duplicate
                </button>
                <button onClick={() => change([...objects.filter((o) => o.id !== sel), picked])}>
                  Bring forward
                </button>
                <button onClick={() => change([picked, ...objects.filter((o) => o.id !== sel)])}>
                  Send back
                </button>
                <button
                  onClick={() => {
                    change(objects.filter((o) => o.id !== sel));
                    select("");
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          {vocabAsset&&<VocabularyCard key={vocabAsset+language} asset={vocabAsset} language={language} e={e} uid={uid} sessionOnly={sessionOnly} onClose={()=>setVocabAsset("")}/>}
        </section>
        {!play && (
          <aside className="pv-panel">
            <h2>My collection</h2><p>Drag into your room, or tap to add. Select an object to move, turn or learn.</p>
            {["Official", "My Uploads", "Made with Moli"].map((s) => (
              <button
                key={s}
                aria-pressed={source === s}
                onClick={() => tab(s)}
              >
                {s}
              </button>
            ))}
            <label>Collection category<select value={assetCategory} onChange={ev=>setAssetCategory(ev.target.value)}>{["All",...Array.from(new Set(assets.map(a=>a.category)))].map(c=><option key={c}>{c}</option>)}</select></label>
            <div className="pv-assets">
              {shown.map((a) => (
                <button
                  key={a.id}
                  disabled={!ready}
                  draggable={!a.collectible||earned.includes(a.id)}
                  onDragStart={ev=>ev.dataTransfer.setData("text/x-moli-asset",a.id)}
                  aria-label={a.name+(a.collectible&&!earned.includes(a.id)?" · locked, learn to unlock":"")}
                  onClick={() => add(a.id)}
                >
                  <Picture a={a} />
                  {a.name}
                  {a.collectible && !earned.includes(a.id) ? " · locked" : ""}
                </button>
              ))}
            </div>
            {source !== "Official" && (
              <>
                <p>
                  Only your active Explorer can use approved private artwork. Guardian permission is required.
                </p>
                <label>
                  Asset name<input maxLength={70} value={name} onChange={(v) => nameIt(v.target.value)} />
                </label>
                <label>
                  Category<select value={cat} onChange={(v) => category(v.target.value)}>
                    {["Decorations", "Food", "Nature", "Furniture", "Characters", "Buildings"].map((k) => (
                      <option key={k}>{k}</option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {source === "My Uploads" && !artReady && (
              <p>Private uploads need guardian permission and a configured scanner.</p>
            )}
            {source === "My Uploads" && (
              <label
                className="pv-drop"
                onDragOver={(ev) => ev.preventDefault()}
                onDrop={(ev) => {
                  ev.preventDefault();
                  if (e && artReady && !busy && ev.dataTransfer.files[0]) {
                    void upload(ev.dataTransfer.files[0]);
                  }
                }}
              >
                Choose or drop PNG, JPEG or WebP · 14 MB<input
                  disabled={!artReady || busy}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(ev) => {
                    if (ev.target.files?.[0]) void upload(ev.target.files[0]);
                  }}
                />
              </label>
            )}
            {source === "Made with Moli" && (
              <>
                <label>
                  Describe a drawing (no private details)<input
                    maxLength={300}
                    value={idea}
                    onChange={(v) => {
                      prompt(v.target.value);
                      propose(null);
                    }}
                  />
                </label>
                <p>Choose the shape, colour and one detail. Only request a preview with your grown-up.</p>
                {!imageReady && (
                  <p>Image generation is unavailable here. Official art and free building still work.</p>
                )}
                <button
                  disabled={!e || !imageReady || busy || !idea.trim()}
                  onClick={() =>
                    job(async () => {
                      msg("Requesting a reviewed preview…");
                      propose(await media<Preview>("generate", { explorer: e, idea }));
                      msg("Preview only. Save if you like it.");
                    })}
                >
                  Request preview
                </button>
                {preview && (
                  <>
                    <img
                      alt="Generated preview, not yet saved"
                      src={"data:image/webp;base64," + preview.preview}
                    />
                    <button
                      disabled={busy}
                      onClick={() =>
                        job(async () => {
                          await media("art", {
                            explorer: e,
                            name,
                            category: cat,
                            data: preview.preview,
                            mime: preview.mime,
                            ticket: preview.ticket,
                            expires: preview.expires,
                          });
                          propose(null);
                          await inventory();
                          msg("Saved to your private assets.");
                        })}
                    >
                      Keep this drawing
                    </button>
                    <button onClick={() => propose(null)}>Discard</button>
                  </>
                )}
              </>
            )}
            <details ref={guide} id="moli-guide">
              <summary>Ask Moli for an idea</summary>
              <img src={withBasePath("/moli-cutout.png")} alt="" width={48} />
              <p>Try a reading corner: a chair by the window gives your character somewhere to sit.</p>
              <button onClick={() => suggest("chair")}>Suggest a reading spot</button>
              <label>
                Question about this room<input
                  maxLength={260}
                  value={question}
                  onChange={(ev) => ask(ev.target.value)}
                />
              </label>
              <small>
                With guardian AI permission, your question and recent replies go to DeepSeek. No names or
                personal details.
              </small>
              {chat.map((t, i) => (
                <p key={i}>
                  <b>{t.role === "user" ? "You" : "Moli"}:</b>
                  {t.content}
                </p>
              ))}
              <button
                disabled={!e || busy || !question.trim()}
                onClick={() =>
                  job(async () => {
                    const { data, error } = await supabase.functions.invoke("world-moli", {
                      body: { explorer: e, question, history: chat.slice(-4), selected: art?.id,language },
                    });
                    if (error || !data?.reply) {
                      throw Error("Live Moli is unavailable or not permitted. Free tools still work.");
                    }
                    converse([...chat.slice(-4), { role: "user", content: question }, {
                      role: "assistant",
                      content: data.reply,
                    }]);
                    recommend(Array.isArray(data.courses) ? data.courses : []);
                    ask("");
                    suggest(
                      official.some((a) => !a.collectible && a.id === data.suggestAsset)
                        ? data.suggestAsset
                        : "",
                    );
                  })}
              >
                Ask live Moli
              </button>
              {recommendations.map((c) => (
                <Link key={c.id} href={"/explore/?experience=" + encodeURIComponent(c.id)}>{c.title} →</Link>
              ))}
              {suggestion && (
                <button
                  disabled={!ready}
                  onClick={() => {
                    add(suggestion);
                    suggest("");
                  }}
                >
                  Add suggested {official.find((a) => a.id === suggestion)?.name}
                </button>
              )}
            </details>
          </aside>
        )}
      </div>
      <p>
        {e
          ? attemptCount + " saved French practice attempts · not a mastery rating."
          : "Free creation does not require a quiz."}
      </p>
      <button onClick={() => askErase(!erase)}>Erase my room and records</button>
      {erase && (
        <button
          disabled={busy}
          onClick={() =>
            job(async () => {
              if (e) await media("erase", { explorer: e });
              else {localStorage.removeItem(guestKey);localStorage.removeItem(guestKey+":language");localStorage.removeItem("moliverse:room-vocabulary:v1:"+(uid||"guest"));}
              askErase(false);
              await open();
            })}
        >
          Confirm erase private room, artwork and practice
        </button>
      )}
    </main>
  );
}
export default function World() {
  const [context, setContext] = useState<
    { uid: string | null; e: string | null; sessionOnly: boolean } | null
  >(null);
  useEffect(() => {
    let alive = true, ticket = 0, current: string | null = null;
    async function update(uid: string | null) {
      const t = ++ticket;
      let e: null | string = null;
      let sessionOnly = true;
      try {
        const candidate = activeExplorerId();
        sessionOnly = !!candidate;
        if (uid && candidate) {
          const { data } = await supabase.rpc("lb_access", { e: candidate });
          if (data === true) {
            e = candidate;
            sessionOnly = false;
          }
        }
      } catch {}
      if (alive && t === ticket) setContext({ uid, e, sessionOnly });
    }
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      const uid = s?.user.id || null;
      if (current !== uid) setContext(null);
      current = uid;
      void update(uid);
    });
    const refresh = () => void update(current);
    const sync = (ev: StorageEvent) => {
      if (ev.key === "moliverse-active-explorer") {
        setContext(null);
        refresh();
      }
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", sync);
    return () => {
      alive = false;
      ticket++;
      data.subscription.unsubscribe();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return context
    ? <Studio key={String(context.uid) + ":" + context.e + ":" + context.sessionOnly} {...context} />
    : <main className="pv">Opening your private workspace…</main>;
}
