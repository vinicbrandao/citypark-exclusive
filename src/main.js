import { createClient } from '@supabase/supabase-js';
import { mountConfigurator, clearConfigurator } from '../app.js';
import '../styles.css';

const root = document.querySelector('#app');
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
let client;
let generation = 0;
let currentUserId = null;
let pendingEmail = '';
let loginMode = 'password';
let definingPassword = sessionStorage.getItem('exclusive-define-password') === 'yes';
let busy = false;
let resendAfter = 0;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function shell(content) {
  root.innerHTML = `<main class="auth-screen"><section class="auth-card"><div class="auth-brand">City Park <span>EXCLUSIVE</span></div>${content}</section></main>`;
}
function showPasswordForm(message = '') {
  shell(`<h1>Defina sua senha</h1><p>Use pelo menos 10 caracteres. Você usará esta senha nos próximos acessos.</p>
    <form id="password-form"><label for="new-password">Nova senha</label><input id="new-password" type="password" autocomplete="new-password" minlength="10" required>
    <label for="confirm-password">Confirme a senha</label><input id="confirm-password" type="password" autocomplete="new-password" minlength="10" required>
    <button class="auth-primary">Salvar senha e entrar</button></form><p class="auth-message" role="status">${escapeHtml(message)}</p><button id="cancel-password" class="auth-link">Sair</button>`);
  document.querySelector('#cancel-password').onclick = signOut;
  document.querySelector('#password-form').onsubmit = async event => {
    event.preventDefault(); if (busy) return;
    const password = document.querySelector('#new-password').value;
    if (password !== document.querySelector('#confirm-password').value) {
      document.querySelector('.auth-message').textContent = 'As senhas não coincidem.'; return;
    }
    if (password.length < 10) return;
    busy = true; const button = event.submitter; button.disabled = true;
    try {
      const { error } = await client.auth.updateUser({ password }); if (error) throw error;
      definingPassword = false; sessionStorage.removeItem('exclusive-define-password');
      currentUserId = null; pendingEmail = ''; loginMode = 'password';
      const { data, error: sessionError } = await client.auth.getSession(); if(sessionError) throw sessionError;
      await openSession(data.session);
    } catch {
      document.querySelector('.auth-message').textContent = 'Não foi possível salvar a senha. Tente outra senha ou reinicie a recuperação.';
    } finally { busy = false; button.disabled = false; }
  };
}
function showLogin(message = '') {
  shell(`<h1>Seu apartamento, suas escolhas</h1><p>${loginMode === 'password' ? 'Entre com seu e-mail e senha.' : 'Primeiro acesso ou recuperação: confirme seu e-mail com um código para definir sua senha.'}</p>
    <form id="login-form"><label for="email">E-mail</label><input id="email" name="email" type="email" autocomplete="email" required maxlength="254" value="${escapeHtml(pendingEmail)}" ${pendingEmail ? 'readonly' : ''}>
    ${pendingEmail ? '<label for="code">Código recebido por e-mail</label><input id="code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" minlength="6" required autofocus>' : loginMode === 'password' ? '<label for="password">Senha</label><input id="password" type="password" autocomplete="current-password" required>' : ''}
    <button class="auth-primary" ${busy ? 'disabled' : ''}>${busy ? 'Aguarde…' : pendingEmail ? 'Verificar código' : loginMode === 'password' ? 'Entrar' : 'Receber código'}</button></form>
    ${pendingEmail ? `<button class="auth-link" id="resend" ${busy ? 'disabled' : ''}>Reenviar código</button><button class="auth-link" id="change-email" ${busy ? 'disabled' : ''}>Usar outro e-mail</button>` : ''}
    <button class="auth-link" id="login-mode" ${busy ? 'disabled' : ''}>${loginMode === 'password' ? 'Primeiro acesso / Esqueci minha senha' : 'Voltar para e-mail e senha'}</button><p class="auth-message" role="status">${escapeHtml(message)}</p><small>O acesso é liberado pela equipe do Exclusive. Caso seu e-mail tenha mudado, solicite a atualização do cadastro.</small>`);
  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const email = document.querySelector('#email').value.trim().toLowerCase();
    const token = document.querySelector('#code')?.value.trim();
    if (!pendingEmail && loginMode === 'password') {
      const password = document.querySelector('#password').value;
      busy = true; event.submitter.disabled = true;
      try { const {error} = await client.auth.signInWithPassword({email,password}); if(error) throw error; }
      catch { document.querySelector('.auth-message').textContent = 'E-mail ou senha inválidos. Se ainda não tem senha, use Primeiro acesso.'; }
      finally { busy = false; event.submitter.disabled = false; }
      return;
    }
    if (!pendingEmail) { await sendCode(email); return; }
    busy = true;
    showLogin();
    try {
      definingPassword = true;
      sessionStorage.setItem('exclusive-define-password', 'yes');
      const { error } = await client.auth.verifyOtp({ email: pendingEmail, token, type: 'email' });
      if (error) throw error;
    } catch {
      definingPassword = false; sessionStorage.removeItem('exclusive-define-password');
      showLogin('Código inválido ou expirado. Confira o e-mail ou solicite um novo código.');
    } finally {
      busy = false;
      if (!currentUserId && !definingPassword) showLogin(document.querySelector('.auth-message')?.textContent || '');
    }
  });
  document.querySelector('#login-mode').onclick = () => { if (busy) return; loginMode = loginMode === 'password' ? 'code' : 'password'; pendingEmail = ''; showLogin(); };
  document.querySelector('#resend')?.addEventListener('click', () => sendCode(pendingEmail));
  document.querySelector('#change-email')?.addEventListener('click', () => { pendingEmail = ''; showLogin(); });
}
async function sendCode(email) {
  if (busy) return;
  if (Date.now() < resendAfter) { showLogin('Aguarde um minuto antes de solicitar outro código.'); return; }
  busy = true;
  showLogin();
  let message;
  try {
    const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    // Do not disclose whether an email belongs to a registered customer.
    if (error && !['otp_disabled', 'signup_disabled', 'user_not_found'].includes(error.code)) throw error;
    pendingEmail = email;
    resendAfter = Date.now() + 60000;
    message = 'Se este e-mail estiver cadastrado, você receberá um código. Confira também a caixa de spam.';
  } catch {
    message = 'Não foi possível solicitar o código. Aguarde um momento e tente novamente.';
  } finally { busy = false; showLogin(message); }
}
async function signOut() {
  definingPassword = false; sessionStorage.removeItem('exclusive-define-password'); loginMode = 'password';
  ++generation;
  currentUserId = null;
  clearConfigurator();
  pendingEmail = '';
  busy = false;
  shell('<h1>Encerrando sessão…</h1>');
  try {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    showLogin();
  } catch {
    shell('<h1>Não foi possível encerrar a sessão</h1><p>Tente novamente antes de deixar este dispositivo.</p><button id="logout-retry" class="auth-primary">Tentar novamente</button>');
    document.querySelector('#logout-retry').onclick = signOut;
  }
}
async function openSession(session) {
  const userId = session?.user?.id || null;
  if (userId && definingPassword) { currentUserId = userId; busy = false; clearConfigurator(); showPasswordForm(); return; }
  if (!userId) { definingPassword = false; sessionStorage.removeItem('exclusive-define-password'); }
  if (userId && userId === currentUserId) return; // Token refresh must not discard edits.
  const request = ++generation;
  currentUserId = userId;
  clearConfigurator();
  if (!userId) { busy = false; pendingEmail = ''; showLogin(); return; }
  shell('<h1>Carregando suas unidades…</h1>');
  try {
    const [unitsResult, draftsResult, staffResult] = await Promise.all([
      client.from('units').select('id,code,tower,floor_label,termination,typology').order('code'),
      client.from('unit_drafts').select('unit_id,selections,revision,updated_at'),
      client.rpc('current_staff_role')
    ]);
    if (request !== generation) return;
    if (unitsResult.error || draftsResult.error || staffResult.error) throw (unitsResult.error || draftsResult.error || staffResult.error);
    if (!unitsResult.data.length) {
      shell('<h1>Acesso em preparação</h1><p>Seu login foi reconhecido, mas ainda não há unidades liberadas para você. Entre em contato com a equipe do Exclusive.</p><button id="logout" class="auth-primary">Sair</button>');
      document.querySelector('#logout').onclick = signOut;
      return;
    }
    const revisions = new Map(draftsResult.data.map(draft => [draft.unit_id, draft.revision]));
    mountConfigurator({
      staffRole: staffResult.data,
      units: unitsResult.data.map(unit => ({
        id: unit.id, label: escapeHtml(unit.code), tower: escapeHtml(unit.tower),
        floor: escapeHtml(unit.floor_label), termination: escapeHtml(unit.termination), type: escapeHtml(unit.typology),
        situation: ['09A', '10A'].includes(unit.termination) ? `${import.meta.env.BASE_URL}assets/situacao/${unit.termination}.jpg` : null,
        plantDeadline: 'A definir'
      })),
      savedDrafts: draftsResult.data,
      onSignOut: signOut,
      onSave: async (unitId, selections) => {
        const { data, error } = await client.rpc('save_unit_draft', {
          p_unit_id: unitId, p_selections: selections, p_expected_revision: revisions.get(unitId) || 0
        });
        if (error) {
          throw new Error(error.code === '40001'
            ? 'Esta unidade foi alterada em outra sessão. Copie suas escolhas e reabra a página antes de salvar novamente.'
            : 'Não foi possível salvar. Verifique a conexão e se seu acesso continua liberado.');
        }
        revisions.set(unitId, data.revision);
        return data.updated_at;
      }
    });
  } catch (error) {
    if (request !== generation) return;
    console.error('Falha ao carregar unidades:', error.message);
    shell('<h1>Não foi possível carregar suas unidades</h1><p>Verifique a conexão e tente novamente.</p><button id="retry" class="auth-primary">Tentar novamente</button><button id="logout" class="auth-link">Sair</button>');
    document.querySelector('#retry').onclick = () => { currentUserId = null; openSession(session); };
    document.querySelector('#logout').onclick = signOut;
  }
}
if (!url || !key) {
  shell('<h1>Acesso em preparação</h1><p>O serviço de acesso ainda não foi configurado neste ambiente.</p>');
} else {
  shell('<h1>Verificando acesso…</h1>');
  client = createClient(url, key);
  client.auth.onAuthStateChange((_event, session) => { setTimeout(() => openSession(session), 0); });
}
