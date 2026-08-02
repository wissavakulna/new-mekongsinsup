import React, { useState, useMemo } from 'react';
import { 
  Package, ShoppingCart, DollarSign, Search, Filter, Calendar, ExternalLink,
  Plus, CheckCircle, Clock, Eye, AlertCircle, FileSpreadsheet, Image as ImageIcon,
  UserCheck, MapPin, CreditCard, ArrowDownRight, Wallet, Check, Sparkles, RefreshCw
} from 'lucide-react';
import { 
  BranStockItem, SaleServiceTransaction, DailyCashReport
} from '../../services/dashboardService';

interface IncomeHubViewProps {
  branStock: BranStockItem[];
  salesServices: SaleServiceTransaction[];
  dailyCashReports: DailyCashReport[];
  onRefresh: () => void;
  loading: boolean;
}

// Complete Date Parsing Utility supporting multiple Thai/English formats, BE/AD years, slash/dash/space separators
export interface ParsedDateResult {
  year: string;       // 4-digit AD year (e.g., "2026")
  month: string;      // 2-digit month ("01"-"12")
  day: string;        // 2-digit day ("01"-"31")
  isoDate: string;    // "YYYY-MM-DD"
  isoMonth: string;   // "YYYY-MM"
  thaiYear: string;   // 4-digit BE year (e.g., "2569")
  displayThai: string; // e.g. "16 เม.ย. 2569"
}

const MONTH_MAP: Record<string, string> = {
  // English short & full
  jan: '01', january: '01',
  feb: '02', february: '02',
  mar: '03', march: '03',
  apr: '04', april: '04',
  may: '05',
  jun: '06', june: '06',
  jul: '07', july: '07',
  aug: '08', august: '08',
  sep: '09', september: '09',
  oct: '10', october: '10',
  nov: '11', november: '11',
  dec: '12', december: '12',
  // Thai short
  'ม.ค.': '01', 'ม.ค': '01',
  'ก.พ.': '02', 'ก.พ': '02',
  'มี.ค.': '03', 'มี.ค': '03',
  'เม.ย.': '04', 'เม.ย': '04',
  'พ.ค.': '05', 'พ.ค': '05',
  'มิ.ย.': '06', 'มิ.ย': '06',
  'ก.ค.': '07', 'ก.ค': '07',
  'ส.ค.': '08', 'ส.ค': '08',
  'ก.ย.': '09', 'ก.ย': '09',
  'ต.ค.': '10', 'ต.ค': '10',
  'พ.ย.': '11', 'พ.ย': '11',
  'ธ.ค.': '12', 'ธ.ค': '12',
  // Thai full
  'มกราคม': '01', 'กุมภาพันธ์': '02', 'มีนาคม': '03', 'เมษายน': '04',
  'พฤษภาคม': '05', 'มิถุนายน': '06', 'กรกฎาคม': '07', 'สิงหาคม': '08',
  'กันยายน': '09', 'ตุลาคม': '10', 'พฤศจิกายน': '11', 'ธันวาคม': '12'
};

