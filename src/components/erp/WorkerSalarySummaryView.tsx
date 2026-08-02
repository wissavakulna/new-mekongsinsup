import React, { useState, useMemo } from 'react';
import { 
  Users, Calendar, DollarSign, Clock, FileText, Printer, CheckCircle2, 
  Search, Filter, ChevronRight, Award, ShieldCheck, ArrowUpRight, Smartphone
} from 'lucide-react';
import { WorkerLaborRecord } from '../../services/dashboardService';
import EmployeePayslipModal, { EmployeeSalarySummaryData } from './EmployeePayslipModal';

interface WorkerSalarySummaryViewProps {
  workerLabor: WorkerLaborRecord[];
  searchQuery: string;
}

export default function WorkerSalarySummaryView({ workerLabor, searchQuery }: WorkerSalarySummaryViewProps) {
  const [selectedCycle, setSelectedCycle] = useState<'all' | '1st-15th' | '16th-End'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // e.g. "2026-07"
  const [selectedPayslipData, setSelectedPayslipData] = useState<EmployeeSalarySummaryData | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [payslipMode, setPayslipMode] = useState<'full' | 'compact'>('full');

  // Group records by Employee Name and chosen Cycle
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
      // Filter by searchQuery
      const matchesSearch = 
        item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.date.includes(searchQuery);

      if (!matchesSearch) return;

      // Filter by Cycle
      if (selectedCycle !== 'all' && item.payCyclePeriod !== selectedCycle) return;

      // Filter by Month if selected
      if (selectedMonth) {
        // e.g. item.date = "28/07/2026" or "2026-07-28"
        const parts = item.date.split(/[/.-]/);
        if (parts.length === 3) {
          let itemYear = parts[2];
          let itemMonth = parts[1].padStart(2, '0');
          if (parts[0].length === 4) {
            itemYear = parts[0];
            itemMonth = parts[1].padStart(2, '0');
          }
          if (parseInt(itemYear) > 2400) itemYear = String(parseInt(itemYear) - 543);
          const itemIsoMonth = `${itemYear}-${itemMonth}`;
          if (itemIsoMonth !== selectedMonth) return;
        }
      }

      const key = `${item.employeeName}_${item.payCyclePeriod}`;
      const existing = map.get(key);

      if (existing) {
        existing.workDays += 1;
        existing.totalWorkHours += item.workHours || 8;
        existing.totalOtHours += item.otHours || 0;
        existing.baseWageTotal += item.baseWage || 0;
        existing.otWageTotal += item.otWage || 0;
        existing.bonusTotal += item.bonus || 0;
        existing.loanDeductionTotal += item.loanDeduction || 0;
        existing.grossWageTotal += item.totalWage || (item.baseWage + item.otWage + (item.bonus || 0) - (item.loanDeduction || 0));
        existing.records.push(item);
      } else {
        const periodLabel = item.payCyclePeriod === '1st-15th'
          ? 'รอบ 1 - 15 (จ่ายวันที่ 16)'
          : 'รอบ 16 - สิ้นเดือน (จ่ายวันที่ 1)';
        const payDate = item.payCyclePeriod === '1st-15th' ? '16 ของเดือน' : '1 ของเดือนถัดไป';

        map.set(key, {
          employeeName: item.employeeName,
          role: item.employeeName.includes('คุมตู้') ? 'ช่างคุมเครื่องขัดสี' :
                item.employeeName.includes('ยกกระสอบ') ? 'พนักงานแบกยกคลังสินค้า' :
                item.employeeName.includes('ช่าง') ? 'หัวหน้าช่างซ่อมบำรุง' : 'พนักงานประจำโรงสี',
          workDays: 1,
          totalWorkHours: item.workHours || 8,
          totalOtHours: item.otHours || 0,
          baseWageTotal: item.baseWage || 0,
          otWageTotal: item.otWage || 0,
          bonusTotal: item.bonus || 0,
          loanDeductionTotal: item.loanDeduction || 0,
          grossWageTotal: item.totalWage || (item.baseWage + item.otWage + (item.bonus || 0) - (item.loanDeduction || 0)),
          payCyclePeriod: item.payCyclePeriod,
          periodLabel,
          payDate,
          records: [item]
        });
      }
    });

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

  return (
    <div className="space-y-4">
      {/* Time & Cycle Filter Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              สรุปยอดค่าแรงเงินเดือนรายบุคคล (Mekong Sinsup Payroll Summary)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              รวมยอดค่าตอบแทนรายรอบของคนงาน พร้อมระบบออกสลิปเงินเดือนอย่างเป็นทางการ
            </p>
          </div>

          {/* Cycle Selector Buttons */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1 self-start md:self-auto">
            <button
              onClick={() => setSelectedCycle('all')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                selectedCycle === 'all' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รวมทุกรอบ
            </button>
            <button
              onClick={() => setSelectedCycle('1st-15th')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                selectedCycle === '1st-15th' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รอบ 1-15 (จ่ายวันที่ 16)
            </button>
            <button
              onClick={() => setSelectedCycle('16th-End')}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition ${
                selectedCycle === '16th-End' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              รอบ 16-สิ้นเดือน (จ่ายวันที่ 1)
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-slate-700 whitespace-nowrap">กรองตามเดือน/ปี:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm"
          />
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded-lg font-semibold transition"
            >
              ล้างเดือน
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">พนักงานในรอบสรุปนี้</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1 flex items-baseline gap-1">
            {groupedEmployeeSummary.length} <span className="text-xs font-normal text-slate-500">คน</span>
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">ค่าแรงปกติรวม</p>
          <p className="text-xl font-extrabold text-slate-900 mt-1">
            ฿{Math.round(grandBaseWage).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">ค่า OT รวม</p>
          <p className="text-xl font-extrabold text-amber-600 mt-1">
            ฿{Math.round(grandOtWage).toLocaleString()}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] text-slate-500 font-medium">โบนัสรวม / หักเงินยืม</p>
          <p className="text-xl font-extrabold text-emerald-600 mt-1">
            +฿{Math.round(grandBonus).toLocaleString()} <span className="text-xs font-bold text-rose-500">(-฿{Math.round(grandLoanDeduction).toLocaleString()})</span>
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white p-3.5 rounded-2xl shadow-sm border border-emerald-700">
          <p className="text-[11px] text-emerald-200 font-medium">ยอดจ่ายสุทธิรวมทั้งสิ้น</p>
          <p className="text-xl font-extrabold text-white mt-1">
            ฿{Math.round(grandNetWage).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Employee Salary Summary Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700" />
            ตารางสรุปเงินเดือนพนักงานรายบุคคล ({groupedEmployeeSummary.length} พนักงาน)
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
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบข้อมูลเงินเดือนพนักงานตามรอบที่เลือก
                  </td>
                </tr>
              ) : (
                groupedEmployeeSummary.map((emp, index) => (
                  <tr key={`${emp.employeeName}_${emp.payCyclePeriod}_${index}`} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                          {emp.employeeName.charAt(0)}
                        </div>
                        <div>
                          <span className="block font-bold text-slate-900">{emp.employeeName}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{emp.role}</span>
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
                      {emp.totalOtHours.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ชม.
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95"
                          title="สลิปเงินเดือนแบบเต็ม (A4 Standard Payslip)"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          สลิปเงินแบบเต็ม
                        </button>

                        <button
                          onClick={() => handleOpenPayslip(emp, 'compact')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition transform active:scale-95"
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
                    {groupedEmployeeSummary.reduce((sum, e) => sum + e.totalOtHours, 0).toLocaleString('th-TH', { maximumFractionDigits: 2 })} ชม.
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

      {/* Official Payslip Modal */}
      <EmployeePayslipModal
        isOpen={isPayslipOpen}
        onClose={() => setIsPayslipOpen(false)}
        summaryData={selectedPayslipData}
        initialMode={payslipMode}
      />
    </div>
  );
}
