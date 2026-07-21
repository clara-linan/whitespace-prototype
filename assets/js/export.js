/**
 * export.js — Excel export for Horizon Portfolio Tool.
 * Exports qualified-in opportunities to a styled .xlsx file.
 * Uses xlsx-js-style (MIT licensed).
 */

const _COLS = [
  { key: 'Account Name',      wch: 32, align: 'left'  },
  { key: 'Account ID',        wch: 18, align: 'left'  },
  { key: 'Solution Area',     wch: 28, align: 'left'  },
  { key: 'Tier',              wch: 12, align: 'left'  },
  { key: 'Account Executive', wch: 24, align: 'left'  },
  { key: 'Segment',           wch: 16, align: 'left'  },
  { key: 'Eligible ACV',      wch: 16, align: 'right', numFmt: '"$"#,##0' },
  { key: 'Opp Value',         wch: 14, align: 'right', numFmt: '"$"#,##0' },
  { key: 'Deal Description',  wch: 48, align: 'left'  },
  { key: 'High Level Item',   wch: 36, align: 'left'  },
  { key: 'Close Date',        wch: 14, align: 'left'  },
];

const _B = {
  top:    { style: 'thin', color: { rgb: 'D1D5DB' } },
  bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
  left:   { style: 'thin', color: { rgb: 'D1D5DB' } },
  right:  { style: 'thin', color: { rgb: 'D1D5DB' } },
};

function _hdrStyle(hAlign) {
  return {
    font:      { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
    fill:      { patternType: 'solid', fgColor: { rgb: '1B4F8A' } },
    alignment: { horizontal: hAlign, vertical: 'center' },
    border:    _B,
  };
}

function _dataStyle(hAlign, alt) {
  return {
    font:      { sz: 11, name: 'Calibri', color: { rgb: '111827' } },
    fill:      alt ? { patternType: 'solid', fgColor: { rgb: 'EEF4FB' } } : { patternType: 'none' },
    alignment: { horizontal: hAlign, vertical: 'center' },
    border:    _B,
  };
}

function buildExportRows(keys, log) {
  const cardMap = new Map();
  for (const key of keys) {
    const group = AppState.getGroup(key);
    if (!group) continue;
    const cardKey = group.isFSM
      ? `${group.customerName}|${group.l2}|${group.l3}`
      : `${group.customerName}|${group.l2}`;
    if (!cardMap.has(cardKey)) cardMap.set(cardKey, { cardKey, groups: [] });
    cardMap.get(cardKey).groups.push(group);
  }

  const rows = [];
  for (const { cardKey, groups } of cardMap.values()) {
    const first    = groups[0];
    const totalAcv = groups.reduce((s, g) => s + g.eligibleAcv, 0);
    const rec      = AppState.getCardRecommendation(cardKey);
    const oppValue = calcOppValue(totalAcv, rec);
    const hli      = rec === 'Enhanced' ? first.highLevelItemEnhanced : first.highLevelItemStandard;
    const solArea  = first.isFSM ? `${first.l2} / ${first.l3}` : first.l2;

    rows.push({
      'Account Name':      first.customerName,
      'Account ID':        first.customerId || '',
      'Solution Area':     solArea,
      'Tier':              rec,
      'Account Executive': first.sae || '',
      'Segment':           first.salesSegment || '',
      'Eligible ACV':      totalAcv,
      'Opp Value':         oppValue,
      'Deal Description':  `${first.customerName} — ${solArea} (${rec})`,
      'High Level Item':   hli || '',
      'Close Date':        '12/31/2025',
    });
  }
  return rows;
}

function _buildSheet(rows) {
  const ws = {};
  _COLS.forEach((col, c) => {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    ws[addr] = { v: col.key, t: 's', s: _hdrStyle('center') };
  });
  rows.forEach((row, r) => {
    const alt = r % 2 === 1;
    _COLS.forEach((col, c) => {
      const addr  = XLSX.utils.encode_cell({ r: r + 1, c });
      const val   = row[col.key];
      const isNum = typeof val === 'number';
      const cell  = { v: val ?? '', t: isNum ? 'n' : 's', s: _dataStyle(col.align, alt) };
      if (isNum && col.numFmt) cell.z = col.numFmt;
      ws[addr] = cell;
    });
  });
  ws['!ref']  = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: _COLS.length - 1 } });
  ws['!cols'] = _COLS.map(col => ({ wch: col.wch }));
  ws['!rows'] = [{ hpt: 22 }, ...rows.map(() => ({ hpt: 18 }))];
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };
  return ws;
}

function _fileName() {
  const d  = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `Horizon_Qualified_Opps_${d.getFullYear()}${mm}${dd}.xlsx`;
}

function _triggerDownload(rows, fileName) {
  if (!rows.length) return;
  const ws = _buildSheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Qualified Opps');
  XLSX.writeFile(wb, fileName, { cellStyles: true });
}

function downloadNew(log) {
  const keys = AppState.getUnexportedQualifiedInKeys();
  if (!keys.length) return;
  _triggerDownload(buildExportRows(keys, log), _fileName());
  AppState.markExported(keys);
}

function downloadAll(log) {
  const keys = AppState.getAllQualifiedInKeys();
  if (!keys.length) return;
  _triggerDownload(buildExportRows(keys, log), _fileName());
}

function hasUnexportedRows()  { return AppState.getUnexportedQualifiedInKeys().length > 0; }
function hasAnyQualifiedRows(){ return AppState.getAllQualifiedInKeys().length > 0; }
