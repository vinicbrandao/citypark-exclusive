const DATA = {
  apartments: [],
  plant: {
    social: [
      { id: 'social-original', title: 'Padrão', subtitle: 'Mantém a planta original, sem fechamento Euroglass.', price: 0, tags: ['Padrão'] },
      { id: 'social-standard', title: 'Padrão + Euroglass', subtitle: 'Mantém a configuração principal com fechamento Euroglass.', price: 0, tags: ['Euroglass'] },
      { id: 'social-veranda', title: 'Sala e varanda integradas + Euroglass', subtitle: 'Integra sala e varanda, remove a porta da cozinha para a varanda e fecha esse vão com alvenaria.', price: 18800, tags: ['Euroglass', 'Integração'] },
      { id: 'social-full', title: 'Sala, varanda e cozinha integradas com ilha + Euroglass', subtitle: 'Integra os três ambientes, remove a bancada da varanda e adiciona ilha. A ilha ainda não está representada na perspectiva recebida.', price: 26750, tags: ['Euroglass', 'Ilha'] }
    ],
    suite: [
      { id: 'suite-standard', title: 'Suíte padrão', subtitle: 'Mantém a configuração original da suíte Master.', price: 0, tags: ['Padrão'] },
      { id: 'suite-closet', title: 'Suíte Master ampliada + closet', subtitle: 'Amplia a suíte e cria área de closet.', price: 22400, tags: ['Drywall'] },
      { id: 'suite-office', title: 'Suíte Master ampliada + gabinete/quarto', subtitle: 'Reconfigura a área da suíte para criar ambiente adicional.', price: 24800, tags: ['Drywall'] }
    ]
  },
  materials: {
    // QUANTIDADES FICTÍCIAS PARA TESTE. Substituir pelos quantitativos do Revit.
    // A bancada e o rodamão são calculados como áreas de granito em m².
    counter: [
      { id: 'counter-standard', title: 'Bancada padrão', subtitle: 'Comprimento previsto no apartamento.', topArea: 1.20, rodamaoLength: 2.40, thumb: 'assets/cozinha/bancada-padrao-sao-marco.png' },
      { id: 'counter-extended', title: 'Bancada estendida', subtitle: 'Amplia a bancada e o comprimento do rodamão acompanha automaticamente.', topArea: 1.90, rodamaoLength: 3.80, thumb: 'assets/cozinha/bancada-estendida-sao-marco.png' }
    ],
    stone: [
      { id: 'sao-marco', title: 'São Marco', subtitle: 'Granito padrão do apartamento.', unitPrice: 900, thumb: 'assets/cozinha/bancada-padrao-sao-marco.png', badge: 'Padrão' },
      { id: 'bellagio', title: 'Bellagio', subtitle: 'Opção de upgrade da bancada.', unitPrice: 1450, thumb: 'assets/cozinha/bancada-padrao-bellagio.png', badge: 'Upgrade' }
    ],
    rodamao: [
      { id: 'padrao', title: 'Altura padrão', subtitle: 'Mantém a altura prevista no memorial.', height: 0.10, thumb: 'assets/cozinha/bancada-padrao-sao-marco.png' },
      { id: '60', title: 'Rodamão 60 cm', subtitle: 'Aumenta a altura do rodamão mantendo o comprimento da bancada.', height: 0.60, thumb: 'assets/cozinha/bancada-padrao-sao-marco-rodamao-60.png' }
    ],
    service: [
      { id: 'service-no', title: 'Configuração padrão', subtitle: 'Sem bancada adicional de serviço; mantém o tanque padrão.', topArea: 0, rodamaoLength: 0, thumb: 'assets/cozinha/tanque-inox-padrao.png' },
      { id: 'service-yes', title: 'Adicionar bancada de serviço', subtitle: 'Adiciona a bancada da área de serviço.', topArea: 0.55, rodamaoLength: 1.10, thumb: 'assets/cozinha/bancada-servico-sao-marco.png' }
    ]
  }
};

const DEFAULT_STATE = {
  apartmentId: null,
  sidebarCollapsed: false,
  module: 'plant',
  plantGroup: 'social',
  materialGroup: 'counter',
  environment: 'cozinha',
  socialPlant: null,
  suitePlant: null,
  counter: 'counter-standard',
  stone: 'sao-marco',
  rodamao: 'padrao',
  service: 'service-no',
  accordions: { plant: true, floor: false, counters: true, fixtures: false, metals: false, extras: false },
  savedAt: null
};

const state = { ...DEFAULT_STATE, accordions: { ...DEFAULT_STATE.accordions } };
const app = document.querySelector('#app');
const drafts = new Map();
let lastSavedUnitId = null;
let backend = null;
let mountVersion = 0;
const savingUnits = new Set();
let deadlineRefresh = null;
let layoutObserver = null;

export function clearConfigurator() {
  layoutObserver?.disconnect();
  layoutObserver = null;
  if (deadlineRefresh != null) clearTimeout(deadlineRefresh);
  deadlineRefresh = null;
  ++mountVersion;
  backend = null;
  DATA.apartments = [];
  drafts.clear();
  savingUnits.clear();
  lastSavedUnitId = null;
  reviewOpen = false;
  helpOpen = false;
  helpArchitectId = null;
  Object.assign(state, DEFAULT_STATE, { accordions: { ...DEFAULT_STATE.accordions } });
  app.innerHTML = '';
}

export function mountConfigurator(options) {
  clearConfigurator();
  backend = options;
  DATA.apartments = options.units;
  for (const row of options.savedDrafts) {
    if (DATA.apartments.some(unit => unit.id === row.unit_id)) {
      drafts.set(row.unit_id, normalizeDraft({ ...row.selections, savedAt: row.updated_at }));
    }
  }
  lastSavedUnitId = [...drafts.entries()].sort((a, b) => (b[1].savedAt || '').localeCompare(a[1].savedAt || ''))[0]?.[0] || null;
  render();
}