const THAI_MONTH_SHORT = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_MONTH_FULL = ['', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

export function parseFlexibleDate(dateStr: string): ParsedDateResult {
  if (!dateStr || typeof dateStr !== 'string') {
    return { year: '', month: '', day: '', isoDate: '', isoMonth: '', thaiYear: '', displayThai: '' };
  }

  const clean = dateStr.trim();
  let day = '';
  let month = '';
  let year = '';

  // 1) ISO string like YYYY-MM-DD or YYYY-MM
  if (/^\d{4}[-/.]\d{1,2}/.test(clean)) {
    const parts = clean.split(/[-/.T ]/);
    let yNum = parseInt(parts[0], 10);
    let mNum = parseInt(parts[1], 10);
    let dNum = parts[2] ? parseInt(parts[2], 10) : 1;

    if (yNum > 2400) yNum -= 543; // Buddhist Era to AD
    year = String(yNum);
    month = String(mNum).padStart(2, '0');
    day = String(dNum).padStart(2, '0');
  } else {
    // 2) Formats like 16-Apr-2026, 28/07/2026, 16 เม.ย. 2569, 16-04-2026
    const parts = clean.split(/[-/\s]+/).filter(Boolean);

    if (parts.length >= 3) {
      const p1 = parts[0].trim();
      const p2 = parts[1].trim();
      const p3 = parts[2].trim();

      const p1Month = MONTH_MAP[p1.toLowerCase()];
      const p2Month = MONTH_MAP[p2.toLowerCase()];

      if (p2Month) {
        // Form: DD - MonthName - YYYY
        day = p1.padStart(2, '0');
        month = p2Month;
        let yNum = parseInt(p3, 10);
        if (yNum > 2400) yNum -= 543;
        else if (yNum < 100) yNum += 2000;
        year = String(yNum);
      } else if (p1Month) {
        // Form: MonthName - DD - YYYY
        month = p1Month;
        day = p2.padStart(2, '0');
        let yNum = parseInt(p3, 10);
        if (yNum > 2400) yNum -= 543;
        else if (yNum < 100) yNum += 2000;
        year = String(yNum);
      } else {
        // Numeric parts: DD/MM/YYYY or YYYY/MM/DD
        const n1 = parseInt(p1, 10);
        const n2 = parseInt(p2, 10);
        const n3 = parseInt(p3, 10);

        if (!isNaN(n1) && !isNaN(n2) && !isNaN(n3)) {
          if (n1 > 1900 || n1 > 2400) {
            // YYYY / MM / DD
            let yNum = n1 > 2400 ? n1 - 543 : n1;
            year = String(yNum);
            month = String(n2).padStart(2, '0');
            day = String(n3).padStart(2, '0');
          } else {
            // DD / MM / YYYY
            day = String(n1).padStart(2, '0');
            month = String(n2).padStart(2, '0');
            let yNum = n3 > 2400 ? n3 - 543 : (n3 < 100 ? 2000 + n3 : n3);
            year = String(yNum);
          }
        }
      }
    } else if (clean.length === 7 && clean.includes('-')) {
      // YYYY-MM
      const parts = clean.split('-');
      let yNum = parseInt(parts[0], 10);
      let mNum = parseInt(parts[1], 10);
      if (yNum > 2400) yNum -= 543;
      if (yNum > 1900) {
        year = String(yNum);
        month = String(mNum).padStart(2, '0');
        day = '01';
      }
    }
  }

  // Fallback to JS Date
  if (!year || !month || isNaN(parseInt(year, 10)) || isNaN(parseInt(month, 10))) {
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      year = String(d.getFullYear());
      month = String(d.getMonth() + 1).padStart(2, '0');
      day = String(d.getDate()).padStart(2, '0');
    }
  }

  if (!year || !month) {
    return { year: '', month: '', day: '', isoDate: clean, isoMonth: clean, thaiYear: '', displayThai: clean };
  }

  const yInt = parseInt(year, 10);
  const mInt = parseInt(month, 10);
  const dInt = parseInt(day || '1', 10);

  const isoDate = `${year}-${month}-${day || '01'}`;
  const isoMonth = `${year}-${month}`;
  const thaiYear = String(yInt + 543);
  const displayThai = `${dInt} ${THAI_MONTH_SHORT[mInt] || ''} ${thaiYear}`;

  return { year, month, day, isoDate, isoMonth, thaiYear, displayThai };
}

