import { ElectricityExpenseRecord } from './dashboardService';

export const DEFAULT_SPREADSHEET_ID = '1Xxr1Nz38gxRR-nQN9Zqq0zKSPb4gRkujTuKxHppVfS8';
export const DEFAULT_SHEET_TAB_NAME = 'ค่าไฟฟ้าโรงสี';
export const DEFAULT_EXPENSES_HUB_TAB = 'ข้อมูลรายจ่ายโรงสี';
export const DEFAULT_MAINTENANCE_TAB = 'ประวัติค่าซ่อมบำรุงเครื่องจักรโรงสี';
export const DEFAULT_CAPEX_TAB = 'รายการลงทุนเพิ่มทรัพย์สินและสิ่งปลูกสร้าง (CapEx)';

export interface GoogleSpreadsheetInfo {
  id: string;
  title: string;
  sheets: string[];
}

export interface SmartScannedBill {
  id: string;
  fileName: string;
  fileData?: string;
  fileType: 'image' | 'pdf';
  category: 'electricity' | 'maintenance' | 'capex' | 'expenses_hub';
  categoryLabel: string;
  vendorName: string;
  billDate: string;
  invoiceNo: string;
  totalAmountBaht: number;
  vatAmountBaht?: number;
  description: string;
  confidenceScore?: number | string;
  reasoning?: string;

  // Specific category fields
  caNumber?: string;
  meterNumber?: string;
  billingPeriod?: string;
  totalUnitsKwh?: number;
  peakUnitsKwh?: number;
  offPeakUnitsKwh?: number;

  machineName?: string;
  maintenanceType?: string;
  replacedParts?: string;
  technician?: string;

  assetProjectTitle?: string;
  expectedLifespanYears?: number;
  estimatedRoiNotes?: string;

  paymentMethod?: string;
  scannedAt: string;
  status?: 'pending' | 'synced' | 'error';
}

/**
 * Get spreadsheet details and tab list
 */
export async function getSpreadsheetInfo(
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<GoogleSpreadsheetInfo> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ไม่สามารถเชื่อมต่อ Google Sheet (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);

  return {
    id: data.spreadsheetId,
    title: data.properties?.title || 'รายการรายจ่ายโรงสี',
    sheets,
  };
}

/**
 * Ensure the sheet tab exists, if not create it
 */
export async function ensureSheetTabExists(
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  tabName: string = DEFAULT_SHEET_TAB_NAME
): Promise<void> {
  try {
    const info = await getSpreadsheetInfo(accessToken, spreadsheetId);
    if (!info.sheets.includes(tabName)) {
      // Create the tab
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              addSheet: {
                properties: { title: tabName },
              },
            },
          ],
        }),
      });
    }
  } catch (err) {
    console.warn('Tab verification warning:', err);
  }
}

/**
 * Header row definition for Electricity Expenses
 */
const ELECTRICITY_HEADERS = [
  'ID',
  'รอบเดือน (Billing Period)',
  'หมายเลขผู้ใช้ (CA)',
  'หมายเลขมิเตอร์',
  'ยอดเงินรวม (บาท)',
  'หน่วยรวม (kWh)',
  'On-Peak (kWh)',
  'Off-Peak (kWh)',
  'Peak Demand (kW)',
  'ค่า FT (บาท)',
  'ค่าปรับ PF (บาท)',
  'ภาษี VAT (บาท)',
  'วิเคราะห์ AI',
  'วันที่อัปเดต'
];

/**
 * Convert record object to Google Sheet row
 */
function recordToRow(r: ElectricityExpenseRecord): (string | number)[] {
  return [
    r.id || '',
    r.billingPeriod || '',
    r.caNumber || '',
    r.meterNumber || '',
    r.totalAmountBaht || 0,
    r.totalUnitsKwh || 0,
    r.peakUnitsKwh || 0,
    r.offPeakUnitsKwh || 0,
    r.peakDemandKw || 0,
    r.ftTotalBaht || 0,
    r.powerFactorPenaltyBaht || 0,
    r.vatAmountBaht || 0,
    r.efficiencyAnalysis || '',
    new Date().toLocaleString('th-TH')
  ];
}

/**
 * Convert Google Sheet row to ElectricityExpenseRecord
 */
function rowToRecord(row: any[], index: number): ElectricityExpenseRecord {
  return {
    id: row[0] ? String(row[0]) : `elec-gsheet-${index}`,
    billingPeriod: row[1] ? String(row[1]) : '01/2026',
    caNumber: row[2] ? String(row[2]) : '020001849201',
    meterNumber: row[3] ? String(row[3]) : '7718920',
    totalAmountBaht: Number(row[4]) || 0,
    totalUnitsKwh: Number(row[5]) || 0,
    peakUnitsKwh: Number(row[6]) || 0,
    offPeakUnitsKwh: Number(row[7]) || 0,
    peakDemandKw: Number(row[8]) || 0,
    ftTotalBaht: Number(row[9]) || 0,
    powerFactorPenaltyBaht: Number(row[10]) || 0,
    vatAmountBaht: Number(row[11]) || 0,
    efficiencyAnalysis: row[12] ? String(row[12]) : '',
    ftRatePerUnit: 0.3972,
    peakAmountBaht: (Number(row[6]) || 0) * 4.32,
    offPeakAmountBaht: (Number(row[7]) || 0) * 2.63
  };
}

