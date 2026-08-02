import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sprout, 
  Wheat, 
  Coins, 
  Building2, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Radio,
  X,
  Layers
} from "lucide-react";
import FadeIn from "./FadeIn";
import { useLanguage, Language } from "../contexts/LanguageContext";
import { lifecycleDataByLang, subUnitsByLang } from "../data/translationsData";

const heroImages: Record<Language, { primary: string; fallback: string }> = {
  th: {
    primary: "https://lh3.googleusercontent.com/d/1qzrJ35epcDOZRsJnNzSVLt3c6gv4Ur_M",
    fallback: "https://drive.google.com/thumbnail?id=1qzrJ35epcDOZRsJnNzSVLt3c6gv4Ur_M&sz=w1600"
  },
  la: {
    primary: "https://lh3.googleusercontent.com/d/1OzfJAzth6nLV3wHYrt5-_vlah27zo2BP",
    fallback: "https://drive.google.com/thumbnail?id=1OzfJAzth6nLV3wHYrt5-_vlah27zo2BP&sz=w1600"
  },
  zh: {
    primary: "https://lh3.googleusercontent.com/d/1l8f2Q_cye0Dq9ajHMq-LFD60aTgOZGop",
    fallback: "https://drive.google.com/thumbnail?id=1l8f2Q_cye0Dq9ajHMq-LFD60aTgOZGop&sz=w1600"
  },
  en: {
    primary: "https://lh3.googleusercontent.com/d/1p8XWHmQok3vzk-2J1peoX6lQNGhDqMu6",
    fallback: "https://drive.google.com/thumbnail?id=1p8XWHmQok3vzk-2J1peoX6lQNGhDqMu6&sz=w1600"
  },
  vi: {
    primary: "https://lh3.googleusercontent.com/d/16WXc7c68NIzSiWYqRpqgBsY8P-OeTN6w",
    fallback: "https://drive.google.com/thumbnail?id=16WXc7c68NIzSiWYqRpqgBsY8P-OeTN6w&sz=w1600"
  }
};

// --- Custom SVGs matching the exact 4-stage lifecycle image ---

// Stage 1: Polished Golden Paddy Grain with glowing amber halo
const SproutingSeedSVG = () => (
  <svg viewBox="0 0 160 160" className="w-full h-full drop-shadow-xl">
    <defs>
      <radialGradient id="amberGlow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.45" />
        <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.15" />
        <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="goldSeedGrad" x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="35%" stopColor="#F59E0B" />
        <stop offset="75%" stopColor="#D97706" />
        <stop offset="100%" stopColor="#78350F" />
      </linearGradient>
      <linearGradient id="goldHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#FEF08A" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    
    {/* Soft Glowing Amber Aura */}
    <circle cx="80" cy="80" r="70" fill="url(#amberGlow)" />
    
    {/* Shadow */}
    <ellipse cx="80" cy="142" rx="35" ry="7" fill="rgba(0,0,0,0.15)" />
    
    {/* Main Vertical Golden Paddy Grain */}
    <g transform="translate(80, 80)">
      <path 
        d="M 0,-52 C 24,-52 32,-15 28,25 C 24,65 0,72 -2,72 C -4,72 -28,65 -30,25 C -34,-15 -24,-52 0,-52 Z" 
        fill="url(#goldSeedGrad)" 
        stroke="#78350F" 
        strokeWidth="1.5"
      />
      {/* Central Longitudinal Husk Seam */}
      <path d="M 0,-52 Q -2,10 0,72" fill="none" stroke="#78350F" strokeWidth="2" opacity="0.75" />
      <path d="M 0,-52 Q 1,10 0,72" fill="none" stroke="#FEF08A" strokeWidth="1" opacity="0.8" />

      {/* Glossy High-light Reflections */}
      <path d="M -16,-38 C -22,-10 -20,20 -14,48" fill="none" stroke="url(#goldHighlight)" strokeWidth="3" strokeLinecap="round" />
      <path d="M 12,-35 C 18,-15 16,15 10,40" fill="none" stroke="#FEF08A" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </g>
  </svg>
);

