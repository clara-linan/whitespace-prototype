/**
 * seed.js — Synthetic demo data for Horizon Portfolio Tool
 *
 * ALL data is 100% fictional. Company names, contacts, opportunity IDs,
 * dollar figures, and all other records are generated for demonstration purposes.
 * No real customer, employee, or company data is included.
 */

window.HORIZON_SEED = (() => {

  // ── Fictional company and people data ────────────────────────────────────────

  const ACCOUNTS = [
    { id: 'ACC-001', name: 'Meridian Global Holdings',   segment: 'Enterprise' },
    { id: 'ACC-002', name: 'Vantage Industrial Corp',    segment: 'Enterprise' },
    { id: 'ACC-003', name: 'Solaris Financial Group',    segment: 'Enterprise' },
    { id: 'ACC-004', name: 'Apex Logistics Solutions',   segment: 'Mid-Market' },
    { id: 'ACC-005', name: 'NorthStar Healthcare',       segment: 'Enterprise' },
    { id: 'ACC-006', name: 'Crestwood Manufacturing',    segment: 'Mid-Market' },
    { id: 'ACC-007', name: 'Luminary Tech Partners',     segment: 'Enterprise' },
    { id: 'ACC-008', name: 'Harborview Energy Systems',  segment: 'Enterprise' },
    { id: 'ACC-009', name: 'Pinnacle Retail Group',      segment: 'Mid-Market' },
    { id: 'ACC-010', name: 'Redwood Public Services',    segment: 'Public Sector' },
    { id: 'ACC-011', name: 'Cobalt Pharmaceuticals',     segment: 'Enterprise' },
    { id: 'ACC-012', name: 'Summit Aerospace & Defense', segment: 'Public Sector' },
    { id: 'ACC-013', name: 'Irongate Capital Markets',   segment: 'Enterprise' },
    { id: 'ACC-014', name: 'Cascade Consumer Goods',     segment: 'Mid-Market' },
    { id: 'ACC-015', name: 'TerraCore Utilities',        segment: 'Enterprise' },
  ];

  const SOLUTION_AREAS = [
    { l1: 'Cloud Platform',    l2: 'Analytics & AI',       isFSM: false },
    { l1: 'Cloud Platform',    l2: 'Integration Suite',    isFSM: false },
    { l1: 'Cloud Platform',    l2: 'Database Services',    isFSM: false },
    { l1: 'Business Apps',     l2: 'ERP Core',             isFSM: false },
    { l1: 'Business Apps',     l2: 'Finance & Accounting', isFSM: false },
    { l1: 'Business Apps',     l2: 'Supply Chain',         isFSM: false },
    { l1: 'Business Apps',     l2: 'Human Capital Mgmt',   isFSM: false },
    { l1: 'Field Services',    l2: 'Field Service Mgmt',   l3: 'Scheduling Engine', isFSM: true },
    { l1: 'Field Services',    l2: 'Field Service Mgmt',   l3: 'Mobile Workforce',  isFSM: true },
    { l1: 'Customer Experience', l2: 'CRM & Sales',        isFSM: false },
    { l1: 'Customer Experience', l2: 'Commerce Cloud',     isFSM: false },
  ];

  const AEs = [
    'Alex Rivera',
    'Jordan Kim',
    'Taylor Okonkwo',
    'Morgan Stein',
    'Casey Patel',
    'Drew Nakamura',
    'Quinn Abrams',
  ];

  const FORECAST_STATUSES = ['Committed', 'Best Case', 'Upside', 'Pipeline'];
  const OPP_TYPES = ['New Attach', 'Cross-Sell', 'Renewal Expansion'];

  const HIGH_LEVEL_ITEMS = {
    'Analytics & AI':       { standard: 'Nexus Analytics Professional', enhanced: 'Nexus Analytics Enterprise + AI Pack' },
    'Integration Suite':    { standard: 'Nexus Integration Hub',        enhanced: 'Nexus Integration Hub — Premium' },
    'Database Services':    { standard: 'Nexus DB Standard',            enhanced: 'Nexus DB Enterprise' },
    'ERP Core':             { standard: 'Nexus ERP Professional',       enhanced: 'Nexus ERP Enterprise Suite' },
    'Finance & Accounting': { standard: 'Nexus Finance Cloud',          enhanced: 'Nexus Finance + Treasury Module' },
    'Supply Chain':         { standard: 'Nexus Supply Chain Essentials', enhanced: 'Nexus Supply Chain Advanced' },
    'Human Capital Mgmt':   { standard: 'Nexus HCM Core',              enhanced: 'Nexus HCM + Talent Suite' },
    'Field Service Mgmt':   { standard: 'Nexus FSM Professional',      enhanced: 'Nexus FSM Enterprise' },
    'CRM & Sales':          { standard: 'Nexus CRM Standard',          enhanced: 'Nexus CRM + Revenue Cloud' },
    'Commerce Cloud':       { standard: 'Nexus Commerce Essentials',    enhanced: 'Nexus Commerce Plus' },
  };

  // ── Opportunity generation ────────────────────────────────────────────────────

  let _oppCounter = 1000;

  function _oppId() {
    return `NX-OPP-${++_oppCounter}`;
  }

  function _pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function _acv(min, max) {
    return Math.round((min + Math.random() * (max - min)) / 1000) * 1000;
  }

  function _buildRows() {
    const rows = [];
    let keyCounter = 0;

    for (const account of ACCOUNTS) {
      // Each account has 2–5 solution areas
      const numSols = 2 + Math.floor(Math.random() * 4);
      const shuffled = [...SOLUTION_AREAS].sort(() => Math.random() - 0.5).slice(0, numSols);
      const ae = _pick(AEs);

      for (const sol of shuffled) {
        // Each sol area has 1–3 opps
        const numOpps = 1 + Math.floor(Math.random() * 3);

        for (let i = 0; i < numOpps; i++) {
          const oppId = _oppId();
          const acv   = _acv(125_000, 2_400_000);
          const hli   = HIGH_LEVEL_ITEMS[sol.l2] ?? { standard: 'Nexus Cloud Module', enhanced: 'Nexus Cloud Module — Premium' };
          const key   = sol.isFSM
            ? `${oppId}|${sol.l2}|${sol.l3}`
            : `${oppId}|${sol.l2}`;

          rows.push({
            key,
            oppId,
            customerId:          account.id,
            planningEntityId:    `PE-${account.id}`,
            customerName:        account.name,
            endCustomerRaw:      account.id,
            salesSegment:        account.segment,
            sae:                 ae,
            forecastStatus:      _pick(FORECAST_STATUSES),
            l1:                  sol.l1,
            l2:                  sol.l2,
            l3:                  sol.l3 ?? null,
            isFSM:               sol.isFSM,
            eligibleAcv:         acv,
            recommendation:      Math.random() > 0.5 ? 'Enhanced' : 'Standard',
            highLevelItemStandard: hli.standard,
            highLevelItemEnhanced: hli.enhanced,
            oppType:             _pick(OPP_TYPES),
          });
        }
      }
    }

    return rows;
  }

  // ── CAS rows (second dashboard — Customer Adoption Services analog) ───────────

  function _buildCasRows() {
    const rows = [];

    for (const account of ACCOUNTS.slice(0, 12)) {
      const numSols = 2 + Math.floor(Math.random() * 3);
      const shuffled = [...SOLUTION_AREAS].sort(() => Math.random() - 0.5).slice(0, numSols);
      const ae = _pick(AEs);

      for (const sol of shuffled) {
        const acv    = _acv(80_000, 1_800_000);
        const cardKey = sol.isFSM
          ? `${account.id}|${sol.l2}|${sol.l3}`
          : `${account.id}|${sol.l2}`;

        rows.push({
          cardKey,
          customerId:    account.id,
          customerName:  account.name,
          salesSegment:  account.segment,
          sae:           ae,
          l2:            sol.l2,
          l3:            sol.l3 ?? null,
          isFSM:         sol.isFSM,
          cloudifiedAcv: acv,
          forecastStatus: _pick(['Committed', 'Probable', 'Upside']),
          numOpps:       1 + Math.floor(Math.random() * 4),
        });
      }
    }

    return rows;
  }

  // ── Public ────────────────────────────────────────────────────────────────────

  // Seed random with fixed value for consistent demo output
  // (We use a simple deterministic shuffle to keep data stable across reloads)
  function _seededRows() {
    // Re-run with same seed order — ACCOUNTS and SOLUTION_AREAS are fixed arrays
    // so output is deterministic given fixed _oppCounter start
    _oppCounter = 1000;
    return _buildRows();
  }

  function _seededCasRows() {
    return _buildCasRows();
  }

  return {
    getSpRows:  _seededRows,
    getCasRows: _seededCasRows,
    accounts:   ACCOUNTS,
    aes:        AEs,
  };

})();