/**
 * Read electricity expenses from Google Sheet
 */
export async function fetchElectricityExpensesFromSheet(
  accessToken: string,
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  tabName: string = DEFAULT_SHEET_TAB_NAME
): Promise<ElectricityExpenseRecord[]> {
  await ensureSheetTabExists(accessToken, spreadsheetId, tabName);

  const encodedTab = encodeURIComponent(tabName);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:N500`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`ไม่สามารถอ่านข้อมูลจาก Google Sheets: ${res.statusText}`);
  }

  const data = await res.json();
  const rows: any[][] = data.values || [];

  if (rows.length <= 1) {
    // Empty or headers only
    return [];
  }

  // Skip header row
  const records = rows.slice(1).map((row, idx) => rowToRecord(row, idx));
  return records.filter(r => r.billingPeriod && r.billingPeriod !== 'รอบเดือน (Billing Period)');
}

/**
 * Overwrite / Full sync records to Google Sheet
 */
export async function syncAllElectricityExpensesToSheet(
  accessToken: string,
  records: ElectricityExpenseRecord[],
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID,
  tabName: string = DEFAULT_SHEET_TAB_NAME
): Promise<void> {
  await ensureSheetTabExists(accessToken, spreadsheetId, tabName);

  const values = [
    ELECTRICITY_HEADERS,
    ...records.map(recordToRow)
  ];

  const encodedTab = encodeURIComponent(tabName);
  // Clear existing content first
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:N500:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Write new content
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1?valueInputOption=USER_ENTERED`;
  const res = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`บันทึกลง Google Sheets ไม่สำเร็จ: ${errText}`);
  }
}

/**
 * Header definitions for the 3 new expense tabs
 */
export const EXPENSES_HUB_HEADERS = [
  'ID',
  'วันที่',
  'หมวดหมู่รายจ่าย',
  'รายการ / รายละเอียด',
  'ผู้เสนอ / ร้านค้า',
  'จำนวนเงิน (บาท)',
  'ภาษี VAT (บาท)',
  'วิธีชำระ',
  'หมายเหตุ / อ้างอิงบิล',
  'วันที่อัปเดต'
];

export const MAINTENANCE_HEADERS = [
  'ID',
  'วันที่',
  'ชื่อเครื่องจักร / อุปกรณ์',
  'ประเภทการซ่อมบำรุง',
  'รายการอะไหล่ที่เปลี่ยน',
  'ช่าง / ผู้รับเหมา',
  'ค่าใช้จ่าย (บาท)',
  'สถานะ',
  'หมายเหตุ / อ้างอิงบิล',
  'วันที่อัปเดต'
];

export const CAPEX_HEADERS = [
  'ID',
  'วันที่',
  'โครงการ / ทรัพย์สิน',
  'หมวดหมู่ CapEx',
  'มูลค่าการลงทุน (บาท)',
  'อายุใช้งาน (ปี)',
  'ผลตอบแทนการลงทุน (ROI)',
  'สถานะโครงการ',
  'หมายเหตุ / อ้างอิงบิล',
  'วันที่อัปเดต'
];

/**
 * Append or Sync a batch of Smart Scanned Bills into Google Sheets based on category
 */