// Stage 2: Seedling Tray (Kubota Mat Seed)
const SeedlingTraySVG = () => (
  <svg viewBox="0 0 200 150" className="w-full h-full drop-shadow-md">
    <defs>
      <linearGradient id="trayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#455A64" />
        <stop offset="100%" stopColor="#1A2327" />
      </linearGradient>
      <linearGradient id="leafGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#388E3C" />
        <stop offset="100%" stopColor="#81C784" />
      </linearGradient>
      <linearGradient id="leafGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor="#1B5E20" />
        <stop offset="100%" stopColor="#66BB6A" />
      </linearGradient>
    </defs>

    {/* Tray Base 3D Perspective */}
    <polygon points="20,85 180,85 160,115 40,115" fill="#111A1E" />
    <polygon points="20,80 180,80 180,85 20,85" fill="#37474F" />
    <polygon points="40,115 160,115 160,120 40,120" fill="#263238" />
    <polygon points="180,80 180,85 160,120 160,115" fill="#1C2529" />
    <polygon points="20,80 20,85 40,120 40,115" fill="#455A64" />

    {/* Seedbed soil layer inside */}
    <polygon points="25,82 175,82 157,112 43,112" fill="#3E2723" />

    {/* Dense Seedling Sprouts */}
    {Array.from({ length: 42 }).map((_, i) => {
      const col = i % 14;
      const row = Math.floor(i / 14);
      const x = 32 + col * 10 + (row * 3);
      const y = 80 - row * 8;
      const height = 35 + ((i * 7) % 18);
      const curve = (i % 2 === 0 ? 5 : -5);

      return (
        <g key={i}>
          {/* Stem */}
          <path 
            d={`M ${x},${y} Q ${x + curve},${y - height/2} ${x + curve/2},${y - height}`} 
            fill="none" 
            stroke={i % 2 === 0 ? "url(#leafGrad1)" : "url(#leafGrad2)"} 
            strokeWidth="2.5" 
            strokeLinecap="round"
          />
          {/* Leaf Tip */}
          <path 
            d={`M ${x + curve/2},${y - height} Q ${x + curve/2 + 3},${y - height - 4} ${x + curve/2 + 5},${y - height + 2}`} 
            fill="none" 
            stroke="#A5D6A7" 
            strokeWidth="1.8" 
          />
        </g>
      );
    })}

    {/* Water Dew Droplets */}
    <circle cx="85" cy="45" r="2" fill="#E0F7FA" opacity="0.9" />
    <circle cx="125" cy="38" r="1.5" fill="#E0F7FA" opacity="0.9" />
    <circle cx="60" cy="52" r="1.8" fill="#E0F7FA" opacity="0.9" />
  </svg>
);

