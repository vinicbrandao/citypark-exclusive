import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);
  const url = Deno.env.get('SUPABASE_URL')!;
  const auth = req.headers.get('Authorization') || '';
  const user = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const identity = await user.auth.getUser();
  const role = await user.rpc('current_staff_role');
  if (identity.error || role.error || role.data !== 'admin') return json({ error: 'Acesso exclusivo do Admin.' }, 403);
  let body;
  try { body = await req.json(); } catch { return json({ error: 'Dados inválidos.' }, 400); }
  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (!name || name.length > 200 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Confira nome e e-mail.' }, 400);
  const existing = await user.rpc('find_customer_auth_user', { p_email: email });
  if (existing.error) return json({ error: 'Não foi possível consultar a conta.' }, 400);
  if (!existing.data) {
    const service = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    // No invitation is sent. The customer confirms their e-mail on first access.
    const created = await service.auth.admin.createUser({ email, email_confirm: false });
    if (created.error) {
      const retry = await user.rpc('find_customer_auth_user', { p_email: email });
      if (!retry.data) return json({ error: 'Não foi possível criar a conta de acesso.' }, 400);
    }
  }
  const result = await user.rpc('register_customer_account', { p_name: name, p_email: email });
  if (result.error) return json({ error: 'Não foi possível cadastrar o cliente. Confira se o e-mail pertence a uma conta de equipe.' }, 400);
  return json({ customerId: result.data });
});
