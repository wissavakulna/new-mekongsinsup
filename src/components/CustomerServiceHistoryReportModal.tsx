import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Printer, User, FileText, Camera, Loader2, MapPin, 
  Phone, Scale, Wheat, Coins, Image as ImageIcon,
  Smartphone, ShieldCheck, CheckCircle2, QrCode, Share2,
  Calendar, Award, Sparkles, ChevronRight, Check, Clock,
  ArrowRight, Layers, FileCheck
} from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { MemberRecord, MillRecord } from '../services/dashboardService';

interface CustomerServiceHistoryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberRecord | null;
  crossInfo: {
    jobsList: MillRecord[];
    bagsByRiceType: Record<string, number>;
    weightByRiceType: Record<string, number>;
    totalBags: number;
    totalWeight: number;
  } | null;
  initialMode?: 'full' | 'compact';
}

export default function CustomerServiceHistoryReportModal({
  isOpen,
  onClose,
  member,
  crossInfo,
  initialMode = 'full',
}: CustomerServiceHistoryReportModalProps) {
  const [mode, setMode] = useState<'full' | 'compact'>(initialMode);
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [includePhotos, setIncludePhotos] = useState(true);
  
  const reportRef = useRef<HTMLDivElement>(null);
  const compactReportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  if (!isOpen || !member) return null;

  const jobs = crossInfo?.jobsList || [];
  const totalBags = crossInfo?.totalBags || 0;
  const totalInboundWeight = crossInfo?.totalWeight || 0;
  
  // Calculate total outbound weight and average yield
  const totalOutboundWeight = jobs.reduce((sum, j) => sum + (j.outboundWeight || 0), 0);
  const averageYield = totalInboundWeight > 0 && totalOutboundWeight > 0 
    ? ((totalOutboundWeight / totalInboundWeight) * 100).toFixed(1)
    : null;

  // Filter jobs that have at least one image
  const jobsWithPhotos = jobs.filter(
    (j) => j.riceBagImg || j.riceInboundImg || j.brownRiceImg || j.milledRiceImg
  );

  // Recent jobs for compact summary
  const recentJobsForCompact = jobs.slice(0, 6);

  // Function to print with full stylesheet clone and customized media queries
  const handlePrint = () => {
    const isCompact = mode === 'compact';
    const targetElement = isCompact ? compactReportRef.current : reportRef.current;
    if (!targetElement) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', isCompact ? 'width=480,height=900' : 'width=1050,height=1200');
    if (!printWindow) {
      window.print();
      return;
    }

    const styleSheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'));
    let stylesHtml = '';
    styleSheets.forEach((style) => {
      stylesHtml += style.outerHTML;
    });

    const pageStyle = isCompact
      ? `@page { size: 80mm auto; margin: 4mm; } body { width: 100%; max-width: 440px; margin: 0 auto; padding: 2px; }`
      : `@page { size: A4 portrait; margin: 10mm 12mm 12mm 12mm; } body { width: 100%; max-width: 100%; margin: 0 auto; padding: 0; }`;

    const printHtml = `
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>${isCompact ? 'สลิปสรุปย่อสมาร์ทโฟน' : 'รายงานประวัติการใช้บริการ'}_${member.name}</title>
          ${stylesHtml}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;500;600;700;800&display=swap');
            ${pageStyle}
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            body {
              background-color: #ffffff !important;
              color: #0f172a !important;
              font-family: 'Sarabun', 'Prompt', system-ui, -apple-system, sans-serif !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .no-print { display: none !important; }
            .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
            table { width: 100% !important; border-collapse: collapse !important; }
            tr { break-inside: avoid !important; page-break-inside: avoid !important; }
            img { max-width: 100% !important; }
          </style>
        </head>
        <body class="bg-white text-slate-900">
          <div style="width: 100%;">
            ${targetElement.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  // Function to download high-resolution JPG of the report
  const handleDownloadJpg = async () => {
    const isCompact = mode === 'compact';
    const targetElement = isCompact ? compactReportRef.current : reportRef.current;
    if (!targetElement) return;

    setIsExportingJpg(true);
    try {
      const dataUrl = await toJpeg(targetElement, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: isCompact ? {
          borderRadius: '24px',
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          width: '440px',
        } : {
          borderRadius: '0px',
          boxShadow: 'none',
          border: 'none',
          margin: '0 auto',
          backgroundColor: '#ffffff',
          width: '820px',
          padding: '24px',
        },
      });
      const link = document.createElement('a');
      const prefix = isCompact ? 'สลิปสรุปย่อสมาร์ทโฟน' : 'รายงานประวัติการใช้บริการ';
      link.download = `${prefix}_${member.name}_โรงสีแม่โขงพืชผล.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export JPG report:', err);
      alert('ไม่สามารถสร้างไฟล์รูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsExportingJpg(false);
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const currentTimeFormatted = new Date().toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Modal Top Control Header */}
        <div className="no-print bg-slate-900 px-4 sm:px-6 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl text-white shadow-md shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-extrabold text-sm sm:text-base flex items-center gap-2">
                รายงานประวัติการใช้บริการและแต้มสะสม
                <span className="text-[11px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-700/60 px-2.5 py-0.5 rounded-full hidden sm:inline-block">
                  โรงสีแม่โขงพืชผล
                </span>
              </h3>
              <p className="text-slate-400 text-xs mt-0.5">
                ลูกค้า: <span className="text-white font-bold">{member.name}</span> • ทั้งหมด {jobs.length} รอบการใช้บริการ
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700">
            <button
              onClick={() => setMode('full')}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'full'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ฉบับเต็ม (A4)</span>
            </button>
            <button
              onClick={() => setMode('compact')}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'compact'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>สรุปย่อสมาร์ทโฟน</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Photos (Full Mode Only) */}
            {mode === 'full' && (
              <button
                onClick={() => setIncludePhotos(!includePhotos)}
                className={`px-3 py-2 text-xs rounded-xl font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                  includePhotos 
                    ? 'bg-amber-600/25 border-amber-500 text-amber-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
                title="เปิด/ปิดการแสดงรูปถ่ายข้าวในรายงาน"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{includePhotos ? 'รูปถ่าย: เปิด' : 'รูปถ่าย: ปิด'}</span>
              </button>
            )}

            {/* Snap JPG Button */}
            <button
              onClick={handleDownloadJpg}
              disabled={isExportingJpg}
              className={`flex items-center gap-1.5 px-4 py-2 text-white font-extrabold text-xs rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-50 cursor-pointer ${
                mode === 'compact'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
              }`}
              title={mode === 'compact' ? "Snap สลิปย่อสำหรับสมาร์ทโฟน (.JPG)" : "Snap รูปภาพรายงานฉบับเต็ม (.JPG)"}
            >
              {isExportingJpg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>{isExportingJpg ? 'กำลังบันทึก...' : mode === 'compact' ? 'Snap สลิปย่อ (.JPG)' : 'Snap รายงาน (.JPG)'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
              title={mode === 'compact' ? "พิมพ์สลิปย่อ" : "พิมพ์ลงกระดาษ A4 หรือบันทึกเป็น PDF"}
            >
              <Printer className="w-4 h-4" />
              <span>{mode === 'compact' ? 'พิมพ์สลิปย่อ' : 'พิมพ์รายงาน A4 (PDF)'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="p-3 sm:p-6 md:p-8 overflow-y-auto bg-slate-800/60 flex justify-center flex-1">
          
          {mode === 'compact' ? (
            /* ======================================================== */
            /* SMARTPHONE COMPACT SUMMARY SLIP                          */
            /* ออกแบบพิเศษสำหรับสมาร์ทโฟน: อักษรใหญ่ อ่านสบายตา ทันสมัย     */
            /* ======================================================== */
            <div
              ref={compactReportRef}
              id="printable-customer-compact-slip"
              className="w-full max-w-[440px] bg-white border border-slate-200/90 shadow-2xl rounded-3xl p-5 space-y-4 text-slate-900 print:shadow-none print:border-none print:rounded-none print:p-2 print:w-full select-text font-sans"
            >
              {/* Luxury Obsidian-Gold Mobile Header */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white rounded-2xl p-4 shadow-lg relative overflow-hidden border border-amber-500/20">
                <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-orange-500/20 rounded-full blur-xl pointer-events-none"></div>
                
                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-md font-black text-xl tracking-wider shrink-0 border border-amber-200/50">
                      MK
                    </div>
                    <div>
                      <h2 className="text-base font-black tracking-tight leading-tight text-white">
                        โรงสีข้าวแม่โขงพืชผล
                      </h2>
                      <p className="text-xs text-amber-300 font-bold mt-0.5">
                        Mekong Assets Group
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-amber-500/30 border border-amber-400/50 text-amber-200 rounded-lg text-[10.5px] font-black tracking-wide shadow-xs">
                      E-SERVICE SLIP
                    </span>
                    <p className="text-[10px] text-slate-300 font-mono mt-1">
                      #{Date.now().toString().slice(-6)}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-white/15 flex justify-between items-center text-xs text-amber-100 font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-300" />
                    {currentDateFormatted.split(' ').slice(1).join(' ')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    {currentTimeFormatted} น.
                  </span>
                </div>
              </div>

              {/* Customer Profile Card - Big & Comfortable Typography */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center gap-3.5">
                  {member.profilePic ? (
                    <img 
                      src={member.profilePic} 
                      alt={member.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-amber-500 shadow-sm shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 rounded-full flex items-center justify-center font-black text-xl border-2 border-amber-400 shadow-sm shrink-0">
                      {member.name.replace(/[.·\s]+/, '').charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-900 text-base sm:text-lg truncate leading-tight">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[11px] bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-bold border border-amber-300">
                        {member.status || 'สมาชิกทั่วไป'}
                      </span>
                      <span className="text-xs text-slate-600 font-bold flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{member.phone || 'ไม่ระบุเบอร์โทร'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {member.address && (
                  <div className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/90 flex items-start gap-1.5 leading-relaxed shadow-2xs">
                    <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 font-medium">{member.address}</span>
                  </div>
                )}
              </div>

              {/* VIP Loyalty Points Highlight Card - Large Clean Digits */}
              <div className="bg-gradient-to-br from-amber-50 via-orange-50/70 to-yellow-50/50 border-2 border-amber-300 rounded-2xl p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-950">
                    <div className="p-1 bg-amber-500 text-white rounded-lg shadow-xs">
                      <Coins className="w-4 h-4" />
                    </div>
                    <span>บัญชีแต้มสะสม LOYALTY</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                    ใช้แลกส่วนลดค่าสีได้
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/95 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-bold">สะสมรวม</p>
                    <p className="text-sm font-black text-amber-600 mt-0.5">+{member.earnedPoints.toLocaleString()}</p>
                  </div>
                  <div className="bg-white/95 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
                    <p className="text-[10px] text-slate-500 font-bold">ใช้แลกไป</p>
                    <p className="text-sm font-black text-rose-600 mt-0.5">-{member.usedPoints.toLocaleString()}</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-600 to-orange-600 text-white p-2.5 rounded-xl shadow-sm">
                    <p className="text-[10px] text-amber-100 font-bold">คงเหลือสุทธิ</p>
                    <p className="text-lg font-black mt-0.5 tracking-tight">{member.balancePoints.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Milling Accumulation Metric Grid (Modern 2x2 Bento Box) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" />
                    สรุปผลการสีข้าวสะสมทั้งหมด
                  </span>
                  <span className="text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">
                    {jobs.length} รอบบริการ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                    <p className="text-xs text-slate-500 font-bold">กระสอบรวมทั้งหมด</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {totalBags.toLocaleString()} <span className="text-xs font-normal text-slate-500">กระสอบ</span>
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                    <p className="text-xs text-slate-500 font-bold">น้ำหนักข้าวเปลือกเข้า</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {totalInboundWeight.toLocaleString()} <span className="text-xs font-normal text-slate-500">กก.</span>
                    </p>
                  </div>

                  {totalOutboundWeight > 0 && (
                    <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-2xl text-center">
                      <p className="text-xs text-indigo-700 font-bold">ข้าวสารที่ได้ขาออก</p>
                      <p className="text-lg font-black text-indigo-950 mt-0.5">
                        {totalOutboundWeight.toLocaleString()} <span className="text-xs font-normal text-indigo-600">กก.</span>
                      </p>
                    </div>
                  )}

                  {averageYield && (
                    <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-2xl text-center">
                      <p className="text-xs text-emerald-700 font-bold">อัตราผลผลิตเฉลี่ย</p>
                      <p className="text-lg font-black text-emerald-950 mt-0.5">
                        {averageYield}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Rice Varieties Breakdown */}
              {crossInfo && Object.keys(crossInfo.bagsByRiceType).length > 0 && (
                <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Wheat className="w-3.5 h-3.5 text-amber-600" />
                    สัดส่วนประเภทข้าวที่นำมาสี:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(crossInfo.bagsByRiceType).map(([type, bags]) => (
                      <span 
                        key={type} 
                        className="px-3 py-1 bg-white border border-amber-200 text-slate-800 rounded-xl font-bold text-xs shadow-2xs flex items-center gap-1.5"
                      >
                        <span>{type}:</span>
                        <span className="text-amber-800 font-black">{bags.toLocaleString()} กระสอบ</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Services List (Card View with Large Text) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-black text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    ประวัติการบริการล่าสุด
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">แสดง {recentJobsForCompact.length} รอบ</span>
                </div>

                <div className="space-y-2">
                  {recentJobsForCompact.map((job, idx) => (
                    <div key={idx} className="bg-slate-50 hover:bg-slate-100/90 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5 transition">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-900 text-sm">{job.date}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10.5px] border ${
                          job.status?.includes('ส่งแล้ว')
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-sky-100 text-sky-800 border-sky-300'
                        }`}>
                          {job.status || 'สีเสร็จแล้ว'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-700">
                        <span className="font-semibold">{job.riceType} ({job.bags} กระสอบ)</span>
                        {job.outboundWeight ? (
                          <span className="font-black text-indigo-700">
                            ข้าวสาร: {job.outboundWeight.toLocaleString()} กก.
                          </span>
                        ) : job.weight ? (
                          <span className="font-medium text-slate-600">เข้า: {job.weight.toLocaleString()} กก.</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grain Photo Gallery (Evidence on Mobile) */}
              {jobsWithPhotos.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-black text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      ภาพถ่ายเมล็ดข้าวบันทึกในระบบ
                    </span>
                    <span className="text-[10px] text-slate-400">รอบวันที่ {jobsWithPhotos[0].date}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {/* 1. Bag */}
                    <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                      <p className="text-[9.5px] font-bold text-slate-600 truncate">1. กระสอบ</p>
                      <div className="h-16 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {jobsWithPhotos[0].riceBagImg ? (
                          <img src={jobsWithPhotos[0].riceBagImg} alt="กระสอบ" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Wheat className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* 2. Inbound Paddy */}
                    <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                      <p className="text-[9.5px] font-bold text-slate-600 truncate">2. ข้าวเปลือก</p>
                      <div className="h-16 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {jobsWithPhotos[0].riceInboundImg ? (
                          <img src={jobsWithPhotos[0].riceInboundImg} alt="ข้าวเปลือก" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Wheat className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* 3. Brown Rice */}
                    <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                      <p className="text-[9.5px] font-bold text-slate-600 truncate">3. ข้าวกล้อง</p>
                      <div className="h-16 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {jobsWithPhotos[0].brownRiceImg ? (
                          <img src={jobsWithPhotos[0].brownRiceImg} alt="ข้าวกล้อง" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Wheat className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {/* 4. Milled Rice */}
                    <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                      <p className="text-[9.5px] font-bold text-slate-600 truncate">4. ข้าวสาร</p>
                      <div className="h-16 bg-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
                        {jobsWithPhotos[0].milledRiceImg ? (
                          <img src={jobsWithPhotos[0].milledRiceImg} alt="ข้าวสาร" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <Wheat className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Digital Footer & Verification Badge */}
              <div className="pt-3 border-t border-slate-200 text-center space-y-1.5">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 shadow-2xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>รับรองความถูกต้องโดย โรงสีแม่โขงพืชผล</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  บ.หนองยาว ต.คำเตย อ.เมือง จ.นครพนม • โทร: 081-xxx-xxxx
                </p>
              </div>

            </div>
          ) : (
            /* ======================================================== */
            /* FULL A4 PRINTABLE REPORT DOCUMENT (รายงานฉบับเต็ม A4)    */
            /* ปรับขนาดสัดส่วนเต็มหน้ากระดาษ ไร้รอยขาด ตัวอักษรคมชัดสวยงาม */
            /* ======================================================== */
            <div
              ref={reportRef}
              id="printable-customer-service-report"
              className="w-full max-w-4xl bg-white border border-slate-200/90 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-5 text-slate-900 print:shadow-none print:border-none print:rounded-none print:p-0 print:w-full print:max-w-full font-sans select-text"
            >
              
              {/* Official Header Banner */}
              <div className="border-b-2 border-amber-600 pb-4">
                <div className="flex flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-800 flex items-center justify-center text-white shadow-md font-black text-2xl tracking-wider shrink-0 border border-amber-300/40">
                      MK
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                        โรงสีข้าวแม่โขงพืชผล
                      </h1>
                      <p className="text-xs sm:text-sm font-bold text-amber-800">
                        ในเครือกลุ่มแม่โขงสินทรัพย์ (Mekong Assets Group)
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ศูนย์บริการสีข้าวชุมชน • คัดเมล็ดพันธุ์ • ตรวจสอบคุณภาพข้าวด้วย AI
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <span className="inline-block px-3 py-1.5 bg-amber-100 text-amber-950 rounded-xl text-xs sm:text-sm font-black border border-amber-300 shadow-2xs">
                      รายงานประวัติการใช้บริการและแต้มสะสม
                    </span>
                    <p className="text-xs text-slate-500 font-medium">
                      เลขที่เอกสาร: <span className="font-mono font-bold text-slate-800">MK-RPT-{Date.now().toString().slice(-6)}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      วันที่พิมพ์: <span className="font-semibold text-slate-800">{currentDateFormatted}</span> ({currentTimeFormatted} น.)
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Dossier & Points Card (3-Column Grid) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 avoid-break shadow-xs">
                
                {/* 1. Customer Info */}
                <div className="space-y-2 md:border-r border-slate-200 md:pr-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wide">
                    <User className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>ข้อมูลสมาชิก / ลูกค้า</span>
                  </div>
                  <div className="text-xs space-y-1.5 pt-0.5 text-slate-700">
                    <p className="font-black text-base text-slate-900">{member.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-bold text-slate-800">{member.phone || 'ไม่ระบุเบอร์โทร'}</span>
                    </p>
                    <p className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span>{member.address || 'ไม่ระบุที่อยู่ / พิกัดรับส่งข้าว'}</span>
                    </p>
                    <div className="pt-1 flex items-center gap-2 text-xs">
                      <span className="text-slate-500 font-medium">สถานะ:</span>
                      <span className="bg-amber-100 text-amber-900 font-black px-2.5 py-0.5 rounded-lg border border-amber-300">
                        {member.status || 'สมาชิกทั่วไป'}
                      </span>
                      <span className="text-slate-400 text-[11px]">สมัคร: {member.registrationDate || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Loyalty Points Ledger */}
                <div className="space-y-2 md:border-r border-slate-200 md:px-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wide">
                    <Coins className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>บัญชีแต้มสะสม Loyalty Points</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <p className="text-[10px] text-slate-500 font-bold">แต้มสะสมรวม</p>
                      <p className="text-sm font-black text-amber-600 mt-0.5">+{member.earnedPoints.toLocaleString()}</p>
                    </div>
                    <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                      <p className="text-[10px] text-slate-500 font-bold">ใช้แลกไป</p>
                      <p className="text-sm font-black text-rose-600 mt-0.5">-{member.usedPoints.toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-100/70 p-2 rounded-xl border border-amber-300 shadow-2xs">
                      <p className="text-[10px] text-amber-900 font-black">คงเหลือสุทธิ</p>
                      <p className="text-sm font-black text-amber-900 mt-0.5">{member.balancePoints.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 text-center pt-1 italic">
                    * แต้มสะสมสามารถใช้แลกส่วนลดค่าบริการสีข้าวและของรางวัล
                  </p>
                </div>

                {/* 3. Milling Summary Stats */}
                <div className="space-y-2 md:pl-4">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 uppercase tracking-wide">
                    <Scale className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>สรุปผลการสีข้าวสะสม</span>
                  </div>
                  <div className="space-y-1.5 pt-0.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>ใช้บริการทั้งหมด:</span>
                      <span className="font-black text-slate-900">{jobs.length} ครั้ง</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>จำนวนกระสอบรวม:</span>
                      <span className="font-black text-slate-900">{totalBags.toLocaleString()} กระสอบ</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>น้ำหนักข้าวเปลือกเข้า:</span>
                      <span className="font-black text-slate-900">{totalInboundWeight.toLocaleString()} กก.</span>
                    </div>
                    {totalOutboundWeight > 0 && (
                      <div className="flex justify-between text-emerald-800 font-semibold">
                        <span>น้ำหนักข้าวสารออก:</span>
                        <span className="font-black">{totalOutboundWeight.toLocaleString()} กก.</span>
                      </div>
                    )}
                    {averageYield && (
                      <div className="flex justify-between text-amber-800 font-black pt-1 border-t border-slate-200">
                        <span>อัตราผลผลิตเฉลี่ย:</span>
                        <span>{averageYield}%</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Rice Type Breakdown Tags */}
              {crossInfo && Object.keys(crossInfo.bagsByRiceType).length > 0 && (
                <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/90 flex flex-wrap items-center justify-between gap-2 text-xs avoid-break">
                  <span className="font-black text-slate-800 flex items-center gap-1.5">
                    <Wheat className="w-4 h-4 text-amber-600" />
                    สัดส่วนประเภทข้าวที่นำมาสี:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(crossInfo.bagsByRiceType).map(([type, bags]) => (
                      <span 
                        key={type} 
                        className="px-3 py-1 bg-white border border-amber-200 text-slate-800 rounded-xl font-bold text-xs shadow-2xs"
                      >
                        {type}: <span className="text-amber-800 font-black">{bags.toLocaleString()}</span> กระสอบ
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Service History Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    ตารางบันทึกประวัติการใช้บริการรายครั้ง (Service Transactions)
                  </h4>
                  <span className="text-xs text-slate-500 font-medium">
                    ทั้งหมด {jobs.length} รายการ
                  </span>
                </div>

                <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100/90 border-b border-slate-300 text-slate-800 font-black text-xs">
                        <th className="py-2.5 px-3 text-center w-12">ลำดับ</th>
                        <th className="py-2.5 px-3 whitespace-nowrap">วันที่รับบริการ</th>
                        <th className="py-2.5 px-3">ประเภทบริการ / ข้าว</th>
                        <th className="py-2.5 px-3 text-center">กระสอบ</th>
                        <th className="py-2.5 px-3 text-right">น้ำหนักขาเข้า</th>
                        <th className="py-2.5 px-3 text-right">ข้าวสารขาออก</th>
                        <th className="py-2.5 px-3 text-center">ผลผลิต %</th>
                        <th className="py-2.5 px-3 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                      {jobs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                            ยังไม่มีประวัติการใช้บริการในระบบ
                          </td>
                        </tr>
                      ) : (
                        jobs.map((job, idx) => {
                          const yieldPct = job.weight && job.outboundWeight && job.weight > 0
                            ? ((job.outboundWeight / job.weight) * 100).toFixed(1)
                            : '-';

                          return (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                              <td className="py-2 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="py-2 px-3 font-bold text-slate-900 whitespace-nowrap">{job.date}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold text-slate-900">{job.riceType}</span>
                                {job.serviceType && (
                                  <span className="block text-[10px] text-amber-700 font-semibold">
                                    {job.serviceType}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-black text-slate-800">
                                {job.bags}
                              </td>
                              <td className="py-2 px-3 text-right font-medium">
                                {job.weight ? `${job.weight.toLocaleString()} กก.` : '-'}
                              </td>
                              <td className="py-2 px-3 text-right font-black text-indigo-700">
                                {job.outboundWeight ? `${job.outboundWeight.toLocaleString()} กก.` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center font-black text-emerald-700">
                                {yieldPct !== '-' ? `${yieldPct}%` : '-'}
                              </td>
                              <td className="py-2 px-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  job.status?.includes('ส่งแล้ว')
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                    : job.status?.includes('สีเสร็จแล้ว')
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-amber-50 text-amber-700 border-amber-300'
                                }`}>
                                  {job.status || 'รับแล้ว'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {jobs.length > 0 && (
                      <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-xs text-slate-900">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 text-right font-black">
                            รวมสุทธิ ({jobs.length} รายการ):
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-amber-800 text-sm">
                            {totalBags.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black">
                            {totalInboundWeight.toLocaleString()} กก.
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-indigo-800">
                            {totalOutboundWeight > 0 ? `${totalOutboundWeight.toLocaleString()} กก.` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-black text-emerald-800">
                            {averageYield ? `${averageYield}%` : '-'}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* Rice Photos Gallery Section */}
              {includePhotos && jobsWithPhotos.length > 0 && (
                <div className="space-y-2 pt-1 avoid-break">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <h4 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-amber-600" />
                      ภาพถ่ายบันทึกหลักฐานการสีข้าว (Milling Photo Gallery)
                    </h4>
                    <span className="text-xs text-slate-400 italic">
                      บันทึกจากระบบตรวจสอบเมล็ดข้าวโรงสี
                    </span>
                  </div>

                  <div className="space-y-3">
                    {jobsWithPhotos.slice(0, 2).map((job, jIdx) => (
                      <div key={jIdx} className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                          <span>
                            รอบวันที่: <span className="text-slate-900 font-black">{job.date}</span> ({job.riceType} • {job.bags} กระสอบ)
                          </span>
                          {job.outboundWeight && (
                            <span className="text-indigo-800 font-black">
                              น้ำหนักข้าวสารขาออก: {job.outboundWeight.toLocaleString()} กก.
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-2.5">
                          {/* Photo 1 */}
                          <div className="bg-white p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 truncate">1. กระสอบข้าว</p>
                            <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {job.riceBagImg ? (
                                <img src={job.riceBagImg} alt="กระสอบข้าว" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] text-slate-400 flex flex-col items-center">
                                  <Wheat className="w-4 h-4 mb-0.5 text-slate-300" /> ไม่มีภาพ
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Photo 2 */}
                          <div className="bg-white p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 truncate">2. ข้าวเปลือกขาเข้า</p>
                            <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {job.riceInboundImg ? (
                                <img src={job.riceInboundImg} alt="ข้าวขาเข้า" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] text-slate-400 flex flex-col items-center">
                                  <Wheat className="w-4 h-4 mb-0.5 text-slate-300" /> ไม่มีภาพ
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Photo 3 */}
                          <div className="bg-white p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 truncate">3. ข้าวกล้อง</p>
                            <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {job.brownRiceImg ? (
                                <img src={job.brownRiceImg} alt="ข้าวกล้อง" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] text-slate-400 flex flex-col items-center">
                                  <Wheat className="w-4 h-4 mb-0.5 text-slate-300" /> ไม่มีภาพ
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Photo 4 */}
                          <div className="bg-white p-1.5 rounded-xl border border-slate-200 text-center space-y-1">
                            <p className="text-[10px] font-bold text-slate-600 truncate">4. ข้าวสารขัดขาว</p>
                            <div className="h-20 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                              {job.milledRiceImg ? (
                                <img src={job.milledRiceImg} alt="ข้าวสาร" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <span className="text-[10px] text-slate-400 flex flex-col items-center">
                                  <Wheat className="w-4 h-4 mb-0.5 text-slate-300" /> ไม่มีภาพ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clean Official Signatures Area (No broken line dots) */}
              <div className="pt-4 border-t-2 border-slate-300 avoid-break">
                <div className="grid grid-cols-2 gap-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-[260px] border-b border-dashed border-slate-400 pb-2 mb-2 text-center text-xs text-slate-400">
                      ( ลงลายมือชื่อ )
                    </div>
                    <p className="font-black text-slate-800 text-xs sm:text-sm">
                      เจ้าหน้าที่ผู้ออกรายงาน
                    </p>
                    <p className="text-slate-600 text-xs mt-0.5">
                      โรงสีข้าวแม่โขงพืชผล / กลุ่มแม่โขงสินทรัพย์
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      วันที่ .......... / .......... / ................
                    </p>
                  </div>

                  <div className="flex flex-col items-center justify-center">
                    <div className="w-full max-w-[260px] border-b border-dashed border-slate-400 pb-2 mb-2 text-center text-xs text-slate-400">
                      ( ลงลายมือชื่อ )
                    </div>
                    <p className="font-black text-slate-800 text-xs sm:text-sm">
                      สมาชิก / ผู้รับบริการ
                    </p>
                    <p className="text-slate-600 text-xs mt-0.5 font-bold">
                      ( {member.name} )
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">
                      วันที่ .......... / .......... / ................
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
                  * เอกสารฉบับนี้ออกโดยระบบสารสนเทศโรงสีข้าวแม่โขงพืชผล เพื่อเป็นหลักฐานรับรองประวัติการใช้บริการและยอดแต้มสะสม
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Bottom Control Footer */}
        <div className="no-print bg-slate-900 px-4 sm:px-6 py-3.5 border-t border-slate-800 flex flex-wrap justify-between items-center gap-2 shrink-0">
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            {mode === 'compact' ? (
              <>
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>สลิปย่อสมาร์ทโฟน: ปรับขนาดอักษรใหญ่ ชัดเจน อ่านสบายตาบนมือถือ / ส่งทาง LINE</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-amber-400" />
                <span>รายงานฉบับเต็ม: จัดขนาดมาตรฐานพอดี A4 พร้อมข้อมูลบริการและรูปภาพเมล็ดข้าว</span>
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              ปิดหน้าต่าง
            </button>
            <button
              onClick={handleDownloadJpg}
              disabled={isExportingJpg}
              className={`px-4 py-2 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer ${
                mode === 'compact'
                  ? 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500'
              }`}
            >
              {isExportingJpg ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
              <span>{isExportingJpg ? 'กำลังบันทึกภาพ...' : mode === 'compact' ? 'Snap สลิปย่อ (.JPG)' : 'Snap รายงาน (.JPG)'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>{mode === 'compact' ? 'พิมพ์สลิปย่อ' : 'พิมพ์รายงาน A4 (PDF)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