// Stage 3: Rice Plant with Rain Cloud & Satellite above
const PaddyFieldSVG = () => (
  <svg viewBox="0 0 200 170" className="w-full h-full drop-shadow-md">
    <defs>
      <linearGradient id="riceGoldEar" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="50%" stopColor="#EAB308" />
        <stop offset="100%" stopColor="#CA8A04" />
      </linearGradient>
      <linearGradient id="cloudGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>

    {/* Floating Rain Cloud with Raindrops (Top Left of Plant) */}
    <g transform="translate(48, 12)">
      <path d="M 12,22 Q 14,10 24,10 Q 30,5 40,10 Q 48,8 54,16 Q 60,20 56,28 Q 50,32 12,28 Z" fill="url(#cloudGrad)" stroke="#94A3B8" strokeWidth="1" className="drop-shadow-xs" />
      {/* Raindrops */}
      <line x1="20" y1="32" x2="18" y2="40" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="30" y1="34" x2="28" y2="42" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="40" y1="32" x2="38" y2="40" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="50" y1="34" x2="48" y2="42" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
    </g>

    {/* Sleek Satellite Observation System (Top Right of Plant) */}
    <g transform="translate(122, 10)">
      {/* Main Satellite Body */}
      <rect x="18" y="16" width="14" height="12" rx="2" fill="#475569" stroke="#0F172A" strokeWidth="1" transform="rotate(-28 25 22)" />
      {/* Solar Panel Wings */}
      <rect x="0" y="18" width="16" height="8" rx="1" fill="#0288D1" stroke="#01579B" strokeWidth="0.8" transform="rotate(-28 8 22)" />
      <rect x="34" y="18" width="16" height="8" rx="1" fill="#0288D1" stroke="#01579B" strokeWidth="0.8" transform="rotate(-28 42 22)" />
      {/* Antenna & Wave Pulses */}
      <circle cx="25" cy="22" r="2.5" fill="#FACC15" />
      <path d="M 10,38 Q 25,32 40,38" fill="none" stroke="#0EA5E9" strokeWidth="1.5" strokeDasharray="2 2" />
      <path d="M 5,44 Q 25,36 45,44" fill="none" stroke="#38BDF8" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.7" />
    </g>

    {/* Ground Soil Base */}
    <ellipse cx="100" cy="158" rx="55" ry="8" fill="rgba(0,0,0,0.12)" />

    {/* Central Rice Plant with Dense Green Leaves & Golden Ears */}
    <g transform="translate(100, 155)">
      {/* Rice Leaves Fan out */}
      <path d="M 0,0 C -15,-30 -40,-50 -65,-52" fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 0,0 C -10,-40 -25,-70 -35,-80" fill="none" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
      <path d="M 0,0 C -5,-45 -8,-85 0,-96" fill="none" stroke="#15803D" strokeWidth="4" strokeLinecap="round" />
      <path d="M 0,0 C 5,-45 8,-85 0,-96" fill="none" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
      <path d="M 0,0 C 10,-40 25,-70 35,-80" fill="none" stroke="#16A34A" strokeWidth="4" strokeLinecap="round" />
      <path d="M 0,0 C 15,-30 40,-50 65,-52" fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" />

      {/* Bending Golden Rice Ears */}
      <path d="M 0,-96 C 8,-108 30,-115 42,-98" fill="none" stroke="url(#riceGoldEar)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 0,-96 C -8,-108 -30,-115 -42,-98" fill="none" stroke="url(#riceGoldEar)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M -35,-80 C -45,-92 -58,-88 -55,-74" fill="none" stroke="url(#riceGoldEar)" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M 35,-80 C 45,-92 58,-88 55,-74" fill="none" stroke="url(#riceGoldEar)" strokeWidth="3.5" strokeLinecap="round" />

      {/* Grains on Ears */}
      {[
        { x: 42, y: -98 }, { x: 36, y: -106 }, { x: 28, y: -110 }, { x: 18, y: -108 },
        { x: -42, y: -98 }, { x: -36, y: -106 }, { x: -28, y: -110 }, { x: -18, y: -108 },
        { x: 55, y: -74 }, { x: 52, y: -82 }, { x: 46, y: -88 },
        { x: -55, y: -74 }, { x: -52, y: -82 }, { x: -46, y: -88 }
      ].map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.8" />
      ))}
    </g>
  </svg>
);

// Stage 4: Translucent Pearl White Rice Grain & QR Code with Gold Thai Kranok Tail
const RiceBagSVG = () => (
  <svg viewBox="0 0 180 170" className="w-full h-full drop-shadow-md">
    <defs>
      <radialGradient id="pearlWhiteGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="45%" stopColor="#F8FAFC" />
        <stop offset="80%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#CBD5E1" />
      </radialGradient>
      <linearGradient id="goldKranok" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FEF08A" />
        <stop offset="40%" stopColor="#EAB308" />
        <stop offset="80%" stopColor="#CA8A04" />
        <stop offset="100%" stopColor="#854D0E" />
      </linearGradient>
    </defs>

    {/* Shadows */}
    <ellipse cx="65" cy="150" rx="20" ry="6" fill="rgba(0,0,0,0.1)" />
    <ellipse cx="130" cy="148" rx="22" ry="5" fill="rgba(0,0,0,0.12)" />

    {/* Polished Translucent White Pearl Rice Grain (Vertical) */}
    <g transform="translate(45, 18)">
      <path 
        d="M 20,10 C 34,10 40,32 38,70 C 36,108 24,120 16,116 C 8,112 6,90 8,50 C 10,22 14,10 20,10 Z" 
        fill="url(#pearlWhiteGrad)" 
        stroke="#CBD5E1" 
        strokeWidth="1.2"
        className="drop-shadow-md"
      />
      {/* High-Gloss Highlight Reflection */}
      <path d="M 16,20 C 24,20 28,40 26,68" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" opacity="0.95" />
    </g>

    {/* QR Code Container on Right */}
    <g transform="translate(108, 62)">
      {/* QR Card Background */}
      <rect x="0" y="0" width="40" height="40" rx="6" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" className="shadow-md" />
      
      {/* Real Looking QR Pattern */}
      <rect x="4" y="4" width="32" height="32" fill="#0F172A" />
      <rect x="6" y="6" width="28" height="28" fill="#FFFFFF" />
      
      {/* Position Detection Squares */}
      <rect x="8" y="8" width="8" height="8" fill="#0F172A" />
      <rect x="10" y="10" width="4" height="4" fill="#FFFFFF" />
      
      <rect x="24" y="8" width="8" height="8" fill="#0F172A" />
      <rect x="26" y="10" width="4" height="4" fill="#FFFFFF" />
      
      <rect x="8" y="24" width="8" height="8" fill="#0F172A" />
      <rect x="10" y="26" width="4" height="4" fill="#FFFFFF" />

      {/* Alignment dots */}
      <rect x="20" y="18" width="4" height="4" fill="#0F172A" />
      <rect x="24" y="24" width="6" height="6" fill="#0F172A" />

      {/* Flowing Gold Thai Kranok Tail / Ornament Motif around QR Code */}
      <path 
        d="M 40,20 C 52,15 58,0 52,-15 C 46,-5 42,10 40,20 Z M 40,30 C 58,35 62,50 50,60 C 46,48 42,38 40,30 Z" 
        fill="url(#goldKranok)" 
        stroke="#78350F" 
        strokeWidth="0.6" 
      />
    </g>
  </svg>
);

