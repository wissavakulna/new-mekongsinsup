import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Printer, Building2, ShieldCheck, User, FileSpreadsheet, 
  ExternalLink, Smartphone, Image, Download, Loader2, FileText, Camera 
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { WorkerLaborRecord } from '../../services/dashboardService';

export interface EmployeeSalarySummaryData {
  employeeName: string;
  role?: string;
  payCyclePeriod: '1st-15th' | '16th-End';
  periodLabel: string; // e.g. "16 - 31 กรกฎาคม 2569"
  payDate: string;     // e.g. "01 สิงหาคม 2569"
  workDays: number;
  totalWorkHours: number;
  totalOtHours: number;
  baseWageTotal: number;
  otWageTotal: number;
  bonusTotal?: number;
  loanDeductionTotal?: number;
  allowance: number;   // เบี้ยขยัน / เงินพิเศษเพิ่มเติม
  deduction: number;   // หักเงินยืมเพิ่มเติม
  netWage: number;
  paymentMethod: string;
  records: WorkerLaborRecord[];
}

interface EmployeePayslipModalProps {
  isOpen: boolean;
  onClose: () => void;
  summaryData: EmployeeSalarySummaryData | null;
  initialMode?: 'full' | 'compact';
}

// Thai baht number to words converter
function thaiBahtText(num: number): string {
  if (isNaN(num) || num === 0) return 'ศูนย์บาทถ้วน';

  const numbers = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
  const digits = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  const baht = Math.floor(Math.abs(num));
  const satang = Math.round((Math.abs(num) - baht) * 100);

  let text = '';

  if (baht > 0) {
    const bahtStr = baht.toString();
    const len = bahtStr.length;
    for (let i = 0; i < len; i++) {
      const digit = parseInt(bahtStr[i], 10);
      const pos = len - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) {
          text += 'สิบ';
        } else if (pos === 1 && digit === 2) {
          text += 'ยี่สิบ';
        } else if (pos === 0 && digit === 1 && len > 1) {
          text += 'เอ็ด';
        } else {
          text += numbers[digit] + digits[pos];
        }
      }
    }
    text += 'บาท';
  }

  if (satang === 0) {
    text += 'ถ้วน';
  } else {
    const satangStr = satang.toString().padStart(2, '0');
    const d1 = parseInt(satangStr[0], 10);
    const d2 = parseInt(satangStr[1], 10);

    if (d1 !== 0) {
      if (d1 === 1) text += 'สิบ';
      else if (d1 === 2) text += 'ยี่สิบ';
      else text += numbers[d1] + 'สิบ';
    }
    if (d2 !== 0) {
      if (d2 === 1 && d1 !== 0) text += 'เอ็ด';
      else text += numbers[d2];
    }
    text += 'สตางค์';
  }

  return text;
}

