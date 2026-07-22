/**
 * cas-display.js — DOM rendering for the CAS (Customer Adoption) dashboard.
 */

const CasFilterState = { ae: [], account: [], solArea: [] };

function renderCasFilterBar(cards) {
  const aeVals      = [...new Set(cards.map(c => c.sae).filter(Boolean))].sort();
  const accountVals = [...new Set(cards.map(c => c.customerName).filter(Boolean))].sort();
  const solAreaVals = [...new Set(cards.map(c => c.l2).filter(Boolean))].sort();

  const bar = document.getElementById('cas-filter-bar');
  if (!bar) return;

  bar.innerHTML = `
    <div class="filter-group">
      <label>Account Executive</label>
      ${_casTypeaheadHtml('cas-filter-ae', 'Filter by AE…')}
    </div>
    <div class="filter-group">
      <label>Account</label>
      ${_casTypeaheadHtml('cas-filter-account', 'Filter by Account…')}
    </div>
    <div class="filter-group">
      <label>Solution Area</label>
      ${_casTypeaheadHtml('cas-filter-solarea', 'Filter by Solution Area…')}
    </div>
    <button id="btn-cas-clear-filters" class="btn-ghost">Clear</button>
  `;

  bar.querySelector('#btn-cas-clear-filters').addEventListener('click', () => {
    CasFilterState.ae = []; CasFilterState.account = []; CasFilterState.solArea = [];
    renderCasFilterBar(cards);
    window.HorizonApp?.rerenderCas();
  });

  wireTypeAhead('cas-filter-ae',      aeVals,      'ae',      CasFilterState, () => window.HorizonApp?.rerenderCas());
  wireTypeAhead('cas-filter-account', accountVals, 'account', CasFilterState, () => window.HorizonApp?.rerenderCas());
  wireTypeAhead('cas-filter-solarea', solAreaVals, 'solArea', CasFilterState, () => window.HorizonApp?.rerenderCas());
}

function _casTypeaheadHtml(id, placeholder) {
  return `
    <div class="typeahead-wrapper" id="${id}-wrapper">
      <div class="typeahead-chips" id="${id}-chips"></div>
      <input type="text" id="${id}" class="typeahead-input" placeholder="${placeholder}" autocomplete="off">
      <ul class="typeahead-dropdown" id="${id}-dropdown" hidden></ul>
    </div>
  `;
}

function applyCasFilters(cards) {
  return cards.filter(c => {
    if (CasFilterState.ae.length      && !CasFilterState.ae.includes(c.sae))             return false;
    if (CasFilterState.account.length && !CasFilterState.account.includes(c.customerName)) return false;
    if (CasFilterState.solArea.length && !CasFilterState.solArea.includes(c.l2))           return false;
    return true;
  });
}

function renderCasTab(tab) {
  const container = document.getElementById('cas-tab-content');
  if (!container) return;
  container.innerHTML = '';

  const casColHeader = document.getElementById('cas-whitespace-col-header');

  if (tab === 'whitespace') {
    if (casColHeader) casColHeader.hidden = false;
    const cards = applyCasFilters(CasState.getWhitespaceCards());
    if (!cards.length) {
      container.innerHTML = '<div class="truffle-empty">No CAS whitespace cards match the current filters.</div>';
      return;
    }
    for (const card of cards.sort((a,b) => a.customerName.localeCompare(b.customerName))) {
      container.appendChild(buildCasWhitespaceRow(card));
    }
  } else if (tab === 'qualified-in') {
    if (casColHeader) casColHeader.hidden = true;
    const cards = CasState.getQualifiedInCards();
    if (!cards.length) {
      container.innerHTML = '<div class="truffle-empty">No CAS opportunities qualified in yet.</div>';
      return;
    }
    const list = document.createElement('div');
    list.className = 'truffle-flat-list';
    for (const card of cards) list.appendChild(buildCasQualifiedRow(card, 'qualified-in'));
    container.appendChild(list);
  } else if (tab === 'qualified-out') {
    if (casColHeader) casColHeader.hidden = true;
    const cards = CasState.getQualifiedOutCards();
    if (!cards.length) {
      container.innerHTML = '<div class="truffle-empty">No CAS opportunities qualified out yet.</div>';
      return;
    }
    const list = document.createElement('div');
    list.className = 'truffle-flat-list';
    for (const card of cards) list.appendChild(buildCasQualifiedRow(card, 'qualified-out'));
    container.appendChild(list);
  }
}

function buildCasWhitespaceRow(card) {
  const row = document.createElement('div');
  row.className = 'opp-header';
  row.style.cursor = 'default';

  const solArea = card.isFSM ? `${card.l2} / ${card.l3}` : card.l2;

  row.innerHTML = `
    <span></span>
    <span class="opp-customer-name">${escapeHtml(card.customerName)}</span>
    <span class="opp-sol-area">${escapeHtml(solArea)}</span>
    <span class="opp-ae">${escapeHtml(card.sae || 'Unassigned')}</span>
    <span class="opp-sales-segment">${escapeHtml(card.salesSegment || '')}</span>
    <span class="opp-eligible-acv">${formatUSD(card.cloudifiedAcv)}</span>
    <span class="opp-solution-count">${card.numOpps}</span>
    <span></span>
    <span></span>
    <span class="opp-group-buttons">
      <button class="btn-qualify-in cas-qualify-in-btn" data-key="${escapeHtml(card.cardKey)}">Qualify In</button>
      <button class="btn-qualify-out cas-qualify-out-btn" data-key="${escapeHtml(card.cardKey)}">Qualify Out</button>
    </span>
  `;

  row.querySelector('.cas-qualify-in-btn').addEventListener('click', () => {
    CasState.qualifyIn(card.cardKey);
    window.HorizonApp?.rerenderCas();
  });

  row.querySelector('.cas-qualify-out-btn').addEventListener('click', () => {
    window.HorizonApp?._openCasQualifyOutModal(card.cardKey);
  });

  return row;
}

function buildCasQualifiedRow(card, tabContext) {
  const reason  = CasState.getQualifyOutReason(card.cardKey);
  const solArea = card.isFSM ? `${card.l2} / ${card.l3}` : card.l2;

  const row = document.createElement('div');
  row.className = `solution-row solution-row--${tabContext} cas-row`;

  const reasonHtml = (tabContext === 'qualified-out' && reason)
    ? `<span class="sol-qualify-out-reason"><strong>Reason:</strong> ${escapeHtml(reason)}</span>`
    : '';

  row.innerHTML = `
    <span class="sol-customer-name">${escapeHtml(card.customerName)}</span>
    <span class="sol-area">${escapeHtml(solArea)}</span>
    <span class="sol-eligible-acv">${formatUSD(card.cloudifiedAcv)}</span>
    <span class="opp-ae">${escapeHtml(card.sae || 'Unassigned')}</span>
    ${reasonHtml}
    <span class="sol-actions">
      <button class="btn-undo cas-undo-btn" data-key="${escapeHtml(card.cardKey)}">Undo</button>
    </span>
  `;

  row.querySelector('.cas-undo-btn').addEventListener('click', () => {
    CasState.undo(card.cardKey);
    window.HorizonApp?.rerenderCas();
  });

  return row;
}

function updateCasDownloadButtons() {
  const btn = document.getElementById('cas-btn-download-all');
  if (btn) btn.disabled = CasState.getQualifiedInCards().length === 0;
}