// Only catalog selections belong to a draft; navigation is reset when opening a unit.
function normalizeDraft(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const catalogs = {
    socialPlant: DATA.plant.social, suitePlant: DATA.plant.suite,
    counter: DATA.materials.counter, stone: DATA.materials.stone,
    rodamao: DATA.materials.rodamao, service: DATA.materials.service
  };
  const draft = {};
  for (const [key, options] of Object.entries(catalogs)) {
    draft[key] = options.some(option => option.id === source[key]) ? source[key] : DEFAULT_STATE[key];
  }
  draft.savedAt = typeof source.savedAt === 'string' && Number.isFinite(Date.parse(source.savedAt))
    ? new Date(source.savedAt).toISOString() : null;
  return draft;
}

function rememberCurrentDraft() {
  if (DATA.apartments.some(apt => apt.id === state.apartmentId)) {
    drafts.set(state.apartmentId, normalizeDraft(state));
  }
}

function selectApartment(apartmentId) {
  if (!DATA.apartments.some(apt => apt.id === apartmentId)) return;
  rememberCurrentDraft();
  Object.assign(state, DEFAULT_STATE, drafts.get(apartmentId) || normalizeDraft(), {
    apartmentId, accordions: { ...DEFAULT_STATE.accordions }
  });
  reviewOpen = false;
  helpOpen = false;
  render();
}

function showApartments() {
  rememberCurrentDraft();
  backend?.editAfterSubmit?.clear();
  Object.assign(state, DEFAULT_STATE, { accordions: { ...DEFAULT_STATE.accordions } });
  reviewOpen = false;
  helpOpen = false;
  render();
}

function currentApartment() {
  return DATA.apartments.find(a => a.id === state.apartmentId) || DATA.apartments[0];
}
function unitDeadlineClosed(apt = currentApartment()) {
  return Boolean(apt?.customizationClosesAt && Date.now() >= Date.parse(apt.customizationClosesAt));
}
function scheduleDeadlineRefresh() {
  if (deadlineRefresh != null) clearTimeout(deadlineRefresh);
  deadlineRefresh = null;
  const units = state.apartmentId ? [currentApartment()] : DATA.apartments;
  const remaining = units.map(apt => Date.parse(apt?.customizationClosesAt) - Date.now())
    .filter(delay => Number.isFinite(delay) && delay > 0);
  if (remaining.length) deadlineRefresh = setTimeout(() => {
    deadlineRefresh = null;
    if (backend) render();
  }, Math.min(Math.min(...remaining) + 20, 2147483647));
}
function find(list, id) { return list.find(x => x.id === id); }
function brl(v) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0); }
function num(v, digits = 2) { return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v || 0); }
function choicePrice(list, id) { return find(list, id)?.price || 0; }

function granitePricing() {
  const counter = find(DATA.materials.counter, state.counter) || DATA.materials.counter[0];
  const service = find(DATA.materials.service, state.service) || DATA.materials.service[0];
  const rodamao = find(DATA.materials.rodamao, state.rodamao) || DATA.materials.rodamao[0];
  const stone = find(DATA.materials.stone, state.stone) || DATA.materials.stone[0];

  const baseCounter = DATA.materials.counter[0];
  const baseService = DATA.materials.service[0];
  const baseRodamao = DATA.materials.rodamao[0];
  const baseStone = DATA.materials.stone[0];

  const countertopArea = counter.topArea + service.topArea;
  const rodamaoLength = counter.rodamaoLength + service.rodamaoLength;
  const rodamaoArea = rodamaoLength * rodamao.height;
  const totalArea = countertopArea + rodamaoArea;

  const baseCountertopArea = baseCounter.topArea + baseService.topArea;
  const baseRodamaoArea = (baseCounter.rodamaoLength + baseService.rodamaoLength) * baseRodamao.height;
  const baseTotalArea = baseCountertopArea + baseRodamaoArea;

  const selectedCost = totalArea * stone.unitPrice;
  const baseCost = baseTotalArea * baseStone.unitPrice;
  const additionalCost = Math.max(0, selectedCost - baseCost);

  return {
    countertopArea,
    rodamaoLength,
    rodamaoArea,
    totalArea,
    unitPrice: stone.unitPrice,
    baseTotalArea,
    baseUnitPrice: baseStone.unitPrice,
    selectedCost,
    baseCost,
    additionalCost,
    extraArea: Math.max(0, totalArea - baseTotalArea)
  };
}

function totalPrice() {
  return choicePrice(DATA.plant.social, state.socialPlant)
    + choicePrice(DATA.plant.suite, state.suitePlant)
    + granitePricing().additionalCost;
}
function plantComplete() { return Boolean(state.socialPlant && state.suitePlant); }
function choiceEnabled(key, value) {
  if (!backend?.canEdit) return true;
  const module = ['socialPlant', 'suitePlant'].includes(key) ? 'planta' : 'bancadas';
  return backend.canEdit(state.apartmentId, module) &&
    (!backend.isOptionAvailable || backend.isOptionAvailable(state.apartmentId, key, value));
}
function materialLabel(list, id, fallback = '—') { return find(list, id)?.title || fallback; }
function materialCardMeta(item, key) {
  if (key === 'counter') return `${num(item.topArea)} m² de bancada · ${num(item.rodamaoLength)} m de comprimento de rodamão`;
  if (key === 'stone') return `${brl(item.unitPrice)} / m²`;
  if (key === 'rodamao') return `${num(item.height * 100, 0)} cm de altura`;
  if (key === 'service') return item.topArea ? `${num(item.topArea)} m² de bancada · ${num(item.rodamaoLength)} m de rodamão` : 'Configuração incluída no padrão';
  return '';
}