export async function syncSmartScannedBillsToGoogleSheets(
  accessToken: string,
  bills: SmartScannedBill[],
  spreadsheetId: string = DEFAULT_SPREADSHEET_ID
): Promise<{ successCount: number; errors: string[] }> {
  let successCount = 0;
  const errors: string[] = [];

  // Group bills by category
  const electricityBills = bills.filter(b => b.category === 'electricity');
  const expensesHubBills = bills.filter(b => b.category === 'expenses_hub');
  const maintenanceBills = bills.filter(b => b.category === 'maintenance');
  const capexBills = bills.filter(b => b.category === 'capex');

  const nowStr = new Date().toLocaleString('th-TH');

  // 1. Process Electricity Bills
  if (electricityBills.length > 0) {
    try {
      await ensureSheetTabExists(accessToken, spreadsheetId, DEFAULT_SHEET_TAB_NAME);
      const rows = electricityBills.map(b => [
        b.id || `ELEC-${Date.now()}`,
        b.billingPeriod || b.billDate || '07/2569',
        b.caNumber || '020029119125',
        b.meterNumber || '6300584313',
        b.totalAmountBaht || 0,
        b.totalUnitsKwh || 0,
        b.peakUnitsKwh || 0,
        b.offPeakUnitsKwh || 0,
        0, // Peak demand
        0, // FT
        0, // PF penalty
        b.vatAmountBaht || 0,
        `สแกนจาก ${b.fileName} (${b.reasoning || 'บิลไฟฟ้า PEA'})`,
        nowStr
      ]);
      await appendRowsToTab(accessToken, spreadsheetId, DEFAULT_SHEET_TAB_NAME, ELECTRICITY_HEADERS, rows);
      successCount += electricityBills.length;
    } catch (err: any) {
      errors.push(`ค่าไฟฟ้าโรงสี: ${err.message || err}`);
    }
  }

  // 2. Process Expenses Hub Bills
  if (expensesHubBills.length > 0) {
    try {
      await ensureSheetTabExists(accessToken, spreadsheetId, DEFAULT_EXPENSES_HUB_TAB);
      const rows = expensesHubBills.map(b => [
        b.id || `EXP-${Date.now()}`,
        b.billDate || new Date().toISOString().split('T')[0],
        b.categoryLabel || 'รายจ่ายดำเนินงานทั่วไป',
        b.description || b.fileName,
        b.vendorName || 'ร้านค้า / ซัพพลายเออร์',
        b.totalAmountBaht || 0,
        b.vatAmountBaht || 0,
        b.paymentMethod || 'โอนชำระ / เงินสด',
        `เลขที่บิล: ${b.invoiceNo || '-'} (สแกน AI)`,
        nowStr
      ]);
      await appendRowsToTab(accessToken, spreadsheetId, DEFAULT_EXPENSES_HUB_TAB, EXPENSES_HUB_HEADERS, rows);
      successCount += expensesHubBills.length;
    } catch (err: any) {
      errors.push(`ข้อมูลรายจ่ายโรงสี: ${err.message || err}`);
    }
  }

  // 3. Process Maintenance Bills
  if (maintenanceBills.length > 0) {
    try {
      await ensureSheetTabExists(accessToken, spreadsheetId, DEFAULT_MAINTENANCE_TAB);
      const rows = maintenanceBills.map(b => [
        b.id || `MAINT-${Date.now()}`,
        b.billDate || new Date().toISOString().split('T')[0],
        b.machineName || 'เครื่องขัดเงา / เครื่องสีข้าว',
        b.maintenanceType || 'ซ่อมบำรุงเชิงแก้ไข',
        b.replacedParts || b.description || 'อะไหล่เครื่องจักร',
        b.technician || b.vendorName || 'ช่างประจำโรงสี',
        b.totalAmountBaht || 0,
        'เสร็จสิ้น',
        `เลขที่บิล: ${b.invoiceNo || '-'} (สแกน AI)`,
        nowStr
      ]);
      await appendRowsToTab(accessToken, spreadsheetId, DEFAULT_MAINTENANCE_TAB, MAINTENANCE_HEADERS, rows);
      successCount += maintenanceBills.length;
    } catch (err: any) {
      errors.push(`ประวัติค่าซ่อมบำรุง: ${err.message || err}`);
    }
  }

  // 4. Process CapEx Bills
  if (capexBills.length > 0) {
    try {
      await ensureSheetTabExists(accessToken, spreadsheetId, DEFAULT_CAPEX_TAB);
      const rows = capexBills.map(b => [
        b.id || `CAPEX-${Date.now()}`,
        b.billDate || new Date().toISOString().split('T')[0],
        b.assetProjectTitle || b.description || 'โครงการสิ่งปลูกสร้าง / ทรัพย์สินใหม่',
        'สินทรัพย์และสิ่งปลูกสร้าง',
        b.totalAmountBaht || 0,
        b.expectedLifespanYears || 10,
        b.estimatedRoiNotes || 'เพิ่มประสิทธิภาพการผลิต',
        'อนุมัติแล้ว',
        `เลขที่บิล: ${b.invoiceNo || '-'} (สแกน AI)`,
        nowStr
      ]);
      await appendRowsToTab(accessToken, spreadsheetId, DEFAULT_CAPEX_TAB, CAPEX_HEADERS, rows);
      successCount += capexBills.length;
    } catch (err: any) {
      errors.push(`CapEx: ${err.message || err}`);
    }
  }

  return { successCount, errors };
}

/**
 * Helper to check if tab is empty, write headers if so, and append rows
 */
async function appendRowsToTab(
  accessToken: string,
  spreadsheetId: string,
  tabName: string,
  headers: string[],
  rows: (string | number)[][]
): Promise<void> {
  const encodedTab = encodeURIComponent(tabName);
  
  // Read existing content
  const checkUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:A2`;
  const checkRes = await fetch(checkUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const checkData = await checkRes.json();
  const existingValues = checkData.values || [];

  if (existingValues.length === 0) {
    // Write headers first
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1?valueInputOption=USER_ENTERED`;
    await fetch(headerUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [headers] }),
    });
  }

  // Append new rows
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedTab}!A1:append?valueInputOption=USER_ENTERED`;
  const appendRes = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: rows }),
  });

  if (!appendRes.ok) {
    const errText = await appendRes.text();
    throw new Error(`ไม่สามารถเพิ่มข้อมูลใน ${tabName}: ${errText}`);
  }
}

