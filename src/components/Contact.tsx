import React from "react";
import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";

export default function Contact() {
  const { language } = useLanguage();

  const labels = {
    th: {
      tag: "ติดต่อเรา",
      title: "พร้อมให้บริการทุกวัน",
      office: "สำนักงาน",
      address: "149 หมู่ 11 บ.หนองยาว ต.คำเตย\nอ.เมือง จ.นครพนม 48000",
      map: "📌 เปิดแผนที่ Google Maps →",
      phone: "โทรศัพท์",
      callNow: "กดโทรออกได้เลย",
      line: "LINE Official",
      lineName: "@แม่โขงพืชผล",
      addFriend: "กดเพิ่มเพื่อน LINE →",
      group: "กลุ่มองค์กร",
      groupName: "กลุ่มแม่โขงสินทรัพย์ (Mekong Sinsup Group)",
      btnCall: "โทรหาเรา",
      btnLine: "LINE โรงสีข้าว",
      btnMap: "แผนที่ Google Maps",
      btnServices: "ดูบริการทั้งหมด",
      formTitle: "📋 สอบถามข้อมูลบริการ",
      name: "ชื่อ-นามสกุล",
      phoneInput: "เบอร์โทรศัพท์",
      unitSelect: "หน่วยธุรกิจที่สนใจ",
      serviceSelect: "บริการที่สนใจ",
      areaInput: "พื้นที่นา (ไร่) / จังหวัด",
      details: "รายละเอียดเพิ่มเติม",
      submit: "ส่งข้อมูล → ทีมงานจะโทรกลับภายใน 24 ชม.",
      alertFill: "กรุณากรอกชื่อและเบอร์โทรศัพท์",
      alertThanks: "ขอบคุณ คุณ",
      alertCallback: "ทีมงานจะโทรกลับที่",
      alertWithin: "ภายใน 24 ชั่วโมง\n\nหรือโทรหาเราได้เลยที่ 093-597-4437",
      optSelectUnit: "-- เลือกหน่วยธุรกิจ --",
      optSelectSvc: "-- เลือกบริการ --"
    },
    la: {
      tag: "ຕິດຕໍ່ເຮົາ",
      title: "ພ້ອມໃຫ້ບໍລິການທຸກມື້",
      office: "ສຳນັກງານ",
      address: "149 ໝູ່ 11 ບ.ໜອງຍາວ ຕ.ຄຳເຕີຍ\nອ.ເມືອງ ຈ.ນະຄອນພະນົມ 48000",
      map: "📌 ເປີດແຜນທີ່ Google Maps →",
      phone: "ໂທລະສັບ",
      callNow: "ກົດໂທອອກໄດ້ເລີຍ",
      line: "LINE Official",
      lineName: "@แม่โขงพืชผล",
      addFriend: "ກົດເພີ່ມເພື່ອນ LINE →",
      group: "ກຸ່ມອົງກອນ",
      groupName: "ກຸ່ມແມ່ໂຄງສິນຊັບ (Mekong Sinsup Group)",
      btnCall: "ໂທຫາເຮົາ",
      btnLine: "LINE ໂຮງສີເຂົ້າ",
      btnMap: "ແຜນທີ່ Google Maps",
      btnServices: "ເບິ່ງບໍລິການທັງໝົດ",
      formTitle: "📋 ສອບຖາມຂໍ້ມູນບໍລິການ",
      name: "ຊື່-ນາມສະກຸນ",
      phoneInput: "ເບີໂທລະສັບ",
      unitSelect: "ຫົວໜ່ວຍທຸລະກິດທີ່ສົນໃຈ",
      serviceSelect: "ບໍລິການທີ່ສົນໃຈ",
      areaInput: "ເນື້ອທີ່ນາ (ໄຮ່) / ແຂວງ",
      details: "ລາຍລະອຽດເພີ່ມເຕີມ",
      submit: "ສົ່ງຂໍ້ມູນ → ທີມງານຈະໂທກັບພາຍໃນ 24 ຊມ.",
      alertFill: "ກະລຸນາກອກຊື່ ແລະ ເບີໂທລະສັບ",
      alertThanks: "ຂອບໃຈ ທ່ານ",
      alertCallback: "ທີມງານຈະໂທກັບທີ່",
      alertWithin: "ພາຍໃນ 24 ຊົ່ວໂມງ\n\nຫຼືໂທຫາເຮົາໄດ້ເລີຍທີ່ 093-597-4437",
      optSelectUnit: "-- ເລືອກຫົວໜ່ວຍທຸລະກິດ --",
      optSelectSvc: "-- ເລືອກບໍລິການ --"
    },
    vi: {
      tag: "Liên hệ",
      title: "Sẵn sàng phục vụ mỗi ngày",
      office: "Văn phòng chính",
      address: "149 Moo 11, Ban Nong Yao, Kham Toei\nMuang, Nakhon Phanom 48000",
      map: "📌 Mở Bản đồ Google Maps →",
      phone: "Điện thoại",
      callNow: "Gọi ngay",
      line: "LINE Official",
      lineName: "@แม่โขงพืชผล",
      addFriend: "Thêm bạn LINE →",
      group: "Tập đoàn",
      groupName: "Tập đoàn Mekong Sinsup (Mekong Sinsup Group)",
      btnCall: "Gọi cho chúng tôi",
      btnLine: "LINE Nhà máy gạo",
      btnMap: "Bản đồ Google Maps",
      btnServices: "Xem tất cả dịch vụ",
      formTitle: "📋 Đăng ký tư vấn dịch vụ",
      name: "Họ và tên",
      phoneInput: "Số điện thoại",
      unitSelect: "Đơn vị quan tâm",
      serviceSelect: "Dịch vụ quan tâm",
      areaInput: "Diện tích (Mẫu/Hécta) / Tỉnh",
      details: "Yêu cầu chi tiết",
      submit: "Gửi thông tin → Phản hồi trong 24 giờ",
      alertFill: "Vui lòng nhập họ tên và số điện thoại",
      alertThanks: "Cảm ơn Quý khách ",
      alertCallback: "Đội ngũ sẽ liên hệ lại qua số ",
      alertWithin: "trong vòng 24 giờ\n\nHoặc gọi trực tiếp: 093-597-4437",
      optSelectUnit: "-- Chọn đơn vị --",
      optSelectSvc: "-- Chọn dịch vụ --"
    },
    zh: {
      tag: "联系我们",
      title: "全天候为您服务",
      office: "总部办公室",
      address: "149 Moo 11, Ban Nong Yao, Kham Toei\nMuang, Nakhon Phanom 48000",
      map: "📌 打开 Google Maps 地图 →",
      phone: "联系电话",
      callNow: "点击立即拨打",
      line: "LINE 官方账号",
      lineName: "@แม่โขงพืชผล",
      addFriend: "添加 LINE 好友 →",
      group: "集团企业",
      groupName: "湄公资产集团 (Mekong Sinsup Group)",
      btnCall: "电话咨询",
      btnLine: "碾米厂 LINE",
      btnMap: "Google Maps 地图",
      btnServices: "查看所有服务",
      formTitle: "📋 业务咨询与服务预约",
      name: "姓名",
      phoneInput: "联系电话",
      unitSelect: "意向业务部门",
      serviceSelect: "意向服务项目",
      areaInput: "种植面积（莱/公顷）/ 所在省份",
      details: "详细需求说明",
      submit: "提交需求 → 24小时内专人回访",
      alertFill: "请填写姓名和联系电话",
      alertThanks: "感谢您 ",
      alertCallback: "工作人员将在24小时内回拨至 ",
      alertWithin: "\n\n或直接拨打热线: 093-597-4437",
      optSelectUnit: "-- 选择业务部门 --",
      optSelectSvc: "-- 选择服务项目 --"
    },
    en: {
      tag: "Contact Us",
      title: "Ready to Serve Everyday",
      office: "Head Office",
      address: "149 Moo 11, Ban Nong Yao, Kham Toei Sub-district\nMueang, Nakhon Phanom 48000",
      map: "📌 Open Google Maps →",
      phone: "Phone",
      callNow: "Call directly",
      line: "LINE Official",
      lineName: "@แม่โขงพืชผล",
      addFriend: "Add LINE Friend →",
      group: "Corporate Group",
      groupName: "Mekong Sinsup Group",
      btnCall: "Call Us",
      btnLine: "Rice Mill LINE",
      btnMap: "Google Maps",
      btnServices: "View All Services",
      formTitle: "📋 Service Inquiry Form",
      name: "Full Name",
      phoneInput: "Phone Number",
      unitSelect: "Business Unit of Interest",
      serviceSelect: "Service of Interest",
      areaInput: "Farm Area (Rai/Ha) / Province",
      details: "Additional Details",
      submit: "Submit → Our team will call back within 24 hrs",
      alertFill: "Please fill in your name and phone number",
      alertThanks: "Thank you, ",
      alertCallback: "Our team will contact you back at ",
      alertWithin: " within 24 hours.\n\nOr call us directly at 093-597-4437",
      optSelectUnit: "-- Select Business Unit --",
      optSelectSvc: "-- Select Service --"
    }
  };

  const l = labels[language] || labels.th;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name");
    const phone = formData.get("phone");
    
    if (!name || !phone) {
      alert(l.alertFill);
      return;
    }
    
    alert(`✅ ${l.alertThanks}${name}\n${l.alertCallback} ${phone} ${l.alertWithin}`);
  };

  return (
    <section id="contact" className="bg-white py-20 px-8">
      <div className="container mx-auto max-w-[1100px]">
        <FadeIn>
          <div className="text-[12px] font-bold text-g7 uppercase tracking-widest mb-2.5">{l.tag}</div>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-dark mb-3">{l.title}</h2>
          <div className="dv"></div>
        </FadeIn>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14">
          <FadeIn>
            <div className="flex gap-3.5 mb-6 items-start">
              <div className="w-11 h-11 rounded-[11px] bg-g1 flex items-center justify-center text-[20px] shrink-0">📍</div>
              <div>
                <h4 className="text-[11px] font-bold text-light uppercase tracking-wider mb-1">{l.office}</h4>
                <p className="text-[14px] text-dark leading-relaxed whitespace-pre-line">{l.address}</p>
                <a href="https://maps.app.goo.gl/U37Y6UtBaywbM6dbA" target="_blank" className="text-[12px] text-blue no-underline font-semibold mt-1 inline-block hover:underline">{l.map}</a>
              </div>
            </div>
            <div className="flex gap-3.5 mb-6 items-start">
              <div className="w-11 h-11 rounded-[11px] bg-g1 flex items-center justify-center text-[20px] shrink-0">📞</div>
              <div>
                <h4 className="text-[11px] font-bold text-light uppercase tracking-wider mb-1">{l.phone}</h4>
                <p className="text-[14px] text-dark leading-relaxed">
                  <a href="tel:0935974437" className="text-g7 no-underline font-semibold hover:underline">093-597-4437</a><br />
                  <a href="tel:0935974437" className="text-g7 no-underline font-semibold hover:underline">{l.callNow}</a>
                </p>
              </div>
            </div>
            <div className="flex gap-3.5 mb-6 items-start">
              <div className="w-11 h-11 rounded-[11px] bg-g1 flex items-center justify-center text-[20px] shrink-0">💬</div>
              <div>
                <h4 className="text-[11px] font-bold text-light uppercase tracking-wider mb-1">{l.line}</h4>
                <p className="text-[14px] text-dark leading-relaxed">
                  <a href="https://line.me/ti/p/~@mekongpuechphol" target="_blank" className="text-g7 no-underline font-semibold hover:underline">{l.lineName}</a><br />
                  <a href="https://lin.ee/mekongpuechphol" target="_blank" className="text-g7 no-underline font-semibold hover:underline">{l.addFriend}</a>
                </p>
              </div>
            </div>
            <div className="flex gap-3.5 mb-6 items-start">
              <div className="w-11 h-11 rounded-[11px] bg-g1 flex items-center justify-center text-[20px] shrink-0">🌱</div>
              <div>
                <h4 className="text-[11px] font-bold text-light uppercase tracking-wider mb-1">{l.group}</h4>
                <p className="text-[14px] text-dark leading-relaxed">{l.groupName}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-7">
              <a href="tel:0935974437" className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-border no-underline text-dark text-[13.5px] font-semibold transition-all duration-200 hover:border-g5 hover:bg-g1 hover:text-g7">
                <span className="text-[20px]">📞</span>{l.btnCall}
              </a>
              <a href="https://line.me/ti/p/~@mekongpuechphol" target="_blank" className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-border no-underline text-dark text-[13.5px] font-semibold transition-all duration-200 hover:border-g5 hover:bg-g1 hover:text-g7">
                <span className="text-[20px]">💬</span>{l.btnLine}
              </a>
              <a href="https://maps.app.goo.gl/U37Y6UtBaywbM6dbA" target="_blank" className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-border no-underline text-dark text-[13.5px] font-semibold transition-all duration-200 hover:border-g5 hover:bg-g1 hover:text-g7">
                <span className="text-[20px]">📍</span>{l.btnMap}
              </a>
              <a href="#units" className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-[1.5px] border-border no-underline text-dark text-[13.5px] font-semibold transition-all duration-200 hover:border-g5 hover:bg-g1 hover:text-g7">
                <span className="text-[20px]">🌾</span>{l.btnServices}
              </a>
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div className="bg-bg rounded-2xl p-8">
              <h3 className="text-[1rem] font-bold mb-5">{l.formTitle}</h3>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-mid">{l.name}</label>
                    <input name="name" type="text" placeholder={l.name} className="w-full px-3.5 py-[11px] border-[1.5px] border-border rounded-lg text-[14px] text-dark bg-white outline-none transition-colors duration-200 focus:border-g5" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-mid">{l.phoneInput}</label>
                    <input name="phone" type="tel" placeholder="08X-XXX-XXXX" className="w-full px-3.5 py-[11px] border-[1.5px] border-border rounded-lg text-[14px] text-dark bg-white outline-none transition-colors duration-200 focus:border-g5" />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[13px] font-semibold text-mid">{l.unitSelect}</label>
                  <select className="w-full px-3.5 py-[11px] border-[1.5px] border-border rounded-lg text-[14px] text-dark bg-white outline-none transition-colors duration-200 focus:border-g5">
                    <option value="">{l.optSelectUnit}</option>
                    <option>🌱 ศูนย์เพาะกล้ารถดำนา นครพนม</option>
                    <option>📱 Mekong Precision Agritech (IoT/แอป)</option>
                    <option>🏭 โรงสีข้าวแม่โขงพืชผล</option>
                    <option>🏗️ แม่โขงสินทรัพย์ก่อสร้าง</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[13px] font-semibold text-mid">{l.serviceSelect}</label>
                  <select className="w-full px-3.5 py-[11px] border-[1.5px] border-border rounded-lg text-[14px] text-dark bg-white outline-none transition-colors duration-200 focus:border-g5">
                    <option value="">{l.optSelectSvc}</option>
                    <option>เพาะกล้า + ดำนา</option>
                    <option>Laser Leveling ปรับระดับนา</option>
                    <option>วิเคราะห์ดิน + ปุ๋ยสูตรเฉพาะ</option>
                    <option>Traceability Rice</option>
                    <option>สีข้าว + Optical Sorting</option>
                    <option>DinNamNa Platform / IoT</option>
                    <option>งานก่อสร้างโรงเรือน/โกดัง</option>
                    <option>ECO Label Consulting</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[13px] font-semibold text-mid">{l.areaInput}</label>
                  <input type="text" placeholder={l.areaInput} className="w-full px-3.5 py-[11px] border-[1.5px] border-border rounded-lg text-[14px] text-dark bg-white outline-none transition-colors duration-200 focus:border-g5" />
                </div>
                <div className="flex flex-col gap-1.5 mb-4">
                  <label className="text-[13px] font-semibold text-mid">{l.details}</label>
                  <textarea placeholder={l.details} className="w-full px-3.5 py-[11px] border-[1.5px] border-border rounded-lg text-[14px] text-dark bg-white outline-none transition-colors duration-200 focus:border-g5 min-h-[90px] resize-y"></textarea>
                </div>
                <button type="submit" className="bg-g9 text-white px-7 py-[13px] rounded-[10px] text-[14px] font-bold border-none cursor-pointer w-full flex items-center justify-center gap-2 transition-colors duration-200 hover:bg-g7">
                  {l.submit}
                </button>
              </form>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { language } = useLanguage();
  const footerNav = {
    th: { 
      about: "เกี่ยวกับเรา", 
      units: "หน่วยธุรกิจ", 
      services: "บริการ", 
      env: "สิ่งแวดล้อม",
      group: "กลุ่มแม่โขงสินทรัพย์ (Mekong Sinsup Group)",
      location: "Mekong Sinsup · อ.เมือง จ.นครพนม"
    },
    la: { 
      about: "ກ່ຽວກັບເຮົາ", 
      units: "ຫົວໜ່ວຍທຸລະກິດ", 
      services: "ບໍລິການ", 
      env: "ສິ່ງແວດລ້ອມ",
      group: "ກຸ່ມແມ່ໂຄງສິນຊັບ (Mekong Sinsup Group)",
      location: "Mekong Sinsup · ເມືອງ, ແຂວງນະຄອນພະນົມ"
    },
    vi: { 
      about: "Về chúng tôi", 
      units: "Đơn vị kinh doanh", 
      services: "Dịch vụ", 
      env: "Môi trường",
      group: "Tập đoàn Mekong Sinsup (Mekong Sinsup Group)",
      location: "Mekong Sinsup · Muang, Nakhon Phanom"
    },
    zh: { 
      about: "关于我们", 
      units: "业务部门", 
      services: "服务项目", 
      env: "环境保护",
      group: "湄公资产集团 (Mekong Sinsup Group)",
      location: "Mekong Sinsup · 那空拍侬府 纳空拍侬"
    },
    en: { 
      about: "About Us", 
      units: "Business Units", 
      services: "Services", 
      env: "Environment",
      group: "Mekong Sinsup Group",
      location: "Mekong Sinsup · Mueang, Nakhon Phanom"
    },
  };

  const nav = footerNav[language] || footerNav.th;

  return (
    <footer className="bg-[#0A140A] py-14 px-8 text-white/45 text-center text-[13px]">
      <p><strong className="text-white">{nav.group}</strong></p>
      <p>{nav.location}</p>
      <div className="flex justify-center gap-8 my-6 flex-wrap">
        <a href="#about" className="text-white/50 no-underline text-[13px] transition-colors duration-200 hover:text-white">{nav.about}</a>
        <a href="#units" className="text-white/50 no-underline text-[13px] transition-colors duration-200 hover:text-white">{nav.units}</a>
        <a href="#services" className="text-white/50 no-underline text-[13px] transition-colors duration-200 hover:text-white">{nav.services}</a>
        <a href="#env" className="text-white/50 no-underline text-[13px] transition-colors duration-200 hover:text-white">{nav.env}</a>
      </div>
      <p className="text-[11px] opacity-35 mt-2">Company Profile 2025 · Precision Agriculture · Traceability Rice</p>
    </footer>
  );
}