async function saveProgress() {
  const apartmentId = state.apartmentId;
  if (!backend || !DATA.apartments.some(apt => apt.id === apartmentId) || savingUnits.has(apartmentId)) return false;
  const requestVersion = mountVersion;
  const { savedAt: previousSave, ...selections } = normalizeDraft(state);
  savingUnits.add(apartmentId);
  try {
    const savedAt = await backend.onSave(apartmentId, selections);
    if (requestVersion !== mountVersion) return;
    // Preserve any edits made while the save was in flight.
    if (state.apartmentId === apartmentId) {
      state.savedAt = savedAt;
      rememberCurrentDraft();
    } else {
      drafts.set(apartmentId, { ...(drafts.get(apartmentId) || selections), savedAt });
    }
    lastSavedUnitId = apartmentId;
    showToast('Progresso salvo na sua unidade.');
    if (state.apartmentId === apartmentId) render();
    return true;
  } catch (error) {
    if (requestVersion === mountVersion) showToast(error.message || 'Não foi possível salvar. Tente novamente.');
    return false;
  } finally {
    if (requestVersion === mountVersion) savingUnits.delete(apartmentId);
  }
}
function showToast(text) {
  const old = document.querySelector('.toast'); if (old) old.remove();
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  document.body.appendChild(el); setTimeout(() => el.remove(), 2200);
}

function headerHtml() {
  const apt = currentApartment();
  return `<header class="app-header${state.apartmentId ? ' configurator-header' : ''}">
    <button class="wordmark" data-action="home" aria-label="Início">
      <span class="wordmark-mark">CP</span>
      <span><b>City Park</b><small>Exclusive</small></span>
    </button>
    ${state.apartmentId ? `<div class="header-unit"><span>${apt.label}</span><small>${apt.floor} · prazo de planta: ${apt.plantDeadline}</small></div>` : '<div></div>'}
    <div class="header-actions">
      ${backend?.staffRole && state.apartmentId ? `<span class="header-btn">${backend.staffRole === 'admin' ? 'Administrador' : 'Arquiteta'} · atendimento</span>` : ''}
      ${state.apartmentId ? `<button class="header-btn" data-action="save" ${unitDeadlineClosed() ? 'disabled title="Prazo final encerrado"' : ''}>Salvar progresso</button><button class="header-btn strong" data-action="change-unit">Trocar unidade</button>` : ''}
      ${state.apartmentId ? '<button class="header-btn compact-review" data-action="compact-review">Resumo</button>' : ''}
      <button class="header-btn" data-action="logout">${!state.apartmentId ? 'Voltar ao login' : 'Sair'}</button>
    </div>
  </header>`;
}

function leftNavHtml() {
  const items = [
    ['plant', 'PLANTA', 'planta'], ['floor', 'PISO', 'piso'], ['counters', 'BANCADAS', 'bancadas'], ['fixtures', 'LOUÇAS', 'loucas'], ['metals', 'METAIS', 'metais'], ['extras', 'EXTRAS', null]
  ];
  return `<aside class="left-nav">
    <div class="left-nav-heading">
      <div class="left-nav-title">Personalize seu<br>apartamento</div>
      <button class="sidebar-toggle" data-action="toggle-sidebar" aria-controls="customizer-navigation" aria-expanded="${!state.sidebarCollapsed}" aria-label="${state.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}" title="${state.sidebarCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 4v16M${state.sidebarCollapsed ? '12 9l3 3-3 3' : '16 9l-3 3 3 3'}"/></svg>
      </button>
    </div>
    <nav id="customizer-navigation" aria-label="Módulos de personalização">${items.map(([id, label, icon]) => {
      const active = (state.module === 'plant' && id === 'plant') || (state.module === 'materials' && id === 'counters');
      const available = id === 'plant' || id === 'counters';
      const iconHtml = icon
        ? `<img class="nav-icon" src="assets/icons/sidebar/icone-${icon}-branco.png" alt="" aria-hidden="true">`
        : '<span aria-hidden="true">+</span>';
      return `<button class="nav-item ${active ? 'active' : ''} ${available ? '' : 'disabled'}" data-nav="${id}" aria-label="${label}" ${active ? 'aria-current="page"' : ''} title="${label}${available ? '' : ' · Catálogo ainda não liberado'}">${iconHtml}<b>${label}</b>${available ? '' : '<em>em breve</em>'}</button>`;
    }).join('')}</nav>
    <button class="left-help" data-action="help" aria-label="Precisa de ajuda? Fale com a equipe do Exclusive." title="Fale com a equipe do Exclusive"><span aria-hidden="true">?</span><div><b>PRECISA DE AJUDA?</b><small>Fale com a equipe do Exclusive.</small></div></button>
  </aside>`;
}

function accordionRow(title, id, content) {
  const open = state.accordions[id];
  return `<section class="summary-accordion ${open ? 'open' : ''}">
    <button class="accordion-head" data-accordion="${id}"><b>${title}</b><span>${open ? '−' : '+'}</span></button>
    ${open ? `<div class="accordion-body">${content}</div>` : ''}
  </section>`;
}

