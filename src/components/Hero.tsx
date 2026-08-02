import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";

const HERO_IMAGES: Record<string, string> = {
  th: "https://drive.google.com/thumbnail?id=1nfem7hIbUGcvGdmzNDWE4CaHVGwnxMc7&sz=w1600",
  la: "https://drive.google.com/thumbnail?id=1OzfJAzth6nLV3wHYrt5-_vlah27zo2BP&sz=w1600",
  zh: "https://drive.google.com/thumbnail?id=1l8f2Q_cye0Dq9ajHMq-LFD60aTgOZGop&sz=w1600",
  en: "https://drive.google.com/thumbnail?id=1p8XWHmQok3vzk-2J1peoX6lQNGhDqMu6&sz=w1600",
  vi: "https://drive.google.com/thumbnail?id=1p8XWHmQok3vzk-2J1peoX6lQNGhDqMu6&sz=w1600",
};

export default function Hero() {
  const { t, language } = useLanguage();
  const currentHeroImage = HERO_IMAGES[language] || HERO_IMAGES.th;

  return (
    <section className="pt-16 min-h-screen flex items-center relative overflow-hidden" id="top">
      <div 
        className="absolute inset-0 bg-cover bg-center brightness-40 transition-all duration-500" 
        style={{ backgroundImage: `url('${currentHeroImage}')` }}
      ></div>

      <div className="absolute inset-0 bg-linear-to-br from-g9/90 to-black/20"></div>
      <div className="relative z-10 max-w-[900px] mx-auto px-8 py-20 text-left">
        <div>
          <FadeIn>
            <div className="inline-flex items-center gap-[7px] bg-white/13 border border-white/28 backdrop-blur-sm px-4 py-1.5 rounded-full text-[12px] font-semibold text-white/90 mb-6">
              <span className="w-[7px] h-[7px] rounded-full bg-g5 inline-block"></span> {t.heroBadge}
            </div>
            <h1 className="text-[clamp(1.8rem,4vw,2.8rem)] font-extrabold text-white leading-tight mb-6">
              {language === 'th' || language === 'la' ? (
                <>
                  1 เชิดชูชาวนา<br />
                  2 <span className="text-[#A5D6A7]">ลด</span><br />
                  3 <span className="text-[#A5D6A7]">เพิ่ม</span>
                </>
              ) : language === 'en' ? (
                <>
                  1 Honor Farmers<br />
                  2 <span className="text-[#A5D6A7]">Reduce</span> Costs<br />
                  3 <span className="text-[#A5D6A7]">Increase</span> Value
                </>
              ) : language === 'vi' ? (
                <>
                  1 Tôn vinh nông dân<br />
                  2 <span className="text-[#A5D6A7]">Giảm</span> chi phí<br />
                  3 <span className="text-[#A5D6A7]">Tăng</span> giá trị
                </>
              ) : (
                <>
                  1 弘扬农民<br />
                  2 <span className="text-[#A5D6A7]">降低</span> 成本<br />
                  3 <span className="text-[#A5D6A7]">增加</span> 价值
                </>
              )}
            </h1>
            <div className="space-y-4 mb-10 max-w-[700px]">
              {t.heroPoints.map((point, i) => {
                const parts = point.split(' ');
                const first = parts.shift();
                const second = parts.shift();
                const third = parts.shift();
                return (
                  <p key={i} className="text-[15px] text-white/90 leading-relaxed">
                    <span className="font-bold text-[#A5D6A7]">{first} {second} {third}</span> {parts.join(' ')}
                  </p>
                );
              })}
            </div>
            <div className="flex gap-3 flex-wrap">
              <a href="#units" className="bg-white text-g9 px-7 py-[13px] rounded-[10px] text-[14px] font-bold no-underline transition-all duration-200 inline-flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-lg">
                → {t.viewUnits}
              </a>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
