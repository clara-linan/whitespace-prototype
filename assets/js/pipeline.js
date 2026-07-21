/**
 * pipeline.js — Converts flat seed rows into grouped SolAreaGroup objects.
 *
 * No proprietary logic. Groups rows by composite key (oppId + solution area),
 * sums ACV, and de-duplicates AE and opp type maps.
 */

function runPipeline(rows) {
  const log    = [];
  const groups = _buildGroups(rows, log);
  const aeByOpp    = _buildAeByOpp(rows);
  const oppTypes   = _buildOppTypes(rows);

  return { qualifiedGroups: groups, aeByOpp, oppTypes, log };
}

function _buildGroups(rows, log) {
  const groupMap = new Map();

  for (const row of rows) {
    if (!groupMap.has(row.key)) {
      groupMap.set(row.key, {
        key:               row.key,
        oppId:             row.oppId,
        customerId:        row.customerId,
        planningEntityId:  row.planningEntityId,
        customerName:      row.customerName,
        endCustomerRaw:    row.endCustomerRaw,
        salesSegment:      row.salesSegment,
        sae:               row.sae,
        forecastStatus:    row.forecastStatus,
        l1:                row.l1,
        l2:                row.l2,
        l3:                row.l3,
        isFSM:             row.isFSM,
        recommendation:    row.recommendation,
        highLevelItemStandard: row.highLevelItemStandard,
        highLevelItemEnhanced: row.highLevelItemEnhanced,
        oppType:           row.oppType,
        eligibleAcv:       0,
        rows:              [],
      });
    }

    const g = groupMap.get(row.key);
    g.eligibleAcv += row.eligibleAcv;
    g.rows.push(row);
  }

  return Array.from(groupMap.values());
}

function _buildAeByOpp(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.oppId)) map.set(row.oppId, row.sae || 'Unassigned');
  }
  return map;
}

function _buildOppTypes(rows) {
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.oppId)) map.set(row.oppId, row.oppType);
  }
  return map;
}