function summaryPanelHtml() {
  const apt = currentApartment();
  const pricing = granitePricing();
  const counter = find(DATA.materials.counter, state.counter);
  const stone = find(DATA.materials.stone, state.stone);
  const service = find(DATA.materials.service, state.service);

  const plantContent = `<div class="summary-line"><span>Área social</span><b>${materialLabel(DATA.plant.social, state.socialPlant)}</b></div>
    <div class="summary-line"><span>Suíte Master</span><b>${materialLabel(DATA.plant.suite, state.suitePlant)}</b></div>`;

  const counterContent = `<div class="summary-line"><span>Bancada</span><b>${materialLabel(DATA.materials.counter, state.counter)}</b><em>${num(counter.topArea)} m²</em></div>
    <div class="summary-line"><span>Granito</span><b>${materialLabel(DATA.materials.stone, state.stone)}</b><em>${brl(stone.unitPrice)}/m²</em></div>
    <div class="summary-line"><span>Rodamão</span><b>${materialLabel(DATA.materials.rodamao, state.rodamao)}</b><em>${num(pricing.rodamaoArea)} m²</em></div>
    <div class="summary-line"><span>Serviço</span><b>${materialLabel(DATA.materials.service, state.service)}</b><em>${service.topArea ? num(service.topArea) + ' m²' : 'Padrão'}</em></div>
    <div class="quantity-summary">
      <div><span>Área total de granito</span><b>${num(pricing.totalArea)} m²</b></div>
      <div><span>Referência padrão</span><b>${num(pricing.baseTotalArea)} m² × ${brl(pricing.baseUnitPrice)}/m²</b></div>
      <div class="subtotal"><span>Acréscimo bancadas</span><b>+ ${brl(pricing.additionalCost)}</b></div>
    </div>`;

  return `<aside class="right-panel">
    <div class="summary-top">
      <span class="summary-kicker">RESUMO DA PERSONALIZAÇÃO</span>
      <h3>${apt.label}</h3><p>${apt.tower} · ${apt.floor}</p>
    </div>
    <div class="summary-scroll">
      ${accordionRow('PLANTA', 'plant', plantContent)}
      ${accordionRow('PISO', 'floor', '<div class="empty-category">Nenhuma escolha disponível ainda.</div>')}
      ${accordionRow('BANCADAS', 'counters', counterContent)}
      ${accordionRow('LOUÇAS', 'fixtures', '<div class="empty-category">Catálogo em preparação.</div>')}
      ${accordionRow('METAIS', 'metals', '<div class="empty-category">Catálogo em preparação.</div>')}
      ${accordionRow('EXTRAS', 'extras', '<div class="empty-category">Catálogo em preparação.</div>')}
    </div>
    <div class="summary-total">
      <span>VALOR ADICIONAL</span>
      <strong>${brl(totalPrice())}</strong>
      <small>Quantidades e preços unitários ainda fictícios. Substituir pelos dados do Revit/orçamento.</small>
      <button data-action="review">REVISAR ESCOLHAS</button>
    </div>
  </aside>`;
}

function plantPreviewHtml() {
  if (state.plantGroup === 'suite') {
    return `<div class="plan-preview environment-preview">
      <div class="environment-preview-empty"><h3>Perspectiva da Suíte Master em preparação</h3><p>As imagens deste ambiente ainda não foram recebidas.</p></div>
    </div>`;
  }
  const selected = state.socialPlant;
  const euroglass = ['social-standard', 'social-veranda', 'social-full'].includes(selected);
  const wallLayer = !selected || ['social-original', 'social-standard'].includes(selected) ? 'opcao-02.png' : selected === 'social-full' ? 'opcao-03.png' : null;
  return `<div class="plan-preview environment-preview">
    <div class="social-perspective" role="img" aria-label="Perspectiva de referência da área social${euroglass ? ' com Euroglass' : ''}">
      <img src="assets/planta/social/base-sala.png" alt="" class="social-perspective-base">
      ${wallLayer ? `<img src="assets/planta/social/${wallLayer}" alt="" class="social-perspective-layer">` : ''}
      ${euroglass ? '<img src="assets/planta/social/euroglass.png" alt="" class="social-perspective-layer">' : ''}
    </div>
  </div>`;
}

function plantCatalogHtml() {
  const list = state.plantGroup === 'social' ? DATA.plant.social : DATA.plant.suite;
  const key = state.plantGroup === 'social' ? 'socialPlant' : 'suitePlant';
  return `<div class="catalog-shell plant-catalog">
    <div class="catalog-head">
      <div><b>${state.plantGroup === 'social' ? 'Área social' : 'Suíte Master'}</b></div>
      <div class="segmented"><button class="${state.plantGroup === 'social' ? 'active' : ''}" data-plant-group="social">Área social</button><button class="${state.plantGroup === 'suite' ? 'active' : ''}" data-plant-group="suite">Suíte Master</button></div>
    </div>
    <div class="catalog-cards plant-cards">${list.map(item => `<button class="catalog-card ${state[key] === item.id ? 'selected' : ''}" data-plant-choice="${key}" data-value="${item.id}" ${choiceEnabled(key, item.id) ? '' : 'disabled'}>
      <div class="card-check">${state[key] === item.id ? '✓' : ''}</div>
      <div class="card-copy"><b>${item.title}</b><p>${item.subtitle}</p><div class="card-tags">${item.tags.map(t => `<span>${t}</span>`).join('')}</div></div>
      <div class="card-price">${item.price ? '+' + brl(item.price) : 'Sem acréscimo'}</div>
    </button>`).join('')}</div>
  </div>`;
}

function environmentTabsHtml() {
  const tabs = [
    ['sala', 'SALA'], ['cozinha', 'COZINHA'], ['suite', 'SUÍTE MASTER'], ['quarto', 'QUARTO'], ['banheiro', 'BANHEIRO'], ['varanda', 'VARANDA'], ['servico', 'SERVIÇO']
  ];
  return `<div class="environment-tabs">${tabs.map(([id, label]) => {
    const enabled = id === 'cozinha' || id === 'servico';
    return `<button class="${state.environment === id ? 'active' : ''} ${enabled ? '' : 'disabled'}" data-environment="${id}" ${enabled ? '' : 'title="Ambiente ainda sem catálogo"'}>${label}</button>`;
  }).join('')}</div>`;
}

