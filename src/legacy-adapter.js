// Database bridge for the approved configurator layout in ../app.js.
// The visible catalog keeps its existing cards and preview assets; only
// options assigned to the unit's base plan are writable.
const CATALOG = {
  socialPlant: { module: 'planta', group: 'DEMO-AREA-SOCIAL', values: {
    'social-original': 'padrao', 'social-standard': 'euroglass',
    'social-veranda': 'integrada', 'social-full': 'ilha'
  } },
  suitePlant: { module: 'planta', group: 'DEMO-SUITE-MASTER', values: {
    'suite-standard': 'padrao', 'suite-closet': 'closet', 'suite-office': 'gabinete'
  } },
  counter: { module: 'bancadas', group: 'DEMO-BANCADA', values: {
    'counter-standard': 'padrao', 'counter-extended': 'estendida'
  } },
  stone: { module: 'bancadas', group: 'DEMO-GRANITO', values: {
    'sao-marco': 'sao-marco', bellagio: 'bellagio'
  } },
  rodamao: { module: 'bancadas', group: 'DEMO-RODAMAO', values: {
    padrao: 'padrao', '60': '60'
  } },
  service: { module: 'bancadas', group: 'DEMO-SERVICO', values: {
    'service-no': 'padrao', 'service-yes': 'bancada'
  } }
};

const check = result => { if (result.error) throw result.error; return result.data; };
const formatDeadline = value => value ? new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
}).format(new Date(value)) : 'A definir';
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());

