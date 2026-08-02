import React, { useState } from 'react';
import { 
  Users, Truck, Zap, Wrench, Building2, Calendar, Clock, DollarSign,
  TrendingDown, Plus, Search, Filter, Camera, Sparkles, FileText, CheckCircle,
  AlertTriangle, ArrowRight, Upload, RefreshCw, FileSpreadsheet, ExternalLink, ShieldCheck, Gauge, Award
} from 'lucide-react';
import { 
  WorkerLaborRecord, FuelExpenseRecord, ElectricityExpenseRecord,
  MachineMaintenanceRecord, CapExInvestmentRecord
} from '../../services/dashboardService';
import WorkerSalarySummaryView from './WorkerSalarySummaryView';
import ElectricityTrackerView from './ElectricityTrackerView';

interface ExpensesHubViewProps {
  workerLabor: WorkerLaborRecord[];
  fuelExpenses: FuelExpenseRecord[];
  electricityExpenses: ElectricityExpenseRecord[];
  maintenanceExpenses: MachineMaintenanceRecord[];
  capexInvestments: CapExInvestmentRecord[];
  onRefresh: () => void;
  loading: boolean;
  onUpdateElectricityRecords?: (records: ElectricityExpenseRecord[]) => void;
}

export default function ExpensesHubView({
  workerLabor,
  fuelExpenses,
  electricityExpenses,
  maintenanceExpenses,
  capexInvestments,
  onRefresh,
  loading,
  onUpdateElectricityRecords
}: ExpensesHubViewProps) {
  const [subTab, setSubTab] = useState<'worker_labor' | 'fuel' | 'electricity' | 'maintenance' | 'capex'>('worker_labor');
  const [laborViewMode, setLaborViewMode] = useState<'summary' | 'logs'>('summary');
  const [payCycleFilter, setPayCycleFilter] = useState<'all' | '1st-15th' | '16th-End'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // AI Fuel Scanner state
  const [fuelBillImg, setFuelBillImg] = useState<string | null>(null);
  const [fuelBillFileName, setFuelBillFileName] = useState<string>('');
  const [odoImg, setOdoImg] = useState<string | null>(null);
  const [vehiclePlateInput, setVehiclePlateInput] = useState('ผก 8812 นครพนม');
  const [scanningFuel, setScanningFuel] = useState(false);
  const [scannedFuelResult, setScannedFuelResult] = useState<any | null>(null);

  // AI Electricity Scanner state
  const [elecBillImg, setElecBillImg] = useState<string | null>(null);
  const [elecBillFileName, setElecBillFileName] = useState<string>('');
  const [scanningElec, setScanningElec] = useState(false);
  const [scannedElecResult, setScannedElecResult] = useState<any | null>(null);

  // Filtering Labor
  const filteredLabor = workerLabor.filter(item => {
    const matchesSearch = item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || item.date.includes(searchQuery);
    const matchesCycle = payCycleFilter === 'all' || item.payCyclePeriod === payCycleFilter;
    return matchesSearch && matchesCycle;
  });

  const totalBaseWage = filteredLabor.reduce((sum, item) => sum + item.baseWage, 0);
  const totalOtWage = filteredLabor.reduce((sum, item) => sum + item.otWage, 0);
  const totalBonus = filteredLabor.reduce((sum, item) => sum + (item.bonus || 0), 0);
  const totalLoanDeduction = filteredLabor.reduce((sum, item) => sum + (item.loanDeduction || 0), 0);
  const totalWageCycle = filteredLabor.reduce((sum, item) => sum + item.totalWage, 0);

  // AI Scanning Trigger Handlers
  const handleScanFuelBill = async () => {
    if (!fuelBillImg && !odoImg) {
      alert('กรุณาอัปโหลดหรือถ่ายภาพใบเสร็จค่าน้ำมัน หรือภาพเรือนไมล์รถยนต์');
      return;
    }
    setScanningFuel(true);
    try {
      const res = await fetch('/api/gemini/analyze-fuel-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fuelBillImage: fuelBillImg,
          odometerImage: odoImg,
          vehiclePlate: vehiclePlateInput,
          previousOdometer: '142100'
        })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setScannedFuelResult(data.data);
      }
    } catch (err) {
      console.error('Fuel AI scan error:', err);
    } finally {
      setScanningFuel(false);
    }
  };

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
      }
    } catch (err) {
      console.error('Electricity AI scan error:', err);
    } finally {
      setScanningElec(false);
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void,
    nameSetter?: (name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (nameSetter) nameSetter(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-tab Switcher */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            ข้อมูลรายจ่ายโรงสี (Expenses Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ค่าแรงงาน, ค่าน้ำมัน AI, ค่าไฟฟ้า AI, ค่าซ่อมบำรุง และงบลงทุน CapEx
          </p>
        </div>

        {/* Sub-tab Navigation Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setSubTab('worker_labor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'worker_labor'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Users className="w-4 h-4" />
            ค่าแรงงาน
          </button>

          <button
            onClick={() => setSubTab('fuel')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'fuel'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            น้ำมัน & AI สแกน
          </button>

          <button
            onClick={() => setSubTab('electricity')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'electricity'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            ไฟฟ้า & AI สแกน
          </button>

          <button
            onClick={() => setSubTab('maintenance')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'maintenance'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wrench className="w-4 h-4" />
            ซ่อมบำรุง
          </button>

          <button
            onClick={() => setSubTab('capex')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
              subTab === 'capex'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-4 h-4" />
            CapEx ลงทุน
          </button>
        </div>
      </div>

      {/* Sub-tab 2.1: ค่าแรงงานคนงาน */}
      {subTab === 'worker_labor' && (
        <div className="space-y-4">
          {/* View Mode Switcher Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setLaborViewMode('summary')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  laborViewMode === 'summary'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Award className="w-4 h-4" />
                สรุปเงินเดือน & สลิปเงินเดือนรายบุคคล
              </button>
              <button
                onClick={() => setLaborViewMode('logs')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  laborViewMode === 'logs'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Calendar className="w-4 h-4" />
                บันทึกเวลาทำงานรายวัน ({workerLabor.length} รายการ)
              </button>
            </div>

            <a
              href="https://docs.google.com/spreadsheets/d/1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg/edit#gid=264764262"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 font-medium px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-rose-600" />
              เปิด Sheet ค่าแรง
            </a>
          </div>

          {laborViewMode === 'summary' ? (
            <WorkerSalarySummaryView workerLabor={workerLabor} searchQuery={searchQuery} />
          ) : (
            <>
              {/* Pay Cycle Switcher & Stat Badges */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-rose-600" />
                      รอบการตัดงบจ่ายค่าแรงงาน
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      จ่ายทุกวันที่ 1 (รอบวันที่ 16-สิ้นเดือนก่อน) และ วันที่ 16 (รอบวันที่ 1-15)
                    </p>
                  </div>

                  {/* Cycle Filter Pills */}
                  <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
                    <button
                      onClick={() => setPayCycleFilter('all')}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                        payCycleFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      รวมทุกรอบ
                    </button>
                    <button
                      onClick={() => setPayCycleFilter('1st-15th')}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                        payCycleFilter === '1st-15th' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      รอบ 1 - 15 (จ่ายวันที่ 16)
                    </button>
                    <button
                      onClick={() => setPayCycleFilter('16th-End')}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition ${
                        payCycleFilter === '16th-End' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      รอบ 16 - สิ้นเดือน (จ่ายวันที่ 1)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500">ค่าแรงปกติรวม</p>
                    <p className="text-xl font-bold text-slate-900 mt-1">฿{Math.round(totalBaseWage).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500">ค่า OT ล่วงเวลารวม</p>
                    <p className="text-xl font-bold text-amber-600 mt-1">฿{Math.round(totalOtWage).toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500">โบนัสรวม / หักเงินยืม</p>
                    <p className="text-xl font-bold text-emerald-600 mt-1">
                      +฿{Math.round(totalBonus).toLocaleString()} <span className="text-xs font-bold text-rose-500">(-฿{Math.round(totalLoanDeduction).toLocaleString()})</span>
                    </p>
                  </div>
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200">
                    <p className="text-[11px] text-slate-500">รวมจ่ายสุทธิ</p>
                    <p className="text-xl font-bold text-rose-600 mt-1">฿{Math.round(totalWageCycle).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Table of Worker Labor */}
              <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อคนงาน, วันที่..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">ID / วันที่</th>
                        <th className="px-4 py-3">รอบตัดจ่าย</th>
                        <th className="px-4 py-3">พนักงาน</th>
                        <th className="px-4 py-3">เวลาทำงาน</th>
                        <th className="px-4 py-3 text-right">OT (ชม.)</th>
                        <th className="px-4 py-3 text-right">ค่าแรงปกติ</th>
                        <th className="px-4 py-3 text-right">ค่า OT</th>
                        <th className="px-4 py-3 text-right">โบนัส</th>
                        <th className="px-4 py-3 text-right">หักเงินยืม</th>
                        <th className="px-4 py-3 text-right">รวมค่าจ้าง</th>
                        <th className="px-4 py-3">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLabor.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition">
                          <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                            <span className="font-semibold text-slate-900 block">{row.id}</span>
                            <span className="text-[10px] text-slate-400">{row.date}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[10px]">
                              {row.payCyclePeriod === '1st-15th' ? 'รอบ 1-15' : 'รอบ 16-สิ้นเดือน'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{row.employeeName}</td>
                          <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {row.checkInTime} - {row.checkOutTime} ({row.breakHours} ชม.)
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-amber-600">{row.otHours.toLocaleString('th-TH', { maximumFractionDigits: 2 })} ชม.</td>
                          <td className="px-4 py-3 text-right text-slate-600">฿{Math.round(row.baseWage).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-amber-600">฿{Math.round(row.otWage).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-emerald-600 font-semibold">฿{Math.round(row.bonus || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-rose-600 font-semibold">฿{Math.round(row.loanDeduction || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right font-bold text-rose-700 text-sm">฿{Math.round(row.totalWage).toLocaleString()}</td>
                          <td className="px-4 py-3 text-slate-500 text-[11px]">{row.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Sub-tab 2.2: ค่าน้ำมัน และค่าขนส่ง + AI Scan */}
      {subTab === 'fuel' && (
        <div className="space-y-6">
          {/* AI Fuel & Odometer Scanner Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-3">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
                <Sparkles className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">AI สแกนบิลน้ำมัน & เรือนไมล์รถขนส่ง</h3>
                <p className="text-xs text-slate-500">รองรับทั้งไฟล์รูปภาพ (.JPG, .PNG) และไฟล์เอกสาร (.PDF) → Gemini AI คำนวณอัตราสิ้นเปลืองอัตโนมัติ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
              {/* Input 1: Fuel Receipt */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-700 mb-2">1. สลิปใบเสร็จเติมน้ำมัน (รูป/PDF)</p>
                <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 transition bg-white">
                  {fuelBillImg ? (
                    fuelBillImg.startsWith('data:application/pdf') || fuelBillFileName.endsWith('.pdf') ? (
                      <div className="py-3 flex flex-col items-center justify-center gap-1.5">
                        <FileText className="w-10 h-10 text-rose-600" />
                        <span className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[180px]">{fuelBillFileName || 'สลิปค่าน้ำมัน (PDF)'}</span>
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 font-bold text-[10px] rounded-md">เอกสาร PDF พร้อมสแกน</span>
                      </div>
                    ) : (
                      <img src={fuelBillImg} alt="Fuel Slip" className="h-28 mx-auto object-contain rounded" />
                    )
                  ) : (
                    <div className="py-3 text-slate-500 text-xs flex flex-col items-center gap-1">
                      <Camera className="w-6 h-6 text-amber-500" />
                      <span>ถ่ายภาพ / อัปโหลดไฟล์ (.JPG, .PDF)</span>
                    </div>
                  )}
                  <input type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => handleFileUpload(e, setFuelBillImg, setFuelBillFileName)} />
                </label>
              </div>

              {/* Input 2: Odometer Photo */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-700 mb-2">2. ภาพเรือนไมล์ (Odometer)</p>
                <label className="cursor-pointer block border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 transition bg-white">
                  {odoImg ? (
                    <img src={odoImg} alt="Odometer" className="h-28 mx-auto object-contain rounded" />
                  ) : (
                    <div className="py-3 text-slate-500 text-xs flex flex-col items-center gap-1">
                      <Gauge className="w-6 h-6 text-amber-500" />
                      <span>ถ่ายภาพ / อัปโหลดเลขไมล์</span>
                    </div>
                  )}
                  <input type="file" accept="image/*,application/pdf,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={(e) => handleFileUpload(e, setOdoImg)} />
                </label>
              </div>

              {/* Input 3: Vehicle Plate & Trigger */}
              <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700 mb-2">3. ข้อมูลรถขนส่ง</p>
                  <label className="text-[11px] text-slate-500 block mb-1">ทะเบียนรถบรรทุก:</label>
                  <input
                    type="text"
                    value={vehiclePlateInput}
                    onChange={(e) => setVehiclePlateInput(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-xs text-slate-900 rounded-lg p-2 mb-3 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={handleScanFuelBill}
                  disabled={scanningFuel}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className={`w-4 h-4 ${scanningFuel ? 'animate-spin' : ''}`} />
                  {scanningFuel ? 'กำลังสแกน...' : 'ประมวลผลด้วย Gemini AI'}
                </button>
              </div>
            </div>

            {/* AI Result Card */}
            {scannedFuelResult && (
              <div className="mt-4 bg-amber-50/50 border border-amber-200 rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-amber-200/80">
                  <span className="font-bold text-amber-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-amber-600" /> วิเคราะห์สแกนบิลน้ำมันสำเร็จ
                  </span>
                  <span className="text-slate-600">{scannedFuelResult.stationName}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700">
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="text-slate-500 block">ปริมาณน้ำมัน:</span>
                    <span className="font-bold text-slate-900 text-sm">{scannedFuelResult.liters} ลิตร</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="text-slate-500 block">ราคารวม:</span>
                    <span className="font-bold text-amber-700 text-sm">฿{scannedFuelResult.totalCostBaht}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="text-slate-500 block">อัตราสิ้นเปลือง:</span>
                    <span className="font-bold text-emerald-700 text-sm">{scannedFuelResult.kmPerLiter} กม./ลิตร</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                    <span className="text-slate-500 block">ต้นทุน/ระยะทาง:</span>
                    <span className="font-bold text-amber-700 text-sm">{scannedFuelResult.costPerKm} บาท/กม.</span>
                  </div>
                </div>

                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-amber-100 text-[11px]">
                  💡 <strong>บทวิเคราะห์ AI:</strong> {scannedFuelResult.fuelEfficiencyNotes}
                </p>
              </div>
            )}
          </div>

          {/* Historical Log Table */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-bold text-slate-900 mb-3">ประวัติการสแกนและบันทึกค่าน้ำมันเชื้อเพลิง</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">วันที่</th>
                    <th className="p-3">ทะเบียนรถ</th>
                    <th className="p-3">ปั๊มน้ำมัน</th>
                    <th className="p-3 text-right">ปริมาณ (ลิตร)</th>
                    <th className="p-3 text-right">จำนวนเงิน</th>
                    <th className="p-3 text-right">ระยะทาง (กม.)</th>
                    <th className="p-3 text-right">กม./ลิตร</th>
                    <th className="p-3 text-right">บาท/กม.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuelExpenses.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono text-slate-500">{row.date}</td>
                      <td className="p-3 font-semibold text-slate-900">{row.vehiclePlate}</td>
                      <td className="p-3 text-slate-600">{row.stationName}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{row.liters} ลิตร</td>
                      <td className="p-3 text-right font-bold text-rose-600">฿{row.totalCostBaht.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-600">{row.distanceDrivenKm} กม.</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{row.kmPerLiter}</td>
                      <td className="p-3 text-right font-semibold text-amber-600">{row.costPerKm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2.3: ค่าไฟฟ้า PEA/MEA, บันทึกรายเดือน, กราฟ & AI Optimization */}
      {subTab === 'electricity' && (
        <ElectricityTrackerView electricityExpenses={electricityExpenses} onUpdateRecords={onUpdateElectricityRecords} />
      )}

      {/* Sub-tab 2.4: ค่าซ่อมบำรุงเครื่องจักร */}
      {subTab === 'maintenance' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            ประวัติค่าซ่อมบำรุงเครื่องจักรโรงสี
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">วันที่</th>
                  <th className="p-3">เครื่องจักร</th>
                  <th className="p-3">ประเภทการซ่อม</th>
                  <th className="p-3">รายการอะไหล่ที่เปลี่ยน</th>
                  <th className="p-3">ช่างผู้ดูแล</th>
                  <th className="p-3 text-right">ค่าใช้จ่าย</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {maintenanceExpenses.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-500">{m.date}</td>
                    <td className="p-3 font-semibold text-slate-900">{m.machineName}</td>
                    <td className="p-3 text-slate-600">{m.maintenanceType}</td>
                    <td className="p-3 text-slate-600">{m.replacedParts}</td>
                    <td className="p-3 text-slate-500">{m.technician}</td>
                    <td className="p-3 text-right font-bold text-rose-600">฿{m.costBaht.toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sub-tab 2.5: ค่าลงทุนเพิ่มเติม CapEx */}
      {subTab === 'capex' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            รายการลงทุนเพิ่มทรัพย์สินและสิ่งปลูกสร้าง (CapEx)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/90 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                <tr>
                  <th className="p-3">วันที่</th>
                  <th className="p-3">โครงการ / ทรัพย์สิน</th>
                  <th className="p-3">หมวดหมู่</th>
                  <th className="p-3 text-right">มูลค่าการลงทุน</th>
                  <th className="p-3 text-center">อายุใช้งาน</th>
                  <th className="p-3">ผลตอบแทนการลงทุน (ROI)</th>
                  <th className="p-3 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {capexInvestments.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono text-slate-500">{c.date}</td>
                    <td className="p-3 font-semibold text-slate-900">{c.title}</td>
                    <td className="p-3 text-slate-600">{c.category}</td>
                    <td className="p-3 text-right font-bold text-purple-700 text-sm">฿{c.amountBaht.toLocaleString()}</td>
                    <td className="p-3 text-center text-slate-600">{c.expectedLifespanYears} ปี</td>
                    <td className="p-3 text-slate-600 text-[11px]">{c.estimatedRoiNotes}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold rounded">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