function kitchenLayers() {
  const layers = [];
  const main = {
    'counter-standard|sao-marco|padrao': 'assets/cozinha/bancada-padrao-sao-marco.png',
    'counter-standard|sao-marco|60': 'assets/cozinha/bancada-padrao-sao-marco-rodamao-60.png',
    'counter-standard|bellagio|padrao': 'assets/cozinha/bancada-padrao-bellagio.png',
    'counter-standard|bellagio|60': 'assets/cozinha/bancada-padrao-bellagio-rodamao-60.png',
    'counter-extended|sao-marco|padrao': 'assets/cozinha/bancada-estendida-sao-marco.png',
    'counter-extended|sao-marco|60': 'assets/cozinha/bancada-estendida-rodamao-60.png',
    'counter-extended|bellagio|padrao': 'assets/cozinha/bancada-estendida-bellagio.png',
    'counter-extended|bellagio|60': 'assets/cozinha/bancada-estendida-bellagio-rodamao-60.png'
  };
  layers.push(main[`${state.counter}|${state.stone}|${state.rodamao}`]);
  if (state.service === 'service-no') {
    layers.push('assets/cozinha/tanque-inox-padrao.png');
  } else {
    const service = {
      'sao-marco|padrao': 'assets/cozinha/bancada-servico-sao-marco.png',
      'sao-marco|60': 'assets/cozinha/bancada-servico-rodamao-60-b.png',
      'bellagio|padrao': 'assets/cozinha/bancada-servico-bellagio.png',
      'bellagio|60': 'assets/cozinha/bancada-servico-rodamao-60-a.png'
    };
    layers.push(service[`${state.stone}|${state.rodamao}`]);
  }
  return layers.filter(Boolean);
}

function materialPreviewHtml() {
  return `<div class="material-preview">
    <img class="preview-base" src="assets/cozinha/cozinha-base.jpg" alt="Prévia da cozinha">
    ${kitchenLayers().map(src => `<img class="preview-layer" src="${src}" alt="Camada selecionada">`).join('')}
    <div class="preview-tools"><button title="Visualização fixa">□</button><button title="Ampliar">＋</button></div>
    <div class="preview-status"><span>${materialLabel(DATA.materials.counter, state.counter)}</span><span>${materialLabel(DATA.materials.stone, state.stone)}</span><span>${materialLabel(DATA.materials.rodamao, state.rodamao)}</span></div>
  </div>`;
}

function materialGroupData() {
  if (state.materialGroup === 'counter') return { title: 'Comprimento da bancada', subtitle: 'A geometria muda imediatamente na prévia.', key: 'counter', list: DATA.materials.counter };
  if (state.materialGroup === 'stone') return { title: 'Granito da bancada', subtitle: 'São Marco é o padrão; Bellagio é a opção de upgrade.', key: 'stone', list: DATA.materials.stone };
  if (state.materialGroup === 'rodamao') return { title: 'Altura do rodamão', subtitle: 'O comprimento acompanha a bancada; a altura é uma variável separada.', key: 'rodamao', list: DATA.materials.rodamao };
  return { title: 'Área de serviço', subtitle: 'A configuração padrão mantém o tanque; a opção adicional inclui bancada de serviço.', key: 'service', list: DATA.materials.service };
}

// Native coordinates enclosing each complete item, including a transparent margin.
// The full original canvases remain in use for the apartment composition.
const MATERIAL_THUMBNAILS = {
  'bancada-padrao-sao-marco.png': { width:3738, height:1770, viewBox:'1548 941 1013 301' },
  'bancada-estendida-sao-marco.png': { width:3738, height:1770, viewBox:'1547 941 1980 301' },
  'bancada-padrao-bellagio.png': { width:3738, height:1770, viewBox:'1548 941 1013 301' },
  'bancada-padrao-sao-marco-rodamao-60.png': { width:2047, height:969, viewBox:'840 391 570 297' },
  'tanque-inox-padrao.png': { width:3738, height:1770, viewBox:'271 922 386 339' },
  'bancada-servico-sao-marco.png': { width:3738, height:1770, viewBox:'188 923 1689 322' }
};

function materialThumbnailHtml(item) {
  if (!item.thumb) return '<div class="card-image text-icon">↕</div>';
  const frame = MATERIAL_THUMBNAILS[item.thumb.split('/').pop()];
  return `<div class="card-image">${frame
    ? `<svg class="material-thumbnail" viewBox="${frame.viewBox}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${safe(item.title)}"><image href="${safe(item.thumb)}" width="${frame.width}" height="${frame.height}"/></svg>`
    : `<img src="${safe(item.thumb)}" alt="${safe(item.title)}">`}</div>`;
}

function materialCatalogHtml() {
  const group = materialGroupData();
  return `<div class="catalog-shell materials-catalog">
    <div class="catalog-head">
      <div><b>${group.title}</b></div>
      <div class="segmented four"><button class="${state.materialGroup === 'counter' ? 'active' : ''}" data-material-group="counter">Configuração</button><button class="${state.materialGroup === 'stone' ? 'active' : ''}" data-material-group="stone">Granito</button><button class="${state.materialGroup === 'rodamao' ? 'active' : ''}" data-material-group="rodamao">Rodamão</button><button class="${state.materialGroup === 'service' ? 'active' : ''}" data-material-group="service">Serviço</button></div>
    </div>
    <div class="catalog-cards material-cards">${group.list.map(item => `<button class="catalog-card visual-card ${state[group.key] === item.id ? 'selected' : ''}" data-material-choice="${group.key}" data-value="${item.id}" ${choiceEnabled(group.key, item.id) ? '' : 'disabled'}>
      ${materialThumbnailHtml(item)}
      <div class="card-copy"><b>${item.title}</b><p>${item.subtitle}</p>${item.badge ? `<div class="card-tags"><span>${item.badge}</span></div>` : ''}</div>
      <div class="card-price">${materialCardMeta(item, group.key)}</div>
    </button>`).join('')}</div>
  </div>`;
}

