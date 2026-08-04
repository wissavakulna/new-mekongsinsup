import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  RefreshCw,
  FileSpreadsheet,
  Zap,
  Wrench,
  Building2,
  Receipt,
  Search,
  Filter,
  Check,
  Download,
  X,
  ExternalLink,
  Users,
  Truck
} from 'lucide-react';
import { SmartScannedBill, syncSmartScannedBillsToGoogleSheets, DEFAULT_SPREADSHEET_ID } from '../../services/googleSheetsService';
import { useGoogleAuth } from '../../services/googleAuthService';

export function SmartBillScannerView() {
  const { isLoggedIn, userProfile, signInWithGoogle, getAccessToken } = useGoogleAuth();

  const [scannedBills, setScannedBills] = useState<SmartScannedBill[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBillModal, setSelectedBillModal] = useState<SmartScannedBill | null>(null);

  const [syncingToSheet, setSyncingToSheet] = useState<boolean>(false);
  const [syncResultMsg, setSyncResultMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler
  const handleFilesSelected = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    const fileList = Array.from(files);
    setProcessingProgress({ current: 0, total: fileList.length });

    const newBills: SmartScannedBill[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      setProcessingProgress({ current: i + 1, total: fileList.length });

      try {
        const base64 = await fileToBase64(file);
        const isPdf = file.name.toLowerCase().endsWith('.pdf');

        const res = await fetch('/api/gemini/smart-scan-bill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileData: base64,
            fileName: file.name
          })
        });

        const json = await res.json();
        if (json.success && json.data) {
          const parsed = json.data;
          const billItem: SmartScannedBill = {
            id: `SCAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            fileName: file.name,
            fileData: base64,
            fileType: isPdf ? 'pdf' : 'image',
            category: parsed.category || 'worker_labor',
            categoryLabel: parsed.categoryLabel || getCategoryLabel(parsed.category),
            vendorName: parsed.vendorName || 'ไม่ระบุชื่อผู้ขาย/หน่วยงาน',
            billDate: parsed.billDate || new Date().toISOString().split('T')[0],
            invoiceNo: parsed.invoiceNo || '-',
            totalAmountBaht: Number(parsed.totalAmountBaht) || 0,
            vatAmountBaht: Number(parsed.vatAmountBaht) || 0,
            description: parsed.description || 'สแกนเอกสารอัตโนมัติ',
            confidenceScore: parsed.confidenceScore || 0.95,
            reasoning: parsed.reasoning || '',
            workerCount: parsed.workerCount,
            payPeriod: parsed.payPeriod,
            fuelType: parsed.fuelType,
            fuelLiters: parsed.fuelLiters,
            vehiclePlate: parsed.vehiclePlate,
            caNumber: parsed.caNumber,
            meterNumber: parsed.meterNumber,
            billingPeriod: parsed.billingPeriod,
            totalUnitsKwh: parsed.totalUnitsKwh,
            peakUnitsKwh: parsed.peakUnitsKwh,
            offPeakUnitsKwh: parsed.offPeakUnitsKwh,
            machineName: parsed.machineName,
            maintenanceType: parsed.maintenanceType,
            replacedParts: parsed.replacedParts,
            technician: parsed.technician,
            assetProjectTitle: parsed.assetProjectTitle,
            expectedLifespanYears: parsed.expectedLifespanYears,
            estimatedRoiNotes: parsed.estimatedRoiNotes,
            paymentMethod: parsed.paymentMethod,
            scannedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            status: 'pending'
          };
          newBills.push(billItem);
        }
      } catch (err) {
        console.error('Error scanning file:', file.name, err);
      }
    }

    setScannedBills(prev => [...newBills, ...prev]);
    setIsProcessing(false);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Load Preset Demo Multi-Bills covering all 5 expense categories
  const handleLoadSampleBatch = async () => {
    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: 5 });

    const samples = [
      {
        fileName: 'สลิปค่าจ้าง_แรงงานย้ายกระสอบข้าว_16-31กค2569.pdf',
        category: 'worker_labor' as const,
        categoryLabel: 'ค่าแรงงาน',
        vendorName: 'ทีมงานจ้างเหมาแบกข้าว & แผนกแรงงานโรงสี',
        billDate: '2026-07-28',
        invoiceNo: 'PAY-LABOR-2026/07-B',
        totalAmountBaht: 28500.00,
        vatAmountBaht: 0,
        description: 'ค่าแรงงานจ้างเหมาแบกยกกระสอบข้าวขึ้นรถบรรทุกและค่า OT คนงานหน้าลานตาก',
        confidenceScore: 0.98,
        reasoning: 'พบคีย์เวิร์ด ค่าแรงงาน, สลิปจ่ายเงิน, OT คนงานโรงสี และจำนวนคนงานผู้รับเงิน',
        workerCount: 12,
        payPeriod: 'รอบ 16-31 ก.ค. 2569',
        paymentMethod: 'โอนชำระผ่านระบบบัญชีธนาคาร (PromptPay)'
      },
      {
        fileName: 'ใบเสร็จ_ค่าน้ำมันดีเซล_ปตท_รถบรรทุก10ล้อ.jpg',
        category: 'fuel' as const,
        categoryLabel: 'ค่าน้ำมันเชื้อเพลิง',
        vendorName: 'สถานีบริการน้ำมัน ปตท. นครพนม (มิตรภาพ)',
        billDate: '2026-07-29',
        invoiceNo: 'TAX-PTT-88912',
        totalAmountBaht: 12450.00,
        vatAmountBaht: 814.49,
        description: 'เติมค่าน้ำมันดีเซล B7 สำหรับรถบรรทุกขนส่งข้าวเปลือกและรถโฟล์คลิฟต์หน้าโรงสี',
        confidenceScore: 0.97,
        reasoning: 'พบตราปั๊ม ปตท., ชนิดน้ำมันดีเซล B7, ปริมาณลิตร และทะเบียนรถบรรทุกขนส่ง',
        fuelType: 'น้ำมันดีเซล B7 UltraForce',
        fuelLiters: 389.06,
        vehiclePlate: '81-2249 นครพนม (รถบรรทุก 10 ล้อ)',
        paymentMethod: 'บัตรเครดิตองค์กร / Fleet Card'
      },
      {
        fileName: 'บิลไฟฟ้า_PEA_07_2569_โรงสี.pdf',
        category: 'electricity' as const,
        categoryLabel: 'ค่าไฟฟ้า PEA',
        vendorName: 'การไฟฟ้าส่วนภูมิภาค (PEA)',
        billDate: '2026-07-28',
        invoiceNo: 'INV-PEA-202607-0091',
        totalAmountBaht: 14250.75,
        vatAmountBaht: 932.25,
        description: 'ใบแจ้งค่าไฟฟ้าโรงสีประจำเดือน 07/2569 (On-Peak 1,280 kWh, Off-Peak 820 kWh)',
        confidenceScore: 0.98,
        reasoning: 'พบลายน้ำ PEA, หมายเลขผู้ใช้ไฟฟ้า (CA), และอัตรา On-Peak / Off-Peak',
        caNumber: '020029119125',
        meterNumber: '6300584313',
        billingPeriod: '07/2569',
        totalUnitsKwh: 2100,
        peakUnitsKwh: 1280,
        offPeakUnitsKwh: 820
      },
      {
        fileName: 'ใบกำกับภาษี_ซ่อมชุดลูกปืนมอเตอร์ขัดเงา.png',
        category: 'maintenance' as const,
        categoryLabel: 'ค่าซ่อมบำรุงเครื่องจักร',
        vendorName: 'ร้าน นครพนมกลการ & อะไหล่ยนต์',
        billDate: '2026-07-29',
        invoiceNo: 'TAX-2026/088',
        totalAmountBaht: 18500.00,
        vatAmountBaht: 1210.28,
        description: 'ค่าซ่อมและเปลี่ยนลูกปืนตลับ สายพานมอเตอร์ชุดหัวขัดเงาข้าวสาร (ชุดที่ 2)',
        confidenceScore: 0.96,
        reasoning: 'พบรายการอะไหล่ตลับลูกปืน NSK, สายพาน B-72 และค่าแรงช่างเทคนิคซ่อมเครื่องสีข้าว',
        machineName: 'ชุดเครื่องขัดเงาข้าวสาร 25 แรงม้า',
        maintenanceType: 'การซ่อมบำรุงเชิงแก้ไข (Corrective Maintenance)',
        replacedParts: 'ตลับลูกปืน NSK 6312 2 ตลับ, สายพาน B-72 4 เส้น, ซีลยางกันน้ำมัน',
        technician: 'ช่างสมหมาย & ทีมงานนครพนมกลการ'
      },
      {
        fileName: 'สัญญาจ้างก่อสร้างหลังคาลานตากข้าว_CapEx.pdf',
        category: 'capex' as const,
        categoryLabel: 'งบลงทุน CapEx',
        vendorName: 'บริษัท นครพนมวิศวกรรมก่อสร้าง จำกัด',
        billDate: '2026-07-30',
        invoiceNo: 'CAPEX-2026-014',
        totalAmountBaht: 245000.00,
        vatAmountBaht: 16028.04,
        description: 'งวดงานที่ 1: ก่อสร้างหลังคาคลุมลานตากข้าวเปลือกชั่วคราวและเทพื้นคอนกรีตเสริมเหล็ก',
        confidenceScore: 0.97,
        reasoning: 'เป็นรายการลงทุนก่อสร้างอาคารและปรับปรุงสิ่งปลูกสร้างถาวรของโรงสี ตัดบัญชีสินทรัพย์ระยะยาว',
        assetProjectTitle: 'โครงการขยายลานตากข้าวและหลังคาคลุมกันฝน 500 ตร.ม.',
        expectedLifespanYears: 15,
        estimatedRoiNotes: 'ช่วยลดความเสียหายข้าวเปลือกชื้นช่วงฤดูฝน เพิ่มศักยภาพรับซื้อข้าวเพิ่มขึ้น 20%'
      }
    ];

    const newBills: SmartScannedBill[] = samples.map((s, idx) => ({
      ...s,
      id: `DEMO-${Date.now()}-${idx}`,
      fileType: s.fileName.endsWith('.pdf') ? 'pdf' : 'image',
      scannedAt: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      status: 'pending'
    }));

    setTimeout(() => {
      setScannedBills(prev => [...newBills, ...prev]);
      setIsProcessing(false);
    }, 1000);
  };

  // Sync to Google Sheets
  const handleSyncToSheets = async () => {
    if (scannedBills.length === 0) return;

    let token = getAccessToken();
    if (!token) {
      token = await signInWithGoogle();
      if (!token) {
        setSyncResultMsg({
          type: 'error',
          message: 'โปรดเข้าสู่ระบบด้วยบัญชี Google ก่อนบันทึกลง Google Sheets'
        });
        return;
      }
    }

    setSyncingToSheet(true);
    setSyncResultMsg(null);

    try {
      const { successCount, errors } = await syncSmartScannedBillsToGoogleSheets(
        token,
        scannedBills,
        DEFAULT_SPREADSHEET_ID
      );

      if (errors.length > 0) {
        setSyncResultMsg({
          type: 'error',
          message: `บันทึกสำเร็จ ${successCount} รายการ, มีข้อผิดพลาด: ${errors.join(', ')}`
        });
      } else {
        setSyncResultMsg({
          type: 'success',
          message: `บันทึกข้อมูลบิลทั้ง ${successCount} รายการลง Google Sheet (${DEFAULT_SPREADSHEET_ID}) เรียบร้อยแล้ว!`
        });

        // Mark as synced
        setScannedBills(prev => prev.map(b => ({ ...b, status: 'synced' })));
      }
    } catch (err: any) {
      console.error('Error syncing smart bills to sheets:', err);
      setSyncResultMsg({
        type: 'error',
        message: `ไม่สามารถบันทึกลง Google Sheets: ${err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ'}`
      });
    } finally {
      setSyncingToSheet(false);
    }
  };

  const handleDeleteBill = (id: string) => {
    setScannedBills(prev => prev.filter(b => b.id !== id));
  };

  const handleClearAll = () => {
    setScannedBills([]);
    setSyncResultMsg(null);
  };

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'worker_labor': return 'ค่าแรงงาน';
      case 'fuel': return 'น้ำมัน';
      case 'electricity': return 'ไฟฟ้า';
      case 'maintenance': return 'ซ่อมบำรุง';
      case 'capex': return 'ลงทุน (CapEx)';
      default: return 'ค่าแรงงาน';
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'worker_labor':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Users className="w-3.5 h-3.5" />
            ค่าแรงงาน
          </span>
        );
      case 'fuel':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Truck className="w-3.5 h-3.5" />
            ค่าน้ำมันเชื้อเพลิง
          </span>
        );
      case 'electricity':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
            <Zap className="w-3.5 h-3.5" />
            ค่าไฟฟ้า PEA
          </span>
        );
      case 'maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Wrench className="w-3.5 h-3.5" />
            ซ่อมบำรุงเครื่องจักร
          </span>
        );
      case 'capex':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Building2 className="w-3.5 h-3.5" />
            งบลงทุน CapEx
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <Users className="w-3.5 h-3.5" />
            ค่าแรงงาน
          </span>
        );
    }
  };

  // Filtering
  const filteredBills = scannedBills.filter(bill => {
    const matchesCategory = selectedCategoryFilter === 'all' || bill.category === selectedCategoryFilter;
    const matchesSearch = searchQuery === '' ||
      bill.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bill.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalAmountScanned = scannedBills.reduce((acc, curr) => acc + curr.totalAmountBaht, 0);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-2 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-pulse" />
              AI Document Classifier (5 Expense Categories)
            </div>
            <h2 className="text-2xl font-bold tracking-tight">ระบบจำแนกบิลและรายจ่ายอัจฉริยะ (AI Smart Bill Scanner)</h2>
            <p className="text-sm text-emerald-100/80 mt-1 max-w-2xl">
              ระบบปัญญาประดิษฐ์สแกนและแยกหมวดหมู่รายจ่ายอัตโนมัติตามมาตรฐาน 5 ด้าน: <strong className="text-emerald-300">ค่าแรงงาน, น้ำมัน, ไฟฟ้า, ซ่อมบำรุง, และลงทุน (CapEx)</strong> พร้อมส่งออกข้อมูลตรงไปยัง Google Sheets
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadSampleBatch}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium backdrop-blur-sm transition-all border border-white/15 flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              ทดลองด้วยชุดบิลตัวอย่าง 5 หมวดรายจ่าย
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop Multi-Upload Box */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files) handleFilesSelected(e.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
          isProcessing
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-white dark:bg-slate-900 shadow-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
            {isProcessing ? (
              <RefreshCw className="w-7 h-7 animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {isProcessing
                ? `กำลังวิเคราะห์เอกสาร (${processingProgress.current}/${processingProgress.total})...`
                : 'คลิก หรือ ลากไฟล์บิล/สลิปเอกสารมาวางที่นี่'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              รองรับไฟล์สลิป/บิลรูปภาพ JPG, PNG, WEBP และ PDF (ระบบจะแยกหมวดหมู่ ค่าแรงงาน/น้ำมัน/ไฟฟ้า/ซ่อมบำรุง/ลงทุน อัตโนมัติ)
            </p>
          </div>

          {isProcessing && (
            <div className="w-full max-w-md bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sync Status Alert */}
      {syncResultMsg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium border ${
          syncResultMsg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/50'
            : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800/50'
        }`}>
          {syncResultMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span className="flex-1">{syncResultMsg.message}</span>
          <button
            onClick={() => setSyncResultMsg(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Actions & Filters Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              รายการบิลสแกนสะสม ({scannedBills.length} รายการ)
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono font-medium">
              รวม ฿{totalAmountScanned.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!isLoggedIn ? (
              <button
                onClick={signInWithGoogle}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition-colors flex items-center gap-2"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                เชื่อมต่อ Google Account
              </button>
            ) : (
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>เชื่อมต่อแล้ว: <strong className="text-slate-700 dark:text-slate-300">{userProfile?.email}</strong></span>
              </div>
            )}

            <button
              onClick={handleSyncToSheets}
              disabled={syncingToSheet || scannedBills.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              {syncingToSheet ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              ส่งข้อมูลไปยัง Google Sheets
            </button>

            {scannedBills.length > 0 && (
              <button
                onClick={handleClearAll}
                className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="ล้างรายการสแกนทั้งหมด"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters for 5 Expense Categories */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedCategoryFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              ทั้งหมด
            </button>

            <button
              onClick={() => setSelectedCategoryFilter('worker_labor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryFilter === 'worker_labor'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              ค่าแรงงาน
            </button>

            <button
              onClick={() => setSelectedCategoryFilter('fuel')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryFilter === 'fuel'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              น้ำมัน
            </button>

            <button
              onClick={() => setSelectedCategoryFilter('electricity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryFilter === 'electricity'
                  ? 'bg-yellow-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              ไฟฟ้า
            </button>

            <button
              onClick={() => setSelectedCategoryFilter('maintenance')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryFilter === 'maintenance'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              ซ่อมบำรุง
            </button>

            <button
              onClick={() => setSelectedCategoryFilter('capex')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                selectedCategoryFilter === 'capex'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              ลงทุน
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาร้านค้า, รายละเอียด, เลขที่บิล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Scanned Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-600 space-y-2">
            <FileText className="w-12 h-12 mx-auto stroke-1 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium">ยังไม่มีรายการบิลในหมวดหมู่นี้</p>
            <p className="text-xs">อัปโหลดไฟล์บิลหรือคลิก "ทดลองด้วยชุดบิลตัวอย่าง" ด้านบน</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">ไฟล์เอกสาร</th>
                  <th className="py-3.5 px-4">หมวดหมู่ AI จำแนก</th>
                  <th className="py-3.5 px-4">ผู้ขาย / หน่วยงาน / ทีมงาน</th>
                  <th className="py-3.5 px-4">เลขที่บิล / อ้างอิง</th>
                  <th className="py-3.5 px-4">วันที่บิล</th>
                  <th className="py-3.5 px-4 text-right">ยอดเงินรวม (บาท)</th>
                  <th className="py-3.5 px-4 text-right">ภาษี VAT (บาท)</th>
                  <th className="py-3.5 px-4">สถานะ</th>
                  <th className="py-3.5 px-4 text-center">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-medium flex items-center gap-2">
                      {bill.fileType === 'pdf' ? (
                        <FileText className="w-4 h-4 text-red-500 shrink-0" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />
                      )}
                      <span className="truncate max-w-[180px]" title={bill.fileName}>
                        {bill.fileName}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {getCategoryBadge(bill.category)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                      {bill.vendorName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {bill.invoiceNo}
                    </td>
                    <td className="py-3 px-4">
                      {bill.billDate}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white font-mono">
                      ฿{bill.totalAmountBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">
                      ฿{(bill.vatAmountBaht || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4">
                      {bill.status === 'synced' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          ซิงก์แล้ว
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                          รอซิงก์
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedBillModal(bill)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                          title="ดูรายละเอียดเชิงลึก"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="ลบรายการนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bill Detail Modal */}
      {selectedBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                {getCategoryBadge(selectedBillModal.category)}
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  รายละเอียดบิลที่สแกน
                </h3>
              </div>
              <button
                onClick={() => setSelectedBillModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-400 font-medium">ชื่อผู้ขาย / ปั๊ม / ทีมงาน / หน่วยงาน</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{selectedBillModal.vendorName}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-400 font-medium">ยอดเงินรวมทั้งสิ้น</span>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 text-base font-mono">
                  ฿{selectedBillModal.totalAmountBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-400 font-medium">เลขที่เอกสาร / บิล</span>
                <p className="font-mono text-slate-700 dark:text-slate-300">{selectedBillModal.invoiceNo}</p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-slate-400 font-medium">วันที่ออกบิล</span>
                <p className="text-slate-700 dark:text-slate-300">{selectedBillModal.billDate}</p>
              </div>

              {/* Category-Specific Detailed Fields */}
              {selectedBillModal.category === 'worker_labor' && (
                <>
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl space-y-1">
                    <span className="text-rose-700 dark:text-rose-400 font-medium">จำนวนคนงาน</span>
                    <p className="font-semibold text-rose-900 dark:text-rose-200">{selectedBillModal.workerCount || 1} คน</p>
                  </div>

                  <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl space-y-1">
                    <span className="text-rose-700 dark:text-rose-400 font-medium">รอบจ่ายค่าจ้าง</span>
                    <p className="font-semibold text-rose-900 dark:text-rose-200">{selectedBillModal.payPeriod || 'ประจำงวด'}</p>
                  </div>
                </>
              )}

              {selectedBillModal.category === 'fuel' && (
                <>
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl space-y-1">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">ประเภทน้ำมัน & ปริมาณ</span>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">{selectedBillModal.fuelType || 'ดีเซล'} ({selectedBillModal.fuelLiters || 0} ลิตร)</p>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl space-y-1">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">ทะเบียนรถบรรทุก</span>
                    <p className="font-semibold text-amber-900 dark:text-amber-200">{selectedBillModal.vehiclePlate || '-'}</p>
                  </div>
                </>
              )}

              {selectedBillModal.category === 'electricity' && (
                <>
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl space-y-1">
                    <span className="text-yellow-700 dark:text-yellow-400 font-medium">หมายเลข CA / มิเตอร์</span>
                    <p className="font-mono text-yellow-900 dark:text-yellow-200">{selectedBillModal.caNumber || '-'} / {selectedBillModal.meterNumber || '-'}</p>
                  </div>

                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-xl space-y-1">
                    <span className="text-yellow-700 dark:text-yellow-400 font-medium">หน่วยไฟรวม (kWh)</span>
                    <p className="font-mono text-yellow-900 dark:text-yellow-200">{selectedBillModal.totalUnitsKwh?.toLocaleString() || '-'} หน่วย</p>
                  </div>
                </>
              )}

              {selectedBillModal.category === 'maintenance' && (
                <>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl space-y-1 sm:col-span-2">
                    <span className="text-blue-700 dark:text-blue-400 font-medium">ชื่อเครื่องจักร / รายการอะไหล่ที่เปลี่ยน</span>
                    <p className="font-medium text-blue-900 dark:text-blue-200">{selectedBillModal.machineName} - {selectedBillModal.replacedParts}</p>
                  </div>
                </>
              )}

              {selectedBillModal.category === 'capex' && (
                <>
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl space-y-1 sm:col-span-2">
                    <span className="text-purple-700 dark:text-purple-400 font-medium">ชื่อโครงการ CapEx / ผลตอบแทนที่คาดหวัง</span>
                    <p className="font-medium text-purple-900 dark:text-purple-200">{selectedBillModal.assetProjectTitle} ({selectedBillModal.estimatedRoiNotes})</p>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1 text-xs">
              <span className="text-slate-400 font-medium">รายละเอียด / เหตุผลที่ AI จำแนกหมวดหมู่นี้</span>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedBillModal.description}</p>
              {selectedBillModal.reasoning && (
                <p className="text-emerald-600 dark:text-emerald-400 text-[11px] mt-1 font-medium">
                  💡 เหตุผล AI: {selectedBillModal.reasoning}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedBillModal(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-medium text-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
