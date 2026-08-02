import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";
import { partnersDataByLang } from "../data/translationsData";

export default function Partners() {
  const { language } = useLanguage();
  const partners = partnersDataByLang[language] || partnersDataByLang.th;

  const sectionTag = language === 'la' ? 'ເຄືອຂ່າຍພັນທະມິດ' : language === 'vi' ? 'Mạng lưới đối tác' : language === 'zh' ? '合作伙伴网络' : language === 'en' ? 'Partner Network' : 'เครือข่ายพันธมิตร';
  const sectionTitle = language === 'la' ? '9 ພັນທະມິດລະດັບຊາດ ແລະ ສາກົນ' : language === 'vi' ? '9 Đối tác Chiến lược Quốc gia & Quốc tế' : language === 'zh' ? '9大国家级与国际合作伙伴机构' : language === 'en' ? '9 National & International Strategic Partners' : '9 องค์กรพันธมิตรระดับชาติและนานาชาติ';

  return (
    <section id="partners" className="bg-bg py-20 px-8">
      <div className="container mx-auto max-w-[1100px]">
        <FadeIn>
          <div className="text-[12px] font-bold text-g7 uppercase tracking-widest mb-2.5">{sectionTag}</div>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-dark mb-3">{sectionTitle}</h2>
          <div className="dv"></div>
        </FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map((p, i) => (
            <FadeIn key={p.title} delay={i * 0.05}>
              <div className="bg-white border border-border rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:border-g5 h-full">
                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-[4px] mb-2 ${p.typeClass}`}>
                  {p.type}
                </span>
                <h4 className="text-[13.5px] font-bold text-dark mb-1.5">{p.title}</h4>
                <p className="text-[12.5px] text-light leading-relaxed">{p.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
