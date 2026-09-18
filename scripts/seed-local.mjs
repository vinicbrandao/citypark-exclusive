import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { localEnvironment } from './local-env.mjs';
const { apiUrl, publicKey, secretKey } = localEnvironment();
const admin = createClient(apiUrl, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
const fixtures = [
  { email: 'cliente.a@example.test', customer: '00000000-0000-4000-8000-000000000001', unit: '10000000-0000-4000-8000-000000000001', code: '1209A', termination: '09A' },
  { email: 'cliente.b@example.test', customer: '00000000-0000-4000-8000-000000000002', unit: '10000000-0000-4000-8000-000000000002', code: '1210A', termination: '10A' }
];
function check(result) { if (result.error) throw result.error; return result.data; }
const existing = check(await admin.auth.admin.listUsers({ perPage: 1000 })).users;
for (const fixture of fixtures) {
  const user = existing.find(user => user.email === fixture.email)
    || check(await admin.auth.admin.createUser({ email: fixture.email, email_confirm: true })).user;
  check(await admin.from('customers').upsert({ id: fixture.customer, name: `Cliente de teste ${fixture.code}` }));
  check(await admin.from('units').upsert({ id: fixture.unit, code: fixture.code, tower: 'Torre Liberty', floor_label: '12º andar', termination: fixture.termination, typology: '3 Quartos' }));
  check(await admin.from('customer_users').upsert({ customer_id: fixture.customer, user_id: user.id }));
  check(await admin.from('customer_units').upsert({ customer_id: fixture.customer, unit_id: fixture.unit }));
}
writeFileSync('.env.local', `VITE_SUPABASE_URL=${apiUrl}\nVITE_SUPABASE_PUBLISHABLE_KEY=${publicKey}\n`);
console.log('Contas locais: cliente.a@example.test (1209A), cliente.b@example.test (1210A).');
console.log('Códigos capturados em http://127.0.0.1:54324. Nenhum e-mail real é enviado.');