export async function createLegacyAdapter({ client, staffRole, onSignOut }) {
  const rows = {};
  const adapter = {
    staffRole, onSignOut, units: [], savedDrafts: [], proposals: {},
    help: {}, editAfterSubmit: new Set(), architects: {},
    canEdit, isOptionAvailable, onSave, onSubmit, onRequestHelp,
    onCancelHelp, onAcceptHelp, onResolveHelp, onRevokeArchitect, onReview, onEditProposal,
    loadArchitects, refresh
  };

  async function refresh() {
    const queries = {
      units: client.from('units').select('id,code,tower,floor_label,termination,typology').order('code'),
      links: client.from('customer_units').select('unit_id,customer_id,ownership_role'),
      plans: client.from('base_plans').select('id,code,name,status'),
      assignments: client.from('unit_base_plan_assignments').select('unit_id,base_plan_id'),
      windows: client.from('unit_module_windows').select('unit_id,module_code,opens_at,closes_at,status'),
      groups: client.from('customization_groups').select('id,code,module_code,status,required_for_submission'),
      options: client.from('customization_options').select('id,group_id,code,status'),
      availability: client.from('base_plan_option_availability').select('base_plan_id,option_id'),
      states: client.from('unit_module_states').select('unit_id,module_code,revision,updated_at'),
      selections: client.from('unit_module_selections').select('unit_id,module_code,group_id,option_id'),
      legacyDrafts: client.from('unit_drafts').select('unit_id,selections,updated_at'),
      proposals: client.from('unit_proposals').select('id,unit_id,cycle_number,status,latest_revision,submitted_at,updated_at,reviewed_at').order('cycle_number', { ascending: false }),
      proposalVersions: client.from('unit_proposal_versions').select('proposal_id,revision,module_revisions,created_at'),
      reviews: client.from('unit_proposal_reviews').select('proposal_id,revision,decision,note,reviewed_at'),
      requests: client.from('architect_assistance_requests').select('id,unit_id,architect_user_id,status')
    };
    const entries = Object.entries(queries);
    const data = await Promise.all(entries.map(([, query]) => query));
    entries.forEach(([key], index) => { rows[key] = check(data[index]); });
    adapter.units = rows.units.map(unit => {
      const deadline = rows.windows.find(window => window.unit_id === unit.id && window.module_code === 'planta');
      return {
        id: unit.id, label: unit.code, tower: unit.tower, floor: unit.floor_label,
        termination: unit.termination, type: unit.typology,
        situation: ['09A', '10A'].includes(unit.termination)
          ? `${import.meta.env.BASE_URL}assets/situacao/${unit.termination}.jpg` : null,
        plantDeadline: formatDeadline(deadline?.closes_at)
      };
    });
    adapter.proposals = Object.fromEntries(rows.units.map(unit => [unit.id, proposalInfo(unit.id)]));
    adapter.help = Object.fromEntries(rows.units.map(unit => [unit.id, activeHelp(unit.id)]));
    adapter.savedDrafts = rows.units.filter(unit => rows.states.some(row => row.unit_id === unit.id) ||
      rows.legacyDrafts.some(row => row.unit_id === unit.id))
      .map(unit => ({
      unit_id: unit.id,
      selections: savedChoices(unit.id),
      updated_at: [...rows.states.filter(row => row.unit_id === unit.id).map(row => row.updated_at),
        ...rows.legacyDrafts.filter(row => row.unit_id === unit.id).map(row => row.updated_at)]
        .sort().at(-1) || null
    }));
    return adapter;
  }

  function planId(unitId) { return rows.assignments.find(row => row.unit_id === unitId)?.base_plan_id; }
  function group(key) { return rows.groups.find(row => row.code === CATALOG[key].group && row.module_code === CATALOG[key].module); }
  function option(key, value) {
    const definition = CATALOG[key], selectedGroup = group(key);
    return rows.options.find(row => row.group_id === selectedGroup?.id && row.code === definition.values[value]);
  }
  function isOptionAvailable(unitId, key, value) {
    const selected = option(key, value), plan = planId(unitId);
    return Boolean(selected && selected.status === 'active' && group(key)?.status === 'active' &&
      rows.availability.some(row => row.base_plan_id === plan && row.option_id === selected.id));
  }
  function savedChoices(unitId) {
    const choices = {};
    const legacy = rows.legacyDrafts.find(row => row.unit_id === unitId)?.selections || {};
    for (const [key, definition] of Object.entries(CATALOG)) {
      const selectedGroup = group(key);
      const selection = rows.selections.find(row => row.unit_id === unitId &&
        row.module_code === definition.module && row.group_id === selectedGroup?.id);
      const selectedOption = rows.options.find(row => row.id === selection?.option_id);
      const value = Object.entries(definition.values).find(([, code]) => code === selectedOption?.code)?.[0];
      if (value) choices[key] = value;
      else if (!rows.states.some(row => row.unit_id === unitId && row.module_code === definition.module) &&
        legacy[key] && isOptionAvailable(unitId, key, legacy[key])) choices[key] = legacy[key];
    }
    return choices;
  }
  function currentSelections(unitId, module) {
    return Object.fromEntries(rows.selections.filter(row => row.unit_id === unitId && row.module_code === module)
      .map(row => [row.group_id, row.option_id]));
  }
  function moduleSelections(unitId, module, selections) {
    const values = {};
    for (const [key, definition] of Object.entries(CATALOG)) {
      if (definition.module !== module || selections[key] == null) continue;
      if (!isOptionAvailable(unitId, key, selections[key])) {
        throw new Error('Esta opção não está disponível para a planta desta unidade.');
      }
      values[group(key).id] = option(key, selections[key]).id;
    }
    return values;
  }
  function windowOpen(unitId, module) {
    const window = rows.windows.find(row => row.unit_id === unitId && row.module_code === module);
    const now = Date.now();
    return Boolean(window?.status === 'active' && now >= Date.parse(window.opens_at) && now < Date.parse(window.closes_at));
  }
  function canEdit(unitId, module) {
    const proposal = adapter.proposals[unitId];
    const cycleEditable = !proposal || proposal.dbStatus === 'reviewed' || proposal.latest_revision < 4;
    const staffCanEdit = staffRole === 'admin' || (Boolean(staffRole) && cycleEditable);
    const customerCanEdit = !proposal || (adapter.editAfterSubmit.has(unitId) && cycleEditable);
    return windowOpen(unitId, module) && Boolean(planId(unitId)) &&
      (staffRole ? staffCanEdit : customerCanEdit);
  }
  function proposalInfo(unitId) {
    const proposal = rows.proposals
      .filter(row => row.unit_id === unitId)
      .sort((a, b) => b.cycle_number - a.cycle_number)[0];
    if (!proposal) return null;
    const version = rows.proposalVersions.find(row => row.proposal_id === proposal.id && row.revision === proposal.latest_revision);
    const review = rows.reviews.find(row => row.proposal_id === proposal.id && row.revision === proposal.latest_revision);
    const currentRevisions = Object.fromEntries(rows.states.filter(row => row.unit_id === unitId)
      .map(row => [row.module_code, row.revision]));
    const pendingChanges = proposal.status === 'open' && Boolean(version) && !same(currentRevisions, version.module_revisions || {});
    const remainingChanges = proposal.status === 'open' ? Math.max(0, 4 - proposal.latest_revision) : 3;
    return { ...proposal, dbStatus: proposal.status, review, pendingChanges, remainingChanges,
      statusLabel: review
        ? review.decision === 'approved' ? 'Viabilidade técnica confirmada' : 'Alterações solicitadas'
        : pendingChanges ? 'Alterações salvas, ainda não enviadas' : 'Aguardando análise da arquiteta' };
  }
  function activeHelp(unitId) {
    return rows.requests.find(row => row.unit_id === unitId && ['requested', 'in_progress'].includes(row.status)) || null;
  }
  function customerId(unitId) { return rows.links.find(row => row.unit_id === unitId)?.customer_id; }
  function explain(error) {
    const message = error?.message || '';
    if (message.includes('Proposal edit limit reached')) return new Error('Você já utilizou as 3 alterações desta proposta. Aguarde o parecer da arquiteta para iniciar uma nova proposta.');
    if (message.includes('No proposal changes to submit')) return new Error('Faça alguma alteração antes de reenviar a proposta.');
    if (message.includes('Proposal has unsent changes')) return new Error('Existem alterações do cliente que ainda não foram reenviadas. A arquiteta só pode avaliar a versão mais recente enviada.');
    if (error?.code === '40001') return new Error('Esta unidade mudou em outra sessão. Reabra a página antes de salvar.');
    if (error?.code === '42501') return new Error('Esta alteração não está permitida. Confira o prazo e sua autorização.');
    if (error?.code === '22023') return new Error('Complete as opções necessárias e confira a disponibilidade para esta planta.');
    return error;
  }
  async function onSave(unitId, selections) {
    try {
      for (const module of ['planta', 'bancadas']) {
        const next = moduleSelections(unitId, module, selections);
        const previous = currentSelections(unitId, module);
        if (same(next, previous)) continue;
        if (!canEdit(unitId, module)) throw new Error(`O módulo ${module} está fechado para edição.`);
        const revision = rows.states.find(row => row.unit_id === unitId && row.module_code === module)?.revision || 0;
        check(await client.rpc('save_unit_module_choices', {
          p_customer_id: staffRole ? null : customerId(unitId), p_unit_id: unitId,
          p_module_code: module, p_selections: next, p_expected_revision: revision
        }));
        await refresh();
      }
      return rows.states.filter(row => row.unit_id === unitId).map(row => row.updated_at).sort().at(-1) || new Date().toISOString();
    } catch (error) { await refresh(); throw explain(error); }
  }
  async function onSubmit(unitId) {
    if (staffRole) throw new Error('O envio da proposta pertence ao cliente.');
    try {
      const revisions = Object.fromEntries(rows.states.filter(row => row.unit_id === unitId)
        .map(row => [row.module_code, row.revision]));
      check(await client.rpc('submit_unit_proposal', {
        p_customer_id: customerId(unitId), p_unit_id: unitId,
        p_expected_module_revisions: revisions
      }));
      adapter.editAfterSubmit.delete(unitId);
      await refresh();
    } catch (error) { await refresh(); throw explain(error); }
  }
  function onEditProposal(unitId) {
    const proposal = proposalInfo(unitId);
    if (proposal?.dbStatus === 'open' && proposal.latest_revision >= 4) {
      throw new Error('Você já utilizou as 3 alterações desta proposta. Aguarde o parecer da arquiteta.');
    }
    adapter.editAfterSubmit.add(unitId);
  }
  async function loadArchitects(unitId) {
    adapter.architects[unitId] = check(await client.rpc('list_unit_architects', { p_unit_id: unitId }));
    return adapter.architects[unitId];
  }
  async function onRequestHelp(unitId, architectId) {
    try {
      const architect = (adapter.architects[unitId] || []).find(row => row.user_id === architectId);
      if (!architect) throw new Error('Escolha uma arquiteta.');
      if (!architect.authorized) check(await client.rpc('set_architect_authorization', {
        p_customer_id: customerId(unitId), p_unit_id: unitId,
        p_architect_user_id: architectId, p_active: true
      }));
      check(await client.rpc('request_architect_assistance', {
        p_customer_id: customerId(unitId), p_unit_id: unitId, p_architect_user_id: architectId
      }));
      await refresh(); await loadArchitects(unitId);
    } catch (error) { throw explain(error); }
  }
  async function onCancelHelp(unitId) {
    check(await client.rpc('cancel_architect_assistance', { p_request_id: activeHelp(unitId)?.id }));
    await refresh();
  }
  async function onRevokeArchitect(unitId, architectId) {
    check(await client.rpc('set_architect_authorization', {
      p_customer_id: customerId(unitId), p_unit_id: unitId,
      p_architect_user_id: architectId, p_active: false
    }));
    await refresh(); await loadArchitects(unitId);
  }
  async function onAcceptHelp(unitId) {
    check(await client.rpc('accept_architect_assistance', { p_request_id: activeHelp(unitId)?.id }));
    await refresh();
  }
  async function onResolveHelp(unitId) {
    check(await client.rpc('resolve_architect_assistance', { p_request_id: activeHelp(unitId)?.id }));
    await refresh();
  }
  async function onReview(unitId, decision, note) {
    try {
      check(await client.rpc('review_unit_proposal', {
        p_unit_id: unitId, p_expected_revision: proposalInfo(unitId)?.latest_revision,
        p_decision: decision, p_note: note || null
      }));
      await refresh();
    } catch (error) { await refresh(); throw explain(error); }
  }

  return refresh();
}
