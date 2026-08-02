import { useState, useEffect } from "react";
import { Play, Video } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { videoShowcaseTranslationsData } from "../data/translationsData";

type MediaItem = 
  | { type: "video"; videoId: string; titleKey: string; previewUrl: string }
  | { type: "image"; src: string; alt: string };

const galleryItems: MediaItem[] = [
  { 
    type: "video", 
    videoId: "14VYj2ioI12OzjtEhEQmAmlUq-WpdVf7w", 
    titleKey: "videoItemTitle", 
    previewUrl: "https://drive.google.com/file/d/14VYj2ioI12OzjtEhEQmAmlUq-WpdVf7w/preview" 
  },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1yovulGzgHKob1TyP8UFyeaUrf-gMRiBt&sz=w800", alt: "ทุ่งนาข้าวสีทอง" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1YNYoXbSLYv9lr1c3k7tnQxhzpBjF-UcW&sz=w800", alt: "โรงสีข้าวแม่โขงพืชผล" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1zRv3EJscJTllDtX8i_PX1Gz2asqcJVg1&sz=w800", alt: "โดรนในนาข้าว" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1rg8htzTEquYaKJIFD60NEs1U8oq8mkH5&sz=w800", alt: "สาธิตดำนา" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=14RmJozBBlo9D4msIv0zZZXtQWm-OjFFe&sz=w800", alt: "แผ่นกล้าข้าว" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1IQKgdu1kjwHAmXF5RLmirjX3rfTw7ep6&sz=w800", alt: "QR Traceability" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1vW2V8T8-24GkvvyE0jbGGtLmHlQifioH&sz=w800", alt: "Traceability Web" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1dX42emvwwJd0QPKfbOZXQ38wm-9TZeGh&sz=w800", alt: "Dashboard" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1pSuK2loGKfiWn3971Xj9FjUU5rX6Kexa&sz=w800", alt: "Seed Conditioning" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=108M2xTHp8tjUFMRykX41cF2ur8rN_mjQ&sz=w800", alt: "โรงเรือน" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1X22Ji0Uq-KhXLsqgJOk5zUvvTI5PQhc1&sz=w800", alt: "ฐานราก" },
  { type: "image", src: "https://drive.google.com/thumbnail?id=1tPOpobl9d-A_smU-D50aBwR1_rK_Ytgn&sz=w800", alt: "งานคอนกรีต" },
];

export default function Gallery() {
  const { language } = useLanguage();
  const t = videoShowcaseTranslationsData[language] || videoShowcaseTranslationsData.th;
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  useEffect(() => {
    if (selectedMedia) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [selectedMedia]);

  return (
    <>
      <div id="gallery" className="bg-white py-12 overflow-hidden">
        <p className="text-[1rem] font-bold text-dark px-8 mb-6 text-center">
          {t.galleryTitle} <span className="text-[12px] font-normal text-light">{t.galleryScrollHint}</span>
        </p>
        <div className="gal-track flex gap-4 px-8 overflow-x-auto snap-x snap-mandatory scroll-smooth">
          {galleryItems.map((item, i) => (
            <div
              key={i}
              className="shrink-0 w-[280px] h-[200px] rounded-xl overflow-hidden snap-start shadow-md cursor-pointer relative group bg-slate-900 border border-border"
              onClick={() => setSelectedMedia(item)}
            >
              {item.type === "video" ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-g9 text-white p-4 text-center relative">
                  <div className="w-12 h-12 rounded-full bg-gold/90 text-dark flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-dark ml-0.5" />
                  </div>
                  <span className="text-xs font-bold text-white line-clamp-2">{t.videoItemTitle}</span>
                  <span className="text-[10px] text-gold mt-1 flex items-center gap-1 font-semibold">
                    <Video size={12} /> {t.clickToPlay}
                  </span>
                </div>
              ) : (
                <img 
                  src={item.src} 
                  alt={item.alt} 
                  className="w-full h-full object-cover transition-transform duration-400 group-hover:scale-105" 
                  referrerPolicy="no-referrer" 
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <span className="absolute top-4 right-6 text-white text-[2rem] cursor-pointer leading-none hover:text-gold z-10">✕</span>
          <div 
            className="relative max-w-[95vw] max-h-[90vh] w-[900px] aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMedia.type === "video" ? (
              <iframe
                src={selectedMedia.previewUrl}
                title={t.videoItemTitle}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              ></iframe>
            ) : (
              <img 
                src={selectedMedia.src} 
                alt={selectedMedia.alt} 
                className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
