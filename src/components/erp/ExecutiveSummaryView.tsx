import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, ShieldCheck, ArrowUpRight,
  PieChart as PieIcon, BarChart3, Calculator, Calendar, Filter, Sparkles, Layers,
  RefreshCw, ChevronLeft, ChevronRight, AlertCircle, Info
} from 'lucide-react';
import { 
  BranStockItem, SaleServiceTransaction, DailyCashReport, WorkerLaborRecord,
  FuelExpenseRecord, ElectricityExpenseRecord, MachineMaintenanceRecord, CapExInvestmentRecord
} from '../../services/dashboardService';
import { parseFlexibleDate } from './IncomeHubView';

interface ExecutiveSummaryViewProps {
  branStock: BranStockItem[];
  salesServices: SaleServiceTransaction[];
  dailyCashReports: DailyCashReport[];
  workerLabor: WorkerLaborRecord[];
  fuelExpenses: FuelExpenseRecord[];
  electricityExpenses: ElectricityExpenseRecord[];
  maintenanceExpenses: MachineMaintenanceRecord[];
  capexInvestments: CapExInvestmentRecord[];
  onRefresh: () => void;
  loading: boolean;
}

// Month formatting helpers
const THAI_MONTH_NAMES: Record<string, string> = {
  '01': 'มกราคม',
  '02': 'กุมภาพันธ์',
  '03': 'มีนาคม',
  '04': 'เมษายน',
  '05': 'พฤษภาคม',
  '06': 'มิถุนายน',
  '07': 'กรกฎาคม',
  '08': 'สิงหาคม',
  '09': 'กันยายน',
  '10': 'ตุลาคม',
  '11': 'พฤศจิกายน',
  '12': 'ธันวาคม',
};

const THAI_SHORT_MONTHS: Record<string, string> = {
  '01': 'ม.ค.',
  '02': 'ก.พ.',
  '03': 'มี.ค.',
  '04': 'เม.ย.',
  '05': 'พ.ค.',
  '06': 'มิ.ย.',
  '07': 'ก.ค.',
  '08': 'ส.ค.',
  '09': 'ก.ย.',
  '10': 'ต.ค.',
  '11': 'พ.ย.',
  '12': 'ธ.ค.',
};

function parseYearMonth(dateStr: string | undefined): string | null {
  if (!dateStr) return null;
  const str = dateStr.trim();

  // Format: YYYY-MM or YYYY-MM-DD
  if (/^\d{4}-\d{2}/.test(str)) {
    return str.substring(0, 7);
  }

  // Format: DD/MM/YYYY or MM/YYYY
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length === 3) {
      let year = parseInt(parts[2], 10);
      let month = parseInt(parts[1], 10);
      if (year > 2500) year -= 543;
      if (!isNaN(year) && !isNaN(month)) {
        return `${year}-${month.toString().padStart(2, '0')}`;
      }
    } else if (parts.length === 2) {
      let month = parseInt(parts[0], 10);
      let year = parseInt(parts[1], 10);
      if (year > 2500) year -= 543;
      if (!isNaN(year) && !isNaN(month)) {
        return `${year}-${month.toString().padStart(2, '0')}`;
      }
    }
  }

  // Thai text formatted dates e.g. "16 ก.ค. 2026" or "28 กรกฎาคม 2569"
  const thaiMonths: Record<string, string> = {
    'ม.ค.': '01', 'มกราคม': '01',
    'ก.พ.': '02', 'กุมภาพันธ์': '02',
    'มี.ค.': '03', 'มีนาคม': '03',
    'เม.ย.': '04', 'เมษายน': '04',
    'พ.ค.': '05', 'พฤษภาคม': '05',
    'มิ.ย.': '06', 'มิถุนายน': '06',
    'ก.ค.': '07', 'กรกฎาคม': '07',
    'ส.ค.': '08', 'สิงหาคม': '08',
    'ก.ย.': '09', 'กันยายน': '09',
    'ต.ค.': '10', 'ตุลาคม': '10',
    'พ.ย.': '11', 'พฤศจิกายน': '11',
    'ธ.ค.': '12', 'ธันวาคม': '12',
  };

  for (const [key, mm] of Object.entries(thaiMonths)) {
    if (str.includes(key)) {
      const yearMatch = str.match(/\b(25\d{2}|20\d{2})\b/);
      let year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
      if (year > 2500) year -= 543;
      return `${year}-${mm}`;
    }
  }

  return null;
}

