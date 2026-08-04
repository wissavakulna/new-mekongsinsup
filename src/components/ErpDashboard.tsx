import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, DollarSign, TrendingDown, Sparkles, FileSpreadsheet, ExternalLink,
  RefreshCw, CheckCircle, Database, ShieldCheck, Lock, LogIn, UserCheck, Layers, Building,
  Wallet, Package, ShoppingCart, Users, Truck, Zap, Wrench, Building2, Plus
} from 'lucide-react';
import { 
  fetchBranStockSheetData, BranStockItem,
  fetchSalesAndServicesSheetData, SaleServiceTransaction,
  fetchDailyCashReportsSheetData, DailyCashReport,
  fetchWorkerLaborSheetData, WorkerLaborRecord,
  fetchFuelExpensesSheetData, FuelExpenseRecord,
  fetchElectricityExpensesSheetData, ElectricityExpenseRecord,
  fetchMachineMaintenanceSheetData, MachineMaintenanceRecord,
  fetchCapExSheetData, CapExInvestmentRecord,
  saveCategoryRecords
} from '../services/dashboardService';

import {
  syncAllWorkerLaborToSheet,
  syncAllFuelExpensesToSheet,
  syncAllMaintenanceExpensesToSheet,
  syncAllCapexToSheet
} from '../services/googleSheetsService';

import ExecutiveSummaryView from './erp/ExecutiveSummaryView';
import IncomeHubView from './erp/IncomeHubView';
import ExpensesHubView from './erp/ExpensesHubView';
import QuickAiScannerView from './erp/QuickAiScannerView';
import { SmartBillScannerView } from './erp/SmartBillScannerView';

export interface Employee {
  id: string;
  name: string;
  role: string;
  wage: number;
  phone: string;
  status: 'active' | 'inactive';
}

export interface Attendance {
  [employeeId: string]: 'present' | 'late' | 'leave' | 'absent';
}

