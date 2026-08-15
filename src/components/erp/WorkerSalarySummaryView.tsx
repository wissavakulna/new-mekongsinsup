import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Calendar, DollarSign, Clock, FileText, Printer, CheckCircle2, 
  Search, Filter, ChevronRight, Award, ShieldCheck, ArrowUpRight, Smartphone,
  ChevronLeft, RefreshCw, Layers, ArrowRight, Check, AlertCircle
} from 'lucide-react';
import { 
  WorkerLaborRecord, parseLaborDateInfo, getCycleInfoForMonth, 
  THAI_MONTH_NAMES, THAI_MONTH_SHORTS 
} from '../../services/dashboardService';
import EmployeePayslipModal, { EmployeeSalarySummaryData } from './EmployeePayslipModal';

interface WorkerSalarySummaryViewProps {
  workerLabor: WorkerLaborRecord[];
  searchQuery: string;
}

export default function WorkerSalarySummaryView({ workerLabor, searchQuery }: WorkerSalarySummaryViewProps) {
  // 1. Detect all unique available months from actual dataset
  const availableMonthsList = useMemo(() => {
    const monthMap = new Map<string, {
      isoMonth: string;
      year: number;
      thaiYear: number;
      month: number;
      label: string;
      shortLabel: string;
      recordCount: number;
      totalWage: number;
      cycle1Count: number;
      cycle2Count: number;
      cycle1Wage: number;
      cycle2Wage: number;
    }>();

    workerLabor.forEach(item => {
      const dateInfo = parseLaborDateInfo(item.date);
      const isoMonth = dateInfo.isoMonth;
      const existing = monthMap.get(isoMonth);
      const isCycle1 = dateInfo.payCyclePeriod === '1st-15th';
      const wage = item.totalWage || (item.baseWage + item.otWage + (item.bonus || 0) - (item.loanDeduction || 0));

      if (existing) {
        existing.recordCount += 1;
        existing.totalWage += wage;
        if (isCycle1) {
          existing.cycle1Count += 1;
          existing.cycle1Wage += wage;
        } else {
          existing.cycle2Count += 1;
          existing.cycle2Wage += wage;
        }
      } else {
        monthMap.set(isoMonth, {
          isoMonth,
          year: dateInfo.year,
          thaiYear: dateInfo.thaiYear,
          month: dateInfo.month,
          label: `${dateInfo.thaiMonthName} ${dateInfo.thaiYear}`,
          shortLabel: `${dateInfo.thaiMonthShort} ${dateInfo.thaiYear}`,
          recordCount: 1,
          totalWage: wage,
          cycle1Count: isCycle1 ? 1 : 0,
          cycle2Count: isCycle1 ? 0 : 1,
          cycle1Wage: isCycle1 ? wage : 0,
          cycle2Wage: isCycle1 ? 0 : wage,
        });
      }
    });

    // Sort descending by ISO Month (latest month first)
    return Array.from(monthMap.values()).sort((a, b) => b.isoMonth.localeCompare(a.isoMonth));
  }, [workerLabor]);

  // Default to the latest available month if present, or current month
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    if (availableMonthsList.length > 0) {
      return availableMonthsList[0].isoMonth;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // If available months change and selected month is empty, select latest
  useEffect(() => {
    if (!selectedMonth && availableMonthsList.length > 0) {
      setSelectedMonth(availableMonthsList[0].isoMonth);
    }
  }, [availableMonthsList, selectedMonth]);

  const [selectedCycle, setSelectedCycle] = useState<'all' | '1st-15th' | '16th-End'>('all');
  const [selectedPayslipData, setSelectedPayslipData] = useState<EmployeeSalarySummaryData | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [payslipMode, setPayslipMode] = useState<'full' | 'compact'>('full');

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      if (availableMonthsList.length > 0) setSelectedMonth(availableMonthsList[0].isoMonth);
      return;
    }
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr);
    let m = parseInt(mStr) - 1;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      if (availableMonthsList.length > 0) setSelectedMonth(availableMonthsList[0].isoMonth);
      return;
    }
    const [yStr, mStr] = selectedMonth.split('-');
    let y = parseInt(yStr);
    let m = parseInt(mStr) + 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    setSelectedMonth(`${y}-${String(m).padStart(2, '0')}`);
  };

  // Current active month cycle info
  const activeCycleInfo = useMemo(() => {
    return getCycleInfoForMonth(selectedMonth, selectedCycle);
  }, [selectedMonth, selectedCycle]);

  // Statistics for current selected month across cycles
  const monthCycleStats = useMemo(() => {
    const matchingRecords = workerLabor.filter(item => {
      if (selectedMonth === 'all') return true;
      const dInfo = parseLaborDateInfo(item.date);
      return dInfo.isoMonth === selectedMonth;
    });

    const c1Records = matchingRecords.filter(r => parseLaborDateInfo(r.date).payCyclePeriod === '1st-15th');
    const c2Records = matchingRecords.filter(r => parseLaborDateInfo(r.date).payCyclePeriod === '16th-End');

    const sumWage = (recs: WorkerLaborRecord[]) => recs.reduce((acc, item) => 
      acc + (item.totalWage || (item.baseWage + item.otWage + (item.bonus || 0) - (item.loanDeduction || 0))), 0);

    return {
      allCount: matchingRecords.length,
      allWage: sumWage(matchingRecords),
      c1Count: c1Records.length,
      c1Wage: sumWage(c1Records),
      c2Count: c2Records.length,
      c2Wage: sumWage(c2Records),
    };
  }, [workerLabor, selectedMonth]);

  // Group records by Employee Name based on selected month & cycle
  const groupedEmployeeSummary = useMemo(() => {
    const map = new Map<string, {
      employeeName: string;
      role: string;
      workDays: number;
      totalWorkHours: number;
      totalOtHours: number;
      baseWageTotal: number;
      otWageTotal: number;
      bonusTotal: number;
      loanDeductionTotal: number;
      grossWageTotal: number;
      payCyclePeriod: '1st-15th' | '16th-End';
      periodLabel: string;
      payDate: string;
      records: WorkerLaborRecord[];
    }>();

    workerLabor.forEach(item => {
      const empNameClean = item.employeeName ? item.employeeName.trim().replace(/\s+/g, ' ') : 'คนงานโรงสี';
      const dateInfo = parseLaborDateInfo(item.date);

      // Filter by searchQuery
      const matchesSearch = 
        empNameClean.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.includes(searchQuery) ||
        dateInfo.thaiFullDate.includes(searchQuery);

      if (!matchesSearch) return;

      // Filter by Month if selected
      if (selectedMonth !== 'all' && dateInfo.isoMonth !== selectedMonth) {
        return;
      }

      // Filter by Cycle if selected
      if (selectedCycle !== 'all' && dateInfo.payCyclePeriod !== selectedCycle) {
        return;
      }

      // Group strictly by employee name
      const key = empNameClean;
      const existing = map.get(key);

      const itemTotalWage = item.totalWage || (item.baseWage + item.otWage + (item.bonus || 0) - (item.loanDeduction || 0));

      if (existing) {
        existing.workDays += 1;
        existing.totalWorkHours += item.workHours || 8;
        existing.totalOtHours += item.otHours || 0;
        existing.baseWageTotal += item.baseWage || 0;
        existing.otWageTotal += item.otWage || 0;
        existing.bonusTotal += item.bonus || 0;
        existing.loanDeductionTotal += item.loanDeduction || 0;
        existing.grossWageTotal += itemTotalWage;
        existing.records.push(item);
      } else {
        // Compute period label and pay date for this specific employee summary
        let periodLabel = '';
        let payDate = '';

        if (selectedMonth !== 'all') {
          const info = getCycleInfoForMonth(selectedMonth, selectedCycle !== 'all' ? selectedCycle : dateInfo.payCyclePeriod);
          periodLabel = info.periodLabel;
          payDate = info.payDate;
        } else {
          periodLabel = dateInfo.periodLabel;
          payDate = dateInfo.payDate;
        }

        map.set(key, {
          employeeName: empNameClean,
          role: empNameClean.includes('คุมตู้') ? 'ช่างคุมเครื่องขัดสี' :
                empNameClean.includes('ยกกระสอบ') ? 'พนักงานแบกยกคลังสินค้า' :
                empNameClean.includes('ช่าง') ? 'หัวหน้าช่างซ่อมบำรุง' : 'พนักงานประจำโรงสี',
          workDays: 1,
          totalWorkHours: item.workHours || 8,
          totalOtHours: item.otHours || 0,
          baseWageTotal: item.baseWage || 0,
          otWageTotal: item.otWage || 0,
          bonusTotal: item.bonus || 0,
          loanDeductionTotal: item.loanDeduction || 0,
          grossWageTotal: itemTotalWage,
          payCyclePeriod: selectedCycle !== 'all' ? selectedCycle : dateInfo.payCyclePeriod,
          periodLabel,
          payDate,
          records: [item]
        });
      }
    });

    // Refine periodLabel for multi-record employees under 'all' cycle
    if (selectedCycle === 'all' && selectedMonth !== 'all') {
      const monthInfo = getCycleInfoForMonth(selectedMonth, 'all');
      map.forEach(emp => {
        const hasC1 = emp.records.some(r => parseLaborDateInfo(r.date).payCyclePeriod === '1st-15th');
        const hasC2 = emp.records.some(r => parseLaborDateInfo(r.date).payCyclePeriod === '16th-End');
        if (hasC1 && hasC2) {
          emp.periodLabel = monthInfo.periodLabel;
          emp.payDate = monthInfo.payDate;
        } else if (hasC1) {
          const c1Info = getCycleInfoForMonth(selectedMonth, '1st-15th');
          emp.periodLabel = c1Info.periodLabel;
          emp.payDate = c1Info.payDate;
          emp.payCyclePeriod = '1st-15th';
        } else if (hasC2) {
          const c2Info = getCycleInfoForMonth(selectedMonth, '16th-End');
          emp.periodLabel = c2Info.periodLabel;
          emp.payDate = c2Info.payDate;
          emp.payCyclePeriod = '16th-End';
        }
      });
    }

    return Array.from(map.values());
  }, [workerLabor, selectedCycle, selectedMonth, searchQuery]);

  const grandBaseWage = groupedEmployeeSummary.reduce((sum, e) => sum + e.baseWageTotal, 0);
  const grandOtWage = groupedEmployeeSummary.reduce((sum, e) => sum + e.otWageTotal, 0);
  const grandBonus = groupedEmployeeSummary.reduce((sum, e) => sum + e.bonusTotal, 0);
  const grandLoanDeduction = groupedEmployeeSummary.reduce((sum, e) => sum + e.loanDeductionTotal, 0);
  const grandNetWage = groupedEmployeeSummary.reduce((sum, e) => sum + e.grossWageTotal, 0);

  const handleOpenPayslip = (emp: typeof groupedEmployeeSummary[0], mode: 'full' | 'compact' = 'full') => {
    setPayslipMode(mode);
    setSelectedPayslipData({
      employeeName: emp.employeeName,
      role: emp.role,
      payCyclePeriod: emp.payCyclePeriod,
      periodLabel: emp.periodLabel,
      payDate: emp.payDate,
      workDays: emp.workDays,
      totalWorkHours: emp.totalWorkHours,
      totalOtHours: emp.totalOtHours,
      baseWageTotal: emp.baseWageTotal,
      otWageTotal: emp.otWageTotal,
      bonusTotal: emp.bonusTotal,
      loanDeductionTotal: emp.loanDeductionTotal,
      allowance: 0,
      deduction: 0,
      netWage: emp.grossWageTotal,
      paymentMethod: 'เงินสด',
      records: emp.records
    });
    setIsPayslipOpen(true);
  };

  // Selected year and month parsed for dropdown selects
  const currentParsedYear = selectedMonth && selectedMonth !== 'all' ? parseInt(selectedMonth.split('-')[0]) : new Date().getFullYear();
  const currentParsedMonth = selectedMonth && selectedMonth !== 'all' ? parseInt(selectedMonth.split('-')[1]) : new Date().getMonth() + 1;

  return (
    <div className="space-y-4">
      {/* 1. Time & Cycle Filter Control Center */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-emerald-600" />
              สรุปยอดค่าแรงเงินเดือนรายบุคคล (Mekong Sinsup Payroll Summary)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              คำนวณและสรุปยอดค่าตอบแทนรายบุคคลตามเดือนและรอบจ่ายเงิน พร้อมระบบออกสลิปเงินเดือน A4 และสลิปมือถือ
            </p>
          </div>

          {/* Quick Year/Month Dropdown Pickers */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <Calendar className="w-4 h-4 text-emerald-600 ml-1 shrink-0" />
            <span className="text-xs font-bold text-slate-700 whitespace-nowrap">เลือกเดือนที่ต้องการ:</span>
            
            {/* Month Dropdown */}
            <select
              value={selectedMonth === 'all' ? 'all' : String(currentParsedMonth)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'all') {
                  setSelectedMonth('all');
                } else {
                  const mNum = String(parseInt(val)).padStart(2, '0');
                  setSelectedMonth(`${currentParsedYear}-${mNum}`);
                }
              }}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-xs cursor-pointer"
            >
              <option value="all">-- ทุกเดือน (All Months) --</option>
              {THAI_MONTH_NAMES.map((mName, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {mName} ({String(idx + 1).padStart(2, '0')})
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            {selectedMonth !== 'all' && (
              <select
                value={currentParsedYear}
                onChange={(e) => {
                  const y = e.target.value;
                  const mNum = String(currentParsedMonth).padStart(2, '0');
                  setSelectedMonth(`${y}-${mNum}`);
                }}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-600 shadow-xs cursor-pointer"
              >
                {[2027, 2026, 2025, 2024].map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {y + 543} ({y})
                  </option>
                ))}
              </select>
            )}

            {/* Prev / Next Month Steppers */}
            {selectedMonth !== 'all' && (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-200">
                <button
                  onClick={handlePrevMonth}
                  title="เดือนก่อนหน้า"
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  title="เดือนถัดไป"
                  className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Discovered Months Fast Selector Badge Pills */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            เดือนที่มีข้อมูลในระบบ:
          </span>

          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1 text-xs rounded-xl font-bold transition flex items-center gap-1.5 ${
              selectedMonth === 'all'
                ? 'bg-slate-800 text-white shadow-sm ring-2 ring-slate-800/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            รวมทุกเดือน
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedMonth === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
            }`}>
              {workerLabor.length}
            </span>
          </button>

          {availableMonthsList.map((m) => {
            const isSelected = selectedMonth === m.isoMonth;
            return (
              <button
                key={m.isoMonth}
                onClick={() => setSelectedMonth(m.isoMonth)}
                className={`px-3 py-1 text-xs rounded-xl font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-700/20'
                    : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/70'
                }`}
              >
                <span>📅 {m.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  ฿{Math.round(m.totalWage).toLocaleString()} ({m.recordCount})
                </span>
              </button>
            );
          })}
        </div>

        {/* 3. Pay Cycle Switcher Buttons for the Selected Month */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">รอบการตัดจ่ายค่าแรง:</span>
          </div>

          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex flex-wrap items-center gap-1">
            <button
              onClick={() => setSelectedCycle('all')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 ${
                selectedCycle === 'all' 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>รวมทุกรอบ (ประจำเดือน)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedCycle === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                ฿{Math.round(monthCycleStats.allWage).toLocaleString()}
              </span>
            </button>

            <button
              onClick={() => setSelectedCycle('1st-15th')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 ${
                selectedCycle === '1st-15th' 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>รอบ 1-15 (จ่ายวันที่ 16)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedCycle === '1st-15th' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                ฿{Math.round(monthCycleStats.c1Wage).toLocaleString()} ({monthCycleStats.c1Count})
              </span>
            </button>

            <button
              onClick={() => setSelectedCycle('16th-End')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition flex items-center gap-1.5 ${
                selectedCycle === '16th-End' 
                  ? 'bg-emerald-700 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <span>รอบ 16-สิ้นเดือน (จ่ายวันที่ 1)</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                selectedCycle === '16th-End' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                ฿{Math.round(monthCycleStats.c2Wage).toLocaleString()} ({monthCycleStats.c2Count})
              </span>
            </button>
          </div>
        </div>

        {/* 4. Active Filter Scope Banner */}
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start md:items-center gap-2.5 text-emerald-950">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-emerald-800">งวดการทำงานจริง:</span>
                <span className="font-extrabold text-emerald-950 bg-white px-2 py-0.5 rounded border border-emerald-300 shadow-xs">
                  {activeCycleInfo.periodLabel}
                </span>
                {activeCycleInfo.payDate && (
                  <span className="text-emerald-700 font-medium">
                    ➔ กำหนดจ่ายเงิน: <strong className="text-emerald-900 font-bold underline decoration-emerald-500">{activeCycleInfo.payDate}</strong>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                * ข้อมูลคำนวณจากวันที่ลงเวลาทำงานจริงของพนักงานในระบบ (Work Date) ไม่ใช่บันทึกล่วงหน้า
              </p>
            </div>
          </div>

          <div className="text-right text-emerald-900 font-bold text-xs bg-emerald-100/70 px-3 py-1.5 rounded-lg border border-emerald-200 shrink-0">
            {groupedEmployeeSummary.length > 0 ? (
              <span>พบข้อมูล {groupedEmployeeSummary.length} พนักงาน • {groupedEmployeeSummary.reduce((s, e) => s + e.workDays, 0)} วันทำงาน</span>
            ) : (
              <span className="text-slate-600 font-normal">ยังไม่มีข้อมูลในงวดนี้ (0 รายการ)</span>
            )}
          </div>
        </div>
      </div>

      {/* 5. Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">พนักงานในรอบนี้</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
            {groupedEmployeeSummary.length} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">{activeCycleInfo.shortLabel}</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">ค่าแรงปกติรวม</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            ฿{Math.round(grandBaseWage).toLocaleString()}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">รวมทุกวันทำงานในรอบ</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">ค่า OT ล่วงเวลารวม</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            ฿{Math.round(grandOtWage).toLocaleString()}
          </p>
          <p className="text-[10px] text-amber-500/80 mt-0.5">
            {groupedEmployeeSummary.reduce((sum, e) => sum + e.totalOtHours, 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม. OT
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">โบนัสรวม / หักเงินยืม</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            +฿{Math.round(grandBonus).toLocaleString()} <span className="text-xs font-bold text-rose-500">(-฿{Math.round(grandLoanDeduction).toLocaleString()})</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">สวัสดิการและรายการหัก</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-3.5 rounded-2xl shadow-sm border border-emerald-700">
          <p className="text-[11px] text-emerald-200 font-medium">ยอดจ่ายสุทธิรวมทั้งสิ้น</p>
          <p className="text-xl font-extrabold text-white mt-1">
            ฿{Math.round(grandNetWage).toLocaleString()}
          </p>
          <p className="text-[10px] text-emerald-200/80 mt-0.5">
            จ่ายวันที่ {activeCycleInfo.payDate}
          </p>
        </div>
      </div>

      {/* 6. Employee Salary Summary Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700" />
            ตารางสรุปเงินเดือนพนักงานรายบุคคล ({groupedEmployeeSummary.length} พนักงาน) • {activeCycleInfo.periodLabel}
          </span>
          <span className="text-[11px] text-slate-500">เลือก "สลิปเงินแบบเต็ม" (A4 PDF) หรือ "สลิปเงินแบบย่อ" (.JPG สมาร์ทโฟน)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">พนักงาน / ตำแหน่ง</th>
                <th className="px-4 py-3">รอบตัดจ่าย</th>
                <th className="px-4 py-3 text-center">มาทำงาน (วัน)</th>
                <th className="px-4 py-3 text-right">OT รวม (ชม.)</th>
                <th className="px-4 py-3 text-right">ค่าแรงปกติรวม</th>
                <th className="px-4 py-3 text-right">ค่า OT รวม</th>
                <th className="px-4 py-3 text-right">โบนัส</th>
                <th className="px-4 py-3 text-right">หักเงินยืม</th>
                <th className="px-4 py-3 text-right">สุทธิต้องจ่าย</th>
                <th className="px-4 py-3 text-center">สลิปเงินเดือน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {groupedEmployeeSummary.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-1">
                        <AlertCircle className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">
                        ไม่พบข้อมูลการทำงานในงวด {activeCycleInfo.periodLabel}
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        ระบบจะแสดงเฉพาะข้อมูลที่มีการลงเวลาทำงานจริงเท่านั้น (หากยังไม่ถึงกำหนดรอบ หรือยังไม่มีการบันทึกเวลาทำงาน ยอดจะแสดงเป็น 0 รายการ)
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={() => {
                            if (availableMonthsList.length > 0) {
                              setSelectedMonth(availableMonthsList[0].isoMonth);
                              setSelectedCycle('all');
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold transition"
                        >
                          ดูงวดเดือนที่มีข้อมูลล่าสุด ({availableMonthsList[0]?.label || 'งวดก่อนหน้า'})
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedEmployeeSummary.map((emp, index) => (
                  <tr key={`${emp.employeeName}_${emp.payCyclePeriod}_${index}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                          {emp.employeeName.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900 text-xs">{emp.employeeName}</span>
                          <span className="text-[11px] text-slate-500 font-normal">{emp.role}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-semibold">
                        {emp.periodLabel}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-slate-800 whitespace-nowrap">
                      {emp.workDays} วัน
                    </td>

                    <td className="px-4 py-3 text-right font-semibold text-amber-600 whitespace-nowrap">
                      {emp.totalOtHours.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.
                    </td>

                    <td className="px-4 py-3 text-right text-slate-700 whitespace-nowrap">
                      ฿{Math.round(emp.baseWageTotal).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right text-amber-600 whitespace-nowrap">
                      ฿{Math.round(emp.otWageTotal).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold whitespace-nowrap">
                      ฿{Math.round(emp.bonusTotal).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right text-rose-600 font-semibold whitespace-nowrap">
                      ฿{Math.round(emp.loanDeductionTotal).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm whitespace-nowrap">
                      ฿{Math.round(emp.grossWageTotal).toLocaleString()}
                    </td>

                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        <button
                          onClick={() => handleOpenPayslip(emp, 'full')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
                          title="สลิปเงินเดือนแบบเต็ม (A4 Standard Payslip)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          สลิปเงินแบบเต็ม
                        </button>

                        <button
                          onClick={() => handleOpenPayslip(emp, 'compact')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95 cursor-pointer"
                          title="สลิปเงินเดือนแบบย่อสำหรับสมาร์ทโฟน (.JPG)"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          สลิปเงินแบบย่อ
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {groupedEmployeeSummary.length > 0 && (
              <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-xs text-slate-900">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right">
                    ยอดรวมสุทธิ ({groupedEmployeeSummary.length} คน):
                  </td>
                  <td className="px-4 py-3 text-center">
                    {groupedEmployeeSummary.reduce((sum, e) => sum + e.workDays, 0)} วัน
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600">
                    {groupedEmployeeSummary.reduce((sum, e) => sum + e.totalOtHours, 0).toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.
                  </td>
                  <td className="px-4 py-3 text-right">
                    ฿{Math.round(grandBaseWage).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-amber-600">
                    ฿{Math.round(grandOtWage).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    ฿{Math.round(grandBonus).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600">
                    ฿{Math.round(grandLoanDeduction).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-800 text-sm font-extrabold">
                    ฿{Math.round(grandNetWage).toLocaleString()}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* 7. Official Payslip Modal */}
      <EmployeePayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        summaryData={selectedPayslipData}
        initialMode={payslipMode}
      />
    </div>
  );
}
