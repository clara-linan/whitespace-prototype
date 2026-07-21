/**
 * main.js — App init, event wiring, tab switching, dashboard switching.
 *
 * Data flow:
 *   On DOMContentLoaded → load synthetic seed data → runPipeline → AppState.init
 *   → render dashboard. No file uploads, no server, no auth.
 */

window.HorizonApp = (() => {

  const LS_QUAL = 'horizon_qual_state';

  let _pipelineData  = null;
  let _summaryLog    = [];
  let _activeTab     = 'whitespace';
  let _casActiveTab  = 'whitespace';
  let _activeDashboard = 'sp';

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    _showDisclaimer();
    _loadData();
    bindDashboardSwitcher();
    bindTabSwitching();
    bindActionButtons();
    bindDownloadButtons();
    bindQualifyOutModal();
    bindCasQualifyOutModal();
    bindUserAvatar();
  }

  function _loadData() {
    showSpinner(true);
    try {
      const rows = window.HORIZON_SEED.getSpRows();
      _pipelineData = runPipeline(rows);
      _summaryLog   = [..._pipelineData.log];

      const qualSnapshot = _loadQualSnapshot();
      AppState.init(_pipelineData.qualifiedGroups, qualSnapshot);

      // CAS data
      const casRows     = window.HORIZON_SEED.getCasRows();
      const casSaved    = CasState.loadSaved();
      CasState.init(casRows, casSaved);

      _showMainApp();
    } catch (err) {
      console.error('Horizon: failed to load seed data:', err);
    } finally {
      showSpinner(false);
    }
  }

  // ── Disclaimer ────────────────────────────────────────────────────────────────

  function _showDisclaimer() {
    const overlay = document.getElementById('modal-overlay');
    const modal   = document.getElementById('disclaimer-modal');
    if (!overlay || !modal) return;
    overlay.hidden = false;
    modal.hidden   = false;

    document.getElementById('btn-acknowledge')?.addEventListener('click', () => {
      overlay.hidden = true;
      modal.hidden   = true;
    });
  }

  // ── Show main app ─────────────────────────────────────────────────────────────

  function _showMainApp() {
    document.getElementById('sp-dashboard').hidden  = false;
    document.getElementById('cas-dashboard').hidden = true;

    renderFilterBar(_pipelineData.qualifiedGroups);
    setActiveTab('whitespace');
    updateStatTiles();
    renderSummaryLog();

    // Pre-warm CAS filter bar
    renderCasFilterBar(CasState.getAllCards());
    updateCasStatTiles();
  }

  // ── Stat tiles ────────────────────────────────────────────────────────────────

  function updateStatTiles() {
    if (!_pipelineData) return;
    const ws    = AppState.getWhitespaceGroups();
    const qi    = AppState.getQualifiedInGroups();
    const qo    = AppState.getQualifiedOutGroups();
    const total = ws.length + qi.length + qo.length;

    function cardKey(g) {
      return g.isFSM ? `${g.customerName}|${g.l2}|${g.l3}` : `${g.customerName}|${g.l2}`;
    }
    function sumCardAcv(groups) {
      const cardAcv = new Map();
      for (const g of groups) {
        const k = cardKey(g);
        cardAcv.set(k, (cardAcv.get(k) ?? 0) + g.eligibleAcv);
      }
      let t = 0;
      for (const [k, acv] of cardAcv) t += calcOppValue(acv, AppState.getCardRecommendation(k));
      return t;
    }

    const pipeline = sumCardAcv(ws) + sumCardAcv(qi);
    const fmt = v => '$' + (v >= 1_000_000
      ? (v / 1_000_000).toFixed(1) + 'M'
      : Math.round(v / 1000).toLocaleString('en-US') + 'K');

    const el = id => document.getElementById(id);
    if (el('stat-pipeline'))   el('stat-pipeline').textContent   = fmt(pipeline);
    if (el('stat-whitespace')) el('stat-whitespace').textContent = ws.length;
    if (el('stat-pct'))        el('stat-pct').textContent        = total > 0 ? Math.round((ws.length / total) * 100) + '%' : '—';
    if (el('stat-qualified'))  el('stat-qualified').textContent  = qi.length;
    if (el('stat-qualout'))    el('stat-qualout').textContent    = qo.length;
    if (el('stat-total'))      el('stat-total').textContent      = total;
  }

  function updateCasStatTiles() {
    const ws    = CasState.getWhitespaceCards();
    const qi    = CasState.getQualifiedInCards();
    const qo    = CasState.getQualifiedOutCards();
    const all   = CasState.getAllCards();
    const fmt = v => '$' + (v >= 1_000_000
      ? (v / 1_000_000).toFixed(1) + 'M'
      : Math.round(v / 1000).toLocaleString('en-US') + 'K');
    const cloudAcv = ws.concat(qi).reduce((s, c) => s + c.cloudifiedAcv, 0);

    const el = id => document.getElementById(id);
    if (el('cas-stat-acv'))        el('cas-stat-acv').textContent        = fmt(cloudAcv);
    if (el('cas-stat-whitespace')) el('cas-stat-whitespace').textContent = ws.length;
    if (el('cas-stat-qualified'))  el('cas-stat-qualified').textContent  = qi.length;
    if (el('cas-stat-qualout'))    el('cas-stat-qualout').textContent    = qo.length;
    if (el('cas-stat-total'))      el('cas-stat-total').textContent      = all.length;
  }

  // ── Dashboard switcher ────────────────────────────────────────────────────────

  function bindDashboardSwitcher() {
    document.getElementById('dashboard-switcher')?.addEventListener('change', e => {
      _switchDashboard(e.target.value);
    });
  }

  function _switchDashboard(which) {
    _activeDashboard = which;
    document.getElementById('sp-dashboard').hidden  = (which !== 'sp');
    document.getElementById('cas-dashboard').hidden = (which !== 'cas');
    document.getElementById('sp-download-btns').hidden  = (which !== 'sp');
    document.getElementById('cas-download-btns').hidden = (which !== 'cas');

    if (which === 'cas') {
      renderCasFilterBar(CasState.getAllCards());
      renderCasTab(_casActiveTab);
      updateCasStatTiles();
    }
  }

  // ── SP tab switching ──────────────────────────────────────────────────────────

  function bindTabSwitching() {
    document.addEventListener('click', e => {
      const spTab = e.target.closest('.table-tab');
      if (spTab?.dataset?.tab) setActiveTab(spTab.dataset.tab);

      const casTab = e.target.closest('.cas-tab');
      if (casTab?.dataset?.tab) setCasActiveTab(casTab.dataset.tab);
    });
  }

  function setActiveTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.table-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const colHeader = document.getElementById('whitespace-col-header');
    if (colHeader) colHeader.hidden = tab !== 'whitespace';
    renderActiveTab(tab, _pipelineData);
    _updateTabCounts();
  }

  function _updateTabCounts() {
    const el = id => document.getElementById(id);
    if (el('tab-count-whitespace'))    el('tab-count-whitespace').textContent    = AppState.getWhitespaceGroups().length;
    if (el('tab-count-qualified-in'))  el('tab-count-qualified-in').textContent  = AppState.getQualifiedInGroups().length;
    if (el('tab-count-qualified-out')) el('tab-count-qualified-out').textContent = AppState.getQualifiedOutGroups().length;
    updateStatTiles();
  }

  // ── CAS tab switching ─────────────────────────────────────────────────────────

  function setCasActiveTab(tab) {
    _casActiveTab = tab;
    document.querySelectorAll('.cas-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    renderCasTab(tab);
    updateCasStatTiles();
    updateCasDownloadButtons();
  }

  function rerenderCas() {
    renderCasTab(_casActiveTab);
    updateCasStatTiles();
    updateCasDownloadButtons();
  }

  // ── Qualify In / Out ──────────────────────────────────────────────────────────

  function bindActionButtons() {
    document.getElementById('tab-content')?.addEventListener('click', e => {
      if (e.target.matches('.btn-undo')) {
        const keys = JSON.parse(e.target.dataset.keys || '[]');
        let undone = false;
        for (const key of keys) {
          if (AppState.undo(key)) undone = true;
        }
        if (undone) { _saveQualState(); rerender(); }
      }
    });
  }

  function _qualifyGroupIn(keys) {
    let qualified = false;
    for (const key of keys) {
      if (AppState.qualifyIn(key)) { _summaryLog.push(`Qualified In: ${key}`); qualified = true; }
    }
    if (qualified) { _saveQualState(); rerender(); }
  }

  // ── Qualify Out modal ─────────────────────────────────────────────────────────

  let _pendingQualOutKeys = [];

  function bindQualifyOutModal() {
    document.getElementById('modal-qualify-out-confirm')?.addEventListener('click', () => {
      const reason = document.getElementById('modal-qualify-out-reason')?.value ?? '';
      if (!reason.trim()) { document.getElementById('modal-reason-error').hidden = false; return; }
      let qualified = false;
      for (const key of _pendingQualOutKeys) {
        if (AppState.qualifyOut(key, reason)) { _summaryLog.push(`Qualified Out: ${key} — ${reason}`); qualified = true; }
      }
      if (qualified) { _saveQualState(); _hideQualifyOutModal(); rerender(); }
    });
    document.getElementById('modal-qualify-out-cancel')?.addEventListener('click', _hideQualifyOutModal);
  }

  function _showQualifyOutModal(keys) {
    _pendingQualOutKeys = Array.isArray(keys) ? keys : [keys];
    document.getElementById('modal-qualify-out-reason').value = '';
    document.getElementById('modal-reason-error').hidden = true;
    document.getElementById('modal-qualify-out').hidden  = false;
    document.getElementById('modal-overlay').hidden      = false;
    document.getElementById('modal-qualify-out-reason').focus();
  }

  function _hideQualifyOutModal() {
    document.getElementById('modal-qualify-out').hidden = true;
    // Only hide overlay if disclaimer is already acknowledged
    document.getElementById('modal-overlay').hidden = true;
    _pendingQualOutKeys = [];
  }

  function _qualifyGroupOut(keys) {
    _showQualifyOutModal(keys);
  }

  // ── CAS qualify out modal ─────────────────────────────────────────────────────

  let _pendingCasQualOutKey = null;

  function bindCasQualifyOutModal() {
    document.getElementById('cas-qualify-out-submit')?.addEventListener('click', () => {
      const reason = document.getElementById('cas-qualify-out-reason')?.value ?? '';
      if (!reason.trim()) { document.getElementById('cas-qualify-out-error').hidden = false; return; }
      if (_pendingCasQualOutKey) {
        CasState.qualifyOut(_pendingCasQualOutKey, reason);
        _hideCasQualifyOutModal();
        rerenderCas();
      }
    });
    document.getElementById('cas-qualify-out-cancel')?.addEventListener('click', _hideCasQualifyOutModal);
  }

  function _openCasQualifyOutModal(key) {
    _pendingCasQualOutKey = key;
    document.getElementById('cas-qualify-out-reason').value = '';
    document.getElementById('cas-qualify-out-error').hidden = true;
    document.getElementById('cas-modal-qualify-out').hidden = false;
    document.getElementById('modal-overlay').hidden         = false;
  }

  function _hideCasQualifyOutModal() {
    document.getElementById('cas-modal-qualify-out').hidden = true;
    document.getElementById('modal-overlay').hidden         = true;
    _pendingCasQualOutKey = null;
  }

  // ── Download buttons ──────────────────────────────────────────────────────────

  function bindDownloadButtons() {
    document.getElementById('btn-download-new')?.addEventListener('click', () => {
      downloadNew(_summaryLog); _saveQualState(); updateDownloadButtons();
    });
    document.getElementById('btn-download-all')?.addEventListener('click', () => {
      downloadAll(_summaryLog);
    });
    document.getElementById('cas-btn-download-all')?.addEventListener('click', () => {
      // CAS download — export qualified-in cards to xlsx
      const cards = CasState.getQualifiedInCards();
      if (!cards.length) return;
      const ws = XLSX.utils.aoa_to_sheet([
        ['Account', 'Solution Area', 'AE', 'Segment', 'Cloudified ACV'],
        ...cards.map(c => [c.customerName, c.isFSM ? `${c.l2} / ${c.l3}` : c.l2, c.sae, c.salesSegment, c.cloudifiedAcv]),
      ]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'CAS Qualified');
      XLSX.writeFile(wb, `Horizon_CAS_${new Date().toISOString().slice(0,10)}.xlsx`);
    });
  }

  // ── Summary log ───────────────────────────────────────────────────────────────

  function renderSummaryLog() {
    const panel = document.getElementById('summary-log');
    if (!panel) return;
    if (!_summaryLog.length) {
      panel.innerHTML = '<p style="padding:10px 16px;color:var(--grey-5);font-size:12px;">No warnings or flags.</p>';
      return;
    }
    panel.innerHTML = _summaryLog.map(entry => {
      const cls = entry.startsWith('WARN') ? 'log-warn'
                : entry.startsWith('INFO') ? 'log-info'
                : 'log-action';
      return `<div class="log-entry ${cls}">${escapeHtml(entry)}</div>`;
    }).join('');
  }

  // ── User avatar ───────────────────────────────────────────────────────────────

  function bindUserAvatar() {
    const avatar = document.getElementById('user-avatar');
    if (!avatar) return;
    avatar.textContent = 'DU'; // Demo User
    avatar.title = 'Demo User — Portfolio Environment';
  }

  // ── Qual state persistence ────────────────────────────────────────────────────

  function _saveQualState() {
    try {
      const snap = AppState.exportStateSnapshot();
      localStorage.setItem(LS_QUAL, JSON.stringify({
        qualState:    [...snap._qualState.entries()],
        historical:   [...snap._historicalGroups.entries()],
        cardRecs:     [...snap._cardRecommendations.entries()],
      }));
    } catch (_) {}
  }

  function _loadQualSnapshot() {
    try {
      const raw = localStorage.getItem(LS_QUAL);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        _qualState:           new Map(parsed.qualState),
        _historicalGroups:    new Map(parsed.historical),
        _cardRecommendations: new Map(parsed.cardRecs ?? []),
      };
    } catch (_) {
      return null;
    }
  }

  // ── Spinner ───────────────────────────────────────────────────────────────────

  function showSpinner(show) {
    const el = document.getElementById('loading-spinner');
    if (el) el.hidden = !show;
  }

  // ── Rerender ──────────────────────────────────────────────────────────────────

  function rerender() {
    renderActiveTab(_activeTab, _pipelineData);
    _updateTabCounts();
    updateDownloadButtons();
    renderSummaryLog();
  }

  return {
    init,
    rerender,
    rerenderCas,
    _qualifyGroupIn,
    _qualifyGroupOut,
    _openCasQualifyOutModal,
  };

})();

document.addEventListener('DOMContentLoaded', () => window.HorizonApp.init());
