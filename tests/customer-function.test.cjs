const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const vm = require('node:vm');

// Exercise the deployed handler with isolated Auth/database adapters; no network or account creation.
const source = stripTypeScriptTypes(readFileSync('supabase/functions/admin-customer/index.ts', 'utf8')
  .replace(/^import[^\n]+\n/, ''));
function fixture(options = {}) {
  const calls = [];
  let handler;
  const user = {
    auth: { async getUser() { return options.identityError
      ? { error: { message: 'Invalid JWT' }, data: { user: null } }
      : { error: null, data: { user: { id: 'fixture-admin' } } }; } },
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'current_staff_role') return { data: options.role || 'admin', error: null };
      if (name === 'find_customer_auth_user') return { data: options.existing ? 'existing-user' : null, error: null };
      if (name === 'register_customer_account') return { data: 'fixture-customer', error: null };
      throw Error(`Unexpected RPC: ${name}`);
    }
  };
  const service = { auth: { admin: { async createUser(data) {
    calls.push({ name: 'createUser', data });
    return { data: { user: { id: 'new-user' } }, error: options.creationError ? { message: 'Creation failed' } : null };
  } } } };
  vm.runInNewContext(source, {
    Request, Response,
    createClient(_url, key, settings) {
      if (key === 'fixture-service-key') { calls.push({ name: 'serviceClient' }); return service; }
      calls.push({ name: 'userClient', authorization: settings?.global?.headers?.Authorization });
      return user;
    },
    Deno: { env: { get: name => ({ SUPABASE_URL: 'https://fixture.example.test', SUPABASE_ANON_KEY: 'fixture-public-key', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-key' })[name] }, serve: fn => { handler = fn; } }
  });
  return {
    calls,
    request(body = { name: 'Cliente', email: 'client@example.test' }, authorization = 'Bearer fixture-user-token', method = 'POST') {
      return handler(new Request('https://fixture.example.test/functions/v1/admin-customer', {
        method, headers: authorization ? { Authorization: authorization } : {},
        ...(method === 'POST' ? { body: JSON.stringify(body) } : {})
      }));
    }
  };
}
function noAccountWrites(f) {
  assert.equal(f.calls.some(c => ['serviceClient', 'createUser', 'register_customer_account'].includes(c.name)), false);
}

test('customer function denies missing identity before any account writes', async () => {
  const f = fixture({ identityError: true });
  assert.equal((await f.request(undefined, '')).status, 403);
  noAccountWrites(f);
});
test('customer function denies an invalid token even if role lookup returned Admin', async () => {
  const f = fixture({ identityError: true });
  assert.equal((await f.request()).status, 403);
  noAccountWrites(f);
});
test('customer function denies an authenticated architect', async () => {
  const f = fixture({ role: 'architect' });
  assert.equal((await f.request()).status, 403);
  noAccountWrites(f);
});
test('customer function rejects malformed customer data without creating Auth users', async () => {
  const f = fixture();
  assert.equal((await f.request({ name: 'Cliente', email: 'invalid' })).status, 400);
  noAccountWrites(f);
});
test('customer function creates unconfirmed accounts without passwords or invitations', async () => {
  const f = fixture();
  const response = await f.request({ name: ' Cliente ', email: ' CLIENT@EXAMPLE.TEST ' });
  assert.equal(response.status, 200);
  const created = f.calls.find(c => c.name === 'createUser').data;
  assert.deepEqual(Object.keys(created).sort(), ['email', 'email_confirm']);
  assert.equal(created.email, 'client@example.test');
  assert.equal(created.email_confirm, false);
  const registration = f.calls.find(c => c.name === 'register_customer_account');
  assert.equal(registration.args.p_name, 'Cliente');
  assert.equal(registration.args.p_email, 'client@example.test');
  assert.deepEqual(await response.json(), { customerId: 'fixture-customer' });
});
test('customer function reuses existing Auth accounts without creating duplicates', async () => {
  const f = fixture({ existing: true });
  assert.equal((await f.request()).status, 200);
  assert.equal(f.calls.some(c => c.name === 'createUser'), false);
  assert.equal(f.calls.filter(c => c.name === 'register_customer_account').length, 1);
});
test('customer function does not register profiles when Auth creation fails', async () => {
  const f = fixture({ creationError: true });
  assert.equal((await f.request()).status, 400);
  assert.equal(f.calls.some(c => c.name === 'register_customer_account'), false);
});
test('customer function preflight and unsupported methods never access Auth or database', async () => {
  const f = fixture();
  assert.equal((await f.request(undefined, '', 'OPTIONS')).status, 200);
  assert.equal((await f.request(undefined, '', 'GET')).status, 405);
  assert.equal(f.calls.length, 0);
});
