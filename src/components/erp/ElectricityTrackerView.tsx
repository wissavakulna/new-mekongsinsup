import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, Calendar, DollarSign, TrendingDown, Sparkles, Plus, Trash2, Edit,
  CheckCircle, AlertTriangle, FileText, Upload, Gauge, Sun, Activity,
  Sliders, RefreshCw, BarChart3, PieChart as PieChartIcon, Info, ArrowUpRight,
  ShieldAlert, ChevronRight, Check, X, Building2, FileSpreadsheet, ExternalLink,
  Database, LogIn, LogOut, Loader2
} from 'lucide-react';
import { 
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { ElectricityExpenseRecord } from '../../services/dashboardService';
import { PeaBillFullDetailsModal } from './PeaBillFullDetailsModal';
import { User } from 'firebase/auth';
import { 
  googleSignIn, 
  initAuth, 
  logoutGoogle, 
  getAccessToken 
} from '../../services/googleAuthService';
import { 
  fetchElectricityExpensesFromSheet, 
  syncAllElectricityExpensesToSheet, 
  DEFAULT_SPREADSHEET_ID, 
  DEFAULT_SHEET_TAB_NAME 
} from '../../services/googleSheetsService';

interface ElectricityTrackerViewProps {
  electricityExpenses: ElectricityExpenseRecord[];
  onUpdateRecords?: (updated: ElectricityExpenseRecord[]) => void;
}

// Initial mock historical records (expanded for rich multi-month charts + PEA Smart Invoice PDF record)
const INITIAL_HISTORICAL_RECORDS: ElectricityExpenseRecord[] = [
  {
    id: 'elec-pdf-012569',
    billingPeriod: '01/2569',
    caNumber: '020029119125',
    meterNumber: '6300584313',
    customerName: 'นายวิศวะ กุลนะ',
    invoiceNo: '000012533268',
    dueDate: '23 กุมภาพันธ์ 2569',
    totalAmountBaht: 13919.32,
    totalUnitsKwh: 2067.03,
    peakUnitsKwh: 1268.06,
    offPeakUnitsKwh: 798.97,
    peakAmountBaht: 5305.44,
    offPeakAmountBaht: 2080.28,
    ftRatePerUnit: 0.0972,
    ftTotalBaht: 200.92,
    vatAmountBaht: 910.61,
    peakDemandKw: 47.67,
    powerFactorPenaltyBaht: 0,
    efficiencyAnalysis: 'บิลค่าไฟฟ้าฉบับเต็มจากการสแกน Smart Invoice ประจำเดือน 01/2569 ผู้ใช้ไฟฟ้า นายวิศวะ กุลนะ ยอดรวมชำระ 13,919.32 บาท',
    fullBillDetails: {
      documentTitle: 'ใบแจ้งค่าไฟฟ้า Smart Invoice (ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษี)',
      peaOfficeName: 'การไฟฟ้าส่วนภูมิภาคจังหวัดนครพนม',
      peaOfficePhone: '0-4251-3091',
      customerName: 'นายวิศวะ กุลนะ',
      address: '149 บ.หนองยาว ม.11 ต.คำเตย อ.เมืองนครพนม จ.นครพนม 48000',
      caNumber: '020029119125',
      invoiceNo: '000012533268',
      totalAmountDue: 13919.32,
      dueDate: '23 กุมภาพันธ์ 2569',
      documentDate: '03/02/2569',
      printedDate: '31-07-2569 14:11:55',
      peaCode: 'D06101',
      mru: 'DNPN9021',
      peaNo: '6300584313',
      rateType: '3224',
      meterReadingDate: '29/01/2569',
      billPeriod: '01/2569',
      voltageLevel: '22-33 KV',
      multiplier: 30,
      usageReadings: [
        { typeLabel: 'พลังไฟฟ้าสูงสุด P (กิโลวัตต์)', code: 'P', recentReading: 20.618, previousReading: 19.060, multiplierNote: '+2%', consumptionUnit: 47.67 },
        { typeLabel: 'พลังไฟฟ้าสูงสุด OP (กิโลวัตต์)', code: 'OP', recentReading: 18.609, previousReading: 18.432, multiplierNote: '+2%', consumptionUnit: 5.42 },
        { typeLabel: 'พลังไฟฟ้าสูงสุด H (กิโลวัตต์)', code: 'H', recentReading: 22.629, previousReading: 21.439, multiplierNote: '+2%', consumptionUnit: 36.41 },
        { typeLabel: 'พลังงานไฟฟ้า P (หน่วย)', code: 'P', recentReading: 1959.350, previousReading: 1917.910, multiplierNote: '+2%', consumptionUnit: 1268.06 },
        { typeLabel: 'พลังงานไฟฟ้า OP (หน่วย)', code: 'OP', recentReading: 1355.100, previousReading: 1348.000, multiplierNote: '+2%', consumptionUnit: 217.26 },
        { typeLabel: 'พลังงานไฟฟ้า H (หน่วย)', code: 'H', recentReading: 1741.520, previousReading: 1722.510, multiplierNote: '+2%', consumptionUnit: 581.71 },
        { typeLabel: 'กิโลวาร์ (kVAR)', code: 'kVAR', recentReading: 10.788, previousReading: 9.279, multiplierNote: '+2%', consumptionUnit: 45.27 }
      ],
      tariffBreakdown: [
        { itemLabel: 'Peak 47.67 กว.', quantity: 47.67, unitLabel: 'กว.', ratePerUnit: 132.9300, amountBaht: 5109.83 },
        { itemLabel: 'Off Peak 36.41 กว.', quantity: 36.41, unitLabel: 'กว.', ratePerUnit: 0.0000, amountBaht: 0.00 },
        { itemLabel: 'Peak 1268.06 หน่วย', quantity: 1268.06, unitLabel: 'หน่วย', ratePerUnit: 4.1839, amountBaht: 5305.44 },
        { itemLabel: 'Off Peak 798.97 หน่วย', quantity: 798.97, unitLabel: 'หน่วย', ratePerUnit: 2.6037, amountBaht: 2080.28 },
        { itemLabel: 'ค่าบริการรายเดือน (Service Charge)', quantity: 1, unitLabel: 'เดือน', ratePerUnit: 312.2400, amountBaht: 312.24 }
      ],
      serviceCharge: 312.24,
      totalBasedAmount: 12807.79,
      installationDateNote: 'ติดตั้งใหม่ 15/12/2568',
      basedAmount: 12807.79,
      ftFormulaNote: 'ม.ค.69-เม.ย.69 = 0.0972 บาท/หน่วย',
      ftRatePerUnit: 0.0972,
      ftTotalAmount: 200.92,
      discountAmount: 0.00,
      subTotalAmount: 13008.71,
      vatRatePercent: 7.00,
      vatAmount: 910.61,
      currentMonthTotal: 13919.32,
      grandTotal: 13919.32,
      barcodeNumber: '|099400016550100 020029119125 690223 1391932',
      announcementMsg: '*** กรณีมีค่าไฟฟ้าค้างชำระเดือนก่อน โปรดชำระทันที เนื่องจากถึงกำหนดงดจ่ายไฟ ขออภัยหากชำระเงินแล้ว'
    }
  },
  {
    id: 'elec-7',
    billingPeriod: '07/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 49800.00,
    totalUnitsKwh: 10150,
    peakUnitsKwh: 6400,
    offPeakUnitsKwh: 3750,
    peakAmountBaht: 27800.00,
    offPeakAmountBaht: 11400.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 4041.73,
    vatAmountBaht: 3257.70,
    peakDemandKw: 88.2,
    powerFactorPenaltyBaht: 0,
    efficiencyAnalysis: 'หน่วยสัดส่วน On-Peak อยู่ที่ 63% แนะนำปรับตารางเดินเครื่องขัดสีข้าวช่วง 22:00 - 09:00 น.',
    energySavingTips: [
      'ปรับย้ายรอบขัดสีข้าวถุงล่วงหน้าเข้า Off-Peak เพื่อประหยัดเพิ่มขึ้น ฿6,200/เดือน',
      'ตรวจสอบ Capacitor Bank ก่อนเข้าฤดูสีข้าวนาปรัง'
    ]
  },
  {
    id: 'elec-6',
    billingPeriod: '06/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 48250.75,
    totalUnitsKwh: 9850,
    peakUnitsKwh: 6150,
    offPeakUnitsKwh: 3700,
    peakAmountBaht: 26800.00,
    offPeakAmountBaht: 11200.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 3922.27,
    vatAmountBaht: 3156.40,
    peakDemandKw: 85.4,
    powerFactorPenaltyBaht: 0,
    efficiencyAnalysis: 'ช่วงเดินเครื่อง On-Peak สูงถึง 62.4% แนะนำสลับการสีข้าวช่วงกลางคืน (Off-Peak 22:00-09:00 น.)',
    energySavingTips: [
      'สลับรอบการเดินเครื่องขัดสีข้าวไปยังช่วง Off-Peak 22:00-09:00 น. ลดต้นทุนพลังงานได้ถึง 25%',
      'ติดตั้งระบบ Solar Rooftop บนหลังคาโกดังโรงสีเพื่อลดการดึงไฟฟ้า On-Peak ในช่วงกลางวัน'
    ]
  },
  {
    id: 'elec-5',
    billingPeriod: '05/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 42100.00,
    totalUnitsKwh: 8600,
    peakUnitsKwh: 5200,
    offPeakUnitsKwh: 3400,
    peakAmountBaht: 22600.00,
    offPeakAmountBaht: 10300.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 3424.52,
    vatAmountBaht: 2754.20,
    peakDemandKw: 78.2,
    powerFactorPenaltyBaht: 0
  },
  {
    id: 'elec-4',
    billingPeriod: '04/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 54600.00,
    totalUnitsKwh: 11200,
    peakUnitsKwh: 7100,
    offPeakUnitsKwh: 4100,
    peakAmountBaht: 30800.00,
    offPeakAmountBaht: 12400.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 4459.84,
    vatAmountBaht: 3572.10,
    peakDemandKw: 92.5,
    powerFactorPenaltyBaht: 1200.00 // Example power factor penalty
  },
  {
    id: 'elec-3',
    billingPeriod: '03/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 41200.00,
    totalUnitsKwh: 8400,
    peakUnitsKwh: 5000,
    offPeakUnitsKwh: 3400,
    peakAmountBaht: 21800.00,
    offPeakAmountBaht: 10300.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 3344.88,
    vatAmountBaht: 2695.10,
    peakDemandKw: 76.0,
    powerFactorPenaltyBaht: 0
  },
  {
    id: 'elec-2',
    billingPeriod: '02/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 38900.00,
    totalUnitsKwh: 7900,
    peakUnitsKwh: 4600,
    offPeakUnitsKwh: 3300,
    peakAmountBaht: 20100.00,
    offPeakAmountBaht: 9900.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 3145.78,
    vatAmountBaht: 2544.80,
    peakDemandKw: 72.1,
    powerFactorPenaltyBaht: 0
  },
  {
    id: 'elec-1',
    billingPeriod: '01/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: 45300.00,
    totalUnitsKwh: 9200,
    peakUnitsKwh: 5700,
    offPeakUnitsKwh: 3500,
    peakAmountBaht: 24800.00,
    offPeakAmountBaht: 10600.00,
    ftRatePerUnit: 0.3982,
    ftTotalBaht: 3663.44,
    vatAmountBaht: 2963.20,
    peakDemandKw: 81.0,
    powerFactorPenaltyBaht: 0
  }
];

export default function ElectricityTrackerView({
  electricityExpenses,
  onUpdateRecords
}: ElectricityTrackerViewProps) {
  // Combine passed records with initial historical records for rich visualization
  const [records, setRecords] = useState<ElectricityExpenseRecord[]>(() => {
    let rawList = INITIAL_HISTORICAL_RECORDS;
    const saved = localStorage.getItem('mekong_electricity_records');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          rawList = parsed;
        }
      } catch (e) {
        console.error(e);
      }
    } else if (electricityExpenses && electricityExpenses.length > 0) {
      const mergedMap = new Map<string, ElectricityExpenseRecord>();
      INITIAL_HISTORICAL_RECORDS.forEach(r => mergedMap.set(r.billingPeriod, r));
      electricityExpenses.forEach(r => mergedMap.set(r.billingPeriod, r));
      rawList = Array.from(mergedMap.values());
    }

    // Sanitize list to ensure guaranteed unique IDs across all items
    const seenIds = new Set<string>();
    return rawList.map((r, idx) => {
      let safeId = r.id;
      if (!safeId || seenIds.has(safeId)) {
        safeId = `elec-clean-${r.billingPeriod ? r.billingPeriod.replace('/', '-') : idx}-${idx}`;
      }
      seenIds.add(safeId);
      return { ...r, id: safeId };
    });
  });

  const onUpdateRecordsRef = useRef(onUpdateRecords);
  useEffect(() => {
    onUpdateRecordsRef.current = onUpdateRecords;
  }, [onUpdateRecords]);

  const isInitialMount = useRef(true);

  // Save to localStorage and notify parent when records change
  useEffect(() => {
    localStorage.setItem('mekong_electricity_records', JSON.stringify(records));
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else if (onUpdateRecordsRef.current) {
      onUpdateRecordsRef.current(records);
    }
  }, [records]);

  // Tab State: 'history' (Log & Form) | 'ai_scan' (Scanner) | 'charts' (Analytics) | 'optimization' (AI Energy Savings)
  const [activeTab, setActiveTab] = useState<'history' | 'ai_scan' | 'charts' | 'optimization'>('charts');

  // Full Smart Invoice Modal State
  const [selectedFullBillRecord, setSelectedFullBillRecord] = useState<ElectricityExpenseRecord | null>(null);

  // Google OAuth & Sheets State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [sheetSyncing, setSheetSyncing] = useState<boolean>(false);
  const [sheetSyncMsg, setSheetSyncMsg] = useState<string | null>(null);
  const [sheetSyncError, setSheetSyncError] = useState<string | null>(null);

  // Initialize Firebase Google Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthUser(user);
        setGoogleToken(token);
      },
      () => {
        setAuthUser(null);
        setGoogleToken(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Handle Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setSheetSyncError(null);
    setSheetSyncMsg(null);
    setSheetSyncing(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setAuthUser(res.user);
        setGoogleToken(res.accessToken);
        setSheetSyncMsg('เชื่อมต่อบัญชี Google และเข้าถึง Google Sheets เรียบร้อยแล้ว');
      }
    } catch (err: any) {
      setSheetSyncError(err.message || 'ไม่สามารถเข้าสู่ระบบ Google ได้');
    } finally {
      setSheetSyncing(false);
    }
  };

  // Handle Google Logout
  const handleGoogleLogout = async () => {
    await logoutGoogle();
    setAuthUser(null);
    setGoogleToken(null);
    setSheetSyncMsg(null);
    setSheetSyncError(null);
  };

  // Import Data from Google Sheet
  const handleImportFromSheet = async () => {
    if (!googleToken) {
      await handleGoogleSignIn();
      return;
    }
    setSheetSyncing(true);
    setSheetSyncError(null);
    setSheetSyncMsg(null);
    try {
      const sheetRecords = await fetchElectricityExpensesFromSheet(googleToken, DEFAULT_SPREADSHEET_ID, DEFAULT_SHEET_TAB_NAME);
      if (sheetRecords.length > 0) {
        setRecords(sheetRecords);
        setSheetSyncMsg(`ดึงข้อมูลค่าไฟฟ้าจาก Google Sheet สำเร็จแล้ว (${sheetRecords.length} รายการ)`);
      } else {
        setSheetSyncMsg('ไม่พบข้อมูลบันทึกค่าไฟใน Google Sheet (ตารางว่างเปล่า)');
      }
    } catch (err: any) {
      setSheetSyncError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheet');
    } finally {
      setSheetSyncing(false);
    }
  };

  // Export/Sync Data to Google Sheet
  const handleExportToSheet = async () => {
    let token = googleToken;
    if (!token) {
      const res = await googleSignIn();
      if (!res) return;
      token = res.accessToken;
      setAuthUser(res.user);
      setGoogleToken(res.accessToken);
    }
    setSheetSyncing(true);
    setSheetSyncError(null);
    setSheetSyncMsg(null);
    try {
      await syncAllElectricityExpensesToSheet(token, records, DEFAULT_SPREADSHEET_ID, DEFAULT_SHEET_TAB_NAME);
      setSheetSyncMsg(`ส่งออกข้อมูลไปยัง Google Sheet เรียบร้อยแล้ว (${records.length} รายการ)`);
    } catch (err: any) {
      setSheetSyncError(err.message || 'เกิดข้อผิดพลาดในการบันทึกลง Google Sheet');
    } finally {
      setSheetSyncing(false);
    }
  };

  // Custom Confirmation Dialog State for Deleting Record (to avoid iframe window.confirm issues)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; period: string } | null>(null);

  // AI Scanner state & Multi-File Batch Queue
  const [batchFiles, setBatchFiles] = useState<Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    dataUrl: string;
    status: 'pending' | 'scanning' | 'success' | 'error';
    result?: any;
    errorMsg?: string;
  }>>([]);
  const [batchProgressIndex, setBatchProgressIndex] = useState<number>(0);
  const [isBatchScanning, setIsBatchScanning] = useState<boolean>(false);

  const [elecBillImg, setElecBillImg] = useState<string | null>(null);
  const [elecBillFileName, setElecBillFileName] = useState<string>('');
  const [scanningElec, setScanningElec] = useState(false);
  const [scannedElecResult, setScannedElecResult] = useState<any | null>(null);

  // Record Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ElectricityExpenseRecord | null>(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    billingPeriod: '08/2026',
    caNumber: '020001849201',
    meterNumber: '7718920',
    totalAmountBaht: '',
    totalUnitsKwh: '',
    peakUnitsKwh: '',
    offPeakUnitsKwh: '',
    peakAmountBaht: '',
    offPeakAmountBaht: '',
    ftRatePerUnit: '0.3982',
    ftTotalBaht: '',
    vatAmountBaht: '',
    peakDemandKw: '',
    powerFactorPenaltyBaht: '0',
    efficiencyAnalysis: '',
    energySavingTips: ''
  });

  // Shift Simulator state (percentage of On-Peak workload shifted to Off-Peak)
  const [shiftPercent, setShiftPercent] = useState<number>(30); // 30% default

  // Sort records chronologically (oldest to newest for charts)
  const sortedRecordsForCharts = [...records].sort((a, b) => {
    const [mA, yA] = a.billingPeriod.split('/').map(Number);
    const [mB, yB] = b.billingPeriod.split('/').map(Number);
    if (yA !== yB) return yA - yB;
    return mA - mB;
  });

  // Sort records descending (newest first for table view)
  const sortedRecordsForTable = [...records].sort((a, b) => {
    const [mA, yA] = a.billingPeriod.split('/').map(Number);
    const [mB, yB] = b.billingPeriod.split('/').map(Number);
    if (yA !== yB) return yB - yA;
    return mB - mA;
  });

  // Calculate Aggregates
  const latestRecord = sortedRecordsForTable[0] || records[0];
  const totalCostYtd = records.reduce((sum, r) => sum + r.totalAmountBaht, 0);
  const avgMonthlyCost = records.length > 0 ? totalCostYtd / records.length : 0;
  
  const totalKwhYtd = records.reduce((sum, r) => sum + r.totalUnitsKwh, 0);
  const totalPeakKwhYtd = records.reduce((sum, r) => sum + r.peakUnitsKwh, 0);
  const totalOffPeakKwhYtd = records.reduce((sum, r) => sum + r.offPeakUnitsKwh, 0);
  
  const peakKwhRatio = totalKwhYtd > 0 ? (totalPeakKwhYtd / totalKwhYtd) * 100 : 0;
  const offPeakKwhRatio = totalKwhYtd > 0 ? (totalOffPeakKwhYtd / totalKwhYtd) * 100 : 0;

  const maxDemandKwYtd = Math.max(...records.map(r => r.peakDemandKw || 0));
  const totalPfPenaltyYtd = records.reduce((sum, r) => sum + (r.powerFactorPenaltyBaht || 0), 0);

  // Multi-File Batch Upload Handler
  const handleBatchFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles: File[] = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    const newItems: typeof batchFiles = [];
    let loadedCount = 0;

    selectedFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newItems.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          dataUrl: reader.result as string,
          status: 'pending'
        });
        loadedCount++;
        if (loadedCount === selectedFiles.length) {
          setBatchFiles(prev => [...prev, ...newItems]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input value to allow re-uploading same file if deleted
    e.target.value = '';
  };

  const handleRemoveBatchFile = (id: string) => {
    setBatchFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleClearAllBatchFiles = () => {
    if (batchFiles.length === 0) return;
    if (confirm('คุณต้องการลบไฟล์ที่อัปโหลดทั้งหมดในคิวหรือไม่?')) {
      setBatchFiles([]);
      setBatchProgressIndex(0);
    }
  };

  // Run Batch Scan for All Files in Queue
  const handleRunBatchScan = async () => {
    const pendingFiles = batchFiles.filter(f => f.status === 'pending' || f.status === 'error');
    if (pendingFiles.length === 0) {
      alert('ไม่มีไฟล์รอดำเนินการสแกนในคิว');
      return;
    }

    setIsBatchScanning(true);

    for (let i = 0; i < batchFiles.length; i++) {
      const file = batchFiles[i];
      if (file.status === 'success') continue;

      // Update current file status to 'scanning'
      setBatchFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'scanning' } : f));
      setBatchProgressIndex(i + 1);

      try {
        const res = await fetch('/api/gemini/analyze-electricity-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ billImage: file.dataUrl })
        });
        const data = await res.json();
        if (data.success && data.data) {
          setBatchFiles(prev => prev.map(f => f.id === file.id ? {
            ...f,
            status: 'success',
            result: data.data
          } : f));
        } else {
          setBatchFiles(prev => prev.map(f => f.id === file.id ? {
            ...f,
            status: 'error',
            errorMsg: data.error || 'ไม่สามารถวิเคราะห์ข้อมูลได้'
          } : f));
        }
      } catch (err) {
        console.error('Error scanning file:', file.fileName, err);
        setBatchFiles(prev => prev.map(f => f.id === file.id ? {
          ...f,
          status: 'error',
          errorMsg: 'เกิดข้อผิดพลาดในการเชื่อมต่อ AI Server'
        } : f));
      }
    }

    setIsBatchScanning(false);
  };

  // Save All Batch Scanned Results to History Log
  const handleSaveAllBatchResults = () => {
    const successfulItems = batchFiles.filter(f => f.status === 'success' && f.result);
    if (successfulItems.length === 0) {
      alert('ไม่มีรายการที่สแกนสำเร็จเพื่อบันทึก');
      return;
    }

    const newRecords: ElectricityExpenseRecord[] = successfulItems.map(f => {
      const r = f.result;
      return {
        id: `elec-batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        billingPeriod: r.billingPeriod || '08/2026',
        caNumber: r.caNumber || '020001849201',
        meterNumber: r.meterNumber || '7718920',
        totalAmountBaht: typeof r.totalAmountBaht === 'number' ? r.totalAmountBaht : parseFloat(r.totalAmountBaht) || 0,
        totalUnitsKwh: typeof r.totalUnitsKwh === 'number' ? r.totalUnitsKwh : parseFloat(r.totalUnitsKwh) || 0,
        peakUnitsKwh: typeof r.peakUnitsKwh === 'number' ? r.peakUnitsKwh : parseFloat(r.peakUnitsKwh) || 0,
        offPeakUnitsKwh: typeof r.offPeakUnitsKwh === 'number' ? r.offPeakUnitsKwh : parseFloat(r.offPeakUnitsKwh) || 0,
        peakAmountBaht: typeof r.peakAmountBaht === 'number' ? r.peakAmountBaht : parseFloat(r.peakAmountBaht) || 0,
        offPeakAmountBaht: typeof r.offPeakAmountBaht === 'number' ? r.offPeakAmountBaht : parseFloat(r.offPeakAmountBaht) || 0,
        ftRatePerUnit: typeof r.ftRatePerUnit === 'number' ? r.ftRatePerUnit : parseFloat(r.ftRatePerUnit) || 0.3982,
        ftTotalBaht: typeof r.ftTotalBaht === 'number' ? r.ftTotalBaht : parseFloat(r.ftTotalBaht) || 0,
        vatAmountBaht: typeof r.vatAmountBaht === 'number' ? r.vatAmountBaht : parseFloat(r.vatAmountBaht) || 0,
        peakDemandKw: typeof r.peakDemandKw === 'number' ? r.peakDemandKw : parseFloat(r.peakDemandKw) || 0,
        powerFactorPenaltyBaht: typeof r.powerFactorPenaltyBaht === 'number' ? r.powerFactorPenaltyBaht : parseFloat(r.powerFactorPenaltyBaht) || 0,
        efficiencyAnalysis: r.efficiencyAnalysis || undefined,
        energySavingTips: Array.isArray(r.energySavingTips) ? r.energySavingTips : undefined
      };
    });

    setRecords(prev => {
      const existingMap = new Map<string, ElectricityExpenseRecord>();
      prev.forEach(item => existingMap.set(item.billingPeriod, item));
      newRecords.forEach(item => existingMap.set(item.billingPeriod, item));
      return Array.from(existingMap.values());
    });

    alert(`บันทึกข้อมูลบิลค่าไฟเรียบร้อยแล้วทั้งหมด ${newRecords.length} งวดข้อมูล! ระบบทำการอัปเดตกราฟและรายงานเรียบร้อยแล้ว`);
    setActiveTab('charts');
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setElecBillFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setElecBillImg(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // AI Scanner API Call
  const handleScanElectricityBill = async () => {
    if (!elecBillImg) {
      alert('กรุณาอัปโหลดหรือถ่ายภาพบิลค่าไฟฟ้า PEA/MEA');
      return;
    }
    setScanningElec(true);
    try {
      const res = await fetch('/api/gemini/analyze-electricity-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billImage: elecBillImg })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setScannedElecResult(data.data);
      } else {
        alert('เกิดข้อผิดพลาดในการสแกน: ' + (data.error || 'ไม่สามารถวิเคราะห์ข้อมูลได้'));
      }
    } catch (err) {
      console.error('Electricity AI scan error:', err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ AI Server');
    } finally {
      setScanningElec(false);
    }
  };

  // Apply Scanned Result to Modal Form for Saving
  const handleApplyScanToForm = (scanned: any) => {
    setFormData({
      billingPeriod: scanned.billingPeriod || '08/2026',
      caNumber: scanned.caNumber || '020001849201',
      meterNumber: scanned.meterNumber || '7718920',
      totalAmountBaht: scanned.totalAmountBaht?.toString() || '',
      totalUnitsKwh: scanned.totalUnitsKwh?.toString() || '',
      peakUnitsKwh: scanned.peakUnitsKwh?.toString() || '',
      offPeakUnitsKwh: scanned.offPeakUnitsKwh?.toString() || '',
      peakAmountBaht: scanned.peakAmountBaht?.toString() || '',
      offPeakAmountBaht: scanned.offPeakAmountBaht?.toString() || '',
      ftRatePerUnit: scanned.ftRatePerUnit?.toString() || '0.3982',
      ftTotalBaht: scanned.ftTotalBaht?.toString() || '',
      vatAmountBaht: scanned.vatAmountBaht?.toString() || '',
      peakDemandKw: scanned.peakDemandKw?.toString() || '',
      powerFactorPenaltyBaht: scanned.powerFactorPenaltyBaht?.toString() || '0',
      efficiencyAnalysis: scanned.efficiencyAnalysis || '',
      energySavingTips: Array.isArray(scanned.energySavingTips) ? scanned.energySavingTips.join('\n') : ''
    });
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  // Open Modal for New Record
  const handleOpenAddModal = () => {
    const today = new Date();
    const curMonth = String(today.getMonth() + 1).padStart(2, '0');
    const curYear = today.getFullYear();
    setFormData({
      billingPeriod: `${curMonth}/${curYear}`,
      caNumber: '020001849201',
      meterNumber: '7718920',
      totalAmountBaht: '',
      totalUnitsKwh: '',
      peakUnitsKwh: '',
      offPeakUnitsKwh: '',
      peakAmountBaht: '',
      offPeakAmountBaht: '',
      ftRatePerUnit: '0.3982',
      ftTotalBaht: '',
      vatAmountBaht: '',
      peakDemandKw: '',
      powerFactorPenaltyBaht: '0',
      efficiencyAnalysis: '',
      energySavingTips: ''
    });
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  // Open Modal for Editing Record
  const handleOpenEditModal = (rec: ElectricityExpenseRecord) => {
    setEditingRecord(rec);
    setFormData({
      billingPeriod: rec.billingPeriod,
      caNumber: rec.caNumber,
      meterNumber: rec.meterNumber || '7718920',
      totalAmountBaht: rec.totalAmountBaht.toString(),
      totalUnitsKwh: rec.totalUnitsKwh.toString(),
      peakUnitsKwh: rec.peakUnitsKwh.toString(),
      offPeakUnitsKwh: rec.offPeakUnitsKwh.toString(),
      peakAmountBaht: rec.peakAmountBaht?.toString() || '',
      offPeakAmountBaht: rec.offPeakAmountBaht?.toString() || '',
      ftRatePerUnit: rec.ftRatePerUnit?.toString() || '0.3982',
      ftTotalBaht: rec.ftTotalBaht?.toString() || '',
      vatAmountBaht: rec.vatAmountBaht?.toString() || '',
      peakDemandKw: rec.peakDemandKw?.toString() || '',
      powerFactorPenaltyBaht: rec.powerFactorPenaltyBaht?.toString() || '0',
      efficiencyAnalysis: rec.efficiencyAnalysis || '',
      energySavingTips: rec.energySavingTips ? rec.energySavingTips.join('\n') : ''
    });
    setIsModalOpen(true);
  };

  // Save Record
  const handleSaveRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.billingPeriod || !formData.totalAmountBaht) {
      alert('กรุณากรอกรอบเดือน และยอดรวมค่าไฟฟ้า');
      return;
    }

    const tipsArray = formData.energySavingTips
      .split('\n')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const newRecord: ElectricityExpenseRecord = {
      id: editingRecord ? editingRecord.id : `elec-${Date.now()}`,
      billingPeriod: formData.billingPeriod,
      caNumber: formData.caNumber || '020001849201',
      meterNumber: formData.meterNumber || '7718920',
      totalAmountBaht: parseFloat(formData.totalAmountBaht) || 0,
      totalUnitsKwh: parseFloat(formData.totalUnitsKwh) || 0,
      peakUnitsKwh: parseFloat(formData.peakUnitsKwh) || 0,
      offPeakUnitsKwh: parseFloat(formData.offPeakUnitsKwh) || 0,
      peakAmountBaht: parseFloat(formData.peakAmountBaht) || 0,
      offPeakAmountBaht: parseFloat(formData.offPeakAmountBaht) || 0,
      ftRatePerUnit: parseFloat(formData.ftRatePerUnit) || 0.3982,
      ftTotalBaht: parseFloat(formData.ftTotalBaht) || 0,
      vatAmountBaht: parseFloat(formData.vatAmountBaht) || 0,
      peakDemandKw: parseFloat(formData.peakDemandKw) || 0,
      powerFactorPenaltyBaht: parseFloat(formData.powerFactorPenaltyBaht) || 0,
      efficiencyAnalysis: formData.efficiencyAnalysis || undefined,
      energySavingTips: tipsArray.length > 0 ? tipsArray : undefined
    };

    if (editingRecord) {
      setRecords(prev => prev.map(r => r.id === editingRecord.id ? newRecord : r));
    } else {
      // Replace existing month if duplicate
      setRecords(prev => {
        const filtered = prev.filter(r => r.billingPeriod !== newRecord.billingPeriod);
        return [newRecord, ...filtered];
      });
    }

    setIsModalOpen(false);
    setActiveTab('charts');
  };

  // Delete Record via Custom Dialog Modal
  const handleDeleteRecord = (id: string, period: string) => {
    setDeleteTarget({ id, period });
  };

  const executeDelete = () => {
    if (!deleteTarget) return;
    const { id, period } = deleteTarget;
    setRecords(prev => {
      const nextRecords = prev.filter(r => r.id !== id && r.billingPeriod !== period);
      // If connected to Google Sheets, auto sync updated list
      if (googleToken) {
        syncAllElectricityExpensesToSheet(googleToken, nextRecords, DEFAULT_SPREADSHEET_ID, DEFAULT_SHEET_TAB_NAME)
          .catch(err => console.error('Auto sync error after delete:', err));
      }
      return nextRecords;
    });
    setDeleteTarget(null);
  };

  // --- Off-Peak Shift Savings Calculation ---
  // PEA TOU Rate Type 4.2 (Industrial Mill 22-33 kV):
  // On-Peak Rate approx: ฿4.35 / kWh
  // Off-Peak Rate approx: ฿2.63 / kWh
  // Difference: ~฿1.72 / kWh saved
  const avgPeakUnits = latestRecord ? latestRecord.peakUnitsKwh : 6000;
  const shiftedUnits = Math.round((avgPeakUnits * shiftPercent) / 100);
  const rateDiffBaht = 1.72; // Baht saved per kWh shifted
  const estimatedMonthlySavings = Math.round(shiftedUnits * rateDiffBaht);
  const estimatedAnnualSavings = estimatedMonthlySavings * 12;

  // Chart Data Preparation
  const chartData = sortedRecordsForCharts.map(r => ({
    period: r.billingPeriod,
    totalCost: r.totalAmountBaht,
    peakKwh: r.peakUnitsKwh,
    offPeakKwh: r.offPeakUnitsKwh,
    totalKwh: r.totalUnitsKwh,
    peakDemandKw: r.peakDemandKw,
    avgBahtPerKwh: r.totalUnitsKwh > 0 ? Number((r.totalAmountBaht / r.totalUnitsKwh).toFixed(2)) : 0
  }));

  const pieData = [
    { name: 'On-Peak (09:00 - 22:00 น.)', value: totalPeakKwhYtd, color: '#f59e0b' },
    { name: 'Off-Peak (22:00 - 09:00 น.)', value: totalOffPeakKwhYtd, color: '#0284c7' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Metrics */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[11px] border border-blue-500/30 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                ระบบบริหารและเพิ่มประสิทธิภาพพลังงานไฟฟ้าโรงสี (PEA Energy Intelligence)
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
              ค่าไฟฟ้าโรงสีรวมประจำปี {records.length > 0 ? `(${records.length} งวดบันทึก)` : ''}
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              วิเคราะห์โครงสร้างค่าไฟ On-Peak / Off-Peak, Peak Demand, FT Rate และแนะนำแนวทางประหยัดต้นทุนพลังงานอัตโนมัติ
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + บันทึกบิลค่าไฟประจำเดือน
            </button>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 font-medium block">ยอดค่าไฟภาคล่าสุด ({latestRecord?.billingPeriod || '-'})</span>
            <span className="text-lg font-black text-rose-400">฿{latestRecord?.totalAmountBaht?.toLocaleString() || '0'}</span>
            <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
              เฉลี่ย ฿{Math.round(avgMonthlyCost).toLocaleString()} / เดือน
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 font-medium block">หน่วยไฟรวม (kWh)</span>
            <span className="text-lg font-black text-blue-300">{totalKwhYtd.toLocaleString()} <span className="text-xs font-normal">หน่วย</span></span>
            <span className="text-[10px] text-amber-400 block mt-0.5 font-bold">
              On-Peak {peakKwhRatio.toFixed(1)}% | Off-Peak {offPeakKwhRatio.toFixed(1)}%
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 font-medium block">Peak Demand ความต้องการสูงสุด</span>
            <span className="text-lg font-black text-amber-400">{maxDemandKwYtd} <span className="text-xs font-normal">kW</span></span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              ควมคุม Peak เพื่อลด surcharge kW
            </span>
          </div>

          <div className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/80">
            <span className="text-[11px] text-slate-400 font-medium block">Power Factor Penalty</span>
            <span className={`text-lg font-black ${totalPfPenaltyYtd > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              ฿{totalPfPenaltyYtd.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-300 block mt-0.5">
              {totalPfPenaltyYtd > 0 ? '⚠️ ควรตรวจเช็ค Capacitor Bank' : '✅ สถานะ PF ปกติ (> 0.85)'}
            </span>
          </div>
        </div>
      </div>

      {/* Google Sheets Database Synchronization Control Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 text-emerald-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-emerald-400" />
                  ฐานข้อมูล Google Sheets รายจ่ายโรงสี
                </span>
                <a
                  href="https://docs.google.com/spreadsheets/d/1Xxr1Nz38gxRR-nQN9Zqq0zKSPb4gRkujTuKxHppVfS8/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-300 underline font-mono flex items-center gap-1 hover:text-emerald-200"
                >
                  เปิด Google Sheet (1Xxr1Nz38...)
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1">
                {authUser ? (
                  <span className="text-emerald-300 font-medium">
                    🟢 เชื่อมต่อในชื่อ: <strong className="text-white">{authUser.email}</strong> — สามารถดึงข้อมูลและบันทึกซิงค์ข้อมูลค่าไฟฟ้าได้แบบเรียลไทม์
                  </span>
                ) : (
                  <span>
                    กดปุ่มลงชื่อเข้าใช้ Google เพื่อเชื่อมต่อและอ่าน/เขียนข้อมูลบันทึกรายจ่ายโรงสีโดยตรงกับ Google Sheet ของคุณ
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {authUser ? (
              <>
                <button
                  onClick={handleImportFromSheet}
                  disabled={sheetSyncing}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  title="ดึงข้อมูลจาก Google Sheet เข้าสู่แอป"
                >
                  {sheetSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  ดึงข้อมูลจาก Sheet
                </button>
                <button
                  onClick={handleExportToSheet}
                  disabled={sheetSyncing}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                  title="ส่งออก/ซิงค์รายการปัจจุบันลงใน Google Sheet"
                >
                  {sheetSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  บันทึกซิงค์ลง Sheet
                </button>
                <button
                  onClick={handleGoogleLogout}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition flex items-center gap-1"
                  title="ออกจากระบบ Google"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  ออก
                </button>
              </>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                disabled={sheetSyncing}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {sheetSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                เชื่อมต่อ Google Sheets (Sign In)
              </button>
            )}
          </div>
        </div>

        {/* Feedback Messages */}
        {sheetSyncMsg && (
          <div className="mt-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              {sheetSyncMsg}
            </span>
            <button onClick={() => setSheetSyncMsg(null)} className="text-emerald-400 hover:text-white text-xs">✕</button>
          </div>
        )}

        {sheetSyncError && (
          <div className="mt-3 p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              {sheetSyncError}
            </span>
            <button onClick={() => setSheetSyncError(null)} className="text-rose-400 hover:text-white text-xs">✕</button>
          </div>
        )}
      </div>

      {/* Navigation Tabs inside Electricity Tracker */}
      <div className="flex border-b border-slate-200 gap-2 bg-slate-50 p-1.5 rounded-xl">
        <button
          onClick={() => setActiveTab('charts')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'charts'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-600" />
          กราฟและแนวโน้มการใช้ไฟ
        </button>

        <button
          onClick={() => setActiveTab('optimization')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'optimization'
              ? 'bg-white text-emerald-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          AI แนะนำลดต้นทุน & โซลาร์เซลล์โรงสี
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'history'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4 text-purple-600" />
          ประวัติบันทึกรายเดือน ({records.length})
        </button>

        <button
          onClick={() => setActiveTab('ai_scan')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'ai_scan'
              ? 'bg-white text-blue-700 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Upload className="w-4 h-4 text-indigo-600" />
          AI สแกนบิลไฟฟ้า (.JPG / .PDF)
        </button>
      </div>

      {/* TAB 1: CHARTS & ANALYTICS */}
      {activeTab === 'charts' && (
        <div className="space-y-6">
          {/* Main Composed Chart: Monthly Cost & kWh Units */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  แนวโน้มค่าไฟฟ้า & หน่วยพลังงานแยก On-Peak / Off-Peak รายเดือน
                </h3>
                <p className="text-xs text-slate-500">เปรียบเทียบปริมาณการใช้ไฟช่วงกลางวัน (On-Peak) และช่วงกลางคืน (Off-Peak) พร้อมยอดค่าไฟรวม (บาท)</p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                PEA TOU Tariff Rate 4.2
              </span>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" orientation="left" stroke="#0284c7" tick={{ fontSize: 11 }} label={{ value: 'หน่วย (kWh)', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#e11d48" tick={{ fontSize: 11 }} label={{ value: 'ยอดรวม (บาท)', angle: 90, position: 'insideRight', fontSize: 10 }} />
                  <Tooltip 
                    formatter={(value: any, name: any) => {
                      if (name === 'ยอดค่าไฟรวม (บาท)') return [`฿${Number(value).toLocaleString()}`, name];
                      if (name === 'On-Peak kWh' || name === 'Off-Peak kWh') return [`${Number(value).toLocaleString()} kWh`, name];
                      return [value, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="left" dataKey="peakKwh" name="On-Peak kWh (09:00-22:00 น.)" stackId="kwh" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar yAxisId="left" dataKey="offPeakKwh" name="Off-Peak kWh (22:00-09:00 น.)" stackId="kwh" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="totalCost" name="ยอดค่าไฟรวม (บาท)" stroke="#e11d48" strokeWidth={3} dot={{ r: 5, fill: '#e11d48' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2 Sub Charts: Ratio Pie Chart & Peak Demand kW Trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* On-Peak vs Off-Peak Ratio */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-amber-500" />
                  สัดส่วนหน่วยไฟฟ้า On-Peak vs Off-Peak ทั้งหมด
                </h4>
                <p className="text-xs text-slate-500 mb-3">เป้าหมายคือการเพิ่มสัดส่วน Off-Peak ให้เกิน 50% เพื่อลดต้นทุนการขัดสีข้าว</p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} kWh`, 'หน่วย']} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                <p className="font-bold mb-0.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> ข้อสังเกตโครงสร้างค่าไฟ TOU
                </p>
                <p className="text-[11px] text-amber-700">
                  หน่วย On-Peak ถูกคิดราคาประมาณ ฿4.35/หน่วย ขณะที่ Off-Peak ถูกคิดเพียง ฿2.63/หน่วย (ประหยัดได้ ฿1.72/หน่วย)
                </p>
              </div>
            </div>

            {/* Peak Demand kW Trend */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  แนวโน้ม Peak Demand (ความต้องการพลังไฟฟ้าสูงสุด kW)
                </h4>
                <p className="text-xs text-slate-500 mb-3">การสตาร์ทเครื่องจักรพร้อมกันหลายเครื่องในคราวเดียวจะดันค่า Peak Demand ให้สูงขึ้น</p>
                
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 'auto']} />
                      <Tooltip formatter={(val: any) => [`${val} kW`, 'Peak Demand']} />
                      <Area type="monotone" dataKey="peakDemandKw" stroke="#2563eb" fill="#dbeafe" strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
                <p className="font-bold mb-0.5 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-blue-600" /> เทคนิคการคุม Peak Demand
                </p>
                <p className="text-[11px] text-blue-800">
                  ใช้สวิตช์ตั้งเวลา (Staggered Soft Starter) ทยอยเปิดมอเตอร์ใหญ่ทีละเครื่อง ห่างกันอย่างน้อย 15 นาที เพื่อไม่ให้เกิดกระแสกระชาก
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AI OPTIMIZATION & SOLAR FEASIBILITY */}
      {activeTab === 'optimization' && (
        <div className="space-y-6">
          {/* Interactive Off-Peak Shift Calculator */}
          <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white border border-emerald-800/80 rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/30 flex items-center gap-1 w-fit mb-2">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  จำลองผลตอบแทนการย้ายกะการขัดสีข้าว (Shift Workload Simulator)
                </span>
                <h3 className="text-xl font-black text-white">
                  คำนวณเงินประหยัดเมื่อสลับเวลาเดินเครื่องสีข้าวไปช่วง Off-Peak (22:00 - 09:00 น.)
                </h3>
                <p className="text-xs text-emerald-200 mt-1">
                  ลากสไลเดอร์เพื่อประเมินเงินที่จะประหยัดได้ต่อเดือนและต่อปี หากย้ายรอบสีข้าวหลักเข้าช่วงกลางคืน
                </p>
              </div>

              <div className="bg-slate-800/90 border border-emerald-500/30 p-4 rounded-xl text-center min-w-[200px]">
                <span className="text-xs text-slate-300 font-medium block">ประมาณการเงินประหยัดได้/ปี</span>
                <span className="text-2xl font-black text-emerald-400">฿{estimatedAnnualSavings.toLocaleString()}</span>
                <span className="text-[10px] text-emerald-300 block font-semibold mt-0.5">
                  (ประหยัด ฿{estimatedMonthlySavings.toLocaleString()} / เดือน)
                </span>
              </div>
            </div>

            {/* Slider Control */}
            <div className="bg-slate-800/70 p-5 rounded-xl border border-slate-700 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-300">สัดส่วนที่สลับไป Off-Peak:</span>
                <span className="font-black text-base text-amber-300">{shiftPercent}% ของปริมาณงาน On-Peak</span>
              </div>

              <input 
                type="range" 
                min="0" 
                max="80" 
                step="5" 
                value={shiftPercent} 
                onChange={(e) => setShiftPercent(Number(e.target.value))}
                className="w-full h-2.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">หน่วยไฟที่ย้ายได้:</span>
                  <span className="font-bold text-white text-sm">{shiftedUnits.toLocaleString()} kWh/เดือน</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">ส่วนต่างอัตราค่าไฟ:</span>
                  <span className="font-bold text-emerald-400 text-sm">฿1.72 / kWh</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">ประหยัดต่อเดือน:</span>
                  <span className="font-bold text-emerald-400 text-sm">฿{estimatedMonthlySavings.toLocaleString()}</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[11px]">ประหยัดสะสม 5 ปี:</span>
                  <span className="font-bold text-amber-300 text-sm">฿{(estimatedAnnualSavings * 5).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rice Mill Energy Optimization Recommendations Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Solar Rooftop Feasibility */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-400 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                    <Sun className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-[10px] rounded-full">
                    คุ้มทุนสูง (High ROI)
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 mb-1">
                  วิเคราะห์คุ้มค่าติดตั้ง Solar Rooftop บนหลังคาโกดังโรงสี
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  โรงสีมีพื้นที่หลังคาโกดังเก็บข้าวเปลือกขนาดใหญ่ ได้รับแสงแดดเต็มที่ช่วง On-Peak (09:00 - 16:00 น.)
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs mb-4">
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-600">ขนาดระบบที่แนะนำ:</span>
                    <span className="font-bold text-slate-900">100 kWp (ใช้พื้นที่หลังคา ~600 ตร.ม.)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-600">ประมาณการผลิตไฟ/เดือน:</span>
                    <span className="font-bold text-blue-600">~12,500 kWh (ตัดยอด On-Peak)</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-600">ประหยัดค่าไฟสุทธิ/เดือน:</span>
                    <span className="font-bold text-emerald-600">฿45,000 - ฿52,000 / เดือน</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ระยะเวลาคืนทุน (Payback Period):</span>
                    <span className="font-bold text-amber-600">ประมาณ 3.8 - 4.2 ปี</span>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>คำแนะนำ AI:</strong> ใช้สิทธิประโยชน์ลดหย่อนภาษี BOI สำหรับการปรับปรุงประสิทธิภาพการใช้พลังงานโรงสีเพิ่มเติม
                </p>
              </div>
            </div>

            {/* Card 2: Power Factor & Capacitor Bank */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-400 transition flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                    <ShieldAlert className="w-5 h-5" />
                  </span>
                  <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 font-bold text-[10px] rounded-full">
                    การซ่อมบำรุงเชิงป้องกัน
                  </span>
                </div>

                <h4 className="text-base font-bold text-slate-900 mb-1">
                  ตรวจสอบระบบปรับปรุง Power Factor (Capacitor Bank)
                </h4>
                <p className="text-xs text-slate-600 mb-4">
                  มอเตอร์ขนาดใหญ่ในโรงสี (มอเตอร์พัดลมดูดแกลบ, ตู้อัด, เครื่องคัดสี) สร้าง Reactive Power (kVAR) สูง
                </p>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 text-xs mb-4">
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-600">ค่า PF เป้าหมาย PEA:</span>
                    <span className="font-bold text-emerald-600">&gt; 0.85 Lagging</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-600">ค่าปรับหาก PF ต่ำกว่าเกณฑ์:</span>
                    <span className="font-bold text-rose-600">฿56.07 ต่อ kVAR / เดือน</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                    <span className="text-slate-600">สถานะปัจจุบัน:</span>
                    <span className="font-bold text-emerald-700">ไม่มีค่าปรับ PF (ปกติ)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">กำหนดการตรวจเช็ค Cap Bank:</span>
                    <span className="font-bold text-slate-800">ทุกๆ 6 เดือน ก่อนฤดูสีข้าว</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>คำแนะนำ AI:</strong> หากพบคอนเดนเซอร์บวมหรือเสื่อมสภาพ ให้เปลี่ยนเฉพาะคาปาซิเตอร์ลูกที่เสียเพื่อรักษาระดับ PF ให้เกิน 0.90 เสมอ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MONTHLY HISTORY LOG & RECORD EDITOR */}
      {activeTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                ประวัติการบันทึกค่าไฟฟ้า PEA รายเดือน (Monthly Electricity Database)
              </h3>
              <p className="text-xs text-slate-500">ตารางบันทึกข้อมูลย้อนหลัง แก้ไข หรือเพิ่มบิลค่าไฟฟ้าใหม่</p>
            </div>

            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              เพิ่มบันทึกค่าไฟประจำเดือน
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">รอบเดือน</th>
                  <th className="p-3">ผู้ใช้ไฟฟ้า / หมายเลข (CA)</th>
                  <th className="p-3 text-right">หน่วยรวม (kWh)</th>
                  <th className="p-3 text-center">On-Peak / Off-Peak</th>
                  <th className="p-3 text-right">Peak Demand (kW)</th>
                  <th className="p-3 text-right">ค่า FT (บาท)</th>
                  <th className="p-3 text-right">ค่าปรับ PF (บาท)</th>
                  <th className="p-3 text-right font-bold">ยอดเงินรวม (บาท)</th>
                  <th className="p-3 text-center">บิลฉบับเต็ม</th>
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRecordsForTable.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900 font-mono text-xs">
                      {r.billingPeriod}
                      {r.fullBillDetails && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-semibold">
                          Smart Invoice
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-slate-600">
                      <div className="font-bold text-slate-900">{r.customerName || 'โรงสีข้าว'}</div>
                      <div className="text-[11px] text-slate-500">CA: {r.caNumber}</div>
                    </td>
                    <td className="p-3 text-right font-semibold text-slate-900">{r.totalUnitsKwh.toLocaleString()}</td>
                    <td className="p-3 text-center text-xs">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold">
                        {r.peakUnitsKwh.toLocaleString()}
                      </span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[11px] font-semibold">
                        {r.offPeakUnitsKwh.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-blue-700 font-bold">{r.peakDemandKw} kW</td>
                    <td className="p-3 text-right font-mono text-slate-600">฿{r.ftTotalBaht ? r.ftTotalBaht.toLocaleString() : '-'}</td>
                    <td className="p-3 text-right font-mono">
                      {r.powerFactorPenaltyBaht > 0 ? (
                        <span className="text-rose-600 font-bold">฿{r.powerFactorPenaltyBaht.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600 text-sm">
                      ฿{r.totalAmountBaht.toLocaleString()}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => setSelectedFullBillRecord(r)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 shadow-2xs"
                        title="คลิกดูบิลค่าไฟฟ้าฉบับเต็มและทุกค่าสกัดจาก PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        ดูบิลฉบับเต็ม
                      </button>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(r)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="แก้ไขบันทึก"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRecord(r.id, r.billingPeriod)}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบรายการ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AI SCANNER CARD (SUPPORT SINGLE & MULTI-FILE BATCH SCANNING) */}
      {activeTab === 'ai_scan' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                <Zap className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  AI สแกนบิลค่าไฟฟ้า PEA แบบหลายไฟล์พร้อมกัน (Batch Multi-File Scanner)
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 font-bold text-[10px] rounded-full">
                    Gemini AI
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  อัปโหลดครั้งละหลายๆ ไฟล์ (.JPG, .PNG, .PDF) → AI จะทยอยอ่านสกัดข้อมูลค่าไฟ On-Peak / Off-Peak, Peak Demand และ VAT 7% จนครบทุกบิลในคราวเดียว
                </p>
              </div>
            </div>

            {batchFiles.length > 0 && (
              <button
                onClick={handleClearAllBatchFiles}
                disabled={isBatchScanning}
                className="px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> ล้างคิวไฟล์ทั้งหมด ({batchFiles.length})
              </button>
            )}
          </div>

          {/* UPLOAD DROPZONE FOR MULTIPLE FILES */}
          <div className="bg-slate-50/80 p-5 rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 transition text-center bg-white shadow-xs">
            <label className="cursor-pointer block py-4">
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-200 shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-sm font-bold text-slate-800 block">
                    คลิกเพื่อเลือกอัปโหลด <span className="text-blue-600 underline">หลายไฟล์พร้อมกัน</span> หรือลากไฟล์มาวางที่นี่
                  </span>
                  <span className="text-xs text-slate-500 block mt-1">
                    รองรับไฟล์เอกสาร PDF (.PDF) และไฟล์รูปภาพ (.JPG, .PNG, .WEBP) ของบิลการไฟฟ้า PEA/MEA
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 font-semibold text-xs rounded-lg border border-blue-200 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-rose-600" /> เลือกได้ทีละหลายๆ ไฟล์
                  </span>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-semibold text-xs rounded-lg border border-emerald-200 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> สแกนอัตโนมัติรวดเดียวครบ
                  </span>
                </div>
              </div>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleBatchFileUpload}
              />
            </label>
          </div>

          {/* BATCH FILES QUEUE DISPLAY */}
          {batchFiles.length > 0 && (
            <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" /> รายการไฟล์บิลไฟฟ้าในคิว ({batchFiles.length} ไฟล์)
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    สำเร็จ: <strong className="text-emerald-600">{batchFiles.filter(f => f.status === 'success').length}</strong> / {batchFiles.length}
                  </span>
                  <button
                    onClick={handleRunBatchScan}
                    disabled={isBatchScanning || batchFiles.filter(f => f.status === 'pending' || f.status === 'error').length === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs"
                  >
                    <Sparkles className={`w-4 h-4 ${isBatchScanning ? 'animate-spin' : ''}`} />
                    {isBatchScanning ? `กำลังอ่านบิล (${batchProgressIndex}/${batchFiles.length})...` : `เริ่มสแกนทุกไฟล์ในคิว (${batchFiles.filter(f => f.status === 'pending' || f.status === 'error').length})`}
                  </button>
                </div>
              </div>

              {/* PROGRESS BAR */}
              {isBatchScanning && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-600 font-semibold">
                    <span>ความคืบหน้าการประมวลผลด้วย AI...</span>
                    <span>{Math.round((batchProgressIndex / batchFiles.length) * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                      style={{ width: `${(batchProgressIndex / batchFiles.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* FILE CARDS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {batchFiles.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                      item.status === 'scanning'
                        ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-200'
                        : item.status === 'success'
                        ? 'bg-emerald-50/60 border-emerald-300'
                        : item.status === 'error'
                        ? 'bg-rose-50/60 border-rose-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {item.fileType.includes('pdf') || item.fileName.endsWith('.pdf') ? (
                          <span className="p-1.5 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                            <FileText className="w-4 h-4" />
                          </span>
                        ) : (
                          <img src={item.dataUrl} alt="preview" className="w-8 h-8 object-cover rounded-lg shrink-0 border border-slate-200" />
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate" title={item.fileName}>{item.fileName}</p>
                          <span className="text-[10px] text-slate-600 font-mono">{(item.fileSize / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                      {!isBatchScanning && (
                        <button
                          onClick={() => handleRemoveBatchFile(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition"
                          title="ลบไฟล์นี้ออก"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* STATUS BADGE */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                      {item.status === 'pending' && (
                        <span className="text-slate-500 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span> รอดำเนินการ
                        </span>
                      )}
                      {item.status === 'scanning' && (
                        <span className="text-blue-700 font-bold flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3 animate-spin text-blue-600" /> กำลังสแกน...
                        </span>
                      )}
                      {item.status === 'success' && (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> สแกนสำเร็จ (งวด {item.result?.billingPeriod || '-'})
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-rose-600 font-bold flex items-center gap-1" title={item.errorMsg}>
                          <AlertTriangle className="w-3.5 h-3.5" /> เกิดข้อผิดพลาด
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BATCH RESULTS SUMMARY TABLE */}
          {batchFiles.some(f => f.status === 'success') && (
            <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  สรุปผลลัพธ์การสแกนบิลค่าไฟทุกบิล ({batchFiles.filter(f => f.status === 'success').length} งวดข้อมูล)
                </h4>
                <button
                  onClick={handleSaveAllBatchResults}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> บันทึกข้อมูลบิลทั้งหมดเข้าประวัติรายเดือนในคลิกเดียว
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-emerald-100/60 text-emerald-900 font-bold">
                    <tr>
                      <th className="p-2.5 rounded-l-lg">รอบเดือน</th>
                      <th className="p-2.5">ยอดรวม (บาท)</th>
                      <th className="p-2.5">หน่วยรวม (kWh)</th>
                      <th className="p-2.5">On-Peak / Off-Peak</th>
                      <th className="p-2.5">Peak Demand</th>
                      <th className="p-2.5">คำแนะนำ AI</th>
                      <th className="p-2.5 text-center rounded-r-lg">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 text-slate-700">
                    {batchFiles.filter(f => f.status === 'success').map(f => (
                      <tr key={f.id} className="hover:bg-white/60 transition">
                        <td className="p-2.5 font-bold font-mono text-emerald-900">{f.result?.billingPeriod || '-'}</td>
                        <td className="p-2.5 font-bold text-rose-600 font-mono">฿{f.result?.totalAmountBaht?.toLocaleString() || '-'}</td>
                        <td className="p-2.5 font-mono text-slate-800">{f.result?.totalUnitsKwh?.toLocaleString() || '-'} kWh</td>
                        <td className="p-2.5 font-mono text-xs">
                          <span className="text-amber-700 font-bold">{f.result?.peakUnitsKwh || 0}</span> / <span className="text-blue-700 font-bold">{f.result?.offPeakUnitsKwh || 0}</span> kWh
                        </td>
                        <td className="p-2.5 font-mono text-blue-800 font-semibold">{f.result?.peakDemandKw || 0} kW</td>
                        <td className="p-2.5 text-[11px] text-slate-600 max-w-[200px] truncate">{f.result?.efficiencyAnalysis || '-'}</td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleRemoveBatchFile(f.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="ลบรายการนี้จากคิว"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SINGLE FILE AI SCANNER SECTION (OPTIONAL ALTERNATIVE) */}
          <div className="pt-4 border-t border-slate-200">
            <details className="group">
              <summary className="text-xs font-bold text-slate-600 cursor-pointer hover:text-blue-600 transition flex items-center justify-between">
                <span>📌 หรือต้องการเลือกสแกนทีละ 1 ไฟล์ และตรวจสอบก่อนบันทึก? (คลิกเพื่อเปิด)</span>
                <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform" />
              </summary>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-700 mb-2">ไฟล์/ภาพบิลค่าไฟฟ้า PEA/MEA แบบเดี่ยว (.JPG, .PNG, .PDF)</p>
                  <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 transition bg-white">
                    {elecBillImg ? (
                      elecBillImg.startsWith('data:application/pdf') || elecBillFileName.endsWith('.pdf') ? (
                        <div className="py-4 flex flex-col items-center justify-center gap-2">
                          <FileText className="w-12 h-12 text-rose-600" />
                          <span className="text-xs font-bold text-slate-900 line-clamp-1 max-w-[220px]">{elecBillFileName || 'บิลค่าไฟฟ้า PEA (PDF)'}</span>
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 font-bold text-xs rounded-lg flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> เอกสาร PDF พร้อมสแกนด้วย Gemini AI
                          </span>
                        </div>
                      ) : (
                        <img src={elecBillImg} alt="Electricity Bill" className="h-32 mx-auto object-contain rounded" />
                      )
                    ) : (
                      <div className="py-4 text-slate-500 text-xs flex flex-col items-center gap-1.5">
                        <Upload className="w-7 h-7 text-blue-500" />
                        <span className="font-semibold text-slate-700">คลิกอัปโหลดบิลเดี่ยว</span>
                        <span className="text-[10px] text-slate-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          รองรับไฟล์ .JPG, .JPEG, .PNG และไฟล์เอกสาร .PDF
                        </span>
                      </div>
                    )}
                    <input type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 mb-2">ประโยชน์ของการสแกนบิลไฟฟ้าด้วย Gemini AI</h4>
                    <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-4">
                      <li>ดึงหน่วย On-Peak และ Off-Peak อัตโนมัติ</li>
                      <li>สแกนค่าความต้องการพลังไฟฟ้า (Peak Demand kW)</li>
                      <li>ตรวจสอบค่าปรับ Power Factor Penalty</li>
                      <li>วิเคราะห์และให้คำแนะนำเวลาขัดสีข้าวล่วงหน้า</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleScanElectricityBill}
                    disabled={scanningElec}
                    className="w-full mt-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Sparkles className={`w-4 h-4 ${scanningElec ? 'animate-spin' : ''}`} />
                    {scanningElec ? 'กำลังสแกน...' : 'ประมวลผลด้วย Gemini AI'}
                  </button>
                </div>
              </div>

              {/* AI Scanned Result Display */}
              {scannedElecResult && (
                <div className="mt-4 bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-blue-600" /> ผลการสแกนบิลค่าไฟฟ้า (งวด {scannedElecResult.billingPeriod})
                    </span>
                    <button
                      onClick={() => handleApplyScanToForm(scannedElecResult)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> บันทึกเข้าประวัติรายเดือน
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block text-[10px]">ยอดรวมค่าไฟ:</span>
                      <span className="font-bold text-rose-600 text-base">฿{scannedElecResult.totalAmountBaht?.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block text-[10px]">หน่วยรวม (kWh):</span>
                      <span className="font-bold text-slate-900 text-base">{scannedElecResult.totalUnitsKwh?.toLocaleString()} kWh</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block text-[10px]">On / Off-Peak:</span>
                      <span className="font-bold text-amber-700 text-xs">{scannedElecResult.peakUnitsKwh} / {scannedElecResult.offPeakUnitsKwh} kWh</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                      <span className="text-slate-500 block text-[10px]">Peak Demand:</span>
                      <span className="font-bold text-blue-700 text-base">{scannedElecResult.peakDemandKw} kW</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-blue-100 text-slate-700">
                    <p className="font-bold text-blue-800 mb-1">💡 วิเคราะห์พฤติกรรมการใช้ไฟจาก AI:</p>
                    <p className="text-[11px] text-slate-600 mb-2">{scannedElecResult.efficiencyAnalysis}</p>
                    {scannedElecResult.energySavingTips && (
                      <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-4">
                        {scannedElecResult.energySavingTips.map((tip: string, idx: number) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </details>
          </div>
        </div>
      )}

      {/* RECORD ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" />
              {editingRecord ? 'แก้ไขบันทึกค่าไฟฟ้า' : 'บันทึกข้อมูลค่าไฟฟ้าประจำเดือน (PEA Bill)'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              กรอกข้อมูลตามใบแจ้งค่าไฟฟ้าการไฟฟ้าส่วนภูมิภาคสำหรับโรงสี
            </p>

            <form onSubmit={handleSaveRecord} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">รอบเดือน (MM/YYYY) *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น 08/2026"
                    value={formData.billingPeriod}
                    onChange={(e) => setFormData({ ...formData, billingPeriod: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">หมายเลขผู้ใช้ไฟฟ้า (CA)</label>
                  <input
                    type="text"
                    placeholder="020001849201"
                    value={formData.caNumber}
                    onChange={(e) => setFormData({ ...formData, caNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ยอดเงินรวมค่าไฟ (บาท) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="เช่น 48250.75"
                    value={formData.totalAmountBaht}
                    onChange={(e) => setFormData({ ...formData, totalAmountBaht: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-rose-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">จำนวนหน่วยรวม (kWh)</label>
                  <input
                    type="number"
                    placeholder="เช่น 9850"
                    value={formData.totalUnitsKwh}
                    onChange={(e) => setFormData({ ...formData, totalUnitsKwh: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-amber-700 block mb-1">หน่วย On-Peak (kWh)</label>
                  <input
                    type="number"
                    placeholder="เช่น 6150"
                    value={formData.peakUnitsKwh}
                    onChange={(e) => setFormData({ ...formData, peakUnitsKwh: e.target.value })}
                    className="w-full p-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-amber-900 bg-amber-50/50"
                  />
                </div>

                <div>
                  <label className="font-semibold text-blue-700 block mb-1">หน่วย Off-Peak (kWh)</label>
                  <input
                    type="number"
                    placeholder="เช่น 3700"
                    value={formData.offPeakUnitsKwh}
                    onChange={(e) => setFormData({ ...formData, offPeakUnitsKwh: e.target.value })}
                    className="w-full p-2.5 border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-900 bg-blue-50/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Peak Demand (kW)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="85.4"
                    value={formData.peakDemandKw}
                    onChange={(e) => setFormData({ ...formData, peakDemandKw: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">อัตรา FT (บาท/หน่วย)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="0.3982"
                    value={formData.ftRatePerUnit}
                    onChange={(e) => setFormData({ ...formData, ftRatePerUnit: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">ค่าปรับ PF (บาท)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0"
                    value={formData.powerFactorPenaltyBaht}
                    onChange={(e) => setFormData({ ...formData, powerFactorPenaltyBaht: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">ผลวิเคราะห์ / คำแนะนำการประหยัดไฟเพิ่มเติม</label>
                <textarea
                  rows={2}
                  placeholder="เช่น สลับเวลาขัดสีข้าวช่วง Off-Peak 22:00-09:00 น. เพื่อลดค่าใช้จ่าย"
                  value={formData.efficiencyAnalysis}
                  onChange={(e) => setFormData({ ...formData, efficiencyAnalysis: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deleting Electricity Record */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-3 bg-rose-50 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">ยืนยันการลบข้อมูล</h3>
                <p className="text-xs text-slate-500">ข้อมูลจะถูกลบออกจากระบบประวัติบันทึกค่าไฟ</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
              คุณต้องการลบรายการบันทึกค่าไฟฟ้าประจำเดือน <span className="font-bold text-rose-600">{deleteTarget.period}</span> ใช่หรือไม่?
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                ยืนยันลบข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Full PEA Smart Invoice Detail Modal */}
      <PeaBillFullDetailsModal
        record={selectedFullBillRecord}
        onClose={() => setSelectedFullBillRecord(null)}
      />
    </div>
  );
}
