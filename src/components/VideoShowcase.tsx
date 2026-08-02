import React, { useState } from "react";
import FadeIn from "./FadeIn";
import { 
  Video, ExternalLink, Sparkles, Copy, 
  Check, RefreshCw, ShieldCheck 
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { videoShowcaseTranslationsData } from "../data/translationsData";

export default function VideoShowcase() {
  const { language } = useLanguage();
  const t = videoShowcaseTranslationsData[language] || videoShowcaseTranslationsData.th;

  const videoId = "14VYj2ioI12OzjtEhEQmAmlUq-WpdVf7w";
  const previewUrl = `https://drive.google.com/file/d/${videoId}/preview`;
  const viewUrl = `https://drive.google.com/file/d/${videoId}/view?usp=sharing`;

  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(viewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReloadVideo = () => {
    setIframeKey((prev) => prev + 1);
  };

  return (
    <section id="video" className="py-20 px-4 sm:px-8 bg-[#F4F7F4] border-t border-b border-border relative overflow-hidden">
      
      {/* Background Ambient Glow Effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-g1/50 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute -bottom-20 right-10 w-[400px] h-[400px] bg-gold-lt/50 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <div className="container mx-auto max-w-[1140px]">
        <FadeIn>
          
          {/* Header Section */}
          <div className="flex flex-col items-center text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-white border border-g5/30 text-g7 text-[12px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-3 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <Video className="w-4 h-4 text-g7" />
              {t.badge}
            </div>
            
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-dark mb-2.5">
              {t.title}
            </h2>
            
            <div className="dv mx-auto"></div>
            
            <p className="text-[15px] text-light max-w-[760px] leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          {/* Main Modern Player Container with Gradient Border */}
          <div className="bg-gradient-to-br from-g5/40 via-white to-gold/30 p-[1.5px] rounded-3xl shadow-2xl max-w-[1020px] mx-auto backdrop-blur-sm">
            <div className="bg-white rounded-[22px] overflow-hidden">
              
              {/* Player Top Interface Bar */}
              <div className="bg-slate-900 text-white px-4 py-3 sm:px-6 sm:py-3.5 flex items-center justify-between gap-3 border-b border-slate-800">
                
                {/* Left: Live indicator */}
                <div className="flex items-center gap-2.5">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold tracking-wide text-emerald-400 uppercase hidden sm:inline-block">
                    Video Ready
                  </span>
                  <span className="text-xs font-bold tracking-wide text-emerald-400 uppercase sm:hidden">
                    READY
                  </span>
                </div>

                {/* Center Badge */}
                <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700/80 px-3 py-1 rounded-full text-[11px] font-semibold text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  <span className="truncate">{t.centerBadge}</span>
                </div>

                {/* Right: Quality Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded">
                    HD 1080P
                  </span>
                  <button 
                    onClick={handleReloadVideo}
                    title={t.reloadBtn}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Video Player Frame */}
              <div className="relative w-full aspect-video bg-black shadow-inner overflow-hidden group">
                <iframe
                  key={iframeKey}
                  src={previewUrl}
                  title="Mekong Sinsup Operations Video Presentation"
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                  allowFullScreen
                ></iframe>
              </div>

              {/* Footer Control & Info Panel */}
              <div className="p-4 sm:p-6 bg-slate-50/80 border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Highlight Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 bg-g1 text-g9 border border-g5/30 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs">
                    🌱 {t.tag1}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-gold-lt text-[#92400E] border border-gold/40 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs">
                    🌾 {t.tag2}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-white text-dark border border-gray-200 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs">
                    🚜 {t.tag3}
                  </span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs">
                    ✨ {t.tag4}
                  </span>
                </div>

                {/* Actions Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className="inline-flex items-center gap-1.5 bg-white hover:bg-gray-100 text-dark border border-border text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check size={14} className="text-emerald-600" />
                        <span className="text-emerald-700">{t.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} className="text-mid" />
                        <span>{t.copyLink}</span>
                      </>
                    )}
                  </button>

                  <a
                    href={viewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-g9 hover:bg-g7 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all no-underline shadow-sm hover:shadow-md active:scale-95"
                  >
                    <ExternalLink size={14} /> {t.openInDrive} ↗
                  </a>
                </div>

              </div>

            </div>
          </div>

          {/* Extra Sub-note */}
          <div className="mt-4 text-center">
            <p className="text-[12px] text-light flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-g7" />
              {t.subNote}
            </p>
          </div>

        </FadeIn>
      </div>
    </section>
  );
}


