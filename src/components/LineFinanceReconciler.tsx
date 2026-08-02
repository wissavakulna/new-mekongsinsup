import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, MessageSquare, ShieldCheck, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw, Copy, Send, HelpCircle, 
  Coins, Sparkles, Check, Bookmark, Calendar, UserCheck
} from 'lucide-react';
import { SalesRecord } from '../services/dashboardService';

interface LineFinanceReconcilerProps {
  sheetSales: SalesRecord[];
  localAppSales: SalesRecord[];
  onSyncDate: (groupKey: string, tf: 'daily' | 'monthly' | 'yearly') => void;
  userName: string;
}

export default function LineFinanceReconciler({ 
  sheetSales, 
  localAppSales, 
  onSyncDate, 
  userName 
}: LineFinanceReconcilerProps) {
  
  // Local reporting & UI state
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly' | 'yearly'>('daily');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [showCopyFeedback, setShowCopyFeedback] = useState<boolean>(false);
  const [showNotifyFeedback, setShowNotifyFeedback] = useState<boolean>(false);
  const [customMemo, setCustomMemo] = useState<string>('ยอดบิลสมบูรณ์เรียบร้อย ปิดยอดผ่านระบบออโต้');

  // Convert or group date formats
  const getGroupKey = (dateStr: string, tf: 'daily' | 'monthly' | 'yearly'): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [d, m, y] = parts;
      if (tf === 'daily') return dateStr;
      if (tf === 'monthly') return `${m}/${y}`;
      if (tf === 'yearly') return y;
    }
    const dashParts = dateStr.split('-');
    if (dashParts.length === 3) {
      const [y, m, d] = dashParts;
      if (y.length === 4) {
        if (tf === 'daily') return `${d}/${m}/${y}`;
        if (tf === 'monthly') return `${m}/${y}`;
        if (tf === 'yearly') return y;
      }
    }
    return dateStr;
  };

  const formatGroupKey = (key: string, tf: 'daily' | 'monthly' | 'yearly'): string => {
    if (!key) return '';
    if (tf === 'daily') return key;
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    if (tf === 'monthly') {
      const parts = key.split('/');
      if (parts.length === 2) {
        const mIdx = parseInt(parts[0], 10) - 1;
        const yr = parseInt(parts[1], 15);
        const beYr = yr > 2500 ? yr : yr + 543;
        return `${thaiMonths[mIdx] || parts[0]} ${beYr}`;
      }
    }
    if (tf === 'yearly') {
      const yr = parseInt(key, 10);
      const beYr = yr > 2500 ? yr : yr + 543;
      return `ปี พ.ศ. ${beYr}`;
    }
    return key;
  };

  // Find all unique keys across both sheet and app sales, sorted descending
  const allGroupKeys = Array.from(
    new Set([
      ...sheetSales.map(s => getGroupKey(s.date, timeframe)),
      ...localAppSales.map(s => getGroupKey(s.date, timeframe))
    ].filter(Boolean))
  ).sort((a, b) => {
    if (timeframe === 'daily') {
      const parseDate = (dStr: string) => {
        const parts = dStr.split('/');
        if (parts.length === 3) {
          return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
        }
        return 0;
      };
      return parseDate(b) - parseDate(a);
    } else if (timeframe === 'monthly') {
      const parseMonth = (mStr: string) => {
        const parts = mStr.split('/');
        if (parts.length === 2) {
          return Number(parts[1]) * 12 + Number(parts[0]);
        }
        return 0;
      };
      return parseMonth(b) - parseMonth(a);
    } else {
      return Number(b) - Number(a);
    }
  });

  // Default selected group to the most recent one on mount, or when mode/keys reload
  useEffect(() => {
    if (allGroupKeys.length > 0) {
      if (!selectedGroup || !allGroupKeys.includes(selectedGroup)) {
        setSelectedGroup(allGroupKeys[0]);
      }
    } else {
      setSelectedGroup('');
    }
  }, [timeframe, allGroupKeys.length, selectedGroup]);

  // Aggregate metrics per group
  const getAggregatedData = (groupKey: string) => {
    const sheetOnGroup = sheetSales.filter(s => getGroupKey(s.date, timeframe) === groupKey);
    const appOnGroup = localAppSales.filter(s => getGroupKey(s.date, timeframe) === groupKey);

    const sheetSum = sheetOnGroup.reduce((sum, s) => sum + s.totalAmount, 0);
    const appSum = appOnGroup.reduce((sum, s) => sum + s.totalAmount, 0);
    const variance = appSum - sheetSum;

    // Product item breakdowns for both streams
    const productBreakdown: { [name: string]: { qty: number; amt: number } } = {};
    
    // We can merge product counts for the LINE report
    (appOnGroup.length > 0 ? appOnGroup : sheetOnGroup).forEach(s => {
      if (!productBreakdown[s.productName]) {
        productBreakdown[s.productName] = { qty: 0, amt: 0 };
      }
      productBreakdown[s.productName].qty += s.quantity;
      productBreakdown[s.productName].amt += s.totalAmount;
    });

    return {
      sheetCount: sheetOnGroup.length,
      appCount: appOnGroup.length,
      sheetSum,
      appSum,
      variance,
      breakdown: productBreakdown,
      representativeSeller: (appOnGroup[0]?.salesperson || sheetOnGroup[0]?.salesperson || userName)
    };
  };

  const activeMetrics = selectedGroup ? getAggregatedData(selectedGroup) : null;

  // Formats a beautiful formatted text summary for copying into real LINE groups
  const generateLineTextReport = () => {
    if (!selectedGroup || !activeMetrics) return '';

    const borderLine = "----------------------------------";
    const statusSymbol = activeMetrics.variance === 0 
      ? "✅ สรุปยอดเงินตรงกันสมบูรณ์" 
      : activeMetrics.variance > 0 
        ? `⚠️ ยอดในแอปสูงกว่าชีตกังขา (+${activeMetrics.variance.toLocaleString()} บ.)`
        : `🛑 ยอดส่งจริงในคลังชีตสูงกว่า (-\t${Math.abs(activeMetrics.variance).toLocaleString()} บ.)`;

    let productsText = "";
    Object.entries(activeMetrics.breakdown).forEach(([pName, metrics]) => {
      productsText += `📦 ${pName}\n   └─ จำนวน: ${metrics.qty.toLocaleString()} กระสอบ | บิลรวม: ${metrics.amt.toLocaleString()} บาท\n`;
    });

    const periodLabel = timeframe === 'daily' 
      ? `ประจำวันที่: ${selectedGroup}`
      : timeframe === 'monthly'
        ? `ประจำเดือน: ${formatGroupKey(selectedGroup, 'monthly')}`
        : `ประจำปี: ${formatGroupKey(selectedGroup, 'yearly')}`;

    return `🟢 รายงานสรุปบัญชีจำหน่ายผลพลอยได้โรงสี\n📅 ${periodLabel}\n🌾 กลุ่มโรงสีข้าวเทคโนโลยีแม่โขง\n${borderLine}\n📥 ยอดเงินบันทึกฝากในแอป: ${activeMetrics.appSum.toLocaleString()} บาท\n📊 ยอดรายงานจริงสเปรดชีต: ${activeMetrics.sheetSum.toLocaleString()} บาท\n⚖️ ผลต่างสะสมคงบัญชี: ${activeMetrics.variance.toLocaleString()} บาท\n📌 สรุปบิลยอดดุล: ${statusSymbol}\n${borderLine}\n📝 รายละเอียดสินค้าที่จำหน่าย:\n${productsText}${borderLine}\n✍️ หมายเหตุผู้รายงาน: ${customMemo}\n👤 เจ้าหน้าที่ตรวจสอบ: ${userName}\n🕒 อัปเดตเมื่อ: ${new Date().toLocaleTimeString('th-TH')} น.`;
  };

  const handleCopyToClipboard = () => {
    const text = generateLineTextReport();
    if (!text) return;
    
    navigator.clipboard.writeText(text);
    setShowCopyFeedback(true);
    setTimeout(() => {
      setShowCopyFeedback(false);
    }, 2800);
  };

  const handleSimulateLineNotify = () => {
    setShowNotifyFeedback(true);
    setTimeout(() => {
      setShowNotifyFeedback(false);
    }, 3500);
  };

  return (
    <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 sm:p-5 space-y-6">
      {/* Visual Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="text-emerald-300 w-5 h-5 shrink-0" />
            <h3 className="text-base font-black tracking-tight uppercase">ระบบสอบบัญชีรายวัน & แผ่นLINEแชร์สรุปการเงิน</h3>
          </div>
          <p className="text-xs text-emerald-100/90 leading-relaxed max-w-2xl font-medium">
            เปรียบเทียบความแตกต่างระหว่าง <span className="underline font-bold">ยอดป้อนรายการขายผ่านตัวแปลงแอป (App-recorded)</span> กับ <span className="underline font-bold">ยอดรายงานในสเปรดชีตจริง "ขายของ" (Google Sheet)</span> ป้องกันเงินสูญหาย ยอดตกค้าง และความคลาดเคลื่อนได้อย่างแม่นยำ
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-950/30 px-3.5 py-1.5 rounded-lg border border-white/10 shrink-0 self-start md:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
          <span className="text-[10px] font-bold text-emerald-100 uppercase tracking-wider font-mono">
            Sheet ID: ...pGQPtpg | แท็บ: ขายของ
          </span>
        </div>
      </div>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Daily Reconciliation Log Table (12-cols - span 7) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                ตารางสรุปผลส่วนต่างการเงิน{timeframe === 'daily' ? 'รายวัน' : timeframe === 'monthly' ? 'รายเดือน' : 'รายปี'}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">
                รวมกลุ่มข้อมูล{timeframe === 'daily' ? 'รายวัน' : timeframe === 'monthly' ? 'รายเดือน' : 'รายปี'}เพื่อตรวจสอบความสมบูรณ์ร่วมกับ Google Sheets "ขายของ"
              </p>
            </div>
            
            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md shrink-0">
              พบยอดดุลรวม {allGroupKeys.length} {timeframe === 'daily' ? 'วัน' : timeframe === 'monthly' ? 'เดือน' : 'ปี'}
            </div>
          </div>

          {/* Timeframe selector buttons */}
          <div className="flex bg-slate-100 p-1 rounded-lg text-[10px] font-bold border border-slate-200">
            <button 
              type="button"
              onClick={() => setTimeframe('daily')}
              className={`flex-1 py-1.5 rounded-md transition-all text-center ${timeframe === 'daily' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
            >
              รายวัน (Daily)
            </button>
            <button 
              type="button"
              onClick={() => setTimeframe('monthly')}
              className={`flex-1 py-1.5 rounded-md transition-all text-center ${timeframe === 'monthly' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
            >
              รายเดือน (Monthly)
            </button>
            <button 
              type="button"
              onClick={() => setTimeframe('yearly')}
              className={`flex-1 py-1.5 rounded-md transition-all text-center ${timeframe === 'yearly' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
            >
              รายปี (Yearly)
            </button>
          </div>

          {/* Reconciliation Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-2">{timeframe === 'daily' ? 'วันที่ลงระเบียน' : timeframe === 'monthly' ? 'รอบประจำเดือน' : 'รอบประจำปี'}</th>
                  <th className="py-2.5 px-2 text-right">บันทึกผ่านแอป</th>
                  <th className="py-2.5 px-2 text-right">รายงานจริงชีตหลัก</th>
                  <th className="py-2.5 px-2 text-right">รวมส่วนต่าง</th>
                  <th className="py-2.5 px-2 text-center">สถานะ</th>
                  <th className="py-2.5 px-2 text-center">เครื่องมือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {allGroupKeys.map(groupKey => {
                  const m = getAggregatedData(groupKey);
                  const isMatch = m.variance === 0;
                  const isAppGreater = m.variance > 0;
                  const isSheetGreater = m.variance < 0;
                  
                  return (
                    <tr 
                      key={groupKey}
                      onClick={() => setSelectedGroup(groupKey)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        selectedGroup === groupKey ? 'bg-emerald-50/50 border-l-2 border-emerald-500' : ''
                      }`}
                    >
                      <td className="py-3 px-2 font-black text-slate-700 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {formatGroupKey(groupKey, timeframe)}
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 font-mono font-semibold">
                        {m.appSum > 0 ? `${m.appSum.toLocaleString()} บ.` : '-'}
                        <span className="text-[9px] text-slate-400 block font-normal font-sans">({m.appCount} รายการ)</span>
                      </td>
                      <td className="py-3 px-2 text-right text-slate-600 font-mono font-semibold">
                        {m.sheetSum > 0 ? `${m.sheetSum.toLocaleString()} บ.` : '-'}
                        <span className="text-[9px] text-slate-400 block font-normal font-sans">({m.sheetCount} รายการ)</span>
                      </td>
                      <td className={`py-3 px-2 text-right font-mono font-black ${
                        isMatch ? 'text-emerald-600' : isAppGreater ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {m.variance > 0 ? `+${m.variance.toLocaleString()}` : m.variance === 0 ? '0' : m.variance.toLocaleString()} บ.
                      </td>
                      <td className="py-3 px-2 text-center">
                        {isMatch ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                            <CheckCircle size={9} /> ตรงกันดี
                          </span>
                        ) : m.sheetSum === 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                            <AlertTriangle size={9} /> ค้างสตรีมยอด
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full font-extrabold uppercase">
                            <XCircle size={9} /> มีคลาดเคลื่อน
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                        {isMatch ? (
                          <button 
                            disabled
                            className="bg-slate-100 text-slate-400 p-1 rounded text-[10px] cursor-not-allowed font-bold"
                          >
                            สุทธิแล้ว
                          </button>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => onSyncDate(groupKey, timeframe)}
                            title={`ซิงค์ปรับยอดของ ${formatGroupKey(groupKey, timeframe)} ในแอปให้ตรงกับ Google Sheet สเปรดชีตโดยอัตโนมัติ`}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 px-2 py-1 rounded text-[10px] font-extrabold shadow-xs transition-all cursor-pointer flex items-center gap-0.5 mx-auto"
                          >
                            <RefreshCw size={10} className="animate-spin-hover" /> ปรับงบให้ตรง
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-1.5 text-slate-500 text-[11px] leading-relaxed">
            <div className="flex gap-1.5 items-start">
              <Sparkles size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-slate-700">คู่มือตรวจสอบผลต่าง (Discrepancy Resolution):</span>
                <p className="mt-0.5 font-medium">
                  - <strong>กรณีเครื่องมือปรับงบให้ตรง (Force Match):</strong> หากเจ้าหน้าที่พบว่าสเปรดชีต Google Sheet คือข้อมูลรายงานการเงินจริงที่ถูกต้อง ให้คลิก <span className="font-bold text-emerald-600">"ปรับงบให้ตรง"</span> ระบบจะจูนค่าปรับสมุดฝากรับขายของแอปให้บันทึกตรงกันในรอบเวลาดังกล่าวโดยทันที แก้ระบบคลาดเคลื่อน
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: LINE Message Simulator Board (12-cols - span 5) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          
          {/* Main Visual LINE Screen Container */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col">
            
            {/* Top LINE Chat Header Banner */}
            <div className="bg-[#06C755] text-slate-950 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center font-black text-[#06C755] text-xs">
                  L
                </div>
                <div>
                  <h4 className="text-xs font-black tracking-tight uppercase leading-none">แผงข้อความแชร์สรุป LINE</h4>
                  <span className="text-[9px] font-bold text-slate-900/80 leading-none">LINE Group Financial Auto-Report</span>
                </div>
              </div>
              <div className="text-[9px] bg-slate-950/15 font-black px-2 py-0.5 rounded-full text-slate-900">
                100% COMPLIANT
              </div>
            </div>

            {/* Simulated Live Chat Container */}
            <div className="bg-[#85a3c9] p-4 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
              
              {/* Decorative cloud shapes of LINE chat app UI background */}
              <div className="absolute top-8 left-12 w-16 h-8 bg-[#9bbad5]/30 rounded-full blur-md"></div>
              <div className="absolute bottom-16 right-8 w-24 h-12 bg-[#9bbad5]/40 rounded-full blur-lg"></div>

              {/* Chat Message Bubble Container */}
              <div className="z-10 w-full space-y-3.5 flex-1">
                
                {/* System System Banner Date indicator */}
                <div className="mx-auto w-fit bg-black/15 text-white text-[9px] font-bold px-3 py-1 rounded-full text-center">
                  -- วันพุธ, 22 มิถุนายน 2569 --
                </div>

                {/* LINE Chat Member Avatar & name */}
                <div className="flex items-start gap-2">
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-white font-extrabold flex items-center justify-center text-[10px] shrink-0 border border-white/20 shadow-xs relative">
                    🍁
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white"></div>
                  </div>
                  
                  <div className="space-y-1 max-w-[85%] text-left">
                    <span className="text-[10px] font-black text-slate-100 block ml-0.5">Mekong Mill BOT (ฝ่ายบัญชีโรงสี)</span>
                    
                    {/* Tail Chat Bubble */}
                    <div className="bg-[#e2f0d9] text-slate-900 p-3 rounded-2xl rounded-tl-sm text-xs font-medium relative shadow-sm border border-emerald-250 leading-relaxed font-mono whitespace-pre-wrap">
                      {generateLineTextReport()}
                    </div>
                  </div>
                </div>

              </div>

              {/* Input details inside chat simulator overlay */}
              <div className="mt-4 pt-3.5 border-t border-white/10 z-10 space-y-1">
                <label className="text-[10px] font-extrabold text-white uppercase tracking-wider block text-left ml-1">
                  แก้ไขข้อความหมายเหตุประกอบรายงาน LINE:
                </label>
                <div className="flex gap-1.5">
                  <input 
                    type="text"
                    value={customMemo}
                    onChange={(e) => setCustomMemo(e.target.value)}
                    placeholder="ใส่ข้อความเพิ่มเติม เช่น ยอดโอนตรงกับบิลทั้งหมด..."
                    className="flex-1 bg-white/90 focus:bg-white text-slate-900 rounded-lg py-1 px-2.5 text-xs outline-none border border-black/10 focus:ring-1 focus:ring-emerald-500 transition-all font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions footer buttons */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleCopyToClipboard}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
              >
                <Copy size={13} />
                คัดลอกข้อความสรุป เพื่อส่ง LINE
              </button>

              <button
                type="button"
                onClick={handleSimulateLineNotify}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={12} />
                จำลองยิง LINE Notify
              </button>
            </div>
          </div>

          {/* Toast / Popups feedbacks */}
          {showCopyFeedback && (
            <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-emerald-550 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <CheckCircle size={15} className="shrink-0 text-emerald-400" />
              <div className="text-left">
                <span className="text-[11px] font-black uppercase block text-white">คัดลอกข้อความสรุปสำเร็จ!</span>
                <span className="text-[9.5px] text-slate-350 block">สามารถกด วาง (Ctrl+V หรือ Paste) ลงทางช่องแชทกลุ่มไลน์ ได้เลยทันที</span>
              </div>
            </div>
          )}

          {showNotifyFeedback && (
            <div className="bg-emerald-950 text-emerald-100 p-3 rounded-xl border border-emerald-500/30 flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-md">
              <div className="bg-emerald-500 text-slate-950 p-1.5 rounded-lg shrink-0">
                <Send size={14} />
              </div>
              <div className="text-left">
                <span className="text-[11px] font-black tracking-tight block text-white">🟢 ส่งสัญญาณ LINE NOTIFY สำเร็จ! (Simulated)</span>
                <p className="text-[9px] text-emerald-300 font-medium">ระบบยิงสรุปยอดเงิน ${activeMetrics?.appSum.toLocaleString()} บาท ไปยังกรุ๊ป ฝ่ายขายและการเงินโรงสี เรียบร้อยแล้ว</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
