// Database bridge for the approved configurator layout in ../app.js.
// Uses only the current module-based customization and proposal architecture.
const CATALOG = {
  socialPlant: { module: 'planta', group: 'DEMO-AREA-SOCIAL', values: {
    'social-original': 'padrao',
    'social-standard': 'euroglass',
    'social-veranda': 'integrada',
    'social-full': 'ilha'
  } },

  suitePlant: { module: 'planta', group: 'DEMO-SUITE-MASTER', values: {
    'suite-standard': 'padrao',
    'suite-closet': 'closet',
    'suite-office': 'gabinete'
  } },

  counter: { module: 'bancadas', group: 'DEMO-BANCADA', values: {
    'counter-standard': 'padrao',
    'counter-extended': 'estendida'
  } },

  stone: { module: 'bancadas', group: 'DEMO-GRANITO', values: {
    'sao-marco': 'sao-marco',
    bellagio: 'bellagio'
  } },

  rodamao: { module: 'bancadas', group: 'DEMO-RODAMAO', values: {
    padrao: 'padrao',
    '60': '60'
  } },

  service: { module: 'bancadas', group: 'DEMO-SERVICO', values: {
    'service-no': 'padrao',
    'service-yes': 'bancada'
  } }
};

const check = result => {
  if (result.error) throw result.error;
  return result.data;
};

const formatDeadline = value => value
  ? new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  : 'A definir';

const same = (a, b) =>
  JSON.stringify(Object.entries(a).sort()) ===
  JSON.stringify(Object.entries(b).sort());

