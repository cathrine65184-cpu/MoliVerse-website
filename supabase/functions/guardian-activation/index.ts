import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "https://moliverse.tech";
  if (origin !== "https://moliverse.tech" && origin !== "https://www.moliverse.tech" && !/^http:\/\/localhost:\d+$/.test(origin)) return new Response(null, { status: 403 });
  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const input = await request.json().catch(() => ({}));

  if (input.action === "start") {
    const nickname = String(input.nickname ?? "").trim();
    const ageBand = String(input.ageBand ?? "");
    const targetLanguage = String(input.targetLanguage ?? "").trim();
    const guardianEmail = String(input.guardianEmail ?? "").trim().toLowerCase();
    const origin = String(input.origin ?? "https://moliverse.tech").replace(/\/$/, "");
    if (!nickname || nickname.length > 30 || !["6–7", "8–10", "11–13", "14+"].includes(ageBand) || !targetLanguage || !/^\S+@\S+\.\S+$/.test(guardianEmail)) {
      return json({ error: "Invalid Explorer details" }, 400);
    }
    if (origin !== "https://moliverse.tech" && origin !== "https://www.moliverse.tech" && !/^http:\/\/localhost:\d+$/.test(origin)) return json({ error: "Invalid origin" }, 400);

    const { data: explorer, error: createError } = await admin
      .from("explorers")
      .insert({ nickname, age_band: ageBand, target_language: targetLanguage, guardian_email: guardianEmail })
      .select("id, activation_token")
      .single();
    if (createError || !explorer) return json({ error: "Could not create Explorer" }, 500);

    const publicAuth = createClient(url, anonKey, { auth: { persistSession: false } });
    // Always use the canonical production URL; an email opened on another device
    // must not inherit a localhost URL from the browser that created the invitation.
    const redirectTo = `${origin.startsWith("http://localhost:") ? origin : "https://moliverse.tech"}/family/activate/?token=${explorer.activation_token}`;
    const { error: emailError } = await publicAuth.auth.signInWithOtp({ email: guardianEmail, options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    if (emailError) {
      await admin.from("explorers").delete().eq("id", explorer.id);
      return json({ error: "Could not send guardian email" }, 502);
    }
    return json({ explorerId: explorer.id });
  }

  if (input.action === "pending" || input.action === "activate") {
    const bearer = request.headers.get("Authorization") ?? "";
    const jwt = bearer.replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(jwt);
    const user = userData.user;
    if (!user?.email || !user.email_confirmed_at) return json({ error: "A verified guardian email sign-in is required" }, 401);
    if (input.action === "pending") {
      const { data, error } = await admin.from("explorers").select("id,nickname,age_band").eq("guardian_email", user.email.toLowerCase()).eq("status", "pending").gt("activation_expires_at", new Date().toISOString()).limit(10);
      if (error) return json({ error: "Could not load invitations" }, 500);
      return json({ invitations: data ?? [] });
    }
    if (input.aiConversationConsent !== true) return json({ error: "Guardian consent for AI conversation is required to activate this Explorer." }, 403);
    const activationToken = String(input.token ?? "");
    const explorerId = String(input.explorerId ?? "");
    if (!activationToken && !/^[0-9a-f-]{36}$/i.test(explorerId)) return json({ error: "Missing invitation" }, 400);
    const query = admin.from("explorers").select("*").eq("guardian_email", user.email.toLowerCase());
    const { data: explorer } = await (activationToken ? query.eq("activation_token", activationToken) : query.eq("id", explorerId)).maybeSingle();
    if (!explorer || explorer.status !== "pending" || new Date(explorer.activation_expires_at).getTime() < Date.now() || explorer.guardian_email.toLowerCase() !== (user.email ?? "").toLowerCase()) return json({ error: "Invalid invitation" }, 400);

    await admin.from("guardians").upsert({ id: user.id, email: user.email?.toLowerCase() ?? "" });
    const { error: activationError } = await admin.from("explorers").update({ guardian_id: user.id, status: "active", activated_at: new Date().toISOString() }).eq("id", explorer.id);
    if (activationError) return json({ error: "Could not activate Explorer" }, 500);
    const { error: preferencesError } = await admin.from("guardian_preferences").upsert({ explorer_id: explorer.id, ai_mentor_enabled: true }, { onConflict: "explorer_id" });
    if (preferencesError) return json({ error: "Explorer activated, but AI permission could not be saved. Please open the family dashboard." }, 500);
    return json({ explorerId: explorer.id });
  }

  if (input.action === "status") {
    const explorerId = String(input.explorerId ?? "");
    if (!explorerId) return json({ error: "Missing Explorer" }, 400);
    const { data: explorer } = await admin.from("explorers").select("status").eq("id", explorerId).maybeSingle();
    if (!explorer) return json({ error: "Not found" }, 404);
    const { data: preferences } = await admin.from("guardian_preferences").select("ai_mentor_enabled, save_memories, voice_input_enabled, educator_response_enabled").eq("explorer_id", explorerId).maybeSingle();
    return json({ status: explorer.status, preferences });
  }

  return json({ error: "Unknown action" }, 400);
});
