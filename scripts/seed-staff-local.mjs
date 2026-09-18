import { createClient } from '@supabase/supabase-js';
import { localEnvironment } from './local-env.mjs';
const { apiUrl, secretKey } = localEnvironment();
const client = createClient(apiUrl, secretKey, {auth:{persistSession:false,autoRefreshToken:false}});
const check = r => { if(r.error) throw r.error; return r.data; };
const users = check(await client.auth.admin.listUsers({perPage:1000})).users;
for (const [role,count] of [['admin',3],['architect',2]]) {
 for(let i=1;i<=count;i++) {
  const email = `${role}.${i}@example.test`;
  const user = users.find(u=>u.email===email) || check(await client.auth.admin.createUser({email,email_confirm:true})).user;
  check(await client.from('staff_users').upsert({user_id:user.id,name:`${role === 'admin' ? 'Administrador' : 'Arquiteta'} de teste ${i}`,role,active:true}));
 }
}
console.log('Criadas/verificadas 3 contas admin e 2 architect locais de teste. Nenhum convite enviado.');
