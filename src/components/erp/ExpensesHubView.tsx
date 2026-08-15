import React, { useState, useEffect } from 'react';
import { 
  Users, Truck, Zap, Wrench, Building2, Calendar, Clock, DollarSign,
  TrendingDown, Plus, Search, Filter, Camera, Sparkles, FileText, CheckCircle,
  AlertTriangle, ArrowRight, Upload, RefreshCw, FileSpreadsheet, ExternalLink, ShieldCheck, Gauge, Award, Layers, X, Edit, Trash2
} from 'lucide-react';
import { 
  WorkerLaborRecord, FuelExpenseRecord, ElectricityExpenseRecord,
  MachineMaintenanceRecord, CapExInvestmentRecord, markRecordDeleted,
  formatThaiFuelDate, deduplicateFuelRecords
} from '../../services/dashboardService';
import WorkerSalarySummaryView from './WorkerSalarySummaryView';
import ElectricityTrackerView from './ElectricityTrackerView';
import { DEFAULT_SPREADSHEET_ID } from '../../services/googleSheetsService';

interface ExpensesHubViewProps {
  workerLabor: WorkerLaborRecord[];
  fuelExpenses: FuelExpenseRecord[];
  electricityExpenses: ElectricityExpenseRecord[];
  maintenanceExpenses: MachineMaintenanceRecord[];
  capexInvestments: CapExInvestmentRecord[];
  onRefresh: () => void;
  loading: boolean;
  onUpdateWorkerLabor?: (records: WorkerLaborRecord[]) => void;
  onUpdateFuelExpenses?: (records: FuelExpenseRecord[]) => void;
  onUpdateElectricityRecords?: (records: ElectricityExpenseRecord[]) => void;
  onUpdateMaintenanceExpenses?: (records: MachineMaintenanceRecord[]) => void;
  onUpdateCapexInvestments?: (records: CapExInvestmentRecord[]) => void;
}

