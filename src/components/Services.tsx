import FadeIn from "./FadeIn";
import { useLanguage } from "../contexts/LanguageContext";
import { servicesDataByLang } from "../data/translationsData";

export default function Services() {
  const { language } = useLanguage();
  const langData = servicesDataByLang[language] || servicesDataByLang.th;
  const { labels, current, future } = langData;

  const currentServices = current.map(item => ({
    ...item,
    statusColor: "bg-g1 text-g7 border border-g5/30",
  }));

  const futureServices = future.map(item => ({
    ...item,
    statusColor: "bg-gold-lt text-[#92400E] border border-gold/40",
  }));

  return (
    <section id="services" className="py-20 px-8">
      <div className="container mx-auto max-w-[1100px]">
        <FadeIn>
          <div className="text-[12px] font-bold text-g7 uppercase tracking-widest mb-2.5">
            {labels.tag}
          </div>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-dark mb-3">
            {labels.title}
          </h2>
          <div className="dv"></div>
        </FadeIn>

        <FadeIn delay={0.1} className="overflow-x-auto shadow-sm rounded-lg border border-border">
          <table className="svc-t w-full border-collapse text-[14px]">
            <thead>
              <tr>
                <th className="w-[30%] rounded-tl-lg">{labels.col1}</th>
                <th className="w-[55%]">{labels.col2}</th>
                <th className="w-[15%] rounded-tr-lg">{labels.col3}</th>
              </tr>
            </thead>
            <tbody>
              {/* ผลิตภัณฑ์ที่ให้บริการในปัจจุบัน */}
              <tr className="bg-g1/80 border-y border-g5/20">
                <td colSpan={3} className="font-extrabold text-g9 py-2.5 px-4 text-[13px] tracking-wide">
                  {labels.currHeader}
                </td>
              </tr>
              {currentServices.map((svc, i) => (
                <tr key={svc.name} className={i % 2 === 1 ? "bg-g1/20" : "bg-white"}>
                  <td className="font-bold text-dark">{svc.name}</td>
                  <td className="text-mid leading-relaxed">{svc.detail}</td>
                  <td>
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${svc.statusColor}`}>
                      {svc.status}
                    </span>
                  </td>
                </tr>
              ))}

              {/* บริการในอนาคต */}
              <tr className="bg-gold-lt/70 border-y border-gold/30">
                <td colSpan={3} className="font-extrabold text-[#78350F] py-2.5 px-4 text-[13px] tracking-wide">
                  {labels.futHeader}
                </td>
              </tr>
              {futureServices.map((svc, i) => (
                <tr key={svc.name} className={i % 2 === 1 ? "bg-amber-50/20" : "bg-white"}>
                  <td className="font-bold text-dark">{svc.name}</td>
                  <td className="text-mid leading-relaxed">{svc.detail}</td>
                  <td>
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${svc.statusColor}`}>
                      {svc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FadeIn>
      </div>
    </section>
  );
}

