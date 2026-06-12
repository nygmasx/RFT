import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  // Vérifie que c'est un webhook Supabase valide
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const payload = await req.json();

  // Le webhook envoie { type: 'INSERT', record: {...} }
  const record = payload.record;
  if (!record || record.status !== 'pending') {
    return new Response('Ignored', { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Récupère le prénom/nom du nouveau membre
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, category')
    .eq('id', record.id)
    .single();

  if (!profile) return new Response('Profile not found', { status: 404 });

  // Récupère les tokens push de tous les coachs
  const { data: coachUsers } = await supabase.auth.admin.listUsers();
  const coachIds = (coachUsers?.users ?? [])
    .filter((u) => u.app_metadata?.role === 'coach')
    .map((u) => u.id);

  if (coachIds.length === 0) return new Response('No coaches found', { status: 200 });

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', coachIds);

  if (!tokens || tokens.length === 0) {
    return new Response('No coach tokens', { status: 200 });
  }

  // Envoie la notification via Expo Push API
  const messages = tokens.map(({ token }) => ({
    to: token,
    title: '🥋 Nouvelle demande d\'inscription',
    body: `${profile.first_name} ${profile.last_name} (${profile.category ?? 'Adultes'}) attend ta validation.`,
    data: { screen: 'admin' },
    sound: 'default',
    priority: 'high',
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  const result = await response.json();

  return new Response(JSON.stringify({ ok: true, result }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