export default function IncomeHubView({
  branStock,
  salesServices,
  dailyCashReports,
  onRefresh,
  loading
}: IncomeHubViewProps) {
  const [subTab, setSubTab] = useState<'bran_stock' | 'sales_services' | 'daily_cash'>('bran_stock');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<'all' | 'เงินสด' | 'โอนเงิน'>('all');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Inventory Filter state
  const [inventoryFilterMode, setInventoryFilterMode] = useState<'all' | 'daily' | 'monthly'>('all');
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>('');
  const [selectedMonthlyPeriod, setSelectedMonthlyPeriod] = useState<string>('');

  // Sales & Services Filter state
  const [salesFilterMode, setSalesFilterMode] = useState<'all' | 'daily' | 'monthly'>('all');
  const [selectedSalesDailyDate, setSelectedSalesDailyDate] = useState<string>('');
  const [selectedSalesMonthlyPeriod, setSelectedSalesMonthlyPeriod] = useState<string>('');

  // Cash Report Filter state
  const [cashFilterMode, setCashFilterMode] = useState<'all' | 'daily' | 'monthly'>('all');
  const [selectedCashDailyDate, setSelectedCashDailyDate] = useState<string>('');
  const [selectedCashMonthlyPeriod, setSelectedCashMonthlyPeriod] = useState<string>('');

  // Extract all available months present in the actual bran stock data
  const availableInventoryMonths = useMemo(() => {
    const map = new Map<string, { isoMonth: string; label: string; count: number }>();
    branStock.forEach(item => {
      const p = parseFlexibleDate(item.date);
      if (p.isoMonth) {
        const existing = map.get(p.isoMonth);
        if (existing) {
          existing.count += 1;
        } else {
          const mInt = parseInt(p.month, 10);
          const monthText = THAI_MONTH_FULL[mInt] || THAI_MONTH_SHORT[mInt] || p.month;
          map.set(p.isoMonth, {
            isoMonth: p.isoMonth,
            label: `${monthText} ${p.year} (${p.thaiYear})`,
            count: 1
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.isoMonth.localeCompare(a.isoMonth));
  }, [branStock]);

  // Extract all available months present in actual salesServices data
  const availableSalesMonths = useMemo(() => {
    const map = new Map<string, { isoMonth: string; label: string; count: number }>();
    salesServices.forEach(item => {
      const p = parseFlexibleDate(item.date);
      if (p.isoMonth) {
        const existing = map.get(p.isoMonth);
        if (existing) {
          existing.count += 1;
        } else {
          const mInt = parseInt(p.month, 10);
          const monthText = THAI_MONTH_FULL[mInt] || THAI_MONTH_SHORT[mInt] || p.month;
          map.set(p.isoMonth, {
            isoMonth: p.isoMonth,
            label: `${monthText} ${p.year} (${p.thaiYear})`,
            count: 1
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.isoMonth.localeCompare(a.isoMonth));
  }, [salesServices]);

  // Extract all available months present in actual dailyCashReports data
  const availableCashMonths = useMemo(() => {
    const map = new Map<string, { isoMonth: string; label: string; count: number }>();
    dailyCashReports.forEach(item => {
      const p = parseFlexibleDate(item.date);
      if (p.isoMonth) {
        const existing = map.get(p.isoMonth);
        if (existing) {
          existing.count += 1;
        } else {
          const mInt = parseInt(p.month, 10);
          const monthText = THAI_MONTH_FULL[mInt] || THAI_MONTH_SHORT[mInt] || p.month;
          map.set(p.isoMonth, {
            isoMonth: p.isoMonth,
            label: `${monthText} ${p.year} (${p.thaiYear})`,
            count: 1
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.isoMonth.localeCompare(a.isoMonth));
  }, [dailyCashReports]);

  // Filter logic for Inventory / Bran Stock
  const filteredBranStock = branStock.filter(item => {
    const parsedItem = parseFlexibleDate(item.date);
    
    // Search query matches original date string or parsed display string or item name or inspector
    const matchesSearch = 
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inspector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parsedItem.displayThai.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (inventoryFilterMode === 'daily') {
      if (selectedDailyDate) {
        const parsedSelected = parseFlexibleDate(selectedDailyDate);
        return (
          parsedItem.isoDate === parsedSelected.isoDate ||
          (parsedItem.year === parsedSelected.year &&
           parsedItem.month === parsedSelected.month &&
           parsedItem.day === parsedSelected.day)
        );
      }
      return true;
    }

    if (inventoryFilterMode === 'monthly') {
      if (selectedMonthlyPeriod) {
        const parsedSelected = parseFlexibleDate(selectedMonthlyPeriod);
        return (
          parsedItem.isoMonth === parsedSelected.isoMonth ||
          (parsedItem.year === parsedSelected.year && parsedItem.month === parsedSelected.month)
        );
      }
      return true;
    }

    return true;
  });

  const filteredSalesServices = salesServices.filter(item => {
    const parsedItem = parseFlexibleDate(item.date);

    const matchesSearch = 
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemOrService.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.seller.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parsedItem.displayThai.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    const matchesPayment = filterPayment === 'all' || item.paymentMethod === filterPayment;
    if (!matchesPayment) return false;

    if (salesFilterMode === 'daily') {
      if (selectedSalesDailyDate) {
        const parsedSelected = parseFlexibleDate(selectedSalesDailyDate);
        return (
          parsedItem.isoDate === parsedSelected.isoDate ||
          (parsedItem.year === parsedSelected.year &&
           parsedItem.month === parsedSelected.month &&
           parsedItem.day === parsedSelected.day)
        );
      }
      return true;
    }

    if (salesFilterMode === 'monthly') {
      if (selectedSalesMonthlyPeriod) {
        const parsedSelected = parseFlexibleDate(selectedSalesMonthlyPeriod);
        return (
          parsedItem.isoMonth === parsedSelected.isoMonth ||
          (parsedItem.year === parsedSelected.year && parsedItem.month === parsedSelected.month)
        );
      }
      return true;
    }

    return true;
  });

  const filteredDailyCash = dailyCashReports.filter(item => {
    const parsedItem = parseFlexibleDate(item.date);

    const matchesSearch = 
      item.reporter.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      parsedItem.displayThai.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (cashFilterMode === 'daily') {
      if (selectedCashDailyDate) {
        const parsedSelected = parseFlexibleDate(selectedCashDailyDate);
        return (
          parsedItem.isoDate === parsedSelected.isoDate ||
          (parsedItem.year === parsedSelected.year &&
           parsedItem.month === parsedSelected.month &&
           parsedItem.day === parsedSelected.day)
        );
      }
      return true;
    }

    if (cashFilterMode === 'monthly') {
      if (selectedCashMonthlyPeriod) {
        const parsedSelected = parseFlexibleDate(selectedCashMonthlyPeriod);
        return (
          parsedItem.isoMonth === parsedSelected.isoMonth ||
          (parsedItem.year === parsedSelected.year && parsedItem.month === parsedSelected.month)
        );
      }
      return true;
    }

    return true;
  });

  // Totals
  const totalBranSacks = filteredBranStock.reduce((sum, item) => sum + item.quantity, 0);
  const grandTotalBranSacks = branStock.reduce((sum, item) => sum + item.quantity, 0);
  const totalSalesRevenue = filteredSalesServices.reduce((sum, item) => sum + item.finalPriceToPay, 0);
  const totalTransferSales = filteredSalesServices.filter(s => s.paymentMethod === 'โอนเงิน').reduce((sum, item) => sum + item.finalPriceToPay, 0);
  const totalCashSales = filteredSalesServices.filter(s => s.paymentMethod === 'เงินสด').reduce((sum, item) => sum + item.finalPriceToPay, 0);
  const totalSalesDiscount = filteredSalesServices.reduce((sum, item) => sum + item.discountAmount, 0);

  const totalAppSalesCashReport = filteredDailyCash.reduce((sum, item) => sum + item.appSalesTotal, 0);
  const totalCountedCashReport = filteredDailyCash.reduce((sum, item) => sum + item.countedCash, 0);
  const totalTransferCashReport = filteredDailyCash.reduce((sum, item) => sum + item.transferPayment, 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            ข้อมูลรายได้โรงสี (Income Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            คลังสินค้า รายการขายสินค้า&บริการ และรายงานยอดเงินประจำวัน
          </p>
        </div>

        {/* Sub-tab Switcher Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setSubTab('bran_stock')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
              subTab === 'bran_stock'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Package className="w-4 h-4" />
            คลังสินค้า
            <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${subTab === 'bran_stock' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {branStock.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('sales_services')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
              subTab === 'sales_services'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            ขายของ & บริการ
            <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${subTab === 'sales_services' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {salesServices.length}
            </span>
          </button>

          <button
            onClick={() => setSubTab('daily_cash')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-2 ${
              subTab === 'daily_cash'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wallet className="w-4 h-4" />
            รายงานยอดเงิน
            <span className={`ml-1 px-1.5 py-0.2 text-[10px] rounded-full ${subTab === 'daily_cash' ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {dailyCashReports.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sub-tab 1.1: คลังสินค้า */}
      {subTab === 'bran_stock' && (
        <div className="space-y-4">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">สินค้าในคลังรับเข้ารวม (ตามตัวกรอง)</p>
                <p className="text-2xl font-bold text-slate-900">{totalBranSacks.toLocaleString()} <span className="text-xs font-semibold text-emerald-600">กระสอบ</span></p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">จำนวนรายการที่แสดง</p>
                <p className="text-2xl font-bold text-slate-900">{filteredBranStock.length} / {branStock.length} <span className="text-xs font-semibold text-blue-600">รายการ</span></p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500">การตรวจสอบหลักฐาน</p>
                <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1 mt-1">
                  <CheckCircle className="w-4 h-4" /> ตรวจสอบเรียบร้อย
                </p>
              </div>
            </div>
          </div>

          {/* Controls: Date Filter Switcher & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Mode Selector (ทั้งหมด / รายวัน / รายเดือน) */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  ตัวกรองเวลา:
                </span>
                <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
                  <button
                    onClick={() => {
                      setInventoryFilterMode('all');
                      setSelectedDailyDate('');
                      setSelectedMonthlyPeriod('');
                    }}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                      inventoryFilterMode === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด
                  </button>
                  <button
                    onClick={() => setInventoryFilterMode('daily')}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                      inventoryFilterMode === 'daily'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รายวัน
                  </button>
                  <button
                    onClick={() => setInventoryFilterMode('monthly')}
                    className={`px-3 py-1 text-xs rounded-lg font-semibold transition ${
                      inventoryFilterMode === 'monthly'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รายเดือน
                  </button>
                </div>
              </div>

              {/* Specific Date Picker inputs */}
              {inventoryFilterMode === 'daily' && (
                <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 text-xs">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-700 font-medium whitespace-nowrap">เลือกวันที่:</span>
                  <input
                    type="date"
                    value={selectedDailyDate}
                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                  {selectedDailyDate && (
                    <button
                      onClick={() => setSelectedDailyDate('')}
                      className="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded-lg font-semibold transition"
                    >
                      ล้างตัวกรองวันที่
                    </button>
                  )}
                </div>
              )}

              {inventoryFilterMode === 'monthly' && (
                <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span className="text-slate-700 font-bold whitespace-nowrap">เลือกเดือน/ปี:</span>
                  </div>

                  {/* Quick Month Select Pills from Actual Data */}
                  {availableInventoryMonths.length > 0 && (
                    <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                      <button
                        onClick={() => setSelectedMonthlyPeriod('')}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold whitespace-nowrap transition ${
                          !selectedMonthlyPeriod
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        ทุกเดือน ({branStock.length})
                      </button>
                      {availableInventoryMonths.map((m) => (
                        <button
                          key={m.isoMonth}
                          onClick={() => setSelectedMonthlyPeriod(m.isoMonth)}
                          className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold whitespace-nowrap transition ${
                            selectedMonthlyPeriod === m.isoMonth
                              ? 'bg-emerald-700 text-white shadow-sm'
                              : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100/50'
                          }`}
                        >
                          {m.label} ({m.count})
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Native Month Input fallback */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[11px] text-slate-500 hidden lg:inline">ปฏิทิน:</span>
                    <input
                      type="month"
                      value={selectedMonthlyPeriod}
                      onChange={(e) => setSelectedMonthlyPeriod(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                    />
                    {selectedMonthlyPeriod && (
                      <button
                        onClick={() => setSelectedMonthlyPeriod('')}
                        className="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded-lg font-semibold transition"
                      >
                        ล้างตัวกรอง
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Sheet Link */}
              <a
                href="https://docs.google.com/spreadsheets/d/1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg/edit#gid=1629903525"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl transition self-start md:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                เปิด Google Sheet คลังสินค้า
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหารายการสินค้า, ผู้ตรวจรับ, หรือวันที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Table View of Inventory Entries */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">วันที่ / เวลา</th>
                    <th className="px-4 py-3">ชนิดสินค้า / รายการ</th>
                    <th className="px-4 py-3 text-right">จำนวนรับเข้า (กระสอบ)</th>
                    <th className="px-4 py-3">ผู้ตรวจรับสินค้า</th>
                    <th className="px-4 py-3 text-center">หลักฐานการตรวจรับ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBranStock.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                        ไม่พบข้อมูลสินค้าในคลังตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredBranStock.map((item) => {
                      const p = parseFlexibleDate(item.date);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            <span className="font-semibold text-slate-900 block">{p.displayThai || item.date}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" /> {item.time || '12:00'}
                              {item.date && item.date !== p.displayThai && (
                                <span className="text-slate-400 font-sans ml-1">({item.date})</span>
                              )}
                            </span>
                          </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg">
                            {item.itemName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm whitespace-nowrap">
                          {item.quantity.toLocaleString()} <span className="text-xs text-slate-500 font-normal">กระสอบ</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {item.inspector}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {item.imageUrl ? (
                            <button
                              onClick={() => setSelectedImage(item.imageUrl)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                              ดูรูปหลักฐาน
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              ไม่มีไฟล์ภาพ
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredBranStock.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs text-slate-900">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">
                        รวมรับเข้าทั้งหมด (ตามตัวกรองปัจจุบัน):
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 text-sm">
                        {totalBranSacks.toLocaleString()} กระสอบ
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-slate-500 font-normal">
                        ({filteredBranStock.length} รายการ)
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 1.2: รายการขายของและค่าบริการ */}
      {subTab === 'sales_services' && (
        <div className="space-y-4">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">ยอดขาย&บริการรวม</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">฿{totalSalesRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">ชำระผ่านเงินโอน</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">฿{totalTransferSales.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">ชำระด้วยเงินสด</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">฿{totalCashSales.toLocaleString()}</p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-slate-500">ส่วนลดแต้มสมาชิก</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                ฿{totalSalesDiscount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Time Filter & Controls Bar */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filter Mode Buttons (ทั้งหมด / รายวัน / รายเดือน) */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start">
                <button
                  onClick={() => setSalesFilterMode('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    salesFilterMode === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  ทั้งหมด ({salesServices.length})
                </button>
                <button
                  onClick={() => setSalesFilterMode('daily')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                    salesFilterMode === 'daily'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  รายวัน
                </button>
                <button
                  onClick={() => setSalesFilterMode('monthly')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                    salesFilterMode === 'monthly'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  รายเดือน
                </button>
              </div>

              {/* Action Buttons: Payment Method + Sheet Link */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  <option value="all">ทุกวิธีการจ่าย</option>
                  <option value="เงินสด">เงินสด</option>
                  <option value="โอนเงิน">โอนเงิน</option>
                </select>

                <a
                  href="https://docs.google.com/spreadsheets/d/1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg/edit#gid=1056042178"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-medium px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  เปิด Sheet
                </a>
              </div>
            </div>

            {/* Specific Date / Month Pickers */}
            {salesFilterMode === 'daily' && (
              <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 p-2 rounded-xl border border-emerald-200 text-xs">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-700 font-medium whitespace-nowrap">เลือกวันที่:</span>
                <input
                  type="date"
                  value={selectedSalesDailyDate}
                  onChange={(e) => setSelectedSalesDailyDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                />
                {selectedSalesDailyDate && (
                  <button
                    onClick={() => setSelectedSalesDailyDate('')}
                    className="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded-lg font-semibold transition"
                  >
                    ล้างตัวกรองวันที่
                  </button>
                )}
              </div>
            )}

            {salesFilterMode === 'monthly' && (
              <div className="flex flex-wrap items-center gap-2 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-700 font-bold whitespace-nowrap">เลือกเดือน/ปี:</span>
                </div>

                {/* Quick Month Select Pills from Actual Data */}
                {availableSalesMonths.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                    <button
                      onClick={() => setSelectedSalesMonthlyPeriod('')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold whitespace-nowrap transition ${
                        !selectedSalesMonthlyPeriod
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ทุกเดือน ({salesServices.length})
                    </button>
                    {availableSalesMonths.map((m) => (
                      <button
                        key={m.isoMonth}
                        onClick={() => setSelectedSalesMonthlyPeriod(m.isoMonth)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold whitespace-nowrap transition ${
                          selectedSalesMonthlyPeriod === m.isoMonth
                            ? 'bg-emerald-700 text-white shadow-sm'
                            : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100/50'
                        }`}
                      >
                        {m.label} ({m.count})
                      </button>
                    ))}
                  </div>
                )}

                {/* Native Month Input fallback */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[11px] text-slate-500 hidden lg:inline">ปฏิทิน:</span>
                  <input
                    type="month"
                    value={selectedSalesMonthlyPeriod}
                    onChange={(e) => setSelectedSalesMonthlyPeriod(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
                  />
                  {selectedSalesMonthlyPeriod && (
                    <button
                      onClick={() => setSelectedSalesMonthlyPeriod('')}
                      className="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded-lg font-semibold transition"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อลูกค้า, สินค้า/บริการ, ผู้ขาย, หรือวันที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 shadow-inner"
              />
            </div>
          </div>

          {/* Table of Sales & Services */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">วันที่</th>
                    <th className="px-4 py-3">ลูกค้า</th>
                    <th className="px-4 py-3">สินค้า / บริการ</th>
                    <th className="px-4 py-3 text-right">จำนวน (กระสอบ)</th>
                    <th className="px-4 py-3 text-right">ราคา/หน่วย</th>
                    <th className="px-4 py-3 text-right">ราคารวม</th>
                    <th className="px-4 py-3">วิธีจ่าย</th>
                    <th className="px-4 py-3">ผู้ขาย</th>
                    <th className="px-4 py-3">สถานที่</th>
                    <th className="px-4 py-3 text-right">ยอดชำระจริง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSalesServices.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        ไม่พบข้อมูลรายการขาย/บริการตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredSalesServices.map((row) => {
                      const p = parseFlexibleDate(row.date);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            <span className="font-semibold text-slate-900 block">{p.displayThai || row.date}</span>
                            {row.date && row.date !== p.displayThai && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">({row.date})</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.customerName}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[11px]">
                              {row.itemOrService}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">{row.sacks.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">฿{row.pricePerUnit.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-slate-600">฿{row.totalProductPrice.toLocaleString()}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              row.paymentMethod === 'โอนเงิน' 
                                ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {row.paymentMethod}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.seller}</td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {row.deliveryLocation || 'รับหน้าโรงสี'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">
                            ฿{row.finalPriceToPay.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredSalesServices.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs text-slate-900">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-right">
                        รวมยอดขายทั้งหมด ({filteredSalesServices.length} รายการ):
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {filteredSalesServices.reduce((sum, item) => sum + item.sacks, 0).toLocaleString()} กระสอบ
                      </td>
                      <td colSpan={5} className="px-4 py-3 text-right text-slate-600 font-normal">
                        ยอดรวมชำระจริงสุทธิ:
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 text-sm font-bold">
                        ฿{totalSalesRevenue.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 1.3: การรายงานยอดเงิน ประจำวัน */}
      {subTab === 'daily_cash' && (
        <div className="space-y-4">
          {/* Cash Audit Header Summary Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-amber-500" />
                  กระทบยอดเงินสดลิ้นชักประจำวัน
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  เงินสดเช้า + เงินสดรับระหว่างวัน - รายจ่ายเงินสด = เงินสดที่ควรมี
                </p>
              </div>

              <a
                href="https://docs.google.com/spreadsheets/d/1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg/edit#gid=575421955"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl transition self-start md:self-auto"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                เปิด Sheet ยอดเงินประจำวัน
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500">ขายของรวมในแอป (ตามตัวกรอง)</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">฿{totalAppSalesCashReport.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500">เงินสดนับได้จริง</p>
                <p className="text-xl font-bold text-amber-600 mt-1">฿{totalCountedCashReport.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500">เงินโอนเข้าระบบ</p>
                <p className="text-xl font-bold text-blue-600 mt-1">
                  ฿{totalTransferCashReport.toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500">สถานะเงินสด</p>
                <p className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> ยอดเงินตรงถูกต้อง
                </p>
              </div>
            </div>
          </div>

          {/* Time Filter & Controls Bar for Cash Report */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filter Mode Buttons (ทั้งหมด / รายวัน / รายเดือน) */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80 self-start">
                <button
                  onClick={() => setCashFilterMode('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    cashFilterMode === 'all'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  ทั้งหมด ({dailyCashReports.length})
                </button>
                <button
                  onClick={() => setCashFilterMode('daily')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                    cashFilterMode === 'daily'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  รายวัน
                </button>
                <button
                  onClick={() => setCashFilterMode('monthly')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                    cashFilterMode === 'monthly'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  รายเดือน
                </button>
              </div>
            </div>

            {/* Specific Date / Month Pickers for Cash Report */}
            {cashFilterMode === 'daily' && (
              <div className="flex flex-wrap items-center gap-2 bg-amber-50/70 p-2 rounded-xl border border-amber-200 text-xs">
                <Calendar className="w-4 h-4 text-amber-600" />
                <span className="text-slate-700 font-medium whitespace-nowrap">เลือกวันที่:</span>
                <input
                  type="date"
                  value={selectedCashDailyDate}
                  onChange={(e) => setSelectedCashDailyDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
                />
                {selectedCashDailyDate && (
                  <button
                    onClick={() => setSelectedCashDailyDate('')}
                    className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded-lg font-semibold transition"
                  >
                    ล้างตัวกรองวันที่
                  </button>
                )}
              </div>
            )}

            {cashFilterMode === 'monthly' && (
              <div className="flex flex-wrap items-center gap-2 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200 text-xs">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-600" />
                  <span className="text-slate-700 font-bold whitespace-nowrap">เลือกเดือน/ปี:</span>
                </div>

                {/* Quick Month Select Pills from Actual Data */}
                {availableCashMonths.length > 0 && (
                  <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                    <button
                      onClick={() => setSelectedCashMonthlyPeriod('')}
                      className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold whitespace-nowrap transition ${
                        !selectedCashMonthlyPeriod
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      ทุกเดือน ({dailyCashReports.length})
                    </button>
                    {availableCashMonths.map((m) => (
                      <button
                        key={m.isoMonth}
                        onClick={() => setSelectedCashMonthlyPeriod(m.isoMonth)}
                        className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold whitespace-nowrap transition ${
                          selectedCashMonthlyPeriod === m.isoMonth
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-100/50'
                        }`}
                      >
                        {m.label} ({m.count})
                      </button>
                    ))}
                  </div>
                )}

                {/* Native Month Input fallback */}
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-[11px] text-slate-500 hidden lg:inline">ปฏิทิน:</span>
                  <input
                    type="month"
                    value={selectedCashMonthlyPeriod}
                    onChange={(e) => setSelectedCashMonthlyPeriod(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-amber-500 shadow-sm"
                  />
                  {selectedCashMonthlyPeriod && (
                    <button
                      onClick={() => setSelectedCashMonthlyPeriod('')}
                      className="text-[11px] bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded-lg font-semibold transition"
                    >
                      ล้างตัวกรอง
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search Input Bar */}
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้รายงาน หรือวันที่..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-amber-500 shadow-inner"
              />
            </div>
          </div>

          {/* Daily Cash Reports Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">วันที่ / เวลา</th>
                    <th className="px-4 py-3">ผู้รายงาน</th>
                    <th className="px-4 py-3 text-right">เงินเช้า (ทอน)</th>
                    <th className="px-4 py-3 text-right">ขายแอปรวม</th>
                    <th className="px-4 py-3 text-right">โอนจ่าย</th>
                    <th className="px-4 py-3 text-right">เงินสดรับ</th>
                    <th className="px-4 py-3 text-right">รายจ่ายเงินสด</th>
                    <th className="px-4 py-3 text-right">เงินสดนับได้</th>
                    <th className="px-4 py-3 text-center">ส่วนต่าง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDailyCash.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        ไม่พบข้อมูล รายงานยอดเงิน ตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    filteredDailyCash.map((row) => {
                      const p = parseFlexibleDate(row.date);
                      return (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                            <span className="font-semibold text-slate-900 block">
                              {p.displayThai || row.date}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono mt-0.5">
                              <Clock className="w-3 h-3 text-slate-400" /> {row.time || '17:00'}
                              {row.date && row.date !== p.displayThai && (
                                <span className="text-slate-400 font-sans ml-1">({row.date})</span>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.reporter}</td>
                          <td className="px-4 py-3 text-right text-slate-600">฿{row.morningCash.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">฿{row.appSalesTotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-blue-600">฿{row.transferPayment.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-600">฿{row.cashPayment.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-rose-600">฿{row.expensesTotal.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600">฿{row.countedCash.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            {row.discrepancy === 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                                ✓ ตรง 0
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[10px] font-semibold">
                                {row.discrepancy > 0 ? `+฿${row.discrepancy}` : `-฿${Math.abs(row.discrepancy)}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredDailyCash.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs text-slate-900">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right">
                        รวมยอด ({filteredDailyCash.length} รายการ):
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        ฿{filteredDailyCash.reduce((sum, item) => sum + item.morningCash, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-700 font-bold">
                        ฿{filteredDailyCash.reduce((sum, item) => sum + item.appSalesTotal, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        ฿{filteredDailyCash.reduce((sum, item) => sum + item.transferPayment, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        ฿{filteredDailyCash.reduce((sum, item) => sum + item.cashPayment, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600">
                        ฿{filteredDailyCash.reduce((sum, item) => sum + item.expensesTotal, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-600 font-bold">
                        ฿{filteredDailyCash.reduce((sum, item) => sum + item.countedCash, 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-5 relative shadow-xl">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full"
            >
              ✕
            </button>
            <h4 className="text-sm font-bold text-slate-900 mb-3">ภาพถ่ายหลักฐานการตรวจรับสินค้า</h4>
            <img src={selectedImage} alt="Bran Inspection" className="w-full h-auto max-h-[70vh] object-contain rounded-xl border border-slate-200" />
          </div>
        </div>
      )}
    </div>
  );
}
