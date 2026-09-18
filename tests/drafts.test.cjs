const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8').replace(/^export /gm, '');
const units = ['1209A','1210A'].map(id => ({ id, label: id, tower: 'Teste', floor: '12', type: '3 Quartos', termination: '09A', plantDeadline: 'A definir' }));
function boot(onSave = async () => new Date().toISOString(), savedDrafts = []) {
  const notices = [];
  const context = vm.createContext({
    document: {
      querySelector: selector => selector === '#app' ? { innerHTML: '' } : null,
      querySelectorAll: () => [], createElement: () => ({}),
      body: { appendChild: element => notices.push(element.textContent) }
    },
    setTimeout: () => {}, options: { units, savedDrafts, onSave, onSignOut: () => {} }
  });
  vm.runInContext(source, context);
  vm.runInContext('mountConfigurator(options)', context);
  return { run: code => vm.runInContext(code, context), notices, context };
}
test('unit switching preserves independent unsaved choices', () => {
  const page = boot();
  page.run("selectApartment('1209A'); state.stone='bellagio'; showApartments(); selectApartment('1210A');");
  assert.equal(page.run('state.stone'), 'sao-marco');
  page.run("state.service='service-yes'; selectApartment('1209A');");
  assert.equal(page.run('state.stone'), 'bellagio');
  assert.equal(page.run('state.service'), 'service-no');
});
test('backend receives selections only; remount restores saved choices', async () => {
  const rows = [];
  const page = boot(async (id, selections) => { rows.push({ unit_id: id, selections, updated_at: '2026-09-15T12:00:00Z' }); return rows[0].updated_at; });
  await page.run("selectApartment('1209A'); state.stone='bellagio'; saveProgress();");
  assert.deepEqual(Object.keys(rows[0].selections).sort(), ['counter','rodamao','service','socialPlant','stone','suitePlant']);
  const reopened = boot(undefined, rows);
  reopened.run("selectApartment('1209A');");
  assert.equal(reopened.run('state.stone'), 'bellagio');
  reopened.run("selectApartment('1210A');");
  assert.equal(reopened.run('state.stone'), 'sao-marco');
});
test('failed save keeps edits without a successful save timestamp', async () => {
  const page = boot(async () => { throw new Error('Falha de conexão'); });
  await page.run("selectApartment('1209A'); state.stone='bellagio'; saveProgress();");
  assert.equal(page.run('state.savedAt'), null);
  assert.equal(page.notices.at(-1), 'Falha de conexão');
  assert.equal(page.run('state.stone'), 'bellagio');
});
test('logout clears data and ignores an outstanding save response', async () => {
  let finish;
  const page = boot(() => new Promise(resolve => { finish = resolve; }));
  const pending = page.run("selectApartment('1209A'); state.stone='bellagio'; saveProgress();");
  page.run('clearConfigurator()');
  finish('2026-09-15T12:00:00Z');
  await pending;
  assert.equal(page.run('drafts.size'), 0);
  assert.equal(page.run('state.apartmentId'), null);
  assert.equal(page.run('DATA.apartments.length'), 0);
  assert.equal(page.notices.length, 0);
});
test('save response preserves later edits and cannot overwrite another unit', async () => {
  let finish;
  const page = boot(() => new Promise(resolve => { finish = resolve; }));
  const pending = page.run("selectApartment('1209A'); state.stone='bellagio'; saveProgress();");
  page.run("state.service='service-yes'; selectApartment('1210A');");
  finish('2026-09-15T12:00:00Z');
  await pending;
  assert.equal(page.run('state.stone'), 'sao-marco');
  page.run("selectApartment('1209A');");
  assert.equal(page.run('state.service'), 'service-yes');
});
test('invalid selections receive defaults; unauthorized drafts are ignored', () => {
  const page = boot(undefined, [
    { unit_id: '1209A', selections: { stone:'removed', counter:null }, updated_at:'bad' },
    { unit_id: 'other', selections: { stone:'bellagio' } }
  ]);
  page.run("selectApartment('1209A');");
  assert.equal(page.run('state.stone'), 'sao-marco');
  assert.equal(page.run('drafts.has("other")'), false);
  page.run("selectApartment('other');");
  assert.equal(page.run('state.apartmentId'), '1209A');
});
