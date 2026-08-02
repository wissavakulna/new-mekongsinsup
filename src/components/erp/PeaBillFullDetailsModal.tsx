import React from 'react';
import { ElectricityExpenseRecord } from '../../services/dashboardService';
import { Zap, X, FileText, CheckCircle, Calendar, DollarSign, Building, Printer, Info, CreditCard } from 'lucide-react';

interface PeaBillFullDetailsModalProps {
  record: ElectricityExpenseRecord | null;
  onClose: () => void;
}

export const PeaBillFullDetailsModal: React.FC<PeaBillFullDetailsModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  const full = record.fullBillDetails || {
    documentTitle: 'ใบแจ้งค่าไฟฟ้า Smart Invoice (รายละเอียดจำลอง)',
    peaOfficeName: 'การไฟฟ้าส่วนภูมิภาคจังหวัดนครพนม',
    peaOfficePhone: '0-4251-3091',
    customerName: record.customerName || 'ผู้ใช้ไฟฟ้าโรงสีข้าว',
    address: 'สถานที่ใช้ไฟฟ้า จังหวัดนครพนม',
    caNumber: record.caNumber || '020001849201',
    invoiceNo: record.invoiceNo || '000012533268',
    totalAmountDue: record.totalAmountBaht,
    dueDate: record.dueDate || '23 กุมภาพันธ์ 2569',
    documentDate: '03/02/2569',
    printedDate: '31-07-2569',
    peaCode: 'D06101',
    mru: 'DNPN9021',
    peaNo: record.meterNumber || '6300584313',
    rateType: '3224',
    meterReadingDate: '29/01/2569',
    billPeriod: record.billingPeriod,
    voltageLevel: '22-33 KV',
    multiplier: 30,
    usageReadings: [
      { typeLabel: 'พลังไฟฟ้าสูงสุด P (กิโลวัตต์)', code: 'P', recentReading: 20.618, previousReading: 19.060, multiplierNote: '+2%', consumptionUnit: record.peakDemandKw || 47.67 },
      { typeLabel: 'พลังงานไฟฟ้า P (หน่วย)', code: 'P', recentReading: 1959.350, previousReading: 1917.910, multiplierNote: '+2%', consumptionUnit: record.peakUnitsKwh || 1268.06 },
      { typeLabel: 'พลังงานไฟฟ้า OP (หน่วย)', code: 'OP', recentReading: 1355.100, previousReading: 1348.000, multiplierNote: '+2%', consumptionUnit: record.offPeakUnitsKwh || 217.26 },
      { typeLabel: 'รวมพลังงานไฟฟ้า (หน่วย)', code: 'รวม', recentReading: 0, previousReading: 0, multiplierNote: '-', consumptionUnit: record.totalUnitsKwh || 2067.03 }
    ],
    tariffBreakdown: [
      { itemLabel: `Peak ${record.peakDemandKw || 47.67} กว.`, quantity: record.peakDemandKw || 47.67, unitLabel: 'กว.', ratePerUnit: 132.9300, amountBaht: record.peakAmountBaht || 5109.83 },
      { itemLabel: `Peak ${record.peakUnitsKwh || 1268.06} หน่วย`, quantity: record.peakUnitsKwh || 1268.06, unitLabel: 'หน่วย', ratePerUnit: 4.1839, amountBaht: record.peakAmountBaht || 5305.44 },
      { itemLabel: `Off Peak ${record.offPeakUnitsKwh || 798.97} หน่วย`, quantity: record.offPeakUnitsKwh || 798.97, unitLabel: 'หน่วย', ratePerUnit: 2.6037, amountBaht: record.offPeakAmountBaht || 2080.28 },
      { itemLabel: 'ค่าบริการรายเดือน (Service Charge)', quantity: 1, unitLabel: 'เดือน', ratePerUnit: 312.2400, amountBaht: 312.24 }
    ],
    serviceCharge: 312.24,
    totalBasedAmount: record.totalAmountBaht * 0.92,
    basedAmount: record.totalAmountBaht * 0.92,
    ftFormulaNote: 'ค่า Ft ประจำงวด',
    ftRatePerUnit: record.ftRatePerUnit || 0.0972,
    ftTotalAmount: record.ftTotalBaht || 200.92,
    subTotalAmount: record.totalAmountBaht * 0.935,
    vatRatePercent: 7.00,
    vatAmount: record.vatAmountBaht || (record.totalAmountBaht * 0.065),
    currentMonthTotal: record.totalAmountBaht,
    grandTotal: record.totalAmountBaht
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white border border-purple-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto flex flex-col my-auto text-slate-800">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white p-4 sm:p-5 flex items-center justify-between sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-400 text-purple-950 rounded-xl font-bold shadow-xs">
              <Zap className="w-6 h-6 fill-amber-400 stroke-purple-950" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-400/20 border border-amber-300/40 text-amber-300 rounded text-[11px] font-bold">
                  PEA Smart Invoice
                </span>
                <span className="text-xs text-purple-200 font-mono">
                  {full.invoiceNo ? `เลขที่ ${full.invoiceNo}` : ''}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                รายละเอียดบิลค่าไฟฟ้า PEA ฉบับเต็ม
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
              title="พิมพ์บิลค่าไฟฟ้า"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">พิมพ์ / PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          
          {/* Section 1: Customer Header & Due Date Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <Building className="w-4 h-4 text-purple-600" />
                <span>{full.peaOfficeName || 'การไฟฟ้าส่วนภูมิภาค'}</span>
                {full.peaOfficePhone && <span className="text-xs font-normal text-slate-500">(โทร. {full.peaOfficePhone})</span>}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {full.documentTitle || 'ใบแจ้งค่าไฟฟ้า Smart Invoice (ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษี)'}
              </p>
              
              <div className="pt-2 border-t border-slate-200">
                <p className="text-xs text-slate-500">ชื่อผู้ใช้ไฟฟ้า (Name)</p>
                <p className="text-sm font-bold text-slate-900">{full.customerName || record.customerName || '-'}</p>
                
                {full.address && (
                  <p className="text-xs text-slate-600 mt-1">
                    <span className="text-slate-400">สถานที่ใช้ไฟฟ้า:</span> {full.address}
                  </p>
                )}
              </div>
            </div>

            <div className="bg-purple-900 text-white rounded-xl p-4 flex flex-col justify-between shadow-xs">
              <div>
                <p className="text-[11px] text-purple-200 font-medium uppercase tracking-wider">จำนวนเงินรวมทั้งสิ้น (Grand Total)</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono mt-0.5">
                  ฿{(full.grandTotal || record.totalAmountBaht).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div className="pt-3 border-t border-purple-700/60 mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-purple-200">หมายเลขผู้ใช้ (CA):</span>
                  <span className="font-mono font-bold text-white">{full.caNumber || record.caNumber}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-200 font-semibold">วันครบกำหนดชำระ:</span>
                  <span className="font-bold text-amber-300">{full.dueDate || '23 กุมภาพันธ์ 2569'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Technical PEA Metadata Table */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-purple-600" />
              ข้อมูลเทคนิคและรหัสเครื่องวัด PEA Meter Metadata
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">รหัสการไฟฟ้า</p>
                <p className="font-bold font-mono text-slate-800">{full.peaCode || '-'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">สายจดหน่วย (MRU)</p>
                <p className="font-bold font-mono text-slate-800">{full.mru || '-'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">รหัสเครื่องวัด (PEA No.)</p>
                <p className="font-bold font-mono text-slate-800">{full.peaNo || record.meterNumber}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">ประเภท (Type)</p>
                <p className="font-bold font-mono text-purple-700">{full.rateType || '3224'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">วันที่อ่านหน่วย</p>
                <p className="font-bold text-slate-800">{full.meterReadingDate || '-'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">ประจำเดือน</p>
                <p className="font-bold text-purple-900 font-mono">{full.billPeriod || record.billingPeriod}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">แรงดัน (Voltage)</p>
                <p className="font-bold text-slate-800">{full.voltageLevel || '22-33 KV'}</p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                <p className="text-[10px] text-slate-400">ตัวคูณ (Multi)</p>
                <p className="font-bold text-slate-800">{full.multiplier || '30'}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Detailed Meter Reading Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-purple-600" />
                รายละเอียดการใช้ไฟฟ้า (Meter Usage Readings)
              </h3>
              <span className="text-[11px] text-slate-400 italic">* รวมผลตัวคูณหม้อแปลง +2%</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="p-2.5">รายการ / ประเภทการใช้ไฟฟ้า</th>
                    <th className="p-2.5 text-right">เลขอ่านครั้งหลัง (Recent)</th>
                    <th className="p-2.5 text-right">เลขอ่านครั้งก่อน (Previous)</th>
                    <th className="p-2.5 text-center">ตัวคูณ (+%)</th>
                    <th className="p-2.5 text-right font-bold text-purple-900">จำนวนที่ใช้ (Consumption)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {full.usageReadings && full.usageReadings.length > 0 ? (
                    full.usageReadings.map((item, idx) => (
                      <tr key={idx} className={item.code === 'รวม' ? 'bg-purple-50/60 font-bold' : 'hover:bg-slate-50'}>
                        <td className="p-2.5 font-medium text-slate-900">{item.typeLabel}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{item.recentReading > 0 ? item.recentReading.toFixed(3) : '-'}</td>
                        <td className="p-2.5 text-right font-mono text-slate-600">{item.previousReading > 0 ? item.previousReading.toFixed(3) : '-'}</td>
                        <td className="p-2.5 text-center text-slate-400">{item.multiplierNote || '+2%'}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-purple-950">
                          {item.consumptionUnit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">ไม่มีข้อมูลเลขจดหน่วย</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Tariff Breakdown & Financial Calculation Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Tariff Breakdown Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                รายละเอียดคำนวณค่าไฟฟ้าฐาน (Tariff Breakdown)
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[11px]">
                    <tr>
                      <th className="p-2">รายการ (Tariff)</th>
                      <th className="p-2 text-right">ราคา/หน่วย</th>
                      <th className="p-2 text-right">จำนวนเงิน (บาท)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {full.tariffBreakdown && full.tariffBreakdown.length > 0 ? (
                      full.tariffBreakdown.map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="p-2 font-medium text-slate-800">{t.itemLabel}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{t.ratePerUnit.toFixed(4)}</td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            ฿{t.amountBaht.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="p-3 text-center text-slate-400">ไม่มีข้อมูลอัตราค่าไฟ</td>
                      </tr>
                    )}
                    <tr className="bg-slate-100 font-bold border-t border-slate-200">
                      <td className="p-2 text-slate-900">รวมเงินค่าไฟฟ้าฐาน (Total Based)</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right font-mono text-purple-900">
                        ฿{(full.totalBasedAmount || record.totalAmountBaht * 0.92).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {full.installationDateNote && (
                <p className="text-[11px] text-slate-500 italic">* หมายเหตุ: {full.installationDateNote}</p>
              )}
            </div>

            {/* Financial Summary Box */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                สรุปภาษีและการชำระเงิน (Financial & Tax Breakdown)
              </h3>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600">เงินค่าไฟฟ้าฐาน (Based Amount)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ฿{(full.basedAmount || full.totalBasedAmount || (record.totalAmountBaht * 0.92)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <span className="text-slate-600">ค่า Ft</span>
                    {full.ftFormulaNote && <span className="text-[10px] text-slate-400 ml-1.5">({full.ftFormulaNote})</span>}
                  </div>
                  <span className="font-mono font-semibold text-slate-900">
                    ฿{(full.ftTotalAmount || record.ftTotalBaht).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {typeof full.discountAmount === 'number' && full.discountAmount > 0 && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-emerald-600">
                    <span>*ส่วนลด (Discount)</span>
                    <span className="font-mono font-bold">-฿{full.discountAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pb-2 border-b border-slate-200 font-semibold text-slate-900">
                  <span>รวมเงินค่าไฟฟ้า (Sub Total)</span>
                  <span className="font-mono text-purple-900">
                    ฿{(full.subTotalAmount || (record.totalAmountBaht * 0.935)).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-600">ภาษีมูลค่าเพิ่ม 7.00% (VAT)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    ฿{(full.vatAmount || record.vatAmountBaht).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 font-bold text-sm text-purple-950">
                  <span>รวมเงินค่าไฟฟ้าเดือนปัจจุบัน (Total)</span>
                  <span className="font-mono text-base text-rose-600">
                    ฿{(full.currentMonthTotal || record.totalAmountBaht).toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 5: Notice & Barcode Bar */}
          {full.announcementMsg && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">ข้อความแจ้งจาก PEA:</p>
                <p>{full.announcementMsg}</p>
              </div>
            </div>
          )}

          {full.barcodeNumber && (
            <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-center space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">รหัสบาร์โค้ดสแกนชำระเงิน (Barcode / QR Payment Ref)</p>
              <p className="font-mono text-xs font-bold text-slate-800 tracking-widest">{full.barcodeNumber}</p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            ข้อมูลที่แสดงสกัดและถอดรหัสจากไฟล์บิลค่าไฟฟ้าฉบับเต็มเรียบร้อยแล้ว
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
