/**
 * display.js — All DOM rendering for Horizon Portfolio Tool.
 * Reads from AppState. Never mutates state directly.
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(value) {
  if (value == null || isNaN(value)) return '$0';
  return '$' + Math.round(value).toLocaleString('en-US');
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Opp value: Standard = 20%, Enhanced = 30% of eligible ACV
function calcOppValue(acv, rec) {
  return rec === 'Enhanced' ? acv * 0.30 : acv * 0.20;
}

// ─── Tab renderer ─────────────────────────────────────────────────────────────

function renderActiveTab(tab, pipelineData) {
  const container = document.getElementById('tab-content');
  if (!container) return;
  container.innerHTML = '';

  if      (tab === 'whitespace')    renderWhitespaceTab(container, pipelineData);
  else if (tab === 'qualified-in')  renderQualifiedInTab(container);
  else if (tab === 'qualified-out') renderQualifiedOutTab(container);

  updateDownloadButtons();
}

// ─── Whitespace tab ───────────────────────────────────────────────────────────

function renderWhitespaceTab(container, pipelineData) {
  const groups = applyFilters(AppState.getWhitespaceGroups());
  const { oppTypes, aeByOpp } = pipelineData;
  const byCard = groupByCard(groups);

  if (byCard.size === 0) {
    container.innerHTML = '<div class="truffle-empty">No whitespace opportunities match the current filters.</div>';
    return;
  }

  for (const [, cardGroups] of byCard) {
    container.appendChild(buildCard(cardGroups, oppTypes, aeByOpp));
  }
}

// ─── Card (outer collapsed row) ───────────────────────────────────────────────

function buildCard(cardGroups, oppTypes, aeByOpp) {
  const first    = cardGroups[0];
  const totalAcv = cardGroups.reduce((s, g) => s + g.eligibleAcv, 0);
  const oppCount = new Set(cardGroups.map(g => g.oppId)).size;
  const solArea  = first.isFSM ? `${first.l2} / ${first.l3}` : first.l2;
  const ae       = aeByOpp.get(first.oppId) ?? first.sae ?? 'Unassigned';
  const groupKeys = cardGroups.map(g => g.key);

  const cardKey = first.isFSM
    ? `${first.customerName}|${first.l2}|${first.l3}`
    : `${first.customerName}|${first.l2}`;

  const recommendation = AppState.getCardRecommendation(cardKey);
  const oppValue       = calcOppValue(totalAcv, recommendation);

  const card   = document.createElement('div');
  card.className = 'opp-card';

  const header = document.createElement('div');
  header.className = 'opp-header';
  header.setAttribute('role', 'button');
  header.setAttribute('aria-expanded', 'false');

  header.innerHTML = `
    <span class="chevron" aria-hidden="true">&#9654;</span>
    <span class="opp-customer-name" title="${escapeHtml(first.customerName)}">
      <a href="#" onclick="return false;">${escapeHtml(first.customerName)}</a>
    </span>
    <span class="opp-sol-area">${escapeHtml(solArea)}</span>
    <span class="opp-ae">${escapeHtml(ae)}</span>
    <span class="opp-sales-segment">${escapeHtml(first.salesSegment || '')}</span>
    <span class="opp-eligible-acv">${formatUSD(totalAcv)}</span>
    <span class="opp-solution-count">${oppCount}</span>
    <select class="recommendation-select card-rec-select" data-cardkey="${escapeHtml(cardKey)}">
      <option value="Standard"${recommendation === 'Standard' ? ' selected' : ''}>Standard</option>
      <option value="Enhanced"${recommendation === 'Enhanced' ? ' selected' : ''}>Enhanced</option>
    </select>
    <span class="opp-card-value" data-cardkey="${escapeHtml(cardKey)}">${formatUSD(oppValue)}</span>
    <span class="opp-group-buttons">
      <button class="btn-qualify-in btn-group-qualify-in">Qualify In</button>
      <button class="btn-qualify-out btn-group-qualify-out">Qualify Out</button>
    </span>
  `;

  header.querySelector('.card-rec-select').addEventListener('change', e => {
    e.stopPropagation();
    const tier = e.target.value;
    AppState.setCardRecommendation(cardKey, tier);
    header.querySelector(`.opp-card-value[data-cardkey="${cardKey}"]`).textContent =
      formatUSD(calcOppValue(totalAcv, tier));
    window.HorizonApp?.rerender();
  });

  header.querySelector('.btn-group-qualify-in').addEventListener('click', e => {
    e.stopPropagation();
    window.HorizonApp._qualifyGroupIn(groupKeys);
  });

  header.querySelector('.btn-group-qualify-out').addEventListener('click', e => {
    e.stopPropagation();
    window.HorizonApp._qualifyGroupOut(groupKeys);
  });

  // Expand / collapse
  const expanded = document.createElement('div');
  expanded.className = 'opp-expanded';
  expanded.hidden = true;

  const innerHeader = document.createElement('div');
  innerHeader.className = 'solution-col-header';
  innerHeader.innerHTML = `<span>Opp ID</span><span>Forecast</span><span>Type</span><span style="text-align:right">Eligible ACV</span>`;
  expanded.appendChild(innerHeader);

  for (const group of cardGroups) {
    expanded.appendChild(buildInnerRow(group, oppTypes));
  }

  header.addEventListener('click', () => {
    const open = header.getAttribute('aria-expanded') === 'true';
    header.setAttribute('aria-expanded', String(!open));
    header.querySelector('.chevron').classList.toggle('chevron-down', !open);
    expanded.hidden = open;
  });

  card.appendChild(header);
  card.appendChild(expanded);
  return card;
}

// ─── Inner opp row ─────────────────────────────────────────────────────────────

function buildInnerRow(group, oppTypes) {
  const oppType = oppTypes.get(group.oppId) ?? group.oppType ?? 'New Attach';
  const typeCls = oppType === 'Cross-Sell' ? 'opp-type-crosssell'
    : oppType === 'Renewal Expansion'      ? 'opp-type-renewal'
    : 'opp-type-new';

  const row = document.createElement('div');
  row.className = 'solution-row';
  row.dataset.key = group.key;

  row.innerHTML = `
    <span class="opp-id-link">${escapeHtml(group.oppId)}</span>
    <span class="sol-forecast-status">${escapeHtml(group.forecastStatus)}</span>
    <span class="opp-type-badge ${typeCls}">${escapeHtml(oppType)}</span>
    <span class="sol-eligible-acv">${formatUSD(group.eligibleAcv)}</span>
  `;
  return row;
}

// ─── Qualified In tab ─────────────────────────────────────────────────────────

function renderQualifiedInTab(container) {
  const groups = AppState.getQualifiedInGroups();
  if (!groups.length) {
    container.innerHTML = '<div class="truffle-empty">No opportunities have been qualified in yet.</div>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'truffle-flat-list';
  for (const [, cardGroups] of groupByCard(groups)) {
    list.appendChild(buildQualifiedCardRow(cardGroups, 'qualified-in'));
  }
  container.appendChild(list);
}

// ─── Qualified Out tab ────────────────────────────────────────────────────────

function renderQualifiedOutTab(container) {
  const groups = AppState.getQualifiedOutGroups();
  if (!groups.length) {
    container.innerHTML = '<div class="truffle-empty">No opportunities have been qualified out yet.</div>';
    return;
  }
  const list = document.createElement('div');
  list.className = 'truffle-flat-list';
  for (const [, cardGroups] of groupByCard(groups)) {
    list.appendChild(buildQualifiedCardRow(cardGroups, 'qualified-out'));
  }
  container.appendChild(list);
}

// ─── Qualified card row (one row per Account + Sol Area card) ─────────────────

function buildQualifiedCardRow(cardGroups, tabContext) {
  const first    = cardGroups[0];
  const cardKey  = first.isFSM
    ? `${first.customerName}|${first.l2}|${first.l3}`
    : `${first.customerName}|${first.l2}`;
  const groupKeys = cardGroups.map(g => g.key);
  const totalAcv  = cardGroups.reduce((s, g) => s + g.eligibleAcv, 0);
  const rec       = AppState.getCardRecommendation(cardKey);
  const oppValue  = calcOppValue(totalAcv, rec);
  const solArea   = first.isFSM ? `${first.l2} / ${first.l3}` : first.l2;
  const oppCount  = new Set(cardGroups.map(g => g.oppId)).size;
  // Qualify-out reason comes from the first key (all keys in a card share the same reason)
  const reason    = AppState.getQualifyOutReason(first.key);
  const isHist    = !!first._historical;

  const row = document.createElement('div');
  row.className = `solution-row solution-row--${tabContext}${isHist ? ' solution-row--historical' : ''}`;

  const reasonHtml = (tabContext === 'qualified-out' && reason)
    ? `<span class="sol-qualify-out-reason"><strong>Reason:</strong> ${escapeHtml(reason)}</span>`
    : '';

  const histBadge = isHist
    ? '<span class="badge--historical" title="No longer in current pipeline">Historical</span>'
    : '';

  row.innerHTML = `
    <span></span>
    <span class="sol-customer-name">${escapeHtml(first.customerName)}</span>
    <span class="sol-area">${escapeHtml(solArea)}</span>
    <span class="opp-ae">${escapeHtml(first.sae || 'Unassigned')}</span>
    <span class="opp-sales-segment">${escapeHtml(first.salesSegment || '')}</span>
    <span class="sol-eligible-acv">${formatUSD(totalAcv)}</span>
    <span style="font-size:12px;color:var(--grey-6);text-align:center">${oppCount}</span>
    <select class="recommendation-select" data-cardkey="${escapeHtml(cardKey)}">
      <option value="Standard"${rec === 'Standard' ? ' selected' : ''}>Standard</option>
      <option value="Enhanced"${rec === 'Enhanced' ? ' selected' : ''}>Enhanced</option>
    </select>
    <span class="sol-opp-value" data-cardkey="${escapeHtml(cardKey)}">${formatUSD(oppValue)}</span>
    ${reasonHtml}
    ${histBadge}
    <span class="sol-actions">
      <button class="btn-undo" data-keys="${escapeHtml(JSON.stringify(groupKeys))}">Undo</button>
    </span>
  `;

  row.querySelector('.recommendation-select').addEventListener('change', e => {
    const tier = e.target.value;
    AppState.setCardRecommendation(cardKey, tier);
    row.querySelector(`.sol-opp-value[data-cardkey="${cardKey}"]`).textContent =
      formatUSD(calcOppValue(totalAcv, tier));
    updateDownloadButtons();
  });

  return row;
}

// ─── Filter state ─────────────────────────────────────────────────────────────

const FilterState = { ae: [], account: [], solArea: [], segment: [], acvRange: [] };

const ACV_RANGES = [
  { key: '125-249', label: '$125K–$249K', min: 125_000,   max: 249_999  },
  { key: '250-499', label: '$250K–$499K', min: 250_000,   max: 499_999  },
  { key: '500-999', label: '$500K–$999K', min: 500_000,   max: 999_999  },
  { key: '1000+',   label: '$1M+',        min: 1_000_000, max: Infinity },
];

function applyFilters(groups) {
  return groups.filter(g => {
    if (FilterState.ae.length      && !FilterState.ae.includes(g.sae))             return false;
    if (FilterState.account.length && !FilterState.account.includes(g.customerName)) return false;
    if (FilterState.solArea.length && !FilterState.solArea.includes(g.l2))           return false;
    if (FilterState.segment.length && !FilterState.segment.includes(g.salesSegment)) return false;
    if (FilterState.acvRange.length) {
      const matched = FilterState.acvRange.some(key => {
        const range = ACV_RANGES.find(r => r.key === key);
        return range && g.eligibleAcv >= range.min && g.eligibleAcv <= range.max;
      });
      if (!matched) return false;
    }
    return true;
  });
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function renderFilterBar(allGroups) {
  const aeVals      = [...new Set(allGroups.map(g => g.sae).filter(Boolean))].sort();
  const accountVals = [...new Set(allGroups.map(g => g.customerName).filter(Boolean))].sort();
  const solAreaVals = [...new Set(allGroups.map(g => g.l2).filter(Boolean))].sort();
  const segmentVals = [...new Set(allGroups.map(g => g.salesSegment).filter(Boolean))].sort();

  const bar = document.getElementById('filter-bar');
  if (!bar) return;

  bar.innerHTML = `
    <div class="filter-group">
      <label>Account Executive</label>
      ${_typeaheadHtml('filter-ae', 'Filter by AE…')}
    </div>
    <div class="filter-group">
      <label>Account</label>
      ${_typeaheadHtml('filter-account', 'Filter by Account…')}
    </div>
    <div class="filter-group">
      <label>Solution Area</label>
      ${_typeaheadHtml('filter-solarea', 'Filter by Solution Area…')}
    </div>
    <div class="filter-group">
      <label>Segment</label>
      ${_typeaheadHtml('filter-segment', 'Filter by Segment…')}
    </div>
    <div class="filter-group">
      <label>ACV Range</label>
      <div class="acv-range-chips">
        ${ACV_RANGES.map(r => `
          <button class="chip${FilterState.acvRange.includes(r.key) ? ' chip--active' : ''}" data-range="${r.key}">${r.label}</button>
        `).join('')}
      </div>
    </div>
    <button id="btn-clear-filters" class="btn-ghost">Clear</button>
  `;

  bar.querySelectorAll('.chip[data-range]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.range;
      const idx = FilterState.acvRange.indexOf(key);
      if (idx === -1) FilterState.acvRange.push(key); else FilterState.acvRange.splice(idx, 1);
      btn.classList.toggle('chip--active');
      window.HorizonApp?.rerender();
    });
  });

  bar.querySelector('#btn-clear-filters').addEventListener('click', () => {
    FilterState.ae = []; FilterState.account = []; FilterState.solArea = [];
    FilterState.segment = []; FilterState.acvRange = [];
    renderFilterBar(allGroups);
    window.HorizonApp?.rerender();
  });

  wireTypeAhead('filter-ae',      aeVals,      'ae');
  wireTypeAhead('filter-account', accountVals, 'account');
  wireTypeAhead('filter-solarea', solAreaVals, 'solArea');
  wireTypeAhead('filter-segment', segmentVals, 'segment');
}

function _typeaheadHtml(id, placeholder) {
  return `
    <div class="typeahead-wrapper" id="${id}-wrapper">
      <div class="typeahead-chips" id="${id}-chips"></div>
      <input type="text" id="${id}" class="typeahead-input" placeholder="${placeholder}" autocomplete="off">
      <ul class="typeahead-dropdown" id="${id}-dropdown" hidden></ul>
    </div>
  `;
}

function wireTypeAhead(inputId, options, filterKey, filterState, onChangeCb) {
  const state    = filterState || FilterState;
  const onChange = onChangeCb  || (() => window.HorizonApp?.rerender());

  const input    = document.getElementById(inputId);
  const dropdown = document.getElementById(`${inputId}-dropdown`);
  const chipsEl  = document.getElementById(`${inputId}-chips`);
  if (!input || !dropdown || !chipsEl) return;

  function renderChips() {
    const selected = state[filterKey];
    chipsEl.innerHTML = selected.map(val => `
      <span class="chip chip--selected">
        ${escapeHtml(val)}
        <button class="chip-remove" data-val="${escapeHtml(val)}" aria-label="Remove ${escapeHtml(val)}">×</button>
      </span>
    `).join('');
    chipsEl.querySelectorAll('.chip-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        state[filterKey] = state[filterKey].filter(v => v !== btn.dataset.val);
        renderChips();
        onChange();
      });
    });
  }

  input.addEventListener('input', () => {
    const term    = input.value.trim().toLowerCase();
    const matches = term ? options.filter(v => v.toLowerCase().includes(term)) : options;

    dropdown.innerHTML = matches.length
      ? matches.slice(0, 50).map(v =>
          `<li class="typeahead-option" data-val="${escapeHtml(v)}">${escapeHtml(v)}</li>`
        ).join('')
      : '<li class="typeahead-no-results">No results</li>';
    dropdown.hidden = false;

    dropdown.querySelectorAll('.typeahead-option').forEach(li => {
      li.addEventListener('click', () => {
        const val = li.dataset.val;
        if (!state[filterKey].includes(val)) { state[filterKey].push(val); renderChips(); onChange(); }
        input.value = '';
        dropdown.hidden = true;
      });
    });
  });

  input.addEventListener('blur', () => setTimeout(() => { dropdown.hidden = true; }, 150));
  renderChips();
}

// ─── Download buttons ─────────────────────────────────────────────────────────

function updateDownloadButtons() {
  const btnNew = document.getElementById('btn-download-new');
  const btnAll = document.getElementById('btn-download-all');
  if (btnNew) btnNew.disabled = !hasUnexportedRows();
  if (btnAll) btnAll.disabled = !hasAnyQualifiedRows();
}

function hasUnexportedRows()  { return AppState.getUnexportedQualifiedInKeys().length > 0; }
function hasAnyQualifiedRows(){ return AppState.getAllQualifiedInKeys().length > 0; }

// ─── Grouping helpers ─────────────────────────────────────────────────────────

function groupByCard(groups) {
  const map = new Map();
  for (const g of groups) {
    const key = g.isFSM
      ? `${g.customerName}|${g.l2}|${g.l3}`
      : `${g.customerName}|${g.l2}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(g);
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}