export default function ErpDashboard() {
  // Main Tab Navigation State
  const [activeMainTab, setActiveMainTab] = useState<'summary' | 'income' | 'expenses' | 'smart_scanner' | 'quick_entry'>('summary');

  // Loading & Sync States
  const [loading, setLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Data Datasets
  const [branStock, setBranStock] = useState<BranStockItem[]>([]);
  const [salesServices, setSalesServices] = useState<SaleServiceTransaction[]>([]);
  const [dailyCashReports, setDailyCashReports] = useState<DailyCashReport[]>([]);
  const [workerLabor, setWorkerLabor] = useState<WorkerLaborRecord[]>([]);
  const [fuelExpenses, setFuelExpenses] = useState<FuelExpenseRecord[]>([]);
  const [electricityExpenses, setElectricityExpenses] = useState<ElectricityExpenseRecord[]>([]);
  const [maintenanceExpenses, setMaintenanceExpenses] = useState<MachineMaintenanceRecord[]>([]);
  const [capexInvestments, setCapexInvestments] = useState<CapExInvestmentRecord[]>([]);

  // Initial Data Load Function
  const loadAllErpSheetData = async () => {
    setLoading(true);
    try {
      const [
        branData,
        salesData,
        cashData,
        laborData,
        fuelData,
        elecData,
        maintData,
        capexData
      ] = await Promise.all([
        fetchBranStockSheetData(),
        fetchSalesAndServicesSheetData(),
        fetchDailyCashReportsSheetData(),
        fetchWorkerLaborSheetData(),
        fetchFuelExpensesSheetData(),
        fetchElectricityExpensesSheetData(),
        fetchMachineMaintenanceSheetData(),
        fetchCapExSheetData()
      ]);

      setBranStock(branData);
      setSalesServices(salesData);
      setDailyCashReports(cashData);
      setWorkerLabor(laborData);
      setFuelExpenses(fuelData);
      setElectricityExpenses(elecData);
      setMaintenanceExpenses(maintData);
      setCapexInvestments(capexData);

      setLastSyncTime(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (error) {
      console.error('Error fetching ERP Google Sheets data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllErpSheetData();
  }, []);

  // Handlers for Quick Entry addition
  const handleAddBranStock = (newItem: BranStockItem) => {
    setBranStock(prev => [newItem, ...prev]);
  };

  const handleAddSaleService = (newItem: SaleServiceTransaction) => {
    setSalesServices(prev => [newItem, ...prev]);
  };

  const handleUpdateWorkerLabor = useCallback((recs: WorkerLaborRecord[]) => {
    setWorkerLabor(recs);
    saveCategoryRecords('worker_labor', recs);
    syncAllWorkerLaborToSheet(recs).catch(err => console.warn('Sync labor failed:', err));
  }, []);

  const handleUpdateFuelExpenses = useCallback((recs: FuelExpenseRecord[]) => {
    setFuelExpenses(recs);
    saveCategoryRecords('fuel', recs);
    syncAllFuelExpensesToSheet(recs).catch(err => console.warn('Sync fuel failed:', err));
  }, []);

  const handleUpdateElectricityRecords = useCallback((recs: ElectricityExpenseRecord[]) => {
    setElectricityExpenses(recs);
    saveCategoryRecords('electricity', recs);
  }, []);

  const handleUpdateMaintenanceExpenses = useCallback((recs: MachineMaintenanceRecord[]) => {
    setMaintenanceExpenses(recs);
    saveCategoryRecords('maintenance', recs);
    syncAllMaintenanceExpensesToSheet(recs).catch(err => console.warn('Sync maintenance failed:', err));
  }, []);

  const handleUpdateCapexInvestments = useCallback((recs: CapExInvestmentRecord[]) => {
    setCapexInvestments(recs);
    saveCategoryRecords('capex', recs);
    syncAllCapexToSheet(recs).catch(err => console.warn('Sync capex failed:', err));
  }, []);

  return (
    <div className="w-full bg-slate-50 text-slate-800 min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Top Banner & Title Section */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold rounded-full flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-emerald-600" /> Google Sheets Connected
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ซิงค์ล่าสุด: {lastSyncTime || 'กำลังโหลด...'}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <Building className="w-6 h-6 text-emerald-600" />
              ระบบศูนย์กลางข้อมูลโรงสีและคุมบัญชีชีต (Mekong ERP & Sheets Control Center)
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              ศูนย์รวมข้อมูลบัญชีและการเงิน ควบคุมคลังสินค้า รายได้การขาย&บริการ และ AI สแกนบิล
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="https://docs.google.com/spreadsheets/d/1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg/edit"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              เปิด Google Sheets คุมบัญชีหลัก
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={loadAllErpSheetData}
              disabled={loading}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl border border-slate-200 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'กำลังดึงข้อมูล...' : 'รีเฟรช'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveMainTab('summary')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-2 ${
              activeMainTab === 'summary'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            ภาพรวมการเงิน
          </button>

          <button
            onClick={() => setActiveMainTab('income')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-2 ${
              activeMainTab === 'income'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-500" />
            รายได้
          </button>

          <button
            onClick={() => setActiveMainTab('expenses')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-2 ${
              activeMainTab === 'expenses'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-rose-400" />
            รายจ่าย
          </button>

          <button
            onClick={() => setActiveMainTab('smart_scanner')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-2 ${
              activeMainTab === 'smart_scanner'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
            ระบบแสกนบิลอัจฉริยะ (Smart Scanner)
          </button>

          <button
            onClick={() => setActiveMainTab('quick_entry')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-2 ${
              activeMainTab === 'quick_entry'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-500" />
            บันทึกด่วน
          </button>
        </div>
      </div>

      {/* Main Tab Content Display */}
      {activeMainTab === 'summary' && (
        <ExecutiveSummaryView
          branStock={branStock}
          salesServices={salesServices}
          dailyCashReports={dailyCashReports}
          workerLabor={workerLabor}
          fuelExpenses={fuelExpenses}
          electricityExpenses={electricityExpenses}
          maintenanceExpenses={maintenanceExpenses}
          capexInvestments={capexInvestments}
          onRefresh={loadAllErpSheetData}
          loading={loading}
        />
      )}

      {activeMainTab === 'income' && (
        <IncomeHubView
          branStock={branStock}
          salesServices={salesServices}
          dailyCashReports={dailyCashReports}
          onRefresh={loadAllErpSheetData}
          loading={loading}
        />
      )}

      {activeMainTab === 'expenses' && (
        <ExpensesHubView
          workerLabor={workerLabor}
          fuelExpenses={fuelExpenses}
          electricityExpenses={electricityExpenses}
          maintenanceExpenses={maintenanceExpenses}
          capexInvestments={capexInvestments}
          onRefresh={loadAllErpSheetData}
          loading={loading}
          onUpdateWorkerLabor={handleUpdateWorkerLabor}
          onUpdateFuelExpenses={handleUpdateFuelExpenses}
          onUpdateElectricityRecords={handleUpdateElectricityRecords}
          onUpdateMaintenanceExpenses={handleUpdateMaintenanceExpenses}
          onUpdateCapexInvestments={handleUpdateCapexInvestments}
        />
      )}

      {activeMainTab === 'smart_scanner' && (
        <SmartBillScannerView />
      )}

      {activeMainTab === 'quick_entry' && (
        <QuickAiScannerView
          onAddBranStock={handleAddBranStock}
          onAddSaleService={handleAddSaleService}
        />
      )}
    </div>
  );
}
