import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";
import { riskDataByLang } from "../data/translationsData";

export default function RiskManagement() {
  const { language } = useLanguage();
  const risks = riskDataByLang[language] || riskDataByLang.th;

  const sectionTag = language === 'la' ? 'ການບໍລິຫານຄວາມສ່ຽງ' : language === 'vi' ? 'Quản lý rủi ro' : language === 'zh' ? '风险管理' : language === 'en' ? 'Risk Management' : 'การบริหารความเสี่ยง';
  const sectionTitle = language === 'la' ? '7 ໝວດຄວາມສ່ຽງ ແລະ ແນວທາງຈັດການ' : language === 'vi' ? '7 Danh mục Rủi ro & Chiến lược Giảm thiểu' : language === 'zh' ? '7大风险类别与应对策略' : language === 'en' ? '7 Risk Categories & Mitigation Strategies' : '7 หมวดความเสี่ยงและแนวทางจัดการ';

  return (
    <section className="bg-g9 py-20 px-8">
      <div className="container mx-auto max-w-[1100px]">
        <FadeIn>
          <div className="text-[12px] font-bold text-white/55 uppercase tracking-widest mb-2.5">{sectionTag}</div>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-white mb-3">{sectionTitle}</h2>
          <div className="dv !bg-gold"></div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {risks.map((risk, i) => (
            <FadeIn key={risk.title} delay={i * 0.05}>
              <div className="bg-white/7 border border-white/10 rounded-xl p-[1.4rem] h-full">
                <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold mb-2.5 ${risk.levelClass}`}>
                  {risk.level}
                </span>
                <h4 className="text-[14px] font-bold text-white mb-1.5">{risk.title}</h4>
                <p className="text-[12.5px] text-white/60 leading-relaxed">{risk.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
