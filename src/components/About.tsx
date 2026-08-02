import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";
import { aboutDataByLang } from "../data/translationsData";

export default function Strip() {
  const { language } = useLanguage();
  const langData = aboutDataByLang[language] || aboutDataByLang.th;
  const stats = langData.stats;

  return (
    <div className="bg-g9 px-8 py-10">
      <div className="max-w-[1100px] mx-auto grid grid-cols-2 lg:grid-cols-4 text-center gap-4">
        {stats.map((stat, i) => (
          <FadeIn key={stat.label} delay={i * 0.1}>
            <div className="text-[2.2rem] font-extrabold text-gold">{stat.value}</div>
            <div className="text-[12.5px] text-white/70 mt-0.5">{stat.label}</div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

export function About() {
  const { language } = useLanguage();
  const langData = aboutDataByLang[language] || aboutDataByLang.th;
  const timeline = langData.timeline;

  const historyImages = [
    "1xhvcAGicM7ybfPpem91sjP1X3lRAPvqh",
    "1KOK6ogUezlJWCIA2xESbRCHtTY57QYm4",
    "1dX42emvwwJd0QPKfbOZXQ38wm-9TZeGh",
    "1vwbAesLVOGBmnjtipc4acJUFUP7iWZ-w",
    "1QUOxvulyvHaGd0V0euBCt8i427R4AZ9M",
    "1lA9c8eQnQki8D-GgtJ9vhkQffVv1cqTV",
    "1d64Q2ntapz-G0mRI715SaK7mnFM2P1X_",
    "12_IOh6HEcqeI2N-alcDPIi1UAioLT7IJ",
    "1ZoZiE2IiipgNOkmtHcMpr7OJPVMArNu1",
    "1x1n4Xv3B2mg5cG0Z9_cyUCgFZ9U9qJdV",
    "1K_wP8jni67OP5sYTYFKt73hEe2ccGzZ2",
    "1-xqTKIQe8S9AvJHNb9Or_6_hRN0UTL4m",
    "1LWs4gx3dJ7YENEkmIHcuh_1_bTA8savr",
    "1-RrgRwMxDgbgFYBR1v9LBsQ0RrG9SOAq",
    "1PYUQy9eGaeDL2qnf_orPGuE-GqLunh8s",
    "1txjMTspmqD5A23Zg9tubsIxPF1PUy1yq",
    "1xVE0X0bWG_umMfApgxPW0V1bMJq5c6ZE",
    "1lNfbdJAWuq3IQhUpOqihAfZuPvEVO0w0"
  ];

  return (
    <section id="about" className="py-20 px-8">
      <div className="container mx-auto max-w-[1101px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
          <FadeIn>
            <div className="text-[12px] font-bold text-g7 uppercase tracking-widest mb-2.5">{langData.tag}</div>
            <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-dark mb-3">{langData.title}</h2>
            <div className="dv"></div>
            <div className="tl">
              {timeline.map((item, index) => (
                <div key={`${item.year}-${index}`} className="relative mb-8">
                  <div className="tld"></div>
                  <div className="text-[12px] font-bold text-g7 mb-1">{item.year}</div>
                  <div className="text-[14px] text-mid leading-relaxed">{item.text}</div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-g1/50 rounded-xl border border-g5/30 mt-6">
              <div className="text-[13.5px] font-bold text-g9">{langData.name}</div>
              <div className="text-[12.5px] text-mid mt-1">{langData.sub}</div>
            </div>
          </FadeIn>
          <FadeIn delay={0.2} className="h-full">
            <div className="grid grid-cols-2 gap-3 max-h-[1200px] overflow-y-auto pr-2 custom-scrollbar">
              {historyImages.map((id, index) => (
                <div 
                  key={id} 
                  className={`rounded-xl overflow-hidden shadow-md hover:scale-[1.02] transition-transform duration-300 ${index === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}
                >
                  <img 
                    src={`https://drive.google.com/thumbnail?id=${id}&sz=w800`} 
                    alt={`History ${index + 1}`} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