function workspaceHtml() {
  if (state.module === 'plant') {
    return `<main class="center-workspace plant-workspace">
      <div class="workspace-top"><h2>Escolha a configuração de planta</h2><div class="deadline-pill">Prazo: <b>${currentApartment().plantDeadline}</b></div></div>
      <div class="preview-zone">${plantPreviewHtml()}</div>
      <div class="catalog-zone">${plantCatalogHtml()}</div>
    </main>`;
  }
  return `<main class="center-workspace materials-workspace">
    ${environmentTabsHtml()}
    <div class="preview-zone material-zone">${materialPreviewHtml()}</div>
    <div class="catalog-zone">${materialCatalogHtml()}</div>
  </main>`;
}

function configuratorHtml() {
  return `<div class="configurator-screen">${headerHtml()}<div class="config-shell${state.sidebarCollapsed ? ' sidebar-collapsed' : ''}">${leftNavHtml()}${workspaceHtml()}${summaryPanelHtml()}</div></div>`;
}

function unitModalHtml() {
  const displayLabel = value => String(value).replace(/^(\d+)([AB])$/, '$1 $2');
  return `<div class="unit-screen unit-selection-screen">
    ${headerHtml()}
    <main class="apartment-selection" aria-labelledby="apartment-selection-title">
      <div class="apartment-selection-heading">
        ${backend?.staffRole ? `<p class="apartment-profile">${backend.staffRole === 'admin' ? 'Administrador' : 'Arquiteta'}</p>` : ''}
        <h1 id="apartment-selection-title">${backend?.staffRole ? 'Selecione a unidade para atendimento' : 'Escolha seu apartamento'}</h1>
      </div>
      <div class="apartment-grid ${DATA.apartments.length === 1 ? 'apartment-grid--single' : ''}">
        ${DATA.apartments.map(apt => {
          const label = displayLabel(apt.label);
          const tower = apt.towerCode && !String(apt.tower).endsWith(` ${apt.towerCode}`)
            ? `${apt.tower} ${apt.towerCode}` : apt.tower;
          const area = Number(apt.areaM2);
          const metadata = [tower, apt.floor, apt.type, Number.isFinite(area) && area > 0
            ? `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(area)} m²`
            : 'Área a confirmar'];
          const closed = unitDeadlineClosed(apt);
          return `<article class="apartment-card" data-apartment-id="${safe(apt.id)}" aria-labelledby="apartment-${safe(apt.id)}">
            <div class="apartment-image">${apt.situation
              ? `<img src="${safe(apt.situation)}" alt="Planta de localização da unidade ${safe(label)}">`
              : '<div class="apartment-image-placeholder"><span aria-hidden="true">⌂</span><p>Planta em preparação</p></div>'}</div>
            <div class="apartment-card-body">
              <h2 id="apartment-${safe(apt.id)}">${safe(label)}</h2>
              <p class="apartment-details">${metadata.filter(Boolean).map(value => `<span>${safe(value)}</span>`).join('')}</p>
              <button class="apartment-access" data-unit="${safe(apt.id)}" aria-label="Acessar unidade ${safe(label)}">Acessar unidade <span aria-hidden="true">→</span></button>
              <div class="apartment-deadline ${closed ? 'apartment-deadline--closed' : ''}">
                <span>${closed ? 'Prazo encerrado · somente consulta' : 'Prazo final para alterações'}</span>
                ${apt.customizationClosesAt
                  ? `<time datetime="${safe(apt.customizationClosesAt)}">${safe(apt.customizationDeadline)}</time>`
                  : '<strong>A definir</strong>'}
              </div>
            </div>
          </article>`;
        }).join('')}
      </div>
    </main>
  </div>`;
}

function reviewHtml() {
  const pricing = granitePricing();
  const stone = find(DATA.materials.stone, state.stone);
  return `<div class="review-overlay"><div class="review-modal">
    <button class="close-review" data-action="close-review">×</button>
    <span class="review-kicker">RESUMO DA PERSONALIZAÇÃO</span><h2>${currentApartment().label}</h2>
    <div class="review-grid">
      <section><h3>Planta</h3><p><span>Área social</span><b>${materialLabel(DATA.plant.social, state.socialPlant)}</b></p><p><span>Suíte Master</span><b>${materialLabel(DATA.plant.suite, state.suitePlant)}</b></p></section>
      <section><h3>Bancadas</h3><p><span>Configuração</span><b>${materialLabel(DATA.materials.counter, state.counter)}</b></p><p><span>Granito</span><b>${materialLabel(DATA.materials.stone, state.stone)} · ${brl(stone.unitPrice)}/m²</b></p><p><span>Rodamão</span><b>${materialLabel(DATA.materials.rodamao, state.rodamao)}</b></p><p><span>Serviço</span><b>${materialLabel(DATA.materials.service, state.service)}</b></p><p><span>Área total de granito</span><b>${num(pricing.totalArea)} m²</b></p><p><span>Acréscimo de bancadas</span><b>${brl(pricing.additionalCost)}</b></p></section>
    </div>
    <div class="review-total"><span>Valor adicional</span><strong>${brl(totalPrice())}</strong></div>
    ${proposalWorkflowHtml()}
    <button class="review-primary" data-action="close-review">Voltar ao configurador</button>
  </div></div>`;
}