export async function createConfiguratorAdapter({
  client,
  staffRole,
  onSignOut
}) {
  const rows = {};

  const adapter = {
    staffRole,
    onSignOut,

    units: [],
    savedDrafts: [],
    proposals: {},
    help: {},
    editAfterSubmit: new Set(),
    architects: {},

    canEdit,
    isOptionAvailable,
    onSave,
    onSubmit,
    onRequestHelp,
    onCancelHelp,
    onAcceptHelp,
    onResolveHelp,
    onRevokeArchitect,
    onReview,
    onEditProposal,
    loadArchitects,
    refresh
  };

  async function refresh() {
    const queries = {
      units: client
        .from('units')
        .select('id,code,tower,tower_code,floor_label,termination,typology,area_m2,customization_closes_at')
        .order('code'),

      links: client
        .from('customer_units')
        .select('unit_id,customer_id,ownership_role'),

      assignments: client
        .from('unit_base_plan_assignments')
        .select('unit_id,base_plan_id'),

      windows: client
        .from('unit_module_windows')
        .select('unit_id,module_code,opens_at,closes_at,status'),

      groups: client
        .from('customization_groups')
        .select('id,code,module_code,status,required_for_submission'),

      options: client
        .from('customization_options')
        .select('id,group_id,code,status'),

      availability: client
        .from('base_plan_option_availability')
        .select('base_plan_id,option_id'),

      states: client
        .from('unit_module_states')
        .select('unit_id,module_code,revision,updated_at'),

      selections: client
        .from('unit_module_selections')
        .select('unit_id,module_code,group_id,option_id'),

      proposals: client
        .from('unit_proposals')
        .select(
          'id,unit_id,cycle_number,latest_revision,status,submitted_at,updated_at,reviewed_at'
        ),

      reviews: client
        .from('unit_proposal_reviews')
        .select('proposal_id,revision,decision,note,reviewed_at'),

      requests: client
        .from('architect_assistance_requests')
        .select('id,unit_id,architect_user_id,status')
    };

    const entries = Object.entries(queries);
    const data = await Promise.all(
      entries.map(([, query]) => query)
    );

    entries.forEach(([key], index) => {
      rows[key] = check(data[index]);
    });

    adapter.units = rows.units.map(unit => {
      const deadline = rows.windows.find(window =>
        window.unit_id === unit.id &&
        window.module_code === 'planta'
      );

      return {
        id: unit.id,
        label: unit.code,
        tower: unit.tower,
        towerCode: unit.tower_code,
        floor: unit.floor_label,
        termination: unit.termination,
        type: unit.typology,
        areaM2: unit.area_m2,
        customizationClosesAt: unit.customization_closes_at,
        customizationDeadline: formatDeadline(unit.customization_closes_at),

        situation: ['09A', '10A'].includes(unit.termination)
          ? `${import.meta.env.BASE_URL}assets/situacao/${unit.termination}.jpg`
          : null,

        plantDeadline: formatDeadline(deadline?.closes_at)
      };
    });

    adapter.proposals = Object.fromEntries(
      rows.units.map(unit => [
        unit.id,
        proposalInfo(unit.id)
      ])
    );

    adapter.help = Object.fromEntries(
      rows.units.map(unit => [
        unit.id,
        activeHelp(unit.id)
      ])
    );

    adapter.savedDrafts = rows.units
      .filter(unit =>
        rows.states.some(row => row.unit_id === unit.id)
      )
      .map(unit => ({
        unit_id: unit.id,

        selections: savedChoices(unit.id),

        updated_at: rows.states
          .filter(row => row.unit_id === unit.id)
          .map(row => row.updated_at)
          .sort()
          .at(-1) || null
      }));

    return adapter;
  }

  function planId(unitId) {
    return rows.assignments.find(
      row => row.unit_id === unitId
    )?.base_plan_id;
  }

  function group(key) {
    return rows.groups.find(row =>
      row.code === CATALOG[key].group &&
      row.module_code === CATALOG[key].module
    );
  }

  function option(key, value) {
    const definition = CATALOG[key];
    const selectedGroup = group(key);

    return rows.options.find(row =>
      row.group_id === selectedGroup?.id &&
      row.code === definition.values[value]
    );
  }

  function isOptionAvailable(unitId, key, value) {
    const selected = option(key, value);
    const plan = planId(unitId);

    return Boolean(
      selected &&
      selected.status === 'active' &&
      group(key)?.status === 'active' &&
      rows.availability.some(row =>
        row.base_plan_id === plan &&
        row.option_id === selected.id
      )
    );
  }

  function savedChoices(unitId) {
    const choices = {};

    for (const [key, definition] of Object.entries(CATALOG)) {
      const selectedGroup = group(key);

      const selection = rows.selections.find(row =>
        row.unit_id === unitId &&
        row.module_code === definition.module &&
        row.group_id === selectedGroup?.id
      );

      const selectedOption = rows.options.find(
        row => row.id === selection?.option_id
      );

      const value = Object.entries(definition.values)
        .find(([, code]) => code === selectedOption?.code)?.[0];

      if (value) {
        choices[key] = value;
      }
    }

    return choices;
  }

  function currentSelections(unitId, module) {
    return Object.fromEntries(
      rows.selections
        .filter(row =>
          row.unit_id === unitId &&
          row.module_code === module
        )
        .map(row => [
          row.group_id,
          row.option_id
        ])
    );
  }

  function moduleSelections(unitId, module, selections) {
    const values = {};

    for (const [key, definition] of Object.entries(CATALOG)) {
      if (
        definition.module !== module ||
        selections[key] == null
      ) {
        continue;
      }

      if (!isOptionAvailable(unitId, key, selections[key])) {
        throw new Error(
          'Esta opção não está disponível para a planta desta unidade.'
        );
      }

      values[group(key).id] =
        option(key, selections[key]).id;
    }

    return values;
  }

  function windowOpen(unitId, module) {
    const window = rows.windows.find(row =>
      row.unit_id === unitId &&
      row.module_code === module
    );

    const now = Date.now();

    return Boolean(
      window?.status === 'active' &&
      now >= Date.parse(window.opens_at) &&
      now < Date.parse(window.closes_at)
    );
  }

  function canEdit(unitId, module) {
    if (
      unitDeadlineClosed(unitId) ||
      !windowOpen(unitId, module) ||
      !planId(unitId)
    ) {
      return false;
    }

    const proposal = adapter.proposals[unitId];

    // Administrador pode realizar intervenções administrativas.
    if (staffRole === 'admin') {
      return true;
    }

    // Após o quarto envio, a proposta fica congelada
    // inclusive para a arquiteta até o parecer.
    if (staffRole === 'architect') {
      return !(
        proposal?.proposalStatus === 'open' &&
        proposal.latest_revision >= 4
      );
    }

    // Cliente ainda não enviou nenhuma proposta.
    if (!proposal) {
      return true;
    }

    // Um ciclo já avaliado só volta a ser editável quando
    // o cliente escolhe iniciar uma nova proposta.
    if (proposal.proposalStatus === 'reviewed') {
      return adapter.editAfterSubmit.has(unitId);
    }

    // Limite absoluto de quatro envios por ciclo.
    if (proposal.latest_revision >= 4) {
      return false;
    }

    return adapter.editAfterSubmit.has(unitId);
  }

  function unitDeadlineClosed(unitId) {
    const closesAt = rows.units.find(unit => unit.id === unitId)?.customization_closes_at;
    return Boolean(closesAt && Date.now() >= Date.parse(closesAt));
  }

  function proposalInfo(unitId) {
    // Uma unidade pode possuir vários ciclos.
    // A interface sempre trabalha com o ciclo mais recente.
    const proposal = rows.proposals
      .filter(row => row.unit_id === unitId)
      .sort(
        (a, b) =>
          b.cycle_number - a.cycle_number
      )[0];

    if (!proposal) {
      return null;
    }

    const review = rows.reviews.find(row =>
      row.proposal_id === proposal.id &&
      row.revision === proposal.latest_revision
    );

    return {
      ...proposal,

      // Preservamos o status original do banco separadamente
      // do texto amigável exibido na interface.
      proposalStatus: proposal.status,

      review,

      canResubmit:
        proposal.status === 'open' &&
        proposal.latest_revision < 4,

      status: review
        ? review.decision === 'approved'
          ? 'Viabilidade técnica confirmada'
          : 'Alterações solicitadas'
        : proposal.latest_revision >= 4
          ? 'Limite de envios atingido · aguardando análise da arquiteta'
          : 'Aguardando análise da arquiteta'
    };
  }

  function activeHelp(unitId) {
    return rows.requests.find(row =>
      row.unit_id === unitId &&
      ['requested', 'in_progress'].includes(row.status)
    ) || null;
  }

  function customerId(unitId) {
    return rows.links.find(
      row => row.unit_id === unitId
    )?.customer_id;
  }

  function explain(error) {
    const messages = {
      'Unit customization deadline reached': 'O prazo final desta unidade encerrou. Suas escolhas continuam disponíveis para consulta.',
      'Proposal has unsent changes': 'Existem alterações salvas que o cliente ainda não reenviou. Aguarde o reenvio antes de registrar o parecer.',
      'No proposal changes to submit': 'Não há alterações salvas para reenviar nesta proposta.',
      'Proposal edit limit reached': 'O limite de quatro envios foi atingido. Aguarde o parecer da arquiteta.'
    };
    if (messages[error?.message]) return new Error(messages[error.message]);
    if (error?.code === '40001') {
      return new Error(
        'Esta unidade mudou em outra sessão. Reabra a página antes de salvar.'
      );
    }

    if (error?.code === '42501') {
      return new Error(
        'Esta alteração não está permitida. Confira o prazo e sua autorização.'
      );
    }

    if (error?.code === '22023') {
      return new Error(
        'Complete as opções necessárias e confira a disponibilidade para esta planta.'
      );
    }

    return error;
  }

  async function onSave(unitId, selections) {
    try {
      if (unitDeadlineClosed(unitId)) throw { message: 'Unit customization deadline reached' };
      for (const module of ['planta', 'bancadas']) {
        const next = moduleSelections(
          unitId,
          module,
          selections
        );

        const previous = currentSelections(
          unitId,
          module
        );

        if (same(next, previous)) {
          continue;
        }

        if (!canEdit(unitId, module)) {
          throw new Error(
            `O módulo ${module} está fechado para edição.`
          );
        }

        const revision =
          rows.states.find(row =>
            row.unit_id === unitId &&
            row.module_code === module
          )?.revision || 0;

        check(await client.rpc(
          'save_unit_module_choices',
          {
            p_customer_id:
              staffRole ? null : customerId(unitId),

            p_unit_id: unitId,
            p_module_code: module,
            p_selections: next,
            p_expected_revision: revision
          }
        ));

        await refresh();
      }

      return rows.states
        .filter(row => row.unit_id === unitId)
        .map(row => row.updated_at)
        .sort()
        .at(-1) || new Date().toISOString();

    } catch (error) {
      await refresh();
      throw explain(error);
    }
  }

  async function onSubmit(unitId) {
    if (staffRole) {
      throw new Error(
        'O envio da proposta pertence ao cliente.'
      );
    }

    try {
      if (unitDeadlineClosed(unitId)) throw { message: 'Unit customization deadline reached' };
      const revisions = Object.fromEntries(
        rows.states
          .filter(row => row.unit_id === unitId)
          .map(row => [
            row.module_code,
            row.revision
          ])
      );

      check(await client.rpc(
        'submit_unit_proposal',
        {
          p_customer_id: customerId(unitId),
          p_unit_id: unitId,
          p_expected_module_revisions: revisions
        }
      ));

      // Depois de cada envio a edição volta a ser fechada.
      // Para alterar novamente, o cliente precisa clicar
      // explicitamente em "Alterar proposta".
      adapter.editAfterSubmit.delete(unitId);

      await refresh();

    } catch (error) {
      throw explain(error);
    }
  }

  function onEditProposal(unitId) {
    if (unitDeadlineClosed(unitId)) throw explain({ message: 'Unit customization deadline reached' });
    const proposal = adapter.proposals[unitId];

    if (
      proposal?.proposalStatus === 'open' &&
      proposal.latest_revision >= 4
    ) {
      throw new Error(
        'O limite de 4 envios foi atingido. Aguarde o parecer da arquiteta.'
      );
    }

    adapter.editAfterSubmit.add(unitId);
  }

  async function loadArchitects(unitId) {
    adapter.architects[unitId] = check(
      await client.rpc(
        'list_unit_architects',
        {
          p_unit_id: unitId
        }
      )
    );

    return adapter.architects[unitId];
  }

  async function onRequestHelp(
    unitId,
    architectId
  ) {
    try {
      const architect =
        (adapter.architects[unitId] || [])
          .find(row =>
            row.user_id === architectId
          );

      if (!architect) {
        throw new Error(
          'Escolha uma arquiteta.'
        );
      }

      if (!architect.authorized) {
        check(await client.rpc(
          'set_architect_authorization',
          {
            p_customer_id: customerId(unitId),
            p_unit_id: unitId,
            p_architect_user_id: architectId,
            p_active: true
          }
        ));
      }

      check(await client.rpc(
        'request_architect_assistance',
        {
          p_customer_id: customerId(unitId),
          p_unit_id: unitId,
          p_architect_user_id: architectId
        }
      ));

      await refresh();
      await loadArchitects(unitId);

    } catch (error) {
      throw explain(error);
    }
  }

  async function onCancelHelp(unitId) {
    check(await client.rpc(
      'cancel_architect_assistance',
      {
        p_request_id: activeHelp(unitId)?.id
      }
    ));

    await refresh();
  }

  async function onRevokeArchitect(
    unitId,
    architectId
  ) {
    check(await client.rpc(
      'set_architect_authorization',
      {
        p_customer_id: customerId(unitId),
        p_unit_id: unitId,
        p_architect_user_id: architectId,
        p_active: false
      }
    ));

    await refresh();
    await loadArchitects(unitId);
  }

  async function onAcceptHelp(unitId) {
    check(await client.rpc(
      'accept_architect_assistance',
      {
        p_request_id: activeHelp(unitId)?.id
      }
    ));

    await refresh();
  }

  async function onResolveHelp(unitId) {
    check(await client.rpc(
      'resolve_architect_assistance',
      {
        p_request_id: activeHelp(unitId)?.id
      }
    ));

    await refresh();
  }

  async function onReview(
    unitId,
    decision,
    note
  ) {
    try {
      check(await client.rpc(
        'review_unit_proposal',
        {
          p_unit_id: unitId,
          p_expected_revision: proposalInfo(unitId)?.latest_revision,
          p_decision: decision,
          p_note: note || null
        }
      ));
      await refresh();
    } catch (error) { throw explain(error); }
  }

  return refresh();
}