// --- Traditional Thai Gold Ornament Badge for Numbers 1, 2, 3, 4 ---
const ThaiGoldBadge = ({ number }: { number: string }) => (
  <div className="relative flex items-center justify-center w-12 h-12 shrink-0">
    {/* Outer Lotus Petal Ornament SVG */}
    <svg viewBox="0 0 60 60" className="absolute inset-0 w-full h-full drop-shadow-md">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="40%" stopColor="#EAB308" />
          <stop offset="80%" stopColor="#CA8A04" />
          <stop offset="100%" stopColor="#854D0E" />
        </linearGradient>
      </defs>
      
      {/* Petals */}
      {Array.from({ length: 8 }).map((_, i) => (
        <path
          key={i}
          d="M 30,30 L 26,6 C 28,2 32,2 34,6 Z"
          fill="url(#goldGrad)"
          transform={`rotate(${i * 45} 30 30)`}
        />
      ))}
      
      {/* Inner Circle Border */}
      <circle cx="30" cy="30" r="18" fill="#9A3412" stroke="url(#goldGrad)" strokeWidth="2.5" />
      <circle cx="30" cy="30" r="15" fill="url(#goldGrad)" />
      <circle cx="30" cy="30" r="13" fill="#B45309" />
    </svg>
    <span className="relative z-10 text-[15px] font-extrabold text-amber-100 font-prompt drop-shadow-xs">
      {number}
    </span>
  </div>
);

// --- Thai Traditional Kranok Top/Bottom Border Banner ---
const ThaiKranokBorder = ({ isTop = true }: { isTop?: boolean }) => (
  <div className={`w-full overflow-hidden leading-none select-none ${isTop ? 'border-b border-amber-500/40 shadow-xs' : 'border-t border-amber-500/40 shadow-xs'}`}>
    <div className="bg-gradient-to-r from-[#0F3818] via-[#854D0E] to-[#0F3818] h-3.5 flex items-center justify-between px-2 relative">
      {/* Thai Kranok Pattern Repeated SVG */}
      <div className="absolute inset-0 opacity-50 flex justify-between pointer-events-none overflow-hidden">
        {Array.from({ length: 22 }).map((_, i) => (
          <svg key={i} viewBox="0 0 40 14" className="h-full w-9 shrink-0 fill-amber-300">
            <path d="M 0,14 C 10,12 15,4 20,0 C 25,4 30,12 40,14 Z" />
            <path d="M 10,14 C 15,10 18,6 20,2 C 22,6 25,10 30,14 Z" fill="#FEF08A" />
          </svg>
        ))}
      </div>
      <div className="w-full h-[1.5px] bg-gradient-to-r from-amber-400/30 via-amber-200 to-amber-400/30 z-10"></div>
    </div>
  </div>
);

