import React, { useState } from 'react';
import { 
  Sparkles, Camera, Upload, CheckCircle, Package, ShoppingCart, Truck, Zap, Plus, ArrowRight
} from 'lucide-react';

interface QuickAiScannerViewProps {
  onAddBranStock: (item: any) => void;
  onAddSaleService: (item: any) => void;
}

export default function QuickAiScannerView({ onAddBranStock, onAddSaleService }: QuickAiScannerViewProps) {
  const [activeQuickTab, setActiveQuickTab] = useState<'bran_entry' | 'sale_entry'>('bran_entry');

  // Quick Bran Form State
  const [itemName, setItemName] = useState('รำบดละเอียด เกรด A');
  const [quantity, setQuantity] = useState('100');
  const [inspector, setInspector] = useState('สมชาย คุ้มวงศ์');
  const [successNotice, setSuccessNotice] = useState('');

  // Quick Sale Form State
  const [customerName, setCustomerName] = useState('');
  const [itemOrService, setItemOrService] = useState('รำข้าวบดละเอียด');
  const [sacks, setSacks] = useState('10');
  const [pricePerUnit, setPricePerUnit] = useState('350');
  const [paymentMethod, setPaymentMethod] = useState('โอนเงิน');

  const handleSaveBran = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) return;

    onAddBranStock({
      id: `bran-quick-${Date.now()}`,
      date: new Date().toLocaleDateString('th-TH'),
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      itemName,
      quantity: parseFloat(quantity),
      inspector,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60'
    });

    setSuccessNotice(`บันทึกการรับรำ ${itemName} จำนวน ${quantity} กระสอบ เข้าสต๊อคเรียบร้อยแล้ว!`);
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !sacks) return;

    const qty = parseFloat(sacks) || 1;
    const price = parseFloat(pricePerUnit) || 0;
    const total = qty * price;

    onAddSaleService({
      id: `sale-quick-${Date.now()}`,
      date: new Date().toLocaleDateString('th-TH'),
      customerName,
      itemOrService,
      sacks: qty,
      pricePerUnit: price,
      otherFees: 0,
      totalProductPrice: total,
      moneyReceived: total,
      change: 0,
      paymentMethod,
      slipUrl: '',
      seller: 'ผู้จัดการหน้าร้าน',
      deliveryLocation: 'รับที่โรงสี',
      pointsUsed: 0,
      discountAmount: 0,
      finalPriceToPay: total
    });

    setSuccessNotice(`บันทึกรายการขายให้คุณ ${customerName} ยอดเงิน ฿${total.toLocaleString()} เรียบร้อยแล้ว!`);
    setCustomerName('');
    setTimeout(() => setSuccessNotice(''), 4000);
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
          <Sparkles className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-slate-900">บันทึกข้อมูลด่วน (Quick Entry)</h2>
          <p className="text-xs text-slate-500">บันทึกรายการสต๊อครำ และรายการขายหน้าร้านส่งตรงไปยังระบบคลังข้อมูลโรงสี</p>
        </div>
      </div>

      {successNotice && (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" /> {successNotice}
        </div>
      )}

      {/* Switcher */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
        <button
          onClick={() => setActiveQuickTab('bran_entry')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
            activeQuickTab === 'bran_entry' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" /> 1. บันทึกรับรำเข้าคลังสินค้า
        </button>

        <button
          onClick={() => setActiveQuickTab('sale_entry')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-2 ${
            activeQuickTab === 'sale_entry' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShoppingCart className="w-4 h-4" /> 2. บันทึกรายการขาย / ค่าบริการ
        </button>
      </div>

      {/* Quick Bran Form */}
      {activeQuickTab === 'bran_entry' && (
        <form onSubmit={handleSaveBran} className="space-y-4 bg-slate-50/70 p-5 rounded-xl border border-slate-200 text-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" /> บันทึกการรับรำเข้าคลังสินค้า
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-slate-600 block mb-1 font-medium">ชนิดรำ / รายการของ:</label>
              <select
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="รำบดละเอียด เกรด A">รำบดละเอียด เกรด A</option>
                <option value="รำผสมอาหารสัตว์">รำผสมอาหารสัตว์</option>
                <option value="รำสกัดน้ำมัน (Defatted Bran)">รำสกัดน้ำมัน (Defatted Bran)</option>
                <option value="รำหยาบ (แกลบปนรำ)">รำหยาบ (แกลบปนรำ)</option>
              </select>
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">จำนวนรับเข้า (กระสอบ):</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">เจ้าหน้าที่ผู้ตรวจรับ:</label>
              <input
                type="text"
                value={inspector}
                onChange={(e) => setInspector(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" /> บันทึกรับรำเข้าสต๊อคทันที
          </button>
        </form>
      )}

      {/* Quick Sale Form */}
      {activeQuickTab === 'sale_entry' && (
        <form onSubmit={handleSaveSale} className="space-y-4 bg-slate-50/70 p-5 rounded-xl border border-slate-200 text-xs">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" /> บันทึกการขายสินค้าและค่าบริการหน้าร้าน
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-600 block mb-1 font-medium">ชื่อลูกค้า:</label>
              <input
                type="text"
                placeholder="ระบุชื่อลูกค้า..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">สินค้า / บริการ:</label>
              <input
                type="text"
                placeholder="เช่น รำละเอียด, ปลายข้าว, บริการสีข้าว"
                value={itemOrService}
                onChange={(e) => setItemOrService(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">จำนวน (กระสอบ):</label>
              <input
                type="number"
                value={sacks}
                onChange={(e) => setSacks(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">ราคาต่อหน่วย (บาท/กระสอบ):</label>
              <input
                type="number"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-slate-600 block mb-1 font-medium">วิธีการชำระเงิน:</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-lg p-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="โอนเงิน">โอนเงิน</option>
                <option value="เงินสด">เงินสด</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
              <span className="text-slate-600 font-medium">ราคารวมสุทธิ:</span>
              <span className="text-base font-bold text-emerald-700">
                ฿{((parseFloat(sacks) || 0) * (parseFloat(pricePerUnit) || 0)).toLocaleString()}
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-sm"
          >
            <Plus className="w-4 h-4" /> บันทึกการขายสินค้าทันที
          </button>
        </form>
      )}
    </div>
  );
}