export default function EmployeePayslipModal({ isOpen, onClose, summaryData, initialMode = 'full' }: EmployeePayslipModalProps) {
  const [customAllowance, setCustomAllowance] = useState<number>(0);
  const [customDeduction, setCustomDeduction] = useState<number>(0);
  const [mode, setMode] = useState<'full' | 'compact'>(initialMode);
  const [isExportingJpg, setIsExportingJpg] = useState<boolean>(false);
  const [isExportingFullJpg, setIsExportingFullJpg] = useState<boolean>(false);

  const slipRef = useRef<HTMLDivElement>(null);
  const compactSlipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen || !summaryData) return null;

  const currentAllowance = customAllowance || summaryData.allowance;
  const currentDeduction = customDeduction || summaryData.deduction;
  const bonusTotal = (summaryData.bonusTotal || 0) + currentAllowance;
  const loanDeductionTotal = (summaryData.loanDeductionTotal || 0) + currentDeduction;

  const grossIncome = summaryData.baseWageTotal + summaryData.otWageTotal + bonusTotal;
  const finalNetPayment = grossIncome - loanDeductionTotal;

  // Function to download compact payslip as JPG image for mobile phones
  const handleDownloadJpg = async () => {
    if (!compactSlipRef.current) return;
    setIsExportingJpg(true);
    try {
      const dataUrl = await toJpeg(compactSlipRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
      });
      const link = document.createElement('a');
      link.download = `สลิปเงินเดือน_ย่อ_${summaryData.employeeName}_${summaryData.payCyclePeriod}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export JPG:', err);
      alert('ไม่สามารถสร้างไฟล์รูปภาพ JPG ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExportingJpg(false);
    }
  };

  // Function to snap and download FULL A4 payslip as high-resolution JPG image (100% exact copy)
  const handleDownloadFullA4Jpg = async () => {
    if (!slipRef.current) return;
    setIsExportingFullJpg(true);
    try {
      const dataUrl = await toJpeg(slipRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          borderRadius: '0px',
          boxShadow: 'none',
          border: '1px solid #cbd5e1',
          margin: '0 auto',
          backgroundColor: '#ffffff',
        }
      });
      const link = document.createElement('a');
      link.download = `สลิปเงินเดือน_ฉบับเต็ม_${summaryData.employeeName}_${summaryData.payCyclePeriod}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export Full A4 JPG:', err);
      alert('ไม่สามารถสร้างไฟล์รูปภาพสลิปเต็ม JPG ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExportingFullJpg(false);
    }
  };

  // Print function with popup window that clones all main application stylesheets for 100% snapshot fidelity
  const handlePrint = () => {
    const printElement = slipRef.current;
    if (!printElement) {
      window.print();
      return;
    }

    // Collect all loaded style and link elements from the main application DOM
    const stylesAndLinks = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('\n');

    // Try popup window first to bypass iframe restrictions in web previews
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="th">
          <head>
            <meta charset="UTF-8">
            <title>ใบแจ้งยอดเงินเดือน_${summaryData.employeeName}_${summaryData.payCyclePeriod}</title>
            ${stylesAndLinks}
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm;
              }
              body {
                font-family: 'Prompt', 'Sarabun', -apple-system, sans-serif !important;
                background-color: #ffffff !important;
                color: #0f172a !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
                display: flex !important;
                justify-content: center !important;
              }
              .no-print {
                display: none !important;
              }
              .a4-print-wrapper {
                width: 190mm !important;
                max-width: 190mm !important;
                margin: 0 auto !important;
                box-sizing: border-box !important;
                background: #ffffff !important;
              }
            </style>
          </head>
          <body>
            <div class="a4-print-wrapper">
              ${printElement.outerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 250);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } else {
      // Fallback to direct print if popup blocked
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* Global CSS for direct window.print() formatting to strictly fit A4 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-payslip-root, #printable-payslip-root * {
            visibility: visible !important;
          }
          #printable-payslip-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            padding: 10mm !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
            z-index: 999999 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 print:shadow-none print:border-none print:rounded-none">
        
        {/* Top Control Bar (Non-printable) */}
        <div className="no-print bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base">
                {mode === 'full' ? 'สลิปเงินแบบเต็ม (A4 Standard Payslip)' : 'สลิปเงินแบบย่อ (Smartphone Card)'}
              </h3>
              <p className="text-xs text-slate-400">พนักงาน กลุ่มแม่โขงสินทรัพย์ ({summaryData.employeeName})</p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-slate-800 p-1 rounded-xl border border-slate-700 flex items-center gap-1">
            <button
              onClick={() => setMode('full')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition ${
                mode === 'full' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              สลิปเงินแบบเต็ม
            </button>
            <button
              onClick={() => setMode('compact')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold flex items-center gap-1.5 transition ${
                mode === 'compact' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              สลิปเงินแบบย่อ
            </button>
          </div>

          <div className="flex items-center gap-2">
            {mode === 'full' ? (
              <>
                {/* Snap Full A4 as JPG Button */}
                <button
                  onClick={handleDownloadFullA4Jpg}
                  disabled={isExportingFullJpg}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50"
                  title="ถ่ายรูปสลิปเต็มบันทึกเป็นรูปภาพ JPG คมชัดสูง 100%"
                >
                  {isExportingFullJpg ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {isExportingFullJpg ? 'กำลังบันทึกภาพ...' : 'Snap สลิปเต็ม (.JPG)'}
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  พิมพ์ / บันทึก PDF (A4)
                </button>
              </>
            ) : (
              <button
                onClick={handleDownloadJpg}
                disabled={isExportingJpg}
                className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50"
              >
                {isExportingJpg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                ดาวน์โหลดรูปภาพ (.jpg)
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Payslip Outer Scroll Container */}
        <div className="p-4 sm:p-6 max-h-[82vh] overflow-y-auto bg-slate-100 space-y-4 print:p-0 print:bg-white print:max-h-none print:overflow-visible">
          
          {/* Quick Adjustment Options (Non-printable controls outside printable ref) */}
          <div className="no-print mx-auto max-w-[190mm] bg-white border border-slate-300 shadow-sm rounded-xl p-3.5 text-xs space-y-2">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              ปรับแต่งยอดโบนัส / หักเงินยืมเพิ่มเติมก่อนพิมพ์สลิป:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-600 block mb-1 font-medium">เงินโบนัส / พิเศษเพิ่มเติม (บาท):</label>
                <input
                  type="number"
                  value={customAllowance}
                  onChange={(e) => setCustomAllowance(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-600 block mb-1 font-medium">หักเงินยืมเพิ่มเติม / อื่นๆ (บาท):</label>
                <input
                  type="number"
                  value={customDeduction}
                  onChange={(e) => setCustomDeduction(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-rose-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Conditional View Mode */}
          {mode === 'compact' ? (
            /* COMPACT SMARTPHONE JPG VIEW */
            <div className="py-2 flex flex-col items-center space-y-4">
              <div
                ref={compactSlipRef}
                className="w-full max-w-[420px] bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xl font-sans text-slate-800"
                style={{ backgroundColor: '#ffffff' }}
              >
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white p-5 text-center relative">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-white font-black text-xl mb-1.5 border border-white/20 shadow-xs">
                    MK
                  </div>
                  <h2 className="text-base font-black tracking-tight">กลุ่มแม่โขงสินทรัพย์</h2>
                  <p className="text-[11px] text-emerald-200 font-medium mt-0.5">ใบแจ้งยอดเงินเดือนแบบย่อ (PAYSLIP)</p>
                  <div className="mt-2.5 bg-white/15 backdrop-blur-sm rounded-xl py-1 px-3 inline-block border border-white/20 text-[11px] font-bold text-emerald-100">
                    {summaryData.periodLabel}
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 space-y-4">
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">ชื่อพนักงาน</span>
                      <span className="text-sm font-extrabold text-slate-900 block mt-0.5">{summaryData.employeeName}</span>
                      <span className="text-[11px] text-slate-500 font-normal">{summaryData.role || 'พนักงานปฏิบัติการโรงสี'}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">วันจ่ายเงิน</span>
                      <span className="text-xs font-bold text-emerald-700 block mt-0.5">{summaryData.payDate}</span>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        {summaryData.paymentMethod || 'เงินสด'}
                      </span>
                    </div>
                  </div>

                  {/* Attendance Stats */}
                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-center text-xs text-emerald-900 font-medium flex justify-around items-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">วันทำงาน</span>
                      <span className="font-extrabold text-slate-900 text-sm">{summaryData.workDays} วัน</span>
                    </div>
                    <div className="h-6 w-px bg-emerald-200"></div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-medium">โอทีสะสม</span>
                      <span className="font-extrabold text-amber-600 text-sm">{summaryData.totalOtHours.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.</span>
                    </div>
                  </div>

                  {/* Breakdown Table */}
                  <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs space-y-2 divide-y divide-slate-100">
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-600">1. ค่าแรงปกติ ({summaryData.workDays} วัน)</span>
                      <span className="font-bold text-slate-900">฿{Math.round(summaryData.baseWageTotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-600">2. ค่า OT ล่วงเวลา ({summaryData.totalOtHours.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.)</span>
                      <span className="font-bold text-amber-600">฿{Math.round(summaryData.otWageTotal).toLocaleString()}</span>
                    </div>
                    {bonusTotal > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-600">3. โบนัส / เงินพิเศษ</span>
                        <span className="font-bold text-emerald-600">+฿{Math.round(bonusTotal).toLocaleString()}</span>
                      </div>
                    )}
                    {loanDeductionTotal > 0 && (
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-600">4. หักเงินยืม / เบิกล่วงหน้า</span>
                        <span className="font-bold text-rose-600">-฿{Math.round(loanDeductionTotal).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Grand Net Box */}
                  <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-4 text-center shadow-lg border border-emerald-700 space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-200 block">
                      ยอดเงินรับสุทธิ (NET PAYMENT)
                    </span>
                    <span className="text-3xl font-black tracking-tight text-white block">
                      ฿{Math.round(finalNetPayment).toLocaleString()}
                    </span>
                    <span className="text-[11px] text-emerald-100 italic font-medium block">
                      ({thaiBahtText(Math.round(finalNetPayment))})
                    </span>
                  </div>

                  {/* Footer Branding */}
                  <div className="text-center pt-1 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 font-medium">
                      กลุ่มแม่โขงสินทรัพย์ (ธุรกิจข้าวครบวงจร) • นครพนม
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button for Compact Mode */}
              <div className="no-print flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleDownloadJpg}
                  disabled={isExportingJpg}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50"
                >
                  {isExportingJpg ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isExportingJpg ? 'กำลังสร้างไฟล์รูปภาพ...' : 'บันทึกสลิปย่อเป็นรูปภาพ (.jpg)'}
                </button>
              </div>
            </div>
          ) : (
            /* A4 PROPORTION PAGE FRAME */
            <div
              ref={slipRef}
              id="printable-payslip-root"
              className="mx-auto bg-white border border-slate-300 shadow-md rounded-2xl p-6 sm:p-8 space-y-5 text-slate-900 print:shadow-none print:border-none print:rounded-none print:p-0 print:w-full"
              style={{ minHeight: '270mm', maxWidth: '190mm' }}
            >
              
              {/* Header Banner */}
              <div className="border-b-2 border-emerald-800 pb-4">
                <div className="flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-900 flex items-center justify-center text-white shadow-md font-extrabold text-2xl tracking-wider">
                      MK
                    </div>
                    <div>
                      <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                        กลุ่มแม่โขงสินทรัพย์
                      </h1>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        ธุรกิจข้าวครบวงจร
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        ที่อยู่ 149 หมู่ 11 บ.หนองยาว ต.คำเตย อ.เมือง จ.นครพนม
                      </p>
                    </div>
                  </div>

                  <div className="text-right border-l border-slate-200 pl-4 min-w-[170px]">
                    <div className="inline-block px-3 py-1 bg-emerald-800 text-white font-extrabold text-xs rounded-md shadow-sm">
                      ใบแจ้งยอดเงินเดือน / PAYSLIP
                    </div>
                    <p className="text-[11px] font-mono text-slate-600 mt-1">
                      เลขที่: MK-SLIP-{summaryData.payCyclePeriod === '1st-15th' ? 'CYCLE1' : 'CYCLE2'}-{new Date().getFullYear()}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      วันที่ออกเอกสาร: {summaryData.payDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee & Cycle Info Grid */}
              <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">ชื่อ-นามสกุล พนักงาน:</span>
                  <span className="font-bold text-slate-900 text-sm flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 text-emerald-700 no-print" />
                    {summaryData.employeeName}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">สังกัด / ตำแหน่ง:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {summaryData.role || 'พนักงานปฏิบัติการโรงสี'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">รอบการตัดจ่ายค่าแรงงาน:</span>
                  <span className="font-bold text-emerald-800 block mt-0.5">
                    {summaryData.periodLabel}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">สถิติการทำงานในรอบ:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {summaryData.workDays} วัน ({summaryData.totalWorkHours.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม. | OT {summaryData.totalOtHours.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.)
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">กำหนดวันที่จ่ายเงิน:</span>
                  <span className="font-semibold text-slate-800 block mt-0.5">
                    {summaryData.payDate}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">ช่องทางชำระเงิน:</span>
                  <span className="font-bold text-emerald-800 block mt-0.5">
                    {summaryData.paymentMethod || 'เงินสด'}
                  </span>
                </div>
              </div>

              {/* Salary Breakdown Table (Earnings vs Deductions) */}
              <div className="grid grid-cols-2 gap-3">
                
                {/* Earnings Column */}
                <div className="border border-emerald-300 rounded-xl overflow-hidden bg-white">
                  <div className="bg-emerald-800 text-white px-3 py-2 font-bold text-xs flex justify-between items-center">
                    <span>รายการเงินได้ (EARNINGS)</span>
                    <span>จำนวนเงิน (บาท)</span>
                  </div>
                  <div className="p-3 text-xs space-y-2 divide-y divide-slate-100">
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-700">1. ค่าแรงปกติ ({summaryData.workDays} วัน)</span>
                      <span className="font-semibold text-slate-900">฿{Math.round(summaryData.baseWageTotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-700">2. ค่า OT ล่วงเวลา ({summaryData.totalOtHours.toLocaleString('th-TH', { maximumFractionDigits: 1 })} ชม.)</span>
                      <span className="font-semibold text-amber-700">฿{Math.round(summaryData.otWageTotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-700">3. โบนัส / เงินพิเศษ</span>
                      <span className="font-semibold text-emerald-700">฿{Math.round(bonusTotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-emerald-200 font-bold text-slate-900">
                      <span>รวมเงินได้ทั้งหมด (Gross Income)</span>
                      <span className="text-emerald-800 text-xs">฿{Math.round(grossIncome).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Column */}
                <div className="border border-rose-300 rounded-xl overflow-hidden bg-white">
                  <div className="bg-rose-800 text-white px-3 py-2 font-bold text-xs flex justify-between items-center">
                    <span>รายการหัก (DEDUCTIONS)</span>
                    <span>จำนวนเงิน (บาท)</span>
                  </div>
                  <div className="p-3 text-xs space-y-2 divide-y divide-slate-100">
                    <div className="flex justify-between items-center pt-0.5">
                      <span className="text-slate-700">1. หักเงินยืม (บาท) / เบิกล่วงหน้า</span>
                      <span className="font-semibold text-rose-700">฿{Math.round(loanDeductionTotal).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-700">2. ประกันสังคม / กองทุน</span>
                      <span className="font-semibold text-slate-500">฿0</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-slate-700">3. ภาษีหัก ณ ที่จ่าย</span>
                      <span className="font-semibold text-slate-500">฿0</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t-2 border-rose-200 font-bold text-slate-900">
                      <span>รวมรายการหักทั้งหมด (Total Deductions)</span>
                      <span className="text-rose-800 text-xs">฿{Math.round(loanDeductionTotal).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Payment Highlight Box */}
              <div className="bg-emerald-900 text-white rounded-xl p-4 border border-emerald-700 flex flex-row items-center justify-between gap-4 shadow-sm">
                <div>
                  <p className="text-[11px] text-emerald-200 uppercase tracking-wider font-bold">
                    ยอดเงินรับสุทธิ (NET PAYMENT)
                  </p>
                  <p className="text-xs text-emerald-100 font-medium mt-1">
                    จำนวนเงินตัวอักษร: <span className="underline font-semibold">{thaiBahtText(Math.round(finalNetPayment))}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-extrabold tracking-tight text-white">
                    ฿{Math.round(finalNetPayment).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Attendance & Work Log Details Table for A4 completeness */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600 no-print" />
                  รายละเอียดสถิติการลงเวลาการทำงานในรอบ ({summaryData.records.length} รายการ):
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                  <table className="w-full text-left divide-y divide-slate-200">
                    <thead className="bg-slate-100 text-slate-700 font-semibold">
                      <tr>
                        <th className="px-2.5 py-1.5">วันที่</th>
                        <th className="px-2.5 py-1.5">เวลา เข้า-ออก</th>
                        <th className="px-2.5 py-1.5 text-right">ค่าแรงปกติ</th>
                        <th className="px-2.5 py-1.5 text-right">ค่า OT</th>
                        <th className="px-2.5 py-1.5 text-right">โบนัส</th>
                        <th className="px-2.5 py-1.5 text-right">หักเงินยืม</th>
                        <th className="px-2.5 py-1.5 text-right">รวมรับสุทธิ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
                      {summaryData.records.slice(0, 8).map((rec, idx) => (
                        <tr key={idx}>
                          <td className="px-2.5 py-1 font-medium">{rec.date}</td>
                          <td className="px-2.5 py-1 text-slate-500">{rec.checkInTime} - {rec.checkOutTime} ({rec.otHours}h OT)</td>
                          <td className="px-2.5 py-1 text-right">฿{Math.round(rec.baseWage).toLocaleString()}</td>
                          <td className="px-2.5 py-1 text-right text-amber-700">฿{Math.round(rec.otWage).toLocaleString()}</td>
                          <td className="px-2.5 py-1 text-right text-emerald-700">฿{Math.round(rec.bonus || 0).toLocaleString()}</td>
                          <td className="px-2.5 py-1 text-right text-rose-700">฿{Math.round(rec.loanDeduction || 0).toLocaleString()}</td>
                          <td className="px-2.5 py-1 text-right font-bold text-slate-900">฿{Math.round(rec.totalWage).toLocaleString()}</td>
                        </tr>
                      ))}
                      {summaryData.records.length > 8 && (
                        <tr>
                          <td colSpan={7} className="px-2.5 py-1 text-center text-slate-400 italic">
                            ... แสดงรายการ 8 จากทั้งหมด {summaryData.records.length} วันในรอบการตัดจ่าย ...
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Official Signatures & Stamp Area */}
              <div className="pt-4 border-t border-slate-300">
                <div className="grid grid-cols-2 gap-8 text-center text-xs">
                  <div className="space-y-6">
                    <p className="font-semibold text-slate-800">ลงชื่อ ........................................................... ผู้จ่ายเงิน/ฝ่ายบัญชี</p>
                    <p className="text-slate-600 text-[11px]">
                      ( กลุ่มแม่โขงสินทรัพย์ ) <br />
                      วันที่ ............./............/.............
                    </p>
                  </div>

                  <div className="space-y-6">
                    <p className="font-semibold text-slate-800">ลงชื่อ ........................................................... พนักงานผู้รับเงิน</p>
                    <p className="text-slate-600 text-[11px]">
                      ( {summaryData.employeeName} ) <br />
                      วันที่ ............./............/.............
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-center text-[10px] text-slate-400">
                  * เอกสารฉบับนี้สร้างจากระบบ ERP บริหารจัดการ กลุ่มแม่โขงสินทรัพย์ ใช้เป็นหลักฐานการจ่ายเงินค่าจ้างตามกฎหมาย
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="no-print bg-slate-100 px-6 py-3 border-t border-slate-200 flex flex-wrap justify-between items-center gap-2">
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <ExternalLink className="w-3.5 h-3.5" />
            {mode === 'full' ? 'พร้อมสำหรับพิมพ์เอกสาร A4 หรือ Snap รูปภาพ JPG สลิปเต็ม' : 'พร้อมสำหรับส่งต่อสลิปเงินย่อ รูปภาพ JPG ให้พนักงานในสมาร์ทโฟน'}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              ปิดหน้าต่าง
            </button>
            {mode === 'full' ? (
              <>
                {/* Bottom Snap Full A4 JPG Button */}
                <button
                  onClick={handleDownloadFullA4Jpg}
                  disabled={isExportingFullJpg}
                  className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
                  title="ถ่ายรูปสลิปเต็มบันทึกเป็นรูปภาพ JPG คมชัดสูง 100%"
                >
                  {isExportingFullJpg ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {isExportingFullJpg ? 'กำลังสร้างไฟล์รูปภาพ...' : 'Snap สลิปเต็ม (.JPG)'}
                </button>

                <button
                  onClick={handlePrint}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md"
                >
                  <Printer className="w-4 h-4" />
                  พิมพ์สลิปเงินเดือน (A4)
                </button>
              </>
            ) : (
              <button
                onClick={handleDownloadJpg}
                disabled={isExportingJpg}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50"
              >
                {isExportingJpg ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                ดาวน์โหลดรูปภาพ (.jpg)
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