export default function BusinessLifecyclePortal() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [selectedUnitModal, setSelectedUnitModal] = useState<number | null>(null);

  const currentHeroImg = heroImages[language] || heroImages.th;

  // 4 Primary Business Units / Life Cycle Stages
  const langLifecycle = lifecycleDataByLang[language] || lifecycleDataByLang.th;
  const langSubUnits = subUnitsByLang[language] || subUnitsByLang.th;

  const componentsMap = [
    <SproutingSeedSVG key="1" />,
    <SeedlingTraySVG key="2" />,
    <PaddyFieldSVG key="3" />,
    <RiceBagSVG key="4" />
  ];

  const badgeColorsMap = [
    "border-amber-500/40 bg-amber-500/10 text-amber-900",
    "border-emerald-600/40 bg-emerald-600/10 text-emerald-900",
    "border-blue-600/40 bg-blue-600/10 text-blue-900",
    "border-amber-700/40 bg-amber-700/10 text-amber-950"
  ];

  const routesMap = [
    "/dashboard/seedling",
    "https://ricenurserycenter.mekongsinsup.com/",
    "/dashboard/erp",
    "/dashboard/mill"
  ];

  const lifecycleStages = langLifecycle.map((stage, idx) => ({
    ...stage,
    component: componentsMap[idx],
    badgeColor: badgeColorsMap[idx],
    route: routesMap[idx]
  }));

  // Quick Action Buttons for all Sub-Units
  const subBusinessUnits = [
    {
      title: langSubUnits[0].title,
      english: langSubUnits[0].english,
      icon: "🌱",
      badge: langSubUnits[0].badge,
      color: "from-emerald-700 to-emerald-900",
      link: "https://ricenurserycenter.mekongsinsup.com/",
      isExternal: true
    },
    {
      title: langSubUnits[1].title,
      english: langSubUnits[1].english,
      icon: "📡",
      badge: langSubUnits[1].badge,
      color: "from-blue-700 to-indigo-900",
      link: "/dashboard/erp",
      isExternal: false
    },
    {
      title: langSubUnits[2].title,
      english: langSubUnits[2].english,
      icon: "🏭",
      badge: langSubUnits[2].badge,
      color: "from-amber-700 to-orange-900",
      link: "/dashboard/mill",
      isExternal: false
    },
    {
      title: langSubUnits[3].title,
      english: langSubUnits[3].english,
      icon: "🏗️",
      badge: langSubUnits[3].badge,
      color: "from-slate-700 to-slate-900",
      onClick: () => setSelectedUnitModal(4)
    }
  ];

  const currentActiveModal = lifecycleStages.find(s => s.id === selectedUnitModal);

  return (
    <section className="relative w-full bg-[#FAFCF8] p-0 overflow-hidden flex flex-col justify-center items-center">
      <div className="w-full relative z-10 flex-grow flex items-center justify-center">
        <FadeIn className="w-full">
          <div className="relative w-full overflow-hidden">
            <img 
              key={language}
              src={currentHeroImg.primary}
              onError={(e) => {
                e.currentTarget.src = currentHeroImg.fallback;
              }}
              alt={`Mekong Sinsup Rice Lifecycle - ${language}`} 
              className="w-full h-auto block object-cover object-center"
              referrerPolicy="no-referrer"
            />

            {/* Overlaid Interactive Hotspot Action Areas (Pointer Cursor on Image) */}
            <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
              {/* Hotspot 1: พันธุ์ข้าวดี */}
              <button
                onClick={() => navigate('/dashboard/seedling')}
                className="pointer-events-auto h-full w-full hover:bg-amber-500/10 transition-all cursor-pointer"
                title="ระยะที่ 1: พันธุ์ข้าวดี (คลิกเพื่อเข้าสู่ศูนย์คัดสรรเมล็ดพันธุ์)"
              />

              {/* Hotspot 2: กล้ามีมาตรฐาน */}
              <a
                href="https://ricenurserycenter.mekongsinsup.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto h-full w-full hover:bg-emerald-500/10 transition-all cursor-pointer block"
                title="ระยะที่ 2: กล้ามีมาตรฐาน (คลิกเพื่อเข้าสู่ศูนย์เพาะกล้านครพนม)"
              />

              {/* Hotspot 3: ต้นแตกกองาม */}
              <button
                onClick={() => navigate('/dashboard/erp')}
                className="pointer-events-auto h-full w-full hover:bg-blue-500/10 transition-all cursor-pointer"
                title="ระยะที่ 3: ต้นแตกกองาม (คลิกเพื่อเข้าสู่ Mekong Precision Agritech)"
              />

              {/* Hotspot 4: ข้าวสารสะอาด */}
              <button
                onClick={() => navigate('/dashboard/mill')}
                className="pointer-events-auto h-full w-full hover:bg-amber-700/10 transition-all cursor-pointer"
                title="ระยะที่ 4: ข้าวสารสะอาด (คลิกเพื่อเข้าสู่โรงสีข้าวแม่โขงพืชผล)"
              />
            </div>
          </div>
        </FadeIn>
      </div>

    </section>
  );
}