export default function ExpensesHubView({
  workerLabor,
  fuelExpenses,
  electricityExpenses,
  maintenanceExpenses,
  capexInvestments,
  onRefresh,
  loading,
  onUpdateWorkerLabor,
  onUpdateFuelExpenses,
  onUpdateElectricityRecords,
  onUpdateMaintenanceExpenses,
  onUpdateCapexInvestments
}: ExpensesHubViewProps) {
  const [subTab, setSubTab] = useState<'worker_labor' | 'fuel' | 'electricity' | 'maintenance' | 'capex'>('worker_labor');
  const [laborViewMode, setLaborViewMode] = useState<'summary' | 'logs'>('summary');
  const [payCycleFilter, setPayCycleFilter] = useState<'all' | '1st-15th' | '16th-End'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Synchronized Local State
  const [localLabor, setLocalLabor] = useState<WorkerLaborRecord[]>(workerLabor);
  const [localFuel, setLocalFuel] = useState<FuelExpenseRecord[]>(() => deduplicateFuelRecords(fuelExpenses));
  const [localMaint, setLocalMaint] = useState<MachineMaintenanceRecord[]>(maintenanceExpenses);
  const [localCapex, setLocalCapex] = useState<CapExInvestmentRecord[]>(capexInvestments);

  useEffect(() => { setLocalLabor(workerLabor); }, [workerLabor]);
  useEffect(() => { setLocalFuel(deduplicateFuelRecords(fuelExpenses)); }, [fuelExpenses]);
  useEffect(() => { setLocalMaint(maintenanceExpenses); }, [maintenanceExpenses]);
  useEffect(() => { setLocalCapex(capexInvestments); }, [capexInvestments]);

  // Toast Notice
  const [notice, setNotice] = useState<string | null>(null);

  // Modals State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newExpCategory, setNewExpCategory] = useState<'worker_labor' | 'fuel' | 'electricity' | 'maintenance' | 'capex'>('worker_labor');
  const [newExpDate, setNewExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [newExpVendor, setNewExpVendor] = useState('');
  const [newExpTitle, setNewExpTitle] = useState('');
  const [newExpAmount, setNewExpAmount] = useState('');
  const [newExpPayMethod, setNewExpPayMethod] = useState('โอนชำระ');

  // Edit Item Modal State
  const [editingItem, setEditingItem] = useState<{ category: 'worker_labor' | 'fuel' | 'maintenance' | 'capex'; data: any } | null>(null);

  // Delete Confirm Modal State
  const [deletingItem, setDeletingItem] = useState<{ category: 'worker_labor' | 'fuel' | 'maintenance' | 'capex'; id: string; title: string } | null>(null);

  // AI Fuel Scanner state
  const [fuelBillImg, setFuelBillImg] = useState<string | null>(null);
  const [fuelBillFileName, setFuelBillFileName] = useState<string>('');
  const [odoImg, setOdoImg] = useState<string | null>(null);
  const [vehiclePlateInput, setVehiclePlateInput] = useState('ผก 8812 นครพนม');
  const [scanningFuel, setScanningFuel] = useState(false);
  const [scannedFuelResult, setScannedFuelResult] = useState<any | null>(null);

  // 5 Expense Category KPI Totals
  const totalLaborSum = localLabor.reduce((sum, item) => sum + item.totalWage, 0);
  const totalFuelSum = localFuel.reduce((sum, item) => sum + item.totalCostBaht, 0);
  const totalElecSum = electricityExpenses.reduce((sum, item) => sum + item.totalAmountBaht, 0);
  const totalMaintSum = localMaint.reduce((sum, item) => sum + item.costBaht, 0);
  const totalCapexSum = localCapex.reduce((sum, item) => sum + item.amountBaht, 0);
  const totalGrandExpenses = totalLaborSum + totalFuelSum + totalElecSum + totalMaintSum + totalCapexSum;

  const laborPercent = totalGrandExpenses > 0 ? (totalLaborSum / totalGrandExpenses) * 100 : 0;
  const fuelPercent = totalGrandExpenses > 0 ? (totalFuelSum / totalGrandExpenses) * 100 : 0;
  const elecPercent = totalGrandExpenses > 0 ? (totalElecSum / totalGrandExpenses) * 100 : 0;
  const maintPercent = totalGrandExpenses > 0 ? (totalMaintSum / totalGrandExpenses) * 100 : 0;
  const capexPercent = totalGrandExpenses > 0 ? (totalCapexSum / totalGrandExpenses) * 100 : 0;

  // Filtering Labor
  const filteredLabor = localLabor.filter(item => {
    const matchesSearch = item.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) || item.date.includes(searchQuery);
    const matchesCycle = payCycleFilter === 'all' || item.payCyclePeriod === payCycleFilter;
    return matchesSearch && matchesCycle;
  });

  const totalBaseWage = filteredLabor.reduce((sum, item) => sum + item.baseWage, 0);
  const totalOtWage = filteredLabor.reduce((sum, item) => sum + item.otWage, 0);
  const totalBonus = filteredLabor.reduce((sum, item) => sum + (item.bonus || 0), 0);
  const totalLoanDeduction = filteredLabor.reduce((sum, item) => sum + (item.loanDeduction || 0), 0);
  const totalWageCycle = filteredLabor.reduce((sum, item) => sum + item.totalWage, 0);

  // AI Fuel Scan Trigger
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

  const handleSaveScannedFuelToTable = () => {
    if (!scannedFuelResult) return;
    const totalCost = scannedFuelResult.totalCostBaht || 0;
    const liters = scannedFuelResult.liters || 1;
    const newRecord: FuelExpenseRecord = {
      id: `fuel-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      vehiclePlate: scannedFuelResult.vehiclePlate || vehiclePlateInput,
      stationName: scannedFuelResult.stationName || 'ปั๊มน้ำมัน (AI Scan)',
      fuelType: 'ดีเซล B7',
      liters: liters,
      pricePerLiter: liters > 0 ? parseFloat((totalCost / liters).toFixed(2)) : 32.80,
      totalCostBaht: totalCost,
      previousOdometerKm: 142100,
      currentOdometerKm: 142450,
      distanceDrivenKm: scannedFuelResult.distanceDrivenKm || 350,
      kmPerLiter: scannedFuelResult.kmPerLiter || 3.5,
      costPerKm: scannedFuelResult.costPerKm || 8.5
    };
    const updated = deduplicateFuelRecords([newRecord, ...localFuel]);
    setLocalFuel(updated);
    onUpdateFuelExpenses?.(updated);
    showNotice(`เพิ่มรายการค่าน้ำมัน ฿${newRecord.totalCostBaht.toLocaleString()} เข้าตารางเรียบร้อยแล้ว`);
    setScannedFuelResult(null);
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

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3000);
  };

  // Delete Action Handler
  const confirmDelete = () => {
    if (!deletingItem) return;
    const { category, id, title } = deletingItem;

    markRecordDeleted(category, id);

    if (category === 'worker_labor') {
      const updated = localLabor.filter(item => item.id !== id);
      setLocalLabor(updated);
      onUpdateWorkerLabor?.(updated);
    } else if (category === 'fuel') {
      const updated = localFuel.filter(item => item.id !== id);
      setLocalFuel(updated);
      onUpdateFuelExpenses?.(updated);
    } else if (category === 'maintenance') {
      const updated = localMaint.filter(item => item.id !== id);
      setLocalMaint(updated);
      onUpdateMaintenanceExpenses?.(updated);
    } else if (category === 'capex') {
      const updated = localCapex.filter(item => item.id !== id);
      setLocalCapex(updated);
      onUpdateCapexInvestments?.(updated);
    }

    showNotice(`ลบรายการ "${title}" เรียบร้อยแล้ว`);
    setDeletingItem(null);
  };

  // Edit Save Handler
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const { category, data } = editingItem;

    if (category === 'worker_labor') {
      const updated = localLabor.map(item => item.id === data.id ? data : item);
      setLocalLabor(updated);
      onUpdateWorkerLabor?.(updated);
    } else if (category === 'fuel') {
      // Auto recalculate efficiency rates
      const liters = parseFloat(data.liters) || 1;
      const totalCost = parseFloat(data.totalCostBaht) || 0;
      const dist = parseFloat(data.distanceDrivenKm) || 0;
      data.kmPerLiter = dist > 0 && liters > 0 ? parseFloat((dist / liters).toFixed(2)) : data.kmPerLiter;
      data.costPerKm = dist > 0 ? parseFloat((totalCost / dist).toFixed(2)) : data.costPerKm;

      const updated = localFuel.map(item => item.id === data.id ? data : item);
      setLocalFuel(updated);
      onUpdateFuelExpenses?.(updated);
    } else if (category === 'maintenance') {
      const updated = localMaint.map(item => item.id === data.id ? data : item);
      setLocalMaint(updated);
      onUpdateMaintenanceExpenses?.(updated);
    } else if (category === 'capex') {
      const updated = localCapex.map(item => item.id === data.id ? data : item);
      setLocalCapex(updated);
      onUpdateCapexInvestments?.(updated);
    }

    showNotice(`บันทึกการแก้ไขรายการเรียบร้อยแล้ว`);
    setEditingItem(null);
  };

  // Manual Add Save Handler
  const handleSaveManualExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newExpAmount);
    if (!amountNum || amountNum <= 0) return;

    const id = `exp-${Date.now()}`;

    if (newExpCategory === 'worker_labor') {
      const newRec: WorkerLaborRecord = {
        id,
        date: newExpDate,
        employeeName: newExpVendor || 'พนักงานใหม่',
        checkInTime: '08:00',
        checkOutTime: '17:00',
        breakHours: 1,
        workHours: 8,
        otHours: 0,
        baseWage: amountNum,
        otWage: 0,
        bonus: 0,
        loanDeduction: 0,
        totalWage: amountNum,
        status: 'ทำงานปกติ',
        payCyclePeriod: '1st-15th',
        notes: newExpTitle || newExpPayMethod
      };
      const updated = [newRec, ...localLabor];
      setLocalLabor(updated);
      onUpdateWorkerLabor?.(updated);
    } else if (newExpCategory === 'fuel') {
      const liters = 100;
      const newRec: FuelExpenseRecord = {
        id,
        date: newExpDate,
        vehiclePlate: newExpTitle || 'รถบรรทุกโรงสี',
        stationName: newExpVendor || 'ปั๊มน้ำมัน',
        fuelType: 'ดีเซล B7',
        liters: liters,
        pricePerLiter: parseFloat((amountNum / liters).toFixed(2)),
        totalCostBaht: amountNum,
        previousOdometerKm: 142100,
        currentOdometerKm: 142450,
        distanceDrivenKm: 350,
        kmPerLiter: 3.5,
        costPerKm: parseFloat((amountNum / 350).toFixed(2))
      };
      const updated = deduplicateFuelRecords([newRec, ...localFuel]);
      setLocalFuel(updated);
      onUpdateFuelExpenses?.(updated);
    } else if (newExpCategory === 'maintenance') {
      const newRec: MachineMaintenanceRecord = {
        id,
        date: newExpDate,
        machineName: newExpVendor || 'เครื่องสีข้าว',
        maintenanceType: 'ซ่อมบำรุงตามระยะ',
        replacedParts: newExpTitle || 'อะไหล่เปลี่ยนใหม่',
        technician: 'ช่างประจำโรงสี',
        costBaht: amountNum,
        status: 'เสร็จสมบูรณ์'
      };
      const updated = [newRec, ...localMaint];
      setLocalMaint(updated);
      onUpdateMaintenanceExpenses?.(updated);
    } else if (newExpCategory === 'capex') {
      const newRec: CapExInvestmentRecord = {
        id,
        date: newExpDate,
        title: newExpTitle || newExpVendor || 'โครงการลงทุนใหม่',
        category: 'เครื่องจักร/อุปกรณ์',
        amountBaht: amountNum,
        expectedLifespanYears: 10,
        estimatedRoiNotes: 'เพิ่มกำลังการผลิต',
        status: 'อนุมัติ/จ่ายแล้ว'
      };
      const updated = [newRec, ...localCapex];
      setLocalCapex(updated);
      onUpdateCapexInvestments?.(updated);
    }

    showNotice(`บันทึกรายจ่ายหมวด ${getCategoryName(newExpCategory)} ฿${amountNum.toLocaleString()} เรียบร้อยแล้ว!`);
    setShowAddModal(false);
    setNewExpTitle('');
    setNewExpAmount('');
    setNewExpVendor('');
  };

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'worker_labor': return 'ค่าแรงงาน';
      case 'fuel': return 'น้ำมันเชื้อเพลิง';
      case 'electricity': return 'ค่าไฟฟ้า PEA';
      case 'maintenance': return 'ค่าซ่อมบำรุง';
      case 'capex': return 'งบลงทุน CapEx';
      default: return 'รายจ่าย';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-emerald-500 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-bold">{notice}</span>
        </div>
      )}

      {/* Google Sheets Safe V2 Integration Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-rose-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              การเชื่อมโยงฐานข้อมูล Google Sheet ปลอดภัย (AppSheet-Safe V2)
            </div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              ระบบรายจ่ายเชื่อมโยง 5 หมวด + การจัดการรายการ (ID: <span className="font-mono text-emerald-300">{DEFAULT_SPREADSHEET_ID}</span>)
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              เชื่อมโยงข้อมูลชีทรายจ่ายครบ 5 หมวด สามารถบันทึก แก้ไข หรือลบรายการได้ทุกตาราง พร้อมซิงค์ข้อมูลกับ Google Sheet V2
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setNewExpCategory(subTab);
                setShowAddModal(true);
              }}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              บันทึกรายจ่ายใหม่
            </button>
            <a
              href={`https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition border border-white/15 flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
              เปิด Google Sheet V2
            </a>
          </div>
        </div>
      </div>

      {/* 5 Expense Categories Executive Overview Cards */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-rose-600" />
              สัดส่วนภาพรวมรายจ่าย 5 ด้าน (5 Expense Categories KPI)
            </h3>
            <p className="text-xs text-slate-500">สรุปยอดรวมค่าใช้จ่ายดำเนินงานโรงสีแยกตามประเภท</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 block">ยอดรวมรายจ่ายทั้งหมด:</span>
            <span className="text-xl font-extrabold text-rose-600 font-mono">฿{totalGrandExpenses.toLocaleString('th-TH', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        {/* Visual Multi-Color Expense Distribution Bar */}
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
            <div style={{ width: `${laborPercent}%` }} className="bg-rose-500 h-full transition-all" title={`ค่าแรงงาน: ${laborPercent.toFixed(1)}%`} />
            <div style={{ width: `${fuelPercent}%` }} className="bg-amber-500 h-full transition-all" title={`น้ำมัน: ${fuelPercent.toFixed(1)}%`} />
            <div style={{ width: `${elecPercent}%` }} className="bg-yellow-500 h-full transition-all" title={`ไฟฟ้า: ${elecPercent.toFixed(1)}%`} />
            <div style={{ width: `${maintPercent}%` }} className="bg-indigo-500 h-full transition-all" title={`ซ่อมบำรุง: ${maintPercent.toFixed(1)}%`} />
            <div style={{ width: `${capexPercent}%` }} className="bg-purple-500 h-full transition-all" title={`CapEx: ${capexPercent.toFixed(1)}%`} />
          </div>
        </div>

        {/* 5 KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-1">
          {/* Card 1: Labor */}
          <div 
            onClick={() => setSubTab('worker_labor')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              subTab === 'worker_labor' 
                ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20 shadow-sm' 
                : 'bg-slate-50/70 border-slate-200 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-rose-700 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-rose-600" />
                1. ค่าแรงงาน
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-rose-100 rounded text-rose-800">{laborPercent.toFixed(0)}%</span>
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">฿{totalLaborSum.toLocaleString('th-TH')}</p>
            <span className="text-[10px] text-slate-500 block mt-0.5">{localLabor.length} รายการจ่าย</span>
          </div>

          {/* Card 2: Fuel */}
          <div 
            onClick={() => setSubTab('fuel')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              subTab === 'fuel' 
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20 shadow-sm' 
                : 'bg-slate-50/70 border-slate-200 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-amber-700 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-amber-600" />
                2. น้ำมันเชื้อเพลิง
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 rounded text-amber-800">{fuelPercent.toFixed(0)}%</span>
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">฿{totalFuelSum.toLocaleString('th-TH')}</p>
            <span className="text-[10px] text-slate-500 block mt-0.5">{localFuel.length} เติมน้ำมัน</span>
          </div>

          {/* Card 3: Electricity */}
          <div 
            onClick={() => setSubTab('electricity')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              subTab === 'electricity' 
                ? 'bg-yellow-50/80 border-yellow-300 ring-2 ring-yellow-500/20 shadow-sm' 
                : 'bg-slate-50/70 border-slate-200 hover:border-yellow-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-yellow-700 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-yellow-600" />
                3. ค่าไฟฟ้า PEA
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-yellow-100 rounded text-yellow-800">{elecPercent.toFixed(0)}%</span>
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">฿{totalElecSum.toLocaleString('th-TH')}</p>
            <span className="text-[10px] text-slate-500 block mt-0.5">{electricityExpenses.length} รอบบิล PEA</span>
          </div>

          {/* Card 4: Maintenance */}
          <div 
            onClick={() => setSubTab('maintenance')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              subTab === 'maintenance' 
                ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20 shadow-sm' 
                : 'bg-slate-50/70 border-slate-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-indigo-700 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                4. ค่าซ่อมบำรุง
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 rounded text-indigo-800">{maintPercent.toFixed(0)}%</span>
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">฿{totalMaintSum.toLocaleString('th-TH')}</p>
            <span className="text-[10px] text-slate-500 block mt-0.5">{localMaint.length} รายการซ่อม</span>
          </div>

          {/* Card 5: CapEx */}
          <div 
            onClick={() => setSubTab('capex')}
            className={`p-3.5 rounded-xl border transition cursor-pointer ${
              subTab === 'capex' 
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20 shadow-sm' 
                : 'bg-slate-50/70 border-slate-200 hover:border-purple-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-purple-700 font-bold mb-1">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-purple-600" />
                5. งบลงทุน CapEx
              </span>
              <span className="text-[10px] px-1.5 py-0.2 bg-purple-100 rounded text-purple-800">{capexPercent.toFixed(0)}%</span>
            </div>
            <p className="text-lg font-bold text-slate-900 font-mono">฿{totalCapexSum.toLocaleString('th-TH')}</p>
            <span className="text-[10px] text-slate-500 block mt-0.5">{localCapex.length} โครงการ</span>
          </div>
        </div>
      </div>

      {/* Sub-tab Switcher Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2 shadow-sm flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          <button
            onClick={() => setSubTab('worker_labor')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              subTab === 'worker_labor'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            1. ค่าแรงงาน (Labor)
          </button>

          <button
            onClick={() => setSubTab('fuel')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              subTab === 'fuel'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-4 h-4" />
            2. น้ำมันเชื้อเพลิง (Fuel)
          </button>

          <button
            onClick={() => setSubTab('electricity')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              subTab === 'electricity'
                ? 'bg-yellow-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Zap className="w-4 h-4" />
            3. ค่าไฟฟ้า PEA
          </button>

          <button
            onClick={() => setSubTab('maintenance')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              subTab === 'maintenance'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            4. ค่าซ่อมบำรุง
          </button>

          <button
            onClick={() => setSubTab('capex')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-2 ${
              subTab === 'capex'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            5. งบลงทุน CapEx
          </button>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 rounded-xl hover:bg-slate-200 transition flex items-center gap-1.5 shrink-0 font-medium"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          รีเฟรชข้อมูล
        </button>
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
                บันทึกเวลาทำงานรายวัน ({localLabor.length} รายการ)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setNewExpCategory('worker_labor');
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                + เพิ่มรายการค่าแรง
              </button>
              <a
                href={`https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit#gid=264764262`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 font-medium px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-rose-600" />
                เปิด Sheet ค่าแรง
              </a>
            </div>
          </div>

          {laborViewMode === 'summary' ? (
            <WorkerSalarySummaryView workerLabor={localLabor} searchQuery={searchQuery} />
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
                        <th className="px-4 py-3 text-center">จัดการ</th>
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
                          <td className="px-4 py-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingItem({ category: 'worker_labor', data: { ...row } })}
                                className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="แก้ไขรายการ"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingItem({ category: 'worker_labor', id: row.id, title: `${row.employeeName} (${row.date})` })}
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
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-semibold">{scannedFuelResult.stationName}</span>
                    <button
                      onClick={handleSaveScannedFuelToTable}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      บันทึกรายการนี้เข้าตาราง
                    </button>
                  </div>
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
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">ประวัติการสแกนและบันทึกค่าน้ำมันเชื้อเพลิง</h4>
              <button
                onClick={() => {
                  setNewExpCategory('fuel');
                  setShowAddModal(true);
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                + เพิ่มค่าน้ำมัน
              </button>
            </div>

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
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deduplicateFuelRecords(localFuel).map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-semibold text-slate-800 whitespace-nowrap">{formatThaiFuelDate(row.date)}</td>
                      <td className="p-3 font-semibold text-slate-900">{row.vehiclePlate}</td>
                      <td className="p-3 text-slate-600">{row.stationName}</td>
                      <td className="p-3 text-right font-semibold text-slate-800">{row.liters} ลิตร</td>
                      <td className="p-3 text-right font-bold text-rose-600">฿{row.totalCostBaht.toLocaleString()}</td>
                      <td className="p-3 text-right text-slate-600">{row.distanceDrivenKm} กม.</td>
                      <td className="p-3 text-right font-semibold text-emerald-600">{row.kmPerLiter}</td>
                      <td className="p-3 text-right font-semibold text-amber-600">{row.costPerKm}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setEditingItem({ category: 'fuel', data: { ...row } })}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="แก้ไข"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingItem({ category: 'fuel', id: row.id, title: `ค่าน้ำมัน ${row.vehiclePlate} (${row.totalCostBaht} บาท)` })}
                            className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="ลบ"
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
        </div>
      )}

      {/* Sub-tab 2.3: ค่าไฟฟ้า PEA/MEA */}
      {subTab === 'electricity' && (
        <ElectricityTrackerView electricityExpenses={electricityExpenses} onUpdateRecords={onUpdateElectricityRecords} />
      )}

      {/* Sub-tab 2.4: ค่าซ่อมบำรุงเครื่องจักร */}
      {subTab === 'maintenance' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-indigo-600" />
              ประวัติค่าซ่อมบำรุงเครื่องจักรโรงสี
            </h3>
            <button
              onClick={() => {
                setNewExpCategory('maintenance');
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + บันทึกงานซ่อมบำรุง
            </button>
          </div>

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
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localMaint.map((m) => (
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
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingItem({ category: 'maintenance', data: { ...m } })}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingItem({ category: 'maintenance', id: m.id, title: `งานซ่อม ${m.machineName} (${m.costBaht} บาท)` })}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบ"
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

      {/* Sub-tab 2.5: ค่าลงทุนเพิ่มเติม CapEx */}
      {subTab === 'capex' && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              รายการลงทุนเพิ่มทรัพย์สินและสิ่งปลูกสร้าง (CapEx)
            </h3>
            <button
              onClick={() => {
                setNewExpCategory('capex');
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              + บันทึกงบลงทุน CapEx
            </button>
          </div>

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
                  <th className="p-3 text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {localCapex.map((c) => (
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
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingItem({ category: 'capex', data: { ...c } })}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="แก้ไข"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingItem({ category: 'capex', id: c.id, title: `โครงการ ${c.title}` })}
                          className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="ลบ"
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

      {/* Manual Expense Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">บันทึกรายจ่ายโรงสี V2 (แยก 5 หมวด)</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveManualExpense} className="p-5 space-y-4">
              {/* Category Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">หมวดหมู่รายจ่าย (5 ด้าน):</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewExpCategory('worker_labor')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition text-left flex items-center gap-1.5 ${
                      newExpCategory === 'worker_labor' ? 'bg-rose-50 border-rose-500 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 text-rose-600" />
                    1. ค่าแรงงาน
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpCategory('fuel')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition text-left flex items-center gap-1.5 ${
                      newExpCategory === 'fuel' ? 'bg-amber-50 border-amber-500 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    2. น้ำมันเชื้อเพลิง
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpCategory('electricity')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition text-left flex items-center gap-1.5 ${
                      newExpCategory === 'electricity' ? 'bg-yellow-50 border-yellow-500 text-yellow-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-600" />
                    3. ค่าไฟฟ้า PEA
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpCategory('maintenance')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition text-left flex items-center gap-1.5 ${
                      newExpCategory === 'maintenance' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                    4. ค่าซ่อมบำรุง
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewExpCategory('capex')}
                    className={`py-2 px-2.5 text-xs font-bold rounded-xl border transition text-left flex items-center gap-1.5 ${
                      newExpCategory === 'capex' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-purple-600" />
                    5. งบลงทุน CapEx
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">วันที่ทำรายการ:</label>
                  <input
                    type="date"
                    value={newExpDate}
                    onChange={(e) => setNewExpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">จำนวนเงิน (บาท):</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={newExpAmount}
                    onChange={(e) => setNewExpAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">ชื่อผู้ขาย / ปั๊ม / ช่าง / รายการ:</label>
                <input
                  type="text"
                  placeholder="เช่น ปั๊ม PTT, PEA นครพนม, ช่างสมชาย..."
                  value={newExpVendor}
                  onChange={(e) => setNewExpVendor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">รายละเอียดเพิ่มเติม / หมายเหตุ:</label>
                <input
                  type="text"
                  placeholder="รายละเอียดสินค้า/งานซ่อม/รอบบิล..."
                  value={newExpTitle}
                  onChange={(e) => setNewExpTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">วิธีชำระเงิน:</label>
                <select
                  value={newExpPayMethod}
                  onChange={(e) => setNewExpPayMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="โอนชำระ">โอนชำระผ่านธนาคาร</option>
                  <option value="เงินสด">เงินสด</option>
                  <option value="เครดิต">เครดิต 30 วัน</option>
                  <option value="หักบัญชีอัตโนมัติ">หักบัญชีอัตโนมัติ</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  บันทึกข้อมูลเข้า Sheet V2
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">แก้ไขรายการ ({getCategoryName(editingItem.category)})</h3>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4">
              {/* Labor Form Edit */}
              {editingItem.category === 'worker_labor' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">ชื่อพนักงาน:</label>
                    <input
                      type="text"
                      value={editingItem.data.employeeName}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, employeeName: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">วันที่:</label>
                      <input
                        type="date"
                        value={editingItem.data.date}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">รอบจ่ายเงิน:</label>
                      <select
                        value={editingItem.data.payCyclePeriod}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, payCyclePeriod: e.target.value as any } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                      >
                        <option value="1st-15th">รอบ 1-15</option>
                        <option value="16th-End">รอบ 16-สิ้นเดือน</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ค่าแรงปกติ:</label>
                      <input
                        type="number"
                        value={editingItem.data.baseWage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const total = val + (editingItem.data.otWage || 0) + (editingItem.data.bonus || 0) - (editingItem.data.loanDeduction || 0);
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, baseWage: val, totalWage: total } });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ค่า OT:</label>
                      <input
                        type="number"
                        value={editingItem.data.otWage}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const total = (editingItem.data.baseWage || 0) + val + (editingItem.data.bonus || 0) - (editingItem.data.loanDeduction || 0);
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, otWage: val, totalWage: total } });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-amber-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">โบนัส:</label>
                      <input
                        type="number"
                        value={editingItem.data.bonus || 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const total = (editingItem.data.baseWage || 0) + (editingItem.data.otWage || 0) + val - (editingItem.data.loanDeduction || 0);
                          setEditingItem({ ...editingItem, data: { ...editingItem.data, bonus: val, totalWage: total } });
                        }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-emerald-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">หมายเหตุ:</label>
                    <input
                      type="text"
                      value={editingItem.data.notes || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, notes: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                    />
                  </div>
                </>
              )}

              {/* Fuel Form Edit */}
              {editingItem.category === 'fuel' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">วันที่:</label>
                      <input
                        type="date"
                        value={editingItem.data.date}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ทะเบียนรถ:</label>
                      <input
                        type="text"
                        value={editingItem.data.vehiclePlate}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, vehiclePlate: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">สถานีบริการ / ปั๊ม:</label>
                    <input
                      type="text"
                      value={editingItem.data.stationName}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, stationName: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ปริมาณ (ลิตร):</label>
                      <input
                        type="number"
                        value={editingItem.data.liters}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, liters: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ราคารวม (บาท):</label>
                      <input
                        type="number"
                        value={editingItem.data.totalCostBaht}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, totalCostBaht: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-rose-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ระยะทาง (กม.):</label>
                      <input
                        type="number"
                        value={editingItem.data.distanceDrivenKm}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, distanceDrivenKm: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Maintenance Form Edit */}
              {editingItem.category === 'maintenance' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">วันที่:</label>
                      <input
                        type="date"
                        value={editingItem.data.date}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ชื่อเครื่องจักร:</label>
                      <input
                        type="text"
                        value={editingItem.data.machineName}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, machineName: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">ประเภทงานซ่อม:</label>
                    <input
                      type="text"
                      value={editingItem.data.maintenanceType}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, maintenanceType: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">รายการอะไหล่เปลี่ยน:</label>
                    <input
                      type="text"
                      value={editingItem.data.replacedParts}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, replacedParts: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ช่างผู้ดูแล:</label>
                      <input
                        type="text"
                        value={editingItem.data.technician}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, technician: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">ค่าใช้จ่าย (บาท):</label>
                      <input
                        type="number"
                        value={editingItem.data.costBaht}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, costBaht: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-rose-600"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* CapEx Form Edit */}
              {editingItem.category === 'capex' && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">ชื่อโครงการ / ทรัพย์สิน:</label>
                    <input
                      type="text"
                      value={editingItem.data.title}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, title: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">วันที่:</label>
                      <input
                        type="date"
                        value={editingItem.data.date}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, date: e.target.value } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">มูลค่าลงทุน (บาท):</label>
                      <input
                        type="number"
                        value={editingItem.data.amountBaht}
                        onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, amountBaht: parseFloat(e.target.value) || 0 } })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs font-bold text-purple-700"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">ผลตอบแทน (ROI):</label>
                    <input
                      type="text"
                      value={editingItem.data.estimatedRoiNotes}
                      onChange={(e) => setEditingItem({ ...editingItem, data: { ...editingItem.data, estimatedRoiNotes: e.target.value } })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  บันทึกการแก้ไข
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200 p-5 space-y-4 text-center">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบรายการรายจ่าย?</h3>
              <p className="text-xs text-slate-500 mt-1">
                คุณกำลังจะลบรายการ <strong className="text-slate-800 font-semibold">{deletingItem.title}</strong> ออกจากระบบและตารางข้อมูล
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