function formatMonthYearLabel(ym: string): string {
  const [y, m] = ym.split('-');
  const thaiYear = parseInt(y, 10) + 543;
  const monthName = THAI_MONTH_NAMES[m] || m;
  return `เดือน ${monthName} พ.ศ. ${thaiYear}`;
}

export default function ExecutiveSummaryView({
  branStock,
  salesServices,
  dailyCashReports,
  workerLabor,
  fuelExpenses,
  electricityExpenses,
  maintenanceExpenses,
  capexInvestments,
  onRefresh,
  loading
}: ExecutiveSummaryViewProps) {

  // Helper to extract YYYY-MM using parseFlexibleDate
  const getItemMonth = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    const res = parseFlexibleDate(dateStr);
    return res.isoMonth || '';
  };

  // 1. Collect all unique months present across all dataset records
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();

    salesServices.forEach(i => { const ym = getItemMonth(i.date); if (ym && ym.length === 7) monthSet.add(ym); });
    dailyCashReports.forEach(i => { const ym = getItemMonth(i.date); if (ym && ym.length === 7) monthSet.add(ym); });
    workerLabor.forEach(i => { const ym = getItemMonth(i.date); if (ym && ym.length === 7) monthSet.add(ym); });
    fuelExpenses.forEach(i => { const ym = getItemMonth(i.date); if (ym && ym.length === 7) monthSet.add(ym); });
    electricityExpenses.forEach(i => { const ym = getItemMonth(i.billingPeriod); if (ym && ym.length === 7) monthSet.add(ym); });
    maintenanceExpenses.forEach(i => { const ym = getItemMonth(i.date); if (ym && ym.length === 7) monthSet.add(ym); });
    capexInvestments.forEach(i => { const ym = getItemMonth(i.date); if (ym && ym.length === 7) monthSet.add(ym); });

    // Ensure recent 2026 months are always available in selector
    ['2026-07', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'].forEach(m => monthSet.add(m));

    // Sort descending (newest month first)
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [salesServices, dailyCashReports, workerLabor, fuelExpenses, electricityExpenses, maintenanceExpenses, capexInvestments]);

  // Default selected month to the newest available month (e.g. '2026-07')
  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || '2026-07');

  // 2. Filter records dynamically for the selected month
  const filteredSales = useMemo(() => 
    salesServices.filter(item => getItemMonth(item.date) === selectedMonth),
    [salesServices, selectedMonth]
  );

  const filteredCashReports = useMemo(() => 
    dailyCashReports.filter(item => getItemMonth(item.date) === selectedMonth),
    [dailyCashReports, selectedMonth]
  );

  const filteredLabor = useMemo(() => 
    workerLabor.filter(item => getItemMonth(item.date) === selectedMonth),
    [workerLabor, selectedMonth]
  );

  const filteredFuel = useMemo(() => 
    fuelExpenses.filter(item => getItemMonth(item.date) === selectedMonth),
    [fuelExpenses, selectedMonth]
  );

  const filteredElectricity = useMemo(() => 
    electricityExpenses.filter(item => getItemMonth(item.billingPeriod) === selectedMonth),
    [electricityExpenses, selectedMonth]
  );

  const filteredMaintenance = useMemo(() => 
    maintenanceExpenses.filter(item => getItemMonth(item.date) === selectedMonth),
    [maintenanceExpenses, selectedMonth]
  );

  const filteredCapEx = useMemo(() => 
    capexInvestments.filter(item => getItemMonth(item.date) === selectedMonth),
    [capexInvestments, selectedMonth]
  );

  // 3. Compute exact totals for selected month
  const monthSalesRevenue = filteredSales.reduce((sum, item) => sum + (item.finalPriceToPay || item.totalProductPrice || 0), 0);
  const monthCashAppSales = filteredCashReports.reduce((sum, item) => sum + (item.appSalesTotal || 0), 0);
  
  // Real net revenue for selected month
  const totalRevenue = Math.max(monthSalesRevenue, monthCashAppSales);

  // Real operating expenses for selected month
  const laborExpense = filteredLabor.reduce((sum, item) => sum + (item.totalWage || 0), 0);
  const fuelExpense = filteredFuel.reduce((sum, item) => sum + (item.totalCostBaht || 0), 0);
  const electricityExpense = filteredElectricity.reduce((sum, item) => sum + (item.totalAmountBaht || 0), 0);
  const maintenanceExpense = filteredMaintenance.reduce((sum, item) => sum + (item.costBaht || 0), 0);
  const capexExpense = filteredCapEx.reduce((sum, item) => sum + (item.amountBaht || 0), 0);

  const totalOperatingExpenses = laborExpense + fuelExpense + electricityExpense + maintenanceExpense;
  const totalExpensesWithCapEx = totalOperatingExpenses + capexExpense;

  const netOperatingProfit = totalRevenue - totalOperatingExpenses;
  const netProfitMargin = totalRevenue > 0 ? ((netOperatingProfit / totalRevenue) * 100).toFixed(1) : '0.0';

  const monthCountedCash = filteredCashReports.reduce((sum, item) => sum + (item.countedCash || 0), 0);
  const monthDiscrepancy = filteredCashReports.reduce((sum, item) => sum + (item.discrepancy || 0), 0);

  // 4. Revenue Breakdown Data for Selected Month
  const revenueBreakdownData = useMemo(() => {
    if (filteredSales.length > 0) {
      let branSum = 0;
      let serviceSum = 0;
      let brokenRiceSum = 0;
      let huskSum = 0;

      filteredSales.forEach(item => {
        const title = item.itemOrService || '';
        const amt = item.finalPriceToPay || item.totalProductPrice || 0;
        if (title.includes('รำ')) {
          branSum += amt;
        } else if (title.includes('บริการ') || title.includes('สีข้าว')) {
          serviceSum += amt;
        } else if (title.includes('ปลายข้าว')) {
          brokenRiceSum += amt;
        } else {
          huskSum += amt;
        }
      });

      const list = [];
      if (branSum > 0) list.push({ name: 'รำข้าว & ผลพลอยได้', value: branSum, color: '#16a34a' });
      if (serviceSum > 0) list.push({ name: 'ค่าบริการสีข้าวเปลือก', value: serviceSum, color: '#0d9488' });
      if (brokenRiceSum > 0) list.push({ name: 'ปลายข้าวหอมมะลิ', value: brokenRiceSum, color: '#eab308' });
      if (huskSum > 0) list.push({ name: 'แกลบเผา & อื่นๆ', value: huskSum, color: '#854d0e' });

      if (list.length > 0) return list;
    }

    if (totalRevenue > 0) {
      return [
        { name: 'ขายสินค้า & บริการประจำเดือน', value: totalRevenue, color: '#16a34a' }
      ];
    }

    return [{ name: 'ยังไม่มีรายการขายในเดือนนี้', value: 0, color: '#cbd5e1' }];
  }, [filteredSales, totalRevenue]);

  // 5. Expense Breakdown Data for Selected Month
  const expenseBreakdownData = [
    { name: 'ค่าไฟฟ้า PEA โรงสี (2.3)', value: electricityExpense, color: '#e11d48' },
    { name: 'ค่าแรงงาน (2.1)', value: laborExpense, color: '#f97316' },
    { name: 'ค่าน้ำมัน & ขนส่ง (2.2)', value: fuelExpense, color: '#eab308' },
    { name: 'ค่าซ่อมบำรุงเครื่องจักร (2.4)', value: maintenanceExpense, color: '#6366f1' },
    { name: 'ค่าลงทุน CapEx (2.5)', value: capexExpense, color: '#8b5cf6' },
  ].filter(e => e.value > 0 || totalExpensesWithCapEx === 0);

  // 6. Monthly Comparison Trend Data (Real calculation per month for chart)
  const monthlyComparisonData = useMemo(() => {
    // Chronological order (oldest to newest) for chart X-axis
    const chronMonths = [...availableMonths].sort((a, b) => a.localeCompare(b));

    return chronMonths.map(ym => {
      const [, mStr] = ym.split('-');
      const monthLabel = THAI_SHORT_MONTHS[mStr] || mStr;

      const mSales = salesServices.filter(i => getItemMonth(i.date) === ym);
      const mCash = dailyCashReports.filter(i => getItemMonth(i.date) === ym);
      const mLabor = workerLabor.filter(i => getItemMonth(i.date) === ym);
      const mFuel = fuelExpenses.filter(i => getItemMonth(i.date) === ym);
      const mElec = electricityExpenses.filter(i => getItemMonth(i.billingPeriod) === ym);
      const mMaint = maintenanceExpenses.filter(i => getItemMonth(i.date) === ym);

      const rev = Math.max(
        mSales.reduce((s, i) => s + (i.finalPriceToPay || i.totalProductPrice || 0), 0),
        mCash.reduce((s, i) => s + (i.appSalesTotal || 0), 0)
      );

      const exp = mLabor.reduce((s, i) => s + (i.totalWage || 0), 0)
        + mFuel.reduce((s, i) => s + (i.totalCostBaht || 0), 0)
        + mElec.reduce((s, i) => s + (i.totalAmountBaht || 0), 0)
        + mMaint.reduce((s, i) => s + (i.costBaht || 0), 0);

      const prof = rev - exp;

      return {
        ym,
        month: monthLabel,
        income: rev,
        expense: exp,
        profit: prof,
        isSelected: ym === selectedMonth
      };
    });
  }, [availableMonths, salesServices, dailyCashReports, workerLabor, fuelExpenses, electricityExpenses, maintenanceExpenses, selectedMonth]);

  // Previous / Next Month Navigation
  const currentMonthIdx = availableMonths.indexOf(selectedMonth);
  const handlePrevMonth = () => {
    if (currentMonthIdx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentMonthIdx + 1]);
    }
  };
  const handleNextMonth = () => {
    if (currentMonthIdx > 0) {
      setSelectedMonth(availableMonths[currentMonthIdx - 1]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls with Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-bold text-slate-900">
              ภาพรวมการเงินและผลกำไรการดำเนินงาน
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            สรุปรายได้ รายจ่ายดำเนินงาน และกำไรสุทธิคำนวณจริงตามเดือนที่เลือก
          </p>
        </div>

        {/* Month Selector Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-50 border border-slate-200 p-1 rounded-xl flex items-center gap-1.5 shadow-xs">
            <button
              onClick={handlePrevMonth}
              disabled={currentMonthIdx >= availableMonths.length - 1}
              className="p-1.5 hover:bg-white text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent font-bold text-xs text-slate-800 focus:outline-none cursor-pointer py-1"
              >
                {availableMonths.map(ym => (
                  <option key={ym} value={ym}>
                    {formatMonthYearLabel(ym)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleNextMonth}
              disabled={currentMonthIdx <= 0}
              className="p-1.5 hover:bg-white text-slate-600 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg transition"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </button>
        </div>
      </div>

      {/* Selected Month Status Indicator */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 px-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-emerald-900">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>กำลังแสดงผลรายงานทางการเงินประจำ: <strong className="text-emerald-800 underline decoration-emerald-300 underline-offset-2">{formatMonthYearLabel(selectedMonth)}</strong></span>
        </div>
        <div className="text-[11px] text-emerald-700 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 self-start sm:self-auto font-medium">
          ข้อมูลคำนวณจากรายการรับ-จ่ายจริงในฐานข้อมูล
        </div>
      </div>

      {/* 4 Main Key Performance Indicators Cards for Selected Month */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              รวมรายได้สุทธิประจำเดือน
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ฿{totalRevenue.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>ขายสินค้า & บริการ</span>
            <span className="text-emerald-600 font-semibold">
              {filteredSales.length} รายการ
            </span>
          </div>
        </div>

        {/* Total Operating Expenses */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              รวมรายจ่ายดำเนินงานประจำเดือน
            </span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ฿{totalOperatingExpenses.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>ค่าไฟ + ค่าแรง + ซ่อม</span>
            <span className="text-xs font-medium text-rose-600">
              CapEx ฿{capexExpense.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Net Operating Profit */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5 text-emerald-600" />
              กำไรดำเนินงานสุทธิประจำเดือน
            </span>
            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
              netOperatingProfit >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              Margin {netProfitMargin}%
            </span>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${netOperatingProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            ฿{netOperatingProfit.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>รายได้ - รายจ่าย</span>
            <span className={netOperatingProfit >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
              {netOperatingProfit >= 0 ? 'มีกำไรการดำเนินงาน' : 'ขาดทุนการดำเนินงาน'}
            </span>
          </div>
        </div>

        {/* Audit Cash */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md transition relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              เงินสดนับจริงประจำเดือน
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            ฿{monthCountedCash.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">รายงาน {filteredCashReports.length} ฉบับ</span>
            {monthDiscrepancy === 0 ? (
              <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ✓ ยอดเงินตรง
              </span>
            ) : (
              <span className="text-rose-600 font-medium bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                ต่าง ฿{monthDiscrepancy.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Monthly Income vs Expenses Trend across available months */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                เปรียบเทียบผลการดำเนินงานรายเดือน (Monthly Comparison)
              </h3>
              <p className="text-xs text-slate-500">คลิกที่แท่งกราฟเพื่อสลับดูข้อมูลประจําเดือนนั้นๆ</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> รายได้
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> รายจ่าย
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyComparisonData} 
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const ym = e.activePayload[0].payload.ym;
                    if (ym) setSelectedMonth(ym);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.8} />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `฿${(val / 1000).toFixed(0)}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, '']}
                  labelFormatter={(label, items) => {
                    if (items && items[0]) {
                      return formatMonthYearLabel(items[0].payload.ym);
                    }
                    return label;
                  }}
                />
                <Bar dataKey="income" name="รายได้สุทธิ" fill="#10b981" radius={[6, 6, 0, 0]} cursor="pointer" />
                <Bar dataKey="expense" name="รายจ่ายดำเนินงาน" fill="#f43f5e" radius={[6, 6, 0, 0]} cursor="pointer" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Structure Pie Chart for Selected Month */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-1">
              <PieIcon className="w-4 h-4 text-emerald-600" />
              สัดส่วนโครงสร้างรายได้ ({formatMonthYearLabel(selectedMonth)})
            </h3>
            <p className="text-xs text-slate-500 mb-3">จำแนกตามประเภทสินค้า/บริการที่ขายได้</p>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', color: '#0f172a', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: any) => [`฿${Number(val).toLocaleString()}`, '']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-slate-100 text-xs">
            {revenueBreakdownData.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-900">฿{item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comprehensive Revenue vs Expenses Category Summary Breakdown for Selected Month */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" />
            เปรียบเทียบหมวดหมู่รายได้และรายจ่ายประจำ {formatMonthYearLabel(selectedMonth)}
          </h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            รวมรายการจริง {filteredSales.length + filteredLabor.length + filteredFuel.length + filteredElectricity.length + filteredMaintenance.length} รายการ
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Revenue Breakdown Panel */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
              <span className="font-bold text-emerald-700 text-xs sm:text-sm flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> ฝั่งรายได้ประจำเดือน (Income)
              </span>
              <span className="font-bold text-emerald-700 text-sm">
                ฿{totalRevenue.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div>
                  <p className="font-medium text-slate-900">1. การขายสินค้าและบริการโรงสี</p>
                  <p className="text-[11px] text-slate-500">รายการขายในเดือนนี้ ({filteredSales.length} บิล)</p>
                </div>
                <span className="font-semibold text-emerald-700">
                  ฿{monthSalesRevenue.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div>
                  <p className="font-medium text-slate-900">2. รายงานยอดขายประจำวัน (แอพ/หน้าร้าน)</p>
                  <p className="text-[11px] text-slate-500">ยอดเงินสดและเงินโอน ({filteredCashReports.length} วันรายงาน)</p>
                </div>
                <span className="font-semibold text-emerald-700">
                  ฿{monthCashAppSales.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200/80">
                <div>
                  <p className="font-medium text-slate-900">3. สรุปรายได้รวมสุทธิคำนวณจริง</p>
                  <p className="text-[11px] text-slate-500">เชื่อมโยงจากชีตข้อมูลรับบริการและลิ้นชักเงินสด</p>
                </div>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  ฿{totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Expenses Breakdown Panel */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-3">
              <span className="font-bold text-rose-700 text-xs sm:text-sm flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-rose-600" /> ฝั่งรายจ่ายประจำเดือน (Expenses)
              </span>
              <span className="font-bold text-rose-700 text-sm">
                ฿{totalExpensesWithCapEx.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-700">1. ค่าแรงงานพนักงาน ({filteredLabor.length} รายการ)</span>
                <span className="font-semibold text-rose-600">฿{laborExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-700">2. ค่าน้ำมัน & ค่าขนส่ง ({filteredFuel.length} รายการ)</span>
                <span className="font-semibold text-rose-600">฿{fuelExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-700">3. ค่าไฟฟ้า PEA/MEA ({filteredElectricity.length} บิล)</span>
                <span className="font-semibold text-rose-600">฿{electricityExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-700">4. ค่าซ่อมบำรุงเครื่องจักร ({filteredMaintenance.length} งาน)</span>
                <span className="font-semibold text-rose-600">฿{maintenanceExpense.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/80">
                <span className="text-slate-700">5. ค่าลงทุนเพิ่มเติม (CapEx) ({filteredCapEx.length} โครงการ)</span>
                <span className="font-semibold text-purple-600">฿{capexExpense.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
