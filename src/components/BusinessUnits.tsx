import { useState } from "react";
import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";
import { businessUnitsByLang } from "../data/translationsData";

const imagesMap: Record<number, string[]> = {
  1: [
    "https://drive.google.com/thumbnail?id=1HHeEgo4fJ7IPAnAsWtVpjwVBgMkRAiAA&sz=w800",
    "https://drive.google.com/thumbnail?id=1rg8htzTEquYaKJIFD60NEs1U8oq8mkH5&sz=w800",
    "https://drive.google.com/thumbnail?id=1IQKgdu1kjwHAmXF5RLmirjX3rfTw7ep6&sz=w800",
    "https://drive.google.com/thumbnail?id=1vW2V8T8-24GkvvyE0jbGGtLmHlQifioH&sz=w800",
    "https://drive.google.com/thumbnail?id=1dX42emvwwJd0QPKfbOZXQ38wm-9TZeGh&sz=w800",
  ],
  2: [
    "https://drive.google.com/thumbnail?id=1r8_329nkr3fMq4pM0BoS85z3lEd8W8hO&sz=w800",
    "https://drive.google.com/thumbnail?id=1qYg83klggG1AjwfMsmylh0Edo5wjqKxi&sz=w800",
    "https://drive.google.com/thumbnail?id=1rtTZMPKuGxKBN_Fqn3McFXhuO4kcbQ-v&sz=w800",
    "https://drive.google.com/thumbnail?id=1thxNWWJTk7_CVumrZT6OcpkOiIrDds93&sz=w800",
    "https://drive.google.com/thumbnail?id=1UDJIeBMguRHSf6K1yCNasSRsy17VIW6Z&sz=w800",
    "https://drive.google.com/thumbnail?id=19a_oMXnifPIF2jgkRGp6z38hPigWJJ91&sz=w800",
  ],
  3: [
    "https://drive.google.com/thumbnail?id=1fsuVHpD0P2P7jH4RcT_wHwfv3K6C1PXh&sz=w800",
    "https://drive.google.com/thumbnail?id=1YNYoXbSLYv9lr1c3k7tnQxhzpBjF-UcW&sz=w800",
    "https://drive.google.com/thumbnail?id=1RNTebxWaOb6aNd8Jdj2QWjOxpy4TJZpg&sz=w800",
    "https://drive.google.com/thumbnail?id=1LbwG6WB7-utbGuNEJy_cVFYTWI4cpCu2&sz=w800",
    "https://drive.google.com/thumbnail?id=1dFcbr6XT6Ar8F0Sl0mhW3zquJJ5xzrEf&sz=w800",
    "https://drive.google.com/thumbnail?id=1kBgtkCxdjsckap8zBCJEOISHldY5T-PP&sz=w800",
    "https://drive.google.com/thumbnail?id=1cJnuqymJQ0cJfeVdZ5qxOk9EqdnOW_v1&sz=w800",
    "https://drive.google.com/thumbnail?id=1O6SbquC41vBxML-10MntIZqK-GNG2zuk&sz=w800",
  ],
  4: [
    "https://drive.google.com/thumbnail?id=1jHFAfEv23FRwmWsf7_LmXdHiwwXrxTZw&sz=w800",
    "https://drive.google.com/thumbnail?id=1fkGUah64_w4CJ8Qg9QDhXErmofFiDZIs&sz=w800",
    "https://drive.google.com/thumbnail?id=1b2koPJmUiNPTokckxwcQ99lVBNpFyxJx&sz=w800",
    "https://drive.google.com/thumbnail?id=19Axa7Gz-B3HjfQTRPMP5JNnb2P8CKDJz&sz=w800",
    "https://drive.google.com/thumbnail?id=1B-js9n4u6EciEOG4v4Potx-sQgfAc1yl&sz=w800",
    "https://drive.google.com/thumbnail?id=1Ugl-93F6sMh8oDUn_MdLxRYxVFhkZkpC&sz=w800",
    "https://drive.google.com/thumbnail?id=1HvDR-XH_xZeHSPJed7HXxoEzOOQGccKh&sz=w800",
    "https://drive.google.com/thumbnail?id=1Ftcnnoe2RLa7B9S3DKxlepjIVZr49hSw&sz=w800",
  ]
};

