/**
 * cas-state.js — Qualification state for the CAS (Customer Adoption) dashboard.
 * Mirrors AppState but operates on account-level cards rather than opp-level groups.
 */

const CasState = (() => {

  let _cards    = new Map(); // cardKey → card object
  let _qualState = new Map(); // cardKey → { status, qualifyOutReason }

  const LS_KEY = 'horizon_cas_qual_state';

  function init(rows, previousState = null) {
    const prevQualState = previousState ?? new Map();

    _cards    = new Map();
    _qualState = new Map();

    for (const row of rows) {
      const key = row.cardKey;
      if (!_cards.has(key)) {
        _cards.set(key, { ...row });
      }

      if (prevQualState.has(key)) {
        _qualState.set(key, { ...prevQualState.get(key) });
      } else {
        _qualState.set(key, { status: 'unqualified', qualifyOutReason: null });
      }
    }
  }

  function getAllCards() {
    return Array.from(_cards.values());
  }

  function getWhitespaceCards() {
    return Array.from(_cards.values()).filter(c => (_qualState.get(c.cardKey)?.status ?? 'unqualified') === 'unqualified');
  }

  function getQualifiedInCards() {
    return Array.from(_cards.values()).filter(c => _qualState.get(c.cardKey)?.status === 'qualified-in');
  }

  function getQualifiedOutCards() {
    return Array.from(_cards.values()).filter(c => _qualState.get(c.cardKey)?.status === 'qualified-out');
  }

  function getStatus(key) {
    return _qualState.get(key)?.status ?? 'unqualified';
  }

  function getQualifyOutReason(key) {
    return _qualState.get(key)?.qualifyOutReason ?? null;
  }

  function qualifyIn(key) {
    if (!_qualState.has(key)) return false;
    _qualState.get(key).status           = 'qualified-in';
    _qualState.get(key).qualifyOutReason = null;
    _save();
    return true;
  }

  function qualifyOut(key, reason) {
    if (!reason?.trim() || !_qualState.has(key)) return false;
    _qualState.get(key).status           = 'qualified-out';
    _qualState.get(key).qualifyOutReason = reason.trim();
    _save();
    return true;
  }

  function undo(key) {
    if (!_qualState.has(key)) return false;
    _qualState.get(key).status           = 'unqualified';
    _qualState.get(key).qualifyOutReason = null;
    _save();
    return true;
  }

  function _save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify([..._qualState.entries()]));
    } catch (_) {}
  }

  function loadSaved() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return new Map();
      return new Map(JSON.parse(raw));
    } catch (_) {
      return new Map();
    }
  }

  return { init, getAllCards, getWhitespaceCards, getQualifiedInCards, getQualifiedOutCards, getStatus, getQualifyOutReason, qualifyIn, qualifyOut, undo, loadSaved };

})();
