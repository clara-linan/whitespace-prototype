/**
 * state.js — Qualification state for Horizon Portfolio Tool
 *
 * Identical logic to the original; no proprietary data or business rules.
 * Manages unqualified / qualified-in / qualified-out state for opportunity groups.
 */

const AppState = (() => {

  let _groupsByKey         = new Map();
  let _qualState           = new Map();
  let _historicalGroups    = new Map();
  let _cardRecommendations = new Map();

  function init(qualifiedGroups, previousState = null) {
    const prevQualState  = previousState?._qualState            ?? new Map();
    const prevHistorical = previousState?._historicalGroups     ?? new Map();
    const prevCardRecs   = previousState?._cardRecommendations  ?? new Map();

    const newGroupsByKey = new Map(qualifiedGroups.map(g => [g.key, g]));
    const newQualState   = new Map();

    for (const [key, group] of newGroupsByKey) {
      if (prevQualState.has(key)) {
        newQualState.set(key, { ...prevQualState.get(key) });
      } else {
        newQualState.set(key, {
          status:           'unqualified',
          qualifyOutReason: null,
          exported:         false,
          recommendation:   group.recommendation,
        });
      }
    }

    const newHistorical = new Map(prevHistorical);
    for (const [key, qs] of prevQualState) {
      if (!newGroupsByKey.has(key) && (qs.status === 'qualified-in' || qs.status === 'qualified-out')) {
        const groupObj = prevHistorical.get(key) ?? null;
        if (groupObj) {
          newHistorical.set(key, { ...groupObj, _historical: true });
          newQualState.set(key, { ...qs });
        }
      }
    }

    _groupsByKey      = newGroupsByKey;
    _qualState        = newQualState;
    _historicalGroups = newHistorical;

    const newCardRecs = new Map(prevCardRecs);
    for (const group of qualifiedGroups) {
      const cardKey = _cardKeyFor(group);
      if (!newCardRecs.has(cardKey) && group.recommendation) {
        newCardRecs.set(cardKey, group.recommendation === 'Enhanced' ? 'Enhanced' : 'Standard');
      }
    }
    _cardRecommendations = newCardRecs;
  }

  function _cardKeyFor(group) {
    return group.isFSM
      ? `${group.customerName}|${group.l2}|${group.l3}`
      : `${group.customerName}|${group.l2}`;
  }

  function getGroup(key) {
    return _groupsByKey.get(key) ?? _historicalGroups.get(key) ?? null;
  }

  function getStatus(key) {
    return _qualState.get(key)?.status ?? 'unqualified';
  }

  function getQualifyOutReason(key) {
    return _qualState.get(key)?.qualifyOutReason ?? null;
  }

  function isExported(key) {
    return _qualState.get(key)?.exported ?? false;
  }

  function getWhitespaceGroups() {
    const result = [];
    for (const [key, group] of _groupsByKey) {
      if (getStatus(key) === 'unqualified') result.push(group);
    }
    return result;
  }

  function getQualifiedInGroups() {
    const result = [];
    for (const [key] of _qualState) {
      if (getStatus(key) === 'qualified-in') {
        const g = getGroup(key);
        if (g) result.push(g);
      }
    }
    return result;
  }

  function getQualifiedOutGroups() {
    const result = [];
    for (const [key] of _qualState) {
      if (getStatus(key) === 'qualified-out') {
        const g = getGroup(key);
        if (g) result.push(g);
      }
    }
    return result;
  }

  function getCardRecommendation(cardKey) {
    return _cardRecommendations.get(cardKey) ?? 'Standard';
  }

  function setCardRecommendation(cardKey, tier) {
    if (tier !== 'Standard' && tier !== 'Enhanced') return;
    _cardRecommendations.set(cardKey, tier);
  }

  function qualifyIn(key) {
    if (!_qualState.has(key)) return false;
    const qs = _qualState.get(key);
    qs.status           = 'qualified-in';
    qs.qualifyOutReason = null;
    qs.exported         = false;
    return true;
  }

  function qualifyOut(key, reason) {
    if (!reason || !reason.trim()) return false;
    if (!_qualState.has(key)) return false;
    const qs = _qualState.get(key);
    qs.status           = 'qualified-out';
    qs.qualifyOutReason = reason.trim();
    qs.exported         = false;
    return true;
  }

  function undo(key) {
    if (!_qualState.has(key)) return false;
    const qs = _qualState.get(key);
    qs.status           = 'unqualified';
    qs.qualifyOutReason = null;
    qs.exported         = false;
    if (_historicalGroups.has(key)) {
      _groupsByKey.set(key, _historicalGroups.get(key));
      _historicalGroups.delete(key);
    }
    return true;
  }

  function markExported(keys) {
    for (const key of keys) {
      if (_qualState.has(key)) _qualState.get(key).exported = true;
    }
  }

  function getUnexportedQualifiedInKeys() {
    const result = [];
    for (const [key, qs] of _qualState) {
      if (qs.status === 'qualified-in' && !qs.exported) result.push(key);
    }
    return result;
  }

  function getAllQualifiedInKeys() {
    const result = [];
    for (const [key, qs] of _qualState) {
      if (qs.status === 'qualified-in') result.push(key);
    }
    return result;
  }

  function exportStateSnapshot() {
    return {
      _qualState:           new Map(_qualState),
      _historicalGroups:    new Map(_historicalGroups),
      _cardRecommendations: new Map(_cardRecommendations),
    };
  }

  return {
    init,
    getGroup,
    getStatus,
    getQualifyOutReason,
    isExported,
    getWhitespaceGroups,
    getQualifiedInGroups,
    getQualifiedOutGroups,
    getCardRecommendation,
    setCardRecommendation,
    qualifyIn,
    qualifyOut,
    undo,
    markExported,
    getUnexportedQualifiedInKeys,
    getAllQualifiedInKeys,
    exportStateSnapshot,
  };

})();