let reviewOpen = false;
let helpOpen = false;
let helpArchitectId = null;
let workflowBusy = false;
const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function proposalWorkflowHtml() {
  if (!backend?.onSubmit) return '';
  const proposal =
    backend.proposals?.[state.apartmentId];
  const editing =
    backend.editAfterSubmit.has(
      state.apartmentId
    );
  const reviewed =
    proposal?.proposalStatus === 'reviewed';
  const limitReached =
    proposal?.proposalStatus === 'open' &&
    proposal.latest_revision >= 4;
  const finalDeadlineClosed = unitDeadlineClosed();
  let customerAction = '';
  if (!backend.staffRole && !finalDeadlineClosed) {
    if (!proposal) {
      customerAction =
        '<button data-action="submit-proposal">Enviar proposta à arquiteta</button>';
    } else if (reviewed) {
      customerAction = editing
        ? '<button data-action="submit-proposal">Enviar nova proposta · envio 1 de 4</button>'
        : '<button data-action="edit-proposal">Iniciar nova proposta</button>';
    } else if (!limitReached) {
      customerAction = editing
        ? `<button data-action="submit-proposal">Reenviar proposta · envio ${proposal.latest_revision + 1} de 4</button>`
        : '<button data-action="edit-proposal">Alterar proposta</button>';
    }
  }

  return `
    <section class="exclusive-workflow">
      <h3>Proposta de alteração</h3>
      ${finalDeadlineClosed ? '<p>O prazo final desta unidade encerrou. As escolhas estão disponíveis para consulta.</p>' : ''}
      ${
        proposal
          ? `
            <p>
              Proposta ${proposal.cycle_number}
              · Envio ${proposal.latest_revision} de 4
              · ${safe(proposal.status)}.
            </p>

            ${
              proposal.review?.note
                ? `<p>Parecer: ${safe(proposal.review.note)}</p>`
                : ''
            }
          `
          : `
            <p>
              Depois de conferir as escolhas,
              envie a proposta para análise da arquiteta.
            </p>
          `
      }

      ${
        limitReached
          ? `
            <p>
              Os quatro envios deste ciclo foram utilizados.
              Aguarde o parecer da arquiteta.
            </p>
          `
          : ''
      }

      ${customerAction}
      ${
        backend.staffRole === 'architect' &&
        proposal &&
        proposal.proposalStatus === 'open' &&
        !proposal.review
          ? `
            <label for="technical-note">
              Observação para o cliente
            </label>

            <textarea
              id="technical-note"
              rows="3"
            ></textarea>

            <div class="exclusive-workflow-actions">

              <button data-action="review-approved">
                Confirmar viabilidade
              </button>

              <button data-action="review-changes">
                Solicitar alteração
              </button>

            </div>

            <small>
              O parecer técnico não é a aprovação final.
            </small>
          `
          : ''
      }
      <p>
        <button data-action="help">
          ${
            backend.staffRole
              ? 'Ver atendimento'
              : 'Pedir ajuda à arquiteta'
          }
        </button>
      </p>
    </section>
  `;
}

function helpHtml() {
  const unitId = state.apartmentId;
  const active = backend?.help?.[unitId];
  const architects = backend?.architects?.[unitId] || [];
  const authorized = architects.find(item => item.user_id === (active?.architect_user_id || helpArchitectId))?.authorized;
  return `<div class="review-overlay"><div class="review-modal exclusive-help-modal">
    <button class="close-review" data-action="close-help">×</button>
    <span class="review-kicker">ATENDIMENTO</span><h2>Ajuda da arquiteta</h2>
    ${active ? `<p>Pedido ${active.status === 'requested' ? 'enviado; aguardando aceite' : 'em atendimento'}.</p>
      ${backend.staffRole === 'architect' ? `<button class="review-primary" data-action="${active.status === 'requested' ? 'accept-help' : 'resolve-help'}">${active.status === 'requested' ? 'Aceitar pedido' : 'Concluir atendimento'}</button>`
        : '<button class="review-primary" data-action="cancel-help">Cancelar pedido</button>'}`
      : backend.staffRole ? '<p>Nenhum pedido de ajuda aberto nesta unidade.</p>'
        : architects.length ? `<p>Escolha a arquiteta designada para esta unidade.</p><label for="help-architect">Arquiteta</label>
          <select id="help-architect">${architects.map(item => `<option value="${item.user_id}" ${item.user_id === helpArchitectId ? 'selected' : ''}>${safe(item.name)}${item.authorized ? ' · autorizada' : ''}</option>`).join('')}</select>
          <button class="review-primary" data-action="request-help">Pedir ajuda</button>`
        : '<p>Não há arquiteta designada para esta unidade no momento.</p>'}
    ${!backend.staffRole && authorized ? '<button class="review-primary" data-action="revoke-architect">Revogar autorização da arquiteta</button>' : ''}
    <small>O pedido não envia aviso externo. A arquiteta o verá ao acessar esta unidade. Cancelar o pedido não revoga a autorização de acesso.</small>
    <button class="review-primary" data-action="close-help">Voltar ao configurador</button>
  </div></div>`;
}

async function runWorkflow(operation, success) {
  if (workflowBusy) return;
  workflowBusy = true;
  try { await operation(); showToast(success); render(); }
  catch (error) { showToast(error.message || 'Não foi possível concluir. Tente novamente.'); }
  finally { workflowBusy = false; }
}
function fitCatalogCards() {
  document.querySelectorAll('.plant-cards .catalog-card, .material-cards .catalog-card').forEach(card => {
    const copy = card.querySelector('.card-copy');
    const fits = () => copy.scrollHeight <= copy.clientHeight;
    card.style.removeProperty('width');
    let lower = Math.ceil(card.getBoundingClientRect().width);
    let upper = lower;
    card.style.width = `${upper}px`;
    if (fits()) return;
    // Keep the card height fixed; grow only its width until all copy fits.
    do {
      lower = upper;
      upper *= 2;
      card.style.width = `${upper}px`;
    } while (!fits() && upper < 14080);
    while (upper - lower > 2) {
      const middle = Math.ceil((upper + lower) / 2);
      card.style.width = `${middle}px`;
      if (fits()) upper = middle;
      else lower = middle;
    }
    card.style.width = `${upper + 2}px`;
  });
}

