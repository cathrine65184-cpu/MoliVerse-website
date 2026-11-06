"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { activeExplorerId } from "@/lib/family";
import { useSession } from "@/lib/platform/useSession";
export default function LearningShelf() {
  const user = useSession(),
    [record, show] = useState<
      { attempts: number; apple: boolean; visits: { id: string; title: string }[] } | null
    >(null);
  useEffect(() => {
    let live = true;
    show(null);
    if (user) {
      void (async () => {
        try {
          const e = activeExplorerId();
          if (!e || !(await supabase.rpc("lb_access", { e })).data) return;
          const [a, r, v] = await Promise.all([
            supabase.from("lb_attempts").select("request_id", { head: true, count: "exact" }).eq(
              "explorer",
              e,
            ),
            supabase.from("lb_rewards").select("asset").eq("explorer", e),
            supabase.from("lb_visits").select("submission").eq("explorer", e).order("last_opened", {
              ascending: false,
            }).limit(6),
          ]);
          if (a.error || r.error || v.error) return;
          const ids = v.data.map((row) => row.submission);
          const items = ids.length
            ? await supabase.from("lb_submissions").select("id,meta").in("id", ids).eq("status", "published")
            : null;
          if (live) {
            show({
              attempts: a.count || 0,
              apple: r.data.some((row) => row.asset === "apple-basket"),
              visits: ids.map((id) => items?.data?.find((row) => row.id === id)).filter(Boolean).map(
                (row) => ({ id: row!.id, title: row!.meta.title }),
              ),
            });
          }
        } catch { /* Existing local learning history still works without V2 storage. */ }
      })();
    }
    return () => {
      live = false;
    };
  }, [user?.id]);
  if (!record) return null;
  return (
    <section>
      <h3>Your world keepsakes</h3>
      <p>
        {record.attempts} fruit-stall practice {record.attempts === 1 ? "attempt" : "attempts"}. {record.apple
          ? "Your apple basket is ready to place."
          : "Collect a basket by filling three French orders."}
      </p>
      <Link href="/create/world/">Visit my world →</Link>
      {record.visits.length > 0 && (
        <>
          <h3>Opened recently</h3>
          <p>Places you visited, not completed lessons.</p>
          {record.visits.map((v) => (
            <p key={v.id}>
              <Link href={"/explore/?experience=" + v.id}>{v.title} →</Link>
            </p>
          ))}
        </>
      )}
    </section>
  );
}
