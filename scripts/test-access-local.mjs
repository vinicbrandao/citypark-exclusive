import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { localEnvironment } from './local-env.mjs';
const { apiUrl, publicKey, secretKey } = localEnvironment();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(apiUrl, secretKey, options);
const anonymous = createClient(apiUrl, publicKey, options);
const settingsResponse = await fetch(`${apiUrl}/auth/v1/settings`, { headers: { apikey: publicKey } });
assert.equal(settingsResponse.ok, true);
const settings = await settingsResponse.json();
assert.equal(settings.external.email, true, 'Email login provider must remain enabled');
assert.equal(settings.disable_signup, true, 'Public signup must be disabled');
function check(result) { if (result.error) throw result.error; return result.data; }
async function login(email) {
  // Generated locally without sending any mail. Never printed or persisted.
  const link = check(await admin.auth.admin.generateLink({ type: 'magiclink', email }));
  const client = createClient(apiUrl, publicKey, options);
  check(await client.auth.verifyOtp({ email, token: link.properties.email_otp, type: 'email' }));
  return client;
}
const clientA = await login('cliente.a@example.test');
const clientB = await login('cliente.b@example.test');
const aUnits = check(await clientA.from('units').select('*'));
const bUnits = check(await clientB.from('units').select('*'));
assert.deepEqual(aUnits.map(u => u.code), ['1209A']);
assert.deepEqual(bUnits.map(u => u.code), ['1210A']);
assert.ok((await anonymous.from('units').select('*')).error);
assert.deepEqual(check(await clientA.from('units').select('*').eq('id', bUnits[0].id)), []);
assert.ok((await clientA.from('customer_units').insert({ customer_id: '00000000-0000-4000-8000-000000000001', unit_id: bUnits[0].id })).error);
const selections = { socialPlant:null, suitePlant:null, counter:'counter-standard', stone:'bellagio', rodamao:'padrao', service:'service-no' };
const current = check(await clientA.from('unit_drafts').select('revision').eq('unit_id', aUnits[0].id).maybeSingle());
const revision = current?.revision || 0;
const saved = check(await clientA.rpc('save_unit_draft', { p_unit_id:aUnits[0].id, p_selections:selections, p_expected_revision:revision }));
assert.equal(saved.revision, revision + 1);
assert.deepEqual(check(await clientB.from('unit_drafts').select('*').eq('unit_id', aUnits[0].id)), []);
assert.equal((await clientB.rpc('save_unit_draft', { p_unit_id:aUnits[0].id, p_selections:selections, p_expected_revision:saved.revision })).error?.code, '42501');
assert.equal((await clientA.rpc('save_unit_draft', { p_unit_id:aUnits[0].id, p_selections:selections, p_expected_revision:revision })).error?.code, '40001');
assert.equal((await clientA.rpc('save_unit_draft', { p_unit_id:aUnits[0].id, p_selections:{...selections,total:1}, p_expected_revision:saved.revision })).error?.code, '22023');
assert.ok((await clientA.from('unit_drafts').update({ selections:{} }).eq('unit_id', aUnits[0].id)).error);
const reopened = await login('cliente.a@example.test');
assert.equal(check(await reopened.from('unit_drafts').select('selections').eq('unit_id', aUnits[0].id).single()).selections.stone, 'bellagio');
const signup = await anonymous.auth.signUp({ email:'public-signup@example.test', password:crypto.randomUUID() });
assert.ok(signup.error);
await Promise.all([clientA.auth.signOut(), clientB.auth.signOut(), reopened.auth.signOut()]);
console.log('PASS: OTP, isolation, anonymous denial, access-link protection, save/reload, foreign write denial, revision conflict, field validation, direct update denial and public signup denial.');
