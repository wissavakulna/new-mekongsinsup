import React, { useState, useEffect, useMemo } from "react";
import FadeIn from "./FadeIn";
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { 
  Sprout, Wheat, MapPin, Factory, Leaf, 
  TrendingDown, Layers, CheckCircle2, 
  Sparkles, Database, RefreshCw, BarChart3, Gauge, Award, ArrowRight
} from "lucide-react";
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend 
} from "recharts";
import { fetchMillData, MillRecord, fetchTransplanterCustomerFields, CustomerFieldPlot, fetchMemberMasterCount } from "../services/dashboardService";
import { useLanguage } from "../contexts/LanguageContext";
import { environmentTranslationsData } from "../data/translationsData";

// Helper function to anonymize / mask customer names for privacy
function anonymizeName(name: string): string {
  if (!name || name.includes("ไม่ระบุ")) return "เกษตรกรสมาชิก";
  const cleaned = name.replace(/^(\.|\s)+/, "").trim();
  const parts = cleaned.split(/\s+/);
  const maskedParts = parts.map(p => {
    if (p.length === 0) return "";
    return p.charAt(0) + "***";
  });
  return `คุณ ${maskedParts.join(" ")}`;
}

// Helper component to programmatically re-center and zoom map
function MapViewController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Fix default marker icon issue in react-leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Kubota Transplanter Customer Field Plot Data
const TRANSPLANTER_CUSTOMER_FIELDS = [
  {
    id: "field-1",
    customerName: "คุณวิศวะ กุลนา",
    locationName: "แปลงนาเรณู ต.เรณู อ.เรณูนคร จ.นครพนม",
    areaRai: 50,
    areaSqm: 80000,
    riceVariety: "ขาวดอกมะลิ 105",
    transplanterModel: "Kubota SPW-48C (4 แถว)",
    status: "SRP Low Carbon",
    averageYieldKgPerRai: 540,
    yieldEstimateKg: 27000,
    yieldEstimateTon: 27.0,
    coords: [17.060, 104.680] as [number, number],
    polygon: [
      [17.061, 104.678],
      [17.063, 104.679],
      [17.062, 104.682],
      [17.059, 104.681],
    ] as [number, number][],
  },
  {
    id: "field-2",
    customerName: "คุณสมจิตร พูนผล",
    locationName: "แปลงสวนแม่มูล ต.ธาตุพนม อ.ธาตุพนม จ.นครพนม",
    areaRai: 65,
    areaSqm: 104000,
    riceVariety: "กข6",
    transplanterModel: "Kubota NSP-60W (6 แถว)",
    status: "SRP Low Carbon",
    averageYieldKgPerRai: 666,
    yieldEstimateKg: 43290,
    yieldEstimateTon: 43.29,
    coords: [16.940, 104.710] as [number, number],
    polygon: [
      [16.941, 104.708],
      [16.943, 104.709],
      [16.942, 104.712],
      [16.939, 104.711],
    ] as [number, number][],
  },
  {
    id: "field-3",
    customerName: "กำนันสมบูรณ์ เกษตรมั่งคั่ง",
    locationName: "แปลงนาถ่อน ต.นาถ่อน อ.เมือง จ.นครพนม",
    areaRai: 85,
    areaSqm: 136000,
    riceVariety: "กข15",
    transplanterModel: "Kubota SPW-48C",
    status: "SRP Low Carbon",
    averageYieldKgPerRai: 560,
    yieldEstimateKg: 47600,
    yieldEstimateTon: 47.6,
    coords: [17.320, 104.750] as [number, number],
    polygon: [
      [17.321, 104.748],
      [17.323, 104.749],
      [17.322, 104.752],
      [17.319, 104.751],
    ] as [number, number][],
  },
  {
    id: "field-4",
    customerName: "ผู้ใหญ่ปรีชา ผาสุข",
    locationName: "แปลงกุสุมาลย์ ต.กุสุมาลย์ จ.สกลนคร",
    areaRai: 70,
    areaSqm: 112000,
    riceVariety: "ไรซ์เบอร์รี่",
    transplanterModel: "Kubota NSP-60W",
    status: "SRP Low Carbon",
    averageYieldKgPerRai: 500,
    yieldEstimateKg: 35000,
    yieldEstimateTon: 35.0,
    coords: [17.330, 104.330] as [number, number],
    polygon: [
      [17.331, 104.328],
      [17.333, 104.329],
      [17.332, 104.332],
      [17.329, 104.331],
    ] as [number, number][],
  },
  {
    id: "field-5",
    customerName: "คุณนงนุช ข้าวยิ้ม",
    locationName: "แปลงหนองย่างชิ้น อ.เรณูนคร จ.นครพนม",
    areaRai: 40,
    areaSqm: 64000,
    riceVariety: "ขาวดอกมะลิ 105",
    transplanterModel: "Kubota SPW-48C",
    status: "Conventional",
    averageYieldKgPerRai: 540,
    yieldEstimateKg: 21600,
    yieldEstimateTon: 21.6,
    coords: [17.110, 104.620] as [number, number],
    polygon: [
      [17.111, 104.618],
      [17.113, 104.619],
      [17.112, 104.622],
      [17.109, 104.621],
    ] as [number, number][],
  }
];