function render() {
  app.innerHTML = state.apartmentId ? configuratorHtml() : unitModalHtml();
  if (reviewOpen) app.insertAdjacentHTML('beforeend', reviewHtml());
  if (helpOpen) app.insertAdjacentHTML('beforeend', helpHtml());
  fitCatalogCards();
  layoutObserver?.disconnect();
  const screen = document.querySelector('.configurator-screen');
  if (screen && typeof ResizeObserver !== 'undefined') {
    layoutObserver = new ResizeObserver(() => fitCatalogCards());
    layoutObserver.observe(screen);
  }
  if (document.fonts?.status === 'loading') {
    const viewVersion = mountVersion;
    document.fonts.ready.then(() => { if (viewVersion === mountVersion) fitCatalogCards(); });
  }
  bindEvents();
  scheduleDeadlineRefresh();
}

function bindEvents() {
  document.querySelectorAll('[data-unit]').forEach(btn => btn.addEventListener('click', () => {
    selectApartment(btn.dataset.unit);
  }));
  document.querySelectorAll('[data-action]').forEach(btn => btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'toggle-sidebar') {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      render();
      document.querySelector('[data-action="toggle-sidebar"]')?.focus({ preventScroll: true });
    }
    if (action === 'logout') backend?.onSignOut();
    if (action === 'home' || action === 'change-unit') showApartments();
    if (action === 'save') saveProgress();
    if (action === 'review' || action === 'compact-review') { reviewOpen = true; render(); }
    if (action === 'close-review') { reviewOpen = false; render(); }
    if (action === 'resume') selectApartment(lastSavedUnitId);
    if (action === 'help') {
      reviewOpen = false; helpOpen = true; render();
      backend?.loadArchitects?.(state.apartmentId).then(architects => {
        helpArchitectId = architects[0]?.user_id || null; if (helpOpen) render();
      }).catch(error => showToast(error.message || 'Não foi possível carregar as arquitetas.'));
    }
    if (action === 'close-help') { helpOpen = false; render(); }
    if (action === 'submit-proposal') runWorkflow(async () => {
      if (!await saveProgress()) throw new Error('Salve as escolhas antes de enviar.');
      await backend.onSubmit(state.apartmentId);
    }, 'Proposta enviada à arquiteta. A equipe retornará assim que possível.');
    if (action === 'edit-proposal') {
      try {
        backend.onEditProposal(state.apartmentId); reviewOpen = false; render();
        showToast('Você pode alterar os módulos ainda dentro do prazo.');
      } catch (error) { showToast(error.message || 'Não foi possível abrir a edição.'); }
    }
    if (action === 'request-help') runWorkflow(() => backend.onRequestHelp(state.apartmentId,
      document.querySelector('#help-architect')?.value || helpArchitectId), 'Pedido de ajuda enviado.');
    if (action === 'cancel-help') runWorkflow(() => backend.onCancelHelp(state.apartmentId), 'Pedido de ajuda cancelado.');
    if (action === 'revoke-architect') runWorkflow(() => backend.onRevokeArchitect(state.apartmentId,
      backend.help?.[state.apartmentId]?.architect_user_id || helpArchitectId), 'Autorização da arquiteta revogada.');
    if (action === 'accept-help') runWorkflow(() => backend.onAcceptHelp(state.apartmentId), 'Pedido de ajuda aceito.');
    if (action === 'resolve-help') runWorkflow(() => backend.onResolveHelp(state.apartmentId), 'Atendimento concluído.');
    if (action === 'review-approved' || action === 'review-changes') {
      const note = document.querySelector('#technical-note')?.value.trim() || null;
      runWorkflow(() => backend.onReview(state.apartmentId,
        action === 'review-approved' ? 'approved' : 'changes_requested', note), 'Parecer técnico registrado.');
    }
  }));
  document.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'plant') { state.module = 'plant'; render(); }
    else if (nav === 'counters') { state.module = 'materials'; state.materialGroup = 'counter'; state.environment = 'cozinha'; render(); }
    else showToast('Este catálogo ainda está em preparação.');
  }));
  document.querySelectorAll('[data-accordion]').forEach(btn => btn.addEventListener('click', () => {
    state.accordions[btn.dataset.accordion] = !state.accordions[btn.dataset.accordion]; render();
  }));
  document.querySelectorAll('[data-plant-group]').forEach(btn => btn.addEventListener('click', () => { state.plantGroup = btn.dataset.plantGroup; render(); }));
  document.querySelectorAll('[data-plant-choice]').forEach(btn => btn.addEventListener('click', () => {
    if (!choiceEnabled(btn.dataset.plantChoice, btn.dataset.value)) return;
    state[btn.dataset.plantChoice] = btn.dataset.value; render();
  }));
  document.querySelectorAll('[data-material-group]').forEach(btn => btn.addEventListener('click', () => { state.materialGroup = btn.dataset.materialGroup; render(); }));
  document.querySelectorAll('[data-material-choice]').forEach(btn => btn.addEventListener('click', () => {
    if (!choiceEnabled(btn.dataset.materialChoice, btn.dataset.value)) return;
    state[btn.dataset.materialChoice] = btn.dataset.value; render();
  }));
  document.querySelectorAll('[data-environment]').forEach(btn => btn.addEventListener('click', () => {
    const env = btn.dataset.environment;
    if (env === 'cozinha') { state.environment = 'cozinha'; if (state.materialGroup === 'service') state.materialGroup = 'counter'; render(); }
    else if (env === 'servico') { state.environment = 'servico'; state.materialGroup = 'service'; render(); }
    else showToast('Ambiente ainda sem catálogo disponível.');
  }));
}