export default function BusinessUnits() {
  const [activeUnit, setActiveUnit] = useState(1);
  const { language, t } = useLanguage();

  const langUnits = businessUnitsByLang[language] || businessUnitsByLang.th;
  const units = langUnits.map(unit => ({
    ...unit,
    images: imagesMap[unit.id] || []
  }));

  const currentUnit = units.find((u) => u.id === activeUnit) || units[0];

  return (
    <section id="units" className="bg-white py-20 px-8">
      <div className="container mx-auto max-w-[1100px]">
        <FadeIn>
          <div className="text-[12px] font-bold text-g7 uppercase tracking-widest mb-2.5">
            {language === 'la' ? 'ໂຄງສ້າງອົງກອນ' : language === 'vi' ? 'Cơ cấu tổ chức' : language === 'zh' ? '组织架构' : language === 'en' ? 'Organizational Structure' : 'โครงสร้างองค์กร'}
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-dark mb-3">
            {language === 'la' ? '4 ຫົວໜ່ວຍທຸລະກິດຫຼັກ' : language === 'vi' ? '4 Đơn vị kinh doanh cốt lõi' : language === 'zh' ? '4大核心业务部门' : language === 'en' ? '4 Core Business Units' : '4 หน่วยธุรกิจหลัก'}
          </h2>
          <div className="dv"></div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="flex gap-4 mb-10 flex-wrap">
            {units.map((unit) => (
              <button
                key={unit.id}
                onClick={() => setActiveUnit(unit.id)}
                className={`px-5 py-[9px] rounded-lg border-[1.5px] text-[13px] font-semibold cursor-pointer transition-all duration-200 font-sans ${
                  activeUnit === unit.id ? "bg-g9 text-white border-g9" : "bg-white text-mid border-border hover:border-g5"
                }`}
              >
                {unit.icon} {unit.title}
              </button>
            ))}
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <FadeIn key={`gallery-${activeUnit}`} className="grid grid-cols-2 gap-3">
            <div className="col-span-2 rounded-xl overflow-hidden shadow-2xl aspect-video">
              <img src={currentUnit.images[0]} alt={currentUnit.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            {currentUnit.images.slice(1).map((img, i) => (
              <div key={i} className="rounded-lg overflow-hidden shadow-lg aspect-[4/3] hover:scale-105 transition-transform duration-300">
                <img src={img} alt={`${currentUnit.title} ${i + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ))}
          </FadeIn>
          <FadeIn key={`info-${activeUnit}`}>
            <h2 className="text-[1.4rem] font-extrabold text-dark mb-1.5">{currentUnit.title}</h2>
            <div className="text-[13px] text-light mb-5">{currentUnit.englishTitle}</div>
            <p className="text-[14.5px] text-mid leading-relaxed mb-6">{currentUnit.description}</p>
            <ul className="list-none mb-6">
              {currentUnit.features.map((feat, i) => (
                <li key={i} className="text-[14px] text-mid py-2 border-b border-border flex items-start gap-2.5 last:border-b-0">
                  <span className="text-g7 font-bold shrink-0 mt-0.5">✓</span>
                  {feat}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-1.5">
              {currentUnit.badges.map((badge, i) => (
                <span key={i} className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-bold ${badge.color}`}>
                  {badge.text}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-5">
              {currentUnit.id === 1 && (
                <a 
                  href="https://ricenurserycenter.mekongsinsup.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-g9 text-white px-[22px] py-[11px] rounded-lg text-[14px] font-semibold no-underline transition-colors duration-200 hover:bg-g7 shadow-xs"
                >
                  🌱 {language === 'la' ? 'ເຂົ້າสู่ເວັບໄຊສູນເພາະກ້າ' : language === 'vi' ? 'Truy cập trang Trung tâm mạ khay' : language === 'zh' ? '进入育苗中心网站' : language === 'en' ? 'Visit Seedling Center Portal' : 'เข้าสู่หน้าเว็บศูนย์เพาะกล้า'} ↗
                </a>
              )}
              <a 
                href="#contact" 
                className={`inline-flex items-center gap-2 ${currentUnit.id === 1 ? 'bg-white text-dark border border-border hover:bg-gray-50' : 'bg-g9 text-white hover:bg-g7'} px-[22px] py-[11px] rounded-lg text-[14px] font-semibold no-underline transition-colors duration-200`}
              >
                {language === 'la' ? 'ສອບຖາມບໍລິການ' : language === 'vi' ? 'Tư vấn dịch vụ' : language === 'zh' ? '咨询服务' : language === 'en' ? 'Inquire Services' : 'สอบถามบริการ'} →
              </a>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