export default function Environment() {
  const { language } = useLanguage();
  const t = environmentTranslationsData[language] || environmentTranslationsData.th;

  const [millRecords, setMillRecords] = useState<MillRecord[]>([]);
  const [loadingMill, setLoadingMill] = useState<boolean>(true);
  const [memberMasterCount, setMemberMasterCount] = useState<number>(917);
  
  const [customerFields, setCustomerFields] = useState<CustomerFieldPlot[]>(TRANSPLANTER_CUSTOMER_FIELDS);
  const [loadingFields, setLoadingFields] = useState<boolean>(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string>("PLOT-001");

  useEffect(() => {
    async function loadData() {
      setLoadingMill(true);
      setLoadingFields(true);
      try {
        const [millData, fieldsData, mCount] = await Promise.all([
          fetchMillData(),
          fetchTransplanterCustomerFields(),
          fetchMemberMasterCount()
        ]);
        setMillRecords(millData);
        if (mCount) setMemberMasterCount(mCount);
        if (fieldsData && fieldsData.length > 0) {
          setCustomerFields(fieldsData);
          setSelectedFieldId(fieldsData[0].id);
        }
      } catch (err) {
        console.error("Error loading sustainability report data:", err);
      } finally {
        setLoadingMill(false);
        setLoadingFields(false);
      }
    }
    loadData();
  }, []);

  // Calculate stats from live mill records
  const totalMillInboundWeightKg = millRecords.reduce((acc, curr) => {
    const w = curr.weight || (curr.bags ? curr.bags * 30 : 0);
    return acc + w;
  }, 0) || 250020;

  const actualOutboundWeightKg = millRecords.reduce((acc, curr) => acc + (curr.outboundWeight || 0), 0);
  const totalMillOutboundWeightKg = actualOutboundWeightKg > 0 
    ? actualOutboundWeightKg 
    : Math.round(totalMillInboundWeightKg * 0.6);

  const totalMillBags = millRecords.reduce((acc, curr) => acc + (curr.bags || 0), 0) || 8334;
  const totalCustomerJobs = millRecords.length > 0 ? millRecords.length : 2069;
  const totalUniqueMembers = memberMasterCount || 917;

  // Milling GHG Carbon Footprint Factor = 0.12 kgCO2e per kg milled rice
  const millCFPFactor = 0.12; 
  const totalMillEmissionsKg = Math.round(totalMillOutboundWeightKg * millCFPFactor);
  const scope1EmissionsKg = Math.round(totalMillEmissionsKg * 0.367);
  const scope2EmissionsKg = Math.round(totalMillEmissionsKg * 0.380);
  const scope3EmissionsKg = totalMillEmissionsKg - scope1EmissionsKg - scope2EmissionsKg;

  // Calculate rice type distribution for Downstream processing PieChart
  const riceTypeDistribution = useMemo(() => {
    if (!millRecords || millRecords.length === 0) {
      return [
        { name: 'ข้าวเหนียว (กข6 / น่าน59)', value: 1322, weightKg: 160020, color: '#D97706', percent: 64.0 },
        { name: 'ข้าวเจ้า (ขาวดอกมะลิ 105)', value: 661, weightKg: 80000, color: '#16A34A', percent: 32.0 },
        { name: 'ข้าวเหนียว + ข้าวเจ้า (ผสม)', value: 70, weightKg: 8500, color: '#2563EB', percent: 3.4 },
        { name: 'ข้าวมีสี / ไรซ์เบอร์รี่', value: 16, weightKg: 1500, color: '#9333EA', percent: 0.6 },
      ];
    }

    const counts: Record<string, { jobs: number; bags: number; weight: number }> = {};

    millRecords.forEach(r => {
      let rawType = (r.riceType || '').trim();
      let category = 'ข้าวเจ้า (ขาวดอกมะลิ 105)';

      if (!rawType || rawType === '21' || rawType === '3.75' || rawType.includes('ไม่ระบุ')) {
        category = 'ข้าวเหนียว (กข6 / น่าน59)';
      } else if (rawType.includes('เหนียว') && rawType.includes('เจ้า')) {
        category = 'ข้าวเหนียว + ข้าวเจ้า (ผสม)';
      } else if (rawType.includes('เหนียว')) {
        category = 'ข้าวเหนียว (กข6 / น่าน59)';
      } else if (rawType.includes('เจ้า') || rawType.includes('มะลิ') || rawType.includes('105')) {
        category = 'ข้าวเจ้า (ขาวดอกมะลิ 105)';
      } else if (rawType.includes('สี') || rawType.includes('กล้อง') || rawType.includes('เบอร์รี่')) {
        category = 'ข้าวมีสี / ไรซ์เบอร์รี่';
      } else {
        category = 'อื่นๆ';
      }

      if (!counts[category]) {
        counts[category] = { jobs: 0, bags: 0, weight: 0 };
      }
      const bags = r.bags || 0;
      const w = r.weight || (bags ? bags * 30 : 0);
      counts[category].jobs += 1;
      counts[category].bags += bags;
      counts[category].weight += w;
    });

    const totalWeight = Object.values(counts).reduce((sum, c) => sum + c.weight, 0) || 1;

    const colorMap: Record<string, string> = {
      'ข้าวเหนียว (กข6 / น่าน59)': '#D97706',
      'ข้าวเจ้า (ขาวดอกมะลิ 105)': '#16A34A',
      'ข้าวเหนียว + ข้าวเจ้า (ผสม)': '#2563EB',
      'ข้าวมีสี / ไรซ์เบอร์รี่': '#9333EA',
      'อื่นๆ': '#64748B'
    };

    return Object.entries(counts)
      .map(([name, data]) => ({
        name,
        jobs: data.jobs,
        bags: data.bags,
        weightKg: data.weight,
        percent: parseFloat(((data.weight / totalWeight) * 100).toFixed(1)),
        color: colorMap[name] || '#D97706'
      }))
      .sort((a, b) => b.weightKg - a.weightKg);
  }, [millRecords]);

  const totalFieldsAreaRai = customerFields.reduce((acc, f) => acc + f.areaRai, 0);
  const totalFieldsYieldTon = customerFields.reduce((acc, f) => acc + f.yieldEstimateTon, 0);

  // Carbon Calculations for Section 1 (Upstream Agriculture)
  const baseYieldTon = totalFieldsYieldTon > 0 ? totalFieldsYieldTon : 65.0;
  const baseYieldKg = baseYieldTon * 1000;
  const srpEmissionsKg = baseYieldKg * 1.25;
  const conventionalEmissionsKg = baseYieldKg * 2.05;
  const avoidanceEmissionsKg = conventionalEmissionsKg - srpEmissionsKg;
  const avoidancePercent = Math.round((avoidanceEmissionsKg / conventionalEmissionsKg) * 100);

  const selectedField = customerFields.find(f => f.id === selectedFieldId) || customerFields[0] || TRANSPLANTER_CUSTOMER_FIELDS[0];

  // Calculate top 5 rice varieties by total planted area (rai)
  const topRiceVarieties = useMemo(() => {
    const map: Record<string, number> = {};
    customerFields.forEach((field) => {
      const variety = field.riceVariety?.trim() || "ไม่ระบุพันธุ์ข้าว";
      map[variety] = (map[variety] || 0) + (field.areaRai || 0);
    });

    return Object.entries(map)
      .map(([name, area]) => ({
        name,
        area: parseFloat(area.toFixed(1))
      }))
      .sort((a, b) => b.area - a.area)
      .slice(0, 5);
  }, [customerFields]);

  return (
    <section id="env" className="bg-[#F8FAF8] py-20 px-4 sm:px-8 border-t border-b border-border relative overflow-hidden">
      
      {/* Decorative Subtle Background Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-g1/50 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gold-lt/60 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <div className="container mx-auto max-w-[1240px]">
        
        {/* Section Header */}
        <FadeIn>
          <div className="flex flex-col items-start mb-10">
            <div className="inline-flex items-center gap-2 bg-g1 border border-g5/30 text-g7 text-[12px] font-bold px-3.5 py-1 rounded-md uppercase tracking-widest mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-g7" />
              {t.badge}
            </div>
            
            <h2 className="text-[clamp(1.6rem,3.5vw,2.4rem)] font-extrabold text-dark mb-2">
              {t.title}
            </h2>
            
            <div className="dv"></div>
            
            <p className="text-[15px] text-light leading-relaxed max-w-[840px]">
              {t.subtitlePart1}
              <span className="font-bold text-g9 text-dark">{t.knowField}</span>
              {t.subtitlePart2}
              <span className="font-bold text-[#92400E]">{t.knowRice}</span>
              {t.subtitlePart3}
            </p>
          </div>
        </FadeIn>

        {/* Large GIS Map Section */}
        <FadeIn delay={0.05}>
          <div className="bg-white rounded-2xl p-5 sm:p-7 border border-g5/30 shadow-md mb-10 relative overflow-hidden">
            
            {/* Header / Title bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-4 border-b border-border">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-11 h-11 bg-g1 rounded-xl flex items-center justify-center text-g9 border border-g5/30 shrink-0">
                  <MapPin className="w-5 h-5 text-g7" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-g7 uppercase tracking-wider block">{t.gisBadge}</span>
                  <h3 className="text-xl sm:text-2xl font-extrabold text-dark flex items-center gap-2">
                    {t.gisTitle}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-g7 font-bold bg-g1 px-3.5 py-1.5 rounded-full border border-g5/30 flex items-center gap-1.5">
                  {loadingFields && <RefreshCw className="w-3.5 h-3.5 animate-spin text-g7" />}
                  {loadingFields ? t.loadingCoords : t.totalPlots(customerFields.length)}
                </span>
              </div>
            </div>

            {/* Map Container - Large View */}
            <div className="w-full h-[380px] sm:h-[460px] rounded-xl overflow-hidden border border-border shadow-inner relative z-0 mb-4">
              <MapContainer 
                center={selectedField ? selectedField.coords : [17.126, 104.750]} 
                zoom={14} 
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewController 
                  center={selectedField ? selectedField.coords : [17.126, 104.750]} 
                  zoom={selectedField ? 15 : 14} 
                />
                {customerFields.map((field) => (
                  <React.Fragment key={field.id}>
                    {field.polygon && field.polygon.length > 0 && (
                      <Polygon 
                        positions={field.polygon}
                        pathOptions={{
                          color: selectedFieldId === field.id ? "#15803D" : field.status === "SRP Low Carbon" ? "#2E7D32" : "#D97706",
                          fillColor: selectedFieldId === field.id ? "#22C55E" : field.status === "SRP Low Carbon" ? "#4CAF50" : "#F59E0B",
                          fillOpacity: selectedFieldId === field.id ? 0.65 : 0.35,
                          weight: selectedFieldId === field.id ? 3.5 : 2
                        }}
                        eventHandlers={{
                          click: () => setSelectedFieldId(field.id)
                        }}
                      >
                        <Popup>
                          <div className="p-1 text-dark font-sans text-xs">
                            <p className="font-bold text-g9">{anonymizeName(field.customerName)}</p>
                            <p className="text-[11px] text-light mt-0.5">{field.locationName}</p>
                            <div className="mt-1.5 text-[11px] space-y-1 bg-g1/50 p-2 rounded border border-g5/20">
                              <p>🌾 <strong>{t.riceVariety}:</strong> {field.riceVariety}</p>
                              <p>📐 <strong>{t.plotArea}:</strong> {field.areaRai} {t.rai} {field.areaSqm ? `(${field.areaSqm.toLocaleString()} ${t.sqm})` : ''}</p>
                              <p>📊 <strong>Yield:</strong> {field.averageYieldKgPerRai || 540} {t.kg}/{t.rai}</p>
                              <p>🌾 <strong>{t.estimatedYield}:</strong> <span className="font-bold text-[#92400E]">{field.yieldEstimateTon} {t.ton}</span> {field.yieldEstimateKg ? `(${field.yieldEstimateKg.toLocaleString()} ${t.kg})` : ''}</p>
                              {field.transplanterModel && <p>🚜 <strong>{t.serviceType}:</strong> {field.transplanterModel}</p>}
                              <p>✨ <strong>{t.std}:</strong> <span className="font-bold text-g7">{field.status}</span></p>
                            </div>
                          </div>
                        </Popup>
                      </Polygon>
                    )}
                  </React.Fragment>
                ))}
              </MapContainer>
            </div>

            {/* Field Selector Pills */}
            <div className="mb-4">
              <span className="text-[11px] font-bold text-light uppercase tracking-wide block mb-1.5">
                {t.clickToSelect}
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                {customerFields.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFieldId(f.id)}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedFieldId === f.id 
                        ? "bg-g9 text-white font-bold shadow-xs scale-[1.02]" 
                        : "bg-gray-100 text-mid hover:bg-gray-200 border border-border"
                    }`}
                  >
                    <span>{anonymizeName(f.customerName)}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded ${selectedFieldId === f.id ? "bg-white/20 text-white" : "bg-white text-light"}`}>
                      {f.areaRai} {t.rai}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Field Quick Highlight Card */}
            {selectedField && (
              <div className="bg-g1/60 rounded-xl p-4 border border-g5/30">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-g5/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-g9 bg-white px-2.5 py-0.5 rounded border border-g5/30">
                      {selectedField.id}
                    </span>
                    <h5 className="font-extrabold text-dark text-sm sm:text-base">{anonymizeName(selectedField.customerName)}</h5>
                    <span className="text-xs text-light">({selectedField.locationName})</span>
                  </div>
                  <span className={`self-start sm:self-auto text-[10px] font-bold px-3 py-0.5 rounded-full ${
                    selectedField.status === "SRP Low Carbon" ? "bg-g1 text-g7 border border-g5/40" : "bg-gold-lt text-[#92400E] border border-gold/40"
                  }`}>
                    {t.std} {selectedField.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-border shadow-2xs">
                    <span className="text-[10px] text-light block mb-0.5">{t.plotArea}</span>
                    <span className="font-bold text-g9 text-sm">{selectedField.areaRai} {t.rai}</span>
                    {selectedField.areaSqm && <span className="text-[10px] text-light block mt-0.5">{selectedField.areaSqm.toLocaleString()} {t.sqm}</span>}
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-border shadow-2xs">
                    <span className="text-[10px] text-light block mb-0.5">{t.riceVariety}</span>
                    <span className="font-bold text-dark text-xs truncate block" title={selectedField.riceVariety}>{selectedField.riceVariety}</span>
                    <span className="text-[10px] text-g7 block mt-0.5">Yield {selectedField.averageYieldKgPerRai || 540} {t.kg}/{t.rai}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-border shadow-2xs">
                    <span className="text-[10px] text-light block mb-0.5">{t.estimatedYield}</span>
                    <span className="font-bold text-[#92400E] text-sm">{selectedField.yieldEstimateTon} {t.ton}</span>
                    <span className="text-[9px] text-light block mt-0.5">=(area_sqm/1600)×Yield</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-border shadow-2xs">
                    <span className="text-[10px] text-light block mb-0.5">{t.serviceType}</span>
                    <span className="font-bold text-g7 text-xs truncate block">{selectedField.transplanterModel || t.transplanterDefault}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </FadeIn>

        {/* 2 Side Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
          
          {/* LEFT SIDE: Upstream */}
          <FadeIn delay={0.1} className="flex flex-col">
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-g5/20 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
              
              {/* Header Title */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-g1 rounded-xl flex items-center justify-center text-g9 border border-g5/30 shrink-0">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-g7 uppercase tracking-wider block">{t.upstreamBadge}</span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-dark flex items-center gap-1.5">
                      {t.upstreamTitle} <span className="text-g9 font-bold">{t.knowField}</span>
                    </h3>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 bg-g1 text-g7 border border-g5/30 text-[11px] font-semibold rounded-full shrink-0">
                  {t.upstreamUnit}
                </span>
              </div>

              {/* Hero Carbon Display Box - Upstream */}
              <div className="bg-gradient-to-br from-g9 to-g8 text-white rounded-xl p-4 mb-4 shadow-md border border-g7/30 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                  <Leaf className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-g5">
                    {t.totalAgriCarbon}
                  </span>
                  <span className="text-[9px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {t.conventionalLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-3xl sm:text-4xl font-black tracking-tight" style={{ color: '#e8ff9c' }}>
                    {Math.round(conventionalEmissionsKg).toLocaleString()}
                  </span>
                  <span className="text-sm font-bold" style={{ color: '#e4ffe4' }}>kgCO₂e</span>
                  <span className="text-xs font-medium ml-1" style={{ color: '#ffffff' }}>
                    (~{(conventionalEmissionsKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} tCO₂e)
                  </span>
                </div>
                <p className="text-[11px]" style={{ color: '#e2e8f0' }}>
                  {t.calcFromYield(baseYieldTon.toLocaleString(undefined, { maximumFractionDigits: 1 }))}
                </p>
              </div>

              {/* Sub-section */}
              <div className="space-y-3.5">
                <h4 className="text-[11px] font-bold uppercase tracking-widest text-light flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-g7" />
                  {t.summaryMetricsTitle}
                </h4>

                {/* Metric 1 & 2 Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white p-3.5 rounded-xl border border-border shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-g1 rounded-lg flex items-center justify-center text-g9 shrink-0">
                        <Layers className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark block">{t.metric1Title}</span>
                        <span className="text-[10px] text-light">{t.metric1Desc}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-g9">
                        {totalFieldsAreaRai > 0 ? totalFieldsAreaRai.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "5,240"}
                      </span>
                      <span className="text-[11px] text-light font-bold ml-1">{t.rai}</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 rounded-xl border border-border shadow-2xs flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-gold-lt rounded-lg flex items-center justify-center text-[#92400E] shrink-0">
                        <Wheat className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold text-dark block">{t.metric2Title}</span>
                        <span className="text-[10px] text-light">{t.metric2Desc}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-extrabold text-[#92400E]">
                        {totalFieldsYieldTon > 0 ? totalFieldsYieldTon.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "65.0"}
                      </span>
                      <span className="text-[11px] text-light font-bold ml-1">{t.ton}</span>
                    </div>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white rounded-xl p-4 border border-g5/30 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <Leaf className="w-4 h-4 text-g7" />
                      <span className="text-xs font-bold text-dark">
                        {t.metric3Title}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-g7 bg-g1 px-2.5 py-0.5 rounded-full border border-g5/30">
                      Carbon Footprint
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div className="bg-g1/80 p-3 rounded-lg border border-g5/40">
                      <span className="text-[11px] font-bold text-g9 flex items-center gap-1 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-g7" />
                        {t.part1Title}
                      </span>
                      <p className="text-[10px] text-light mb-2">{t.part1Desc}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-extrabold text-g9">1.25</span>
                        <span className="text-[10px] font-semibold text-g7">kgCO₂ / kg</span>
                      </div>
                      <p className="text-[10px] text-mid mt-1 pt-1 border-t border-g5/20">
                        {t.part1Total} <strong className="text-g9">{Math.round(srpEmissionsKg).toLocaleString()} kgCO₂</strong>
                      </p>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <span className="text-[11px] font-bold text-dark mb-1 block">
                        {t.part2Title}
                      </span>
                      <p className="text-[10px] text-light mb-2">{t.part2Desc}</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-mid">2.05</span>
                        <span className="text-[10px] font-medium text-light">kgCO₂ / kg</span>
                      </div>
                      <p className="text-[10px] text-mid mt-1 pt-1 border-t border-gray-200">
                        {t.part2Total} <strong className="text-dark">{Math.round(conventionalEmissionsKg).toLocaleString()} kgCO₂</strong>
                      </p>
                    </div>
                  </div>

                  <div className="bg-g9 text-white rounded-lg p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-gold" />
                      <div>
                        <p className="font-bold text-[11px]">{t.avoidanceTitle}</p>
                        <p className="text-[10px] text-white/80">{t.avoidanceSub}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-gold">{t.avoidancePercent(avoidancePercent)}</span>
                      <span className="block text-[9px] text-white/90 font-semibold">(-{Math.round(avoidanceEmissionsKg).toLocaleString()} kgCO₂)</span>
                    </div>
                  </div>

                </div>

                {/* Top 5 Rice Varieties */}
                <div className="bg-white rounded-xl p-4 border border-g5/30 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-g7" />
                      <span className="text-xs font-bold text-dark">
                        {t.top5Title}
                      </span>
                    </div>
                    <span className="text-[10px] text-g7 font-bold bg-g1 px-2.5 py-0.5 rounded-full border border-g5/30">
                      Top 5 Varieties
                    </span>
                  </div>

                  <div className="w-full h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={topRiceVarieties} 
                        layout="vertical" 
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#64748B" }} unit={` ${t.rai}`} />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={115} 
                          tick={{ fontSize: 11, fill: "#1E293B", fontWeight: 600 }} 
                        />
                        <Tooltip
                          formatter={(value: any) => [`${value} ${t.rai}`, t.plotArea]}
                          contentStyle={{ borderRadius: "8px", fontSize: "12px", borderColor: "#86EFAC" }}
                        />
                        <Bar dataKey="area" radius={[0, 6, 6, 0]} barSize={18}>
                          {topRiceVarieties.map((_, index) => {
                            const colors = ["#15803D", "#16A34A", "#22C55E", "#4ADE80", "#86EFAC"];
                            return <Cell key={`variety-cell-${index}`} fill={colors[index % colors.length]} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-light text-center mt-1">
                    {t.top5Desc}
                  </p>
                </div>

              </div>

            </div>
          </FadeIn>


          {/* RIGHT SIDE: Downstream */}
          <FadeIn delay={0.2} className="flex flex-col">
            <div className="bg-white rounded-2xl p-6 sm:p-7 border border-gold/40 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full relative">
              
              {/* Header Title */}
              <div className="flex items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gold-lt rounded-xl flex items-center justify-center text-[#92400E] border border-gold/40 shrink-0">
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-[#92400E] uppercase tracking-wider block">{t.downstreamBadge}</span>
                    <h3 className="text-lg sm:text-xl font-extrabold text-dark flex items-center gap-1.5">
                      {t.downstreamTitle} <span className="text-[#92400E] font-bold">{t.knowRice}</span>
                    </h3>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-3 py-1 bg-gold-lt text-[#92400E] border border-gold/40 text-[11px] font-semibold rounded-full shrink-0">
                  {t.downstreamUnit}
                </span>
              </div>

              {/* Hero Carbon Display Box - Downstream */}
              <div className="bg-gradient-to-br from-[#78350F] to-[#92400E] text-white rounded-xl p-4 mb-4 shadow-md border border-gold/40 relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                  <Gauge className="w-24 h-24 text-white" />
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gold-lt">
                    {t.totalMillingCarbon}
                  </span>
                  <span className="text-[9px] bg-white/20 text-white font-semibold px-2 py-0.5 rounded-full backdrop-blur-xs">
                    {t.millDataLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 my-1">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {totalMillEmissionsKg.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-gold-lt">kgCO₂e</span>
                  <span className="text-xs text-white/80 font-medium ml-1">
                    (~{(totalMillEmissionsKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} tCO₂e)
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-white/20 text-[11px]">
                  <span className="text-white/90">{t.milledRiceCfp}</span>
                  <span className="font-extrabold text-gold text-xs">{t.cfpRate}</span>
                </div>
              </div>

              {/* SECTION 1 */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-[13px] font-bold text-dark flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-[#92400E]" />
                    {t.summaryMembersTitle}
                  </h4>
                  {loadingMill && (
                    <span className="text-[10px] text-g7 font-semibold animate-pulse flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> {t.syncingData}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-gold-lt/50 p-3 rounded-xl border border-gold/30 text-center">
                    <span className="text-[10px] font-bold text-[#92400E] uppercase block mb-0.5">{t.currentMembers}</span>
                    <span className="text-xl sm:text-2xl font-black text-[#92400E]">
                      {totalUniqueMembers}
                    </span>
                    <span className="text-[10px] text-[#92400E] font-bold ml-1">{t.persons}</span>
                    <p className="text-[9px] text-[#92400E]/80 mt-0.5">{t.farmersInSystem}</p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-border text-center">
                    <span className="text-[10px] font-bold text-dark uppercase block mb-0.5">{t.serviceJobs}</span>
                    <span className="text-xl sm:text-2xl font-black text-dark">
                      {totalCustomerJobs}
                    </span>
                    <span className="text-[10px] text-dark font-bold ml-1">{t.times}</span>
                    <p className="text-[9px] text-light mt-0.5">{t.millingHistory}</p>
                  </div>

                  <div className="bg-g1/50 p-3 rounded-xl border border-g5/30 text-center">
                    <span className="text-[10px] font-bold text-g7 uppercase block mb-0.5">{t.milledRiceProduced}</span>
                    <span className="text-xl sm:text-2xl font-black text-g9">
                      {(totalMillOutboundWeightKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </span>
                    <span className="text-[10px] text-g7 font-bold ml-1">{t.ton}</span>
                    <p className="text-[9px] text-g7/80 mt-0.5">{t.millingRate}</p>
                  </div>
                </div>

                <div className="mt-3.5 bg-amber-50/40 rounded-xl p-3.5 border border-amber-200/60 shadow-2xs">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[12px] font-bold text-dark flex items-center gap-1.5">
                      <Wheat className="w-3.5 h-3.5 text-[#92400E]" />
                      {t.riceTypeDistTitle}
                    </h5>
                    <span className="text-[9px] text-[#92400E] font-medium bg-amber-100/80 px-2 py-0.5 rounded-full">
                      {totalMillInboundWeightKg ? t.totalRice((totalMillInboundWeightKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })) : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                    <div className="sm:col-span-5 h-[150px] relative flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={riceTypeDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={58}
                            paddingAngle={3}
                            dataKey="weightKg"
                            nameKey="name"
                          >
                            {riceTypeDistribution.map((entry, index) => (
                              <Cell key={`rice-type-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any, name: any, props: any) => [
                              `${(Number(value) / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${t.ton} (${props.payload.percent}%)`,
                              props.payload.name
                            ]}
                            contentStyle={{ borderRadius: "8px", fontSize: "11px", borderColor: "#F59E0B" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[9px] font-bold text-gray-500 uppercase">{t.distribution}</span>
                        <span className="text-xs font-black text-[#92400E]">100%</span>
                      </div>
                    </div>

                    <div className="sm:col-span-7 space-y-1.5">
                      {riceTypeDistribution.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px] bg-white p-2 rounded-lg border border-amber-100/80 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-semibold text-dark truncate">{item.name}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="font-bold text-[#92400E] text-xs">{(item.weightKg / 1000).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {t.ton}</span>
                            <span className="text-[10px] text-gray-500 font-medium ml-1">({item.percent}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 */}
              <div className="mt-auto">
                <div className="bg-white rounded-xl p-4 border border-gold/40 shadow-2xs">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-[#92400E]" />
                      <span className="text-xs font-bold text-dark">
                        {t.ghgBreakdownTitle}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#92400E] bg-gold-lt px-2.5 py-0.5 rounded-full border border-gold/30">
                      {t.isoStandard}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg text-xs border border-border">
                      <div>
                        <span className="font-bold text-dark block">{t.scope1Title}</span>
                        <span className="text-[10px] text-light">{t.scope1Desc}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-dark text-xs">{scope1EmissionsKg.toLocaleString()}</span>
                        <span className="text-[10px] text-light font-medium ml-1">kgCO₂</span>
                        <span className="block text-[9px] text-light">({(scope1EmissionsKg / 1000).toFixed(2)} Ton CO₂e)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg text-xs border border-border">
                      <div>
                        <span className="font-bold text-dark block">{t.scope2Title}</span>
                        <span className="text-[10px] text-light">{t.scope2Desc}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-dark text-xs">{scope2EmissionsKg.toLocaleString()}</span>
                        <span className="text-[10px] text-light font-medium ml-1">kgCO₂</span>
                        <span className="block text-[9px] text-light">({(scope2EmissionsKg / 1000).toFixed(2)} Ton CO₂e)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg text-xs border border-border">
                      <div>
                        <span className="font-bold text-dark block">{t.scope3Title}</span>
                        <span className="text-[10px] text-light">{t.scope3Desc}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-dark text-xs">{scope3EmissionsKg.toLocaleString()}</span>
                        <span className="text-[10px] text-light font-medium ml-1">kgCO₂</span>
                        <span className="block text-[9px] text-light">({(scope3EmissionsKg / 1000).toFixed(2)} Ton CO₂e)</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-g1 border border-g5/30 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-g7 uppercase tracking-wider">
                        {t.totalMillingEmissions}
                      </p>
                      <p className="text-base font-extrabold text-g9 leading-tight">
                        {totalMillEmissionsKg.toLocaleString()} <span className="text-xs font-normal text-mid">kgCO₂ ({(totalMillEmissionsKg / 1000).toFixed(2)} Ton CO₂e)</span>
                      </p>
                    </div>

                    <div className="text-right border-l border-g5/20 pl-3">
                      <p className="text-[9px] font-bold text-g7 uppercase">Milled Rice CFP</p>
                      <p className="text-lg font-extrabold text-g9 leading-tight">
                        0.12 <span className="text-[10px] font-normal text-mid">kgCO₂ / kg</span>
                      </p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </FadeIn>

        </div>

        {/* Verification & Certification Footer */}
        <FadeIn delay={0.3}>
          <div className="mt-8 p-4 bg-white rounded-xl border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-g7 shrink-0" />
              <span className="text-mid">
                <strong>{t.cfoStatusLabel}</strong> {t.cfoStatusDetail} <br className="hidden sm:inline" />
                {t.cfoStatusSub}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 bg-gold-lt border border-gold px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#92400E]">
                🏅 ISO 14064-1
              </span>
              <span className="inline-flex items-center gap-1 bg-g1 border border-g5 px-2.5 py-1 rounded-md text-[11px] font-semibold text-g9">
                📊 TGO Carbon Footprint
              </span>
            </div>
          </div>
        </FadeIn>

      </div>
    </section>
  );
}

