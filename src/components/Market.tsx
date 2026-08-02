import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import FadeIn from "./FadeIn";
import { fetchMillData } from "../services/dashboardService";

const NKP_CENTER: [number, number] = [17.1791, 104.6641];
const BASE_MILL: [number, number] = [17.1791275, 104.6640595];

const baseIcon = L.divIcon({
  className: "",
  html: '<div style="width:24px;height:24px;border-radius:50%;background:#1B5E20;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px">🏭</div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

function MapBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [bounds, map]);
  return null;
}

const RICE_COLOR_MAP: Record<string, string> = {
  'ข้าวเจ้า': '#FFD54F',    // Amber
  'ข้าวเหนียว': '#2E7D32',  // Green
  'ข้าวมีสี': '#7B1FA2',   // Purple
};

const getRiceColor = (type: string) => {
  if (!type) return '#9E9E9E';
  for (const key in RICE_COLOR_MAP) {
    if (type.includes(key)) return RICE_COLOR_MAP[key];
  }
  return '#9E9E9E';
};

export default function Market() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bounds, setBounds] = useState<[number, number][]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchMillData();
        if (data.length === 0) {
          setLoading(false);
          return;
        }

        const validCustomers: any[] = [];
        const newBounds: [number, number][] = [BASE_MILL]; // Always include base mill

        data.forEach((row, idx) => {
          if (!row.location) return;
          const [lat, lng] = row.location;
          if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

          const name = row.customerName || `ลูกค้า ${idx + 1}`;
          const type = row.riceType || "";
          const isRice = type.toLowerCase().includes("สีข้าว") || type.toLowerCase().includes("rice") || !type;

          validCustomers.push({ lat, lng, name, type, isRice });
          newBounds.push([lat, lng]);
        });

        setCustomers(validCustomers);
        setBounds(newBounds);
      } catch (err) {
        console.error("Failed to load customers:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <section className="bg-g1 py-20 px-8" id="market">
      <div className="container mx-auto max-w-[1100px]">
        <FadeIn>
          <div className="text-[12px] font-bold text-g7 uppercase tracking-widest mb-2.5">พื้นที่ให้บริการ</div>
          <h2 className="text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold text-dark mb-3">ตลาดและเป้าหมายการขยายตัว</h2>
          <div className="dv"></div>
          <p className="text-[15px] text-light leading-relaxed max-w-[640px]">
            มุ่งเน้นพื้นที่จังหวัดนครพนมเป็นหลัก โดยเฉพาะอำเภอเมือง และอำเภอใกล้เคียง พื้นที่ให้บริการ 20 กิโลเมตรจากฐานปฏิบัติการหลัก บ้านหนองยาว ตำบลคำเตย
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start mt-8">
          <FadeIn>
            <div className="flex flex-col gap-4">
              {[
                { title: "จ.นครพนม", sub: "ฐานปฏิบัติการหลัก · บ้านหนองยาว ต.คำเตย อ.เมือง", val: "หลัก", unit: "พื้นที่" },
                { title: "พื้นที่ให้บริการ", sub: "ครอบคลุมพื้นที่อำเภอเมือง และอำเภอใกล้เคียง", val: "20", unit: "กม." },
                { title: "ศูนย์เพาะกล้า", sub: "อำเภอเมืองนครพนม · รับรอง Kubota Mat Seed Center", val: "อ.เมือง", unit: "นครพนม" },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-5 flex justify-between items-center shadow-sm">
                  <div>
                    <div className="text-[15px] font-bold text-dark">{item.title}</div>
                    <div className="text-[12px] text-light">{item.sub}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[1.5rem] font-extrabold text-g9">{item.val}</div>
                    <div className="text-[11px] text-light">{item.unit}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white rounded-xl p-5 text-center shadow-sm">
                <div className="text-[1.5rem] font-extrabold text-g9">฿180M+</div>
                <div className="text-[12px] text-light">รายได้เป้าหมาย 5 ปี</div>
              </div>
              <div className="bg-white rounded-xl p-5 text-center shadow-sm">
                <div className="text-[1.5rem] font-extrabold text-[#92400E]">35%</div>
                <div className="text-[12px] text-light">อัตราการเติบโต YoY</div>
              </div>
            </div>

            <div className="mt-5 bg-white rounded-xl px-5 py-4 shadow-sm">
              <div className="text-[12px] font-bold text-g9 mb-2">🎯 กลุ่มลูกค้าเป้าหมาย</div>
              <div className="text-[13px] text-mid leading-relaxed">
                เกษตรกรผู้ปลูกข้าวในจังหวัดนครพนม · กลุ่มวิสาหกิจชุมชน · สหกรณ์การเกษตร · ผู้รับเหมาก่อสร้างในภาคการเกษตร
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <div className="h-[440px] w-full bg-gray-200">
                <MapContainer center={NKP_CENTER} zoom={11} scrollWheelZoom={false} className="h-full w-full">
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Circle
                    center={BASE_MILL}
                    radius={20000}
                    pathOptions={{ color: "#4CAF50", weight: 1.5, opacity: 0.5, fillColor: "#4CAF50", fillOpacity: 0.06 }}
                  >
                    <Popup><b>พื้นที่ให้บริการ</b><br />รัศมี 20 กม. จากฐานปฏิบัติการ</Popup>
                  </Circle>
                  <Marker position={BASE_MILL} icon={baseIcon}>
                    <Popup>
                      <b>🏭 ฐานปฏิบัติการหลัก</b><br />บ้านหนองยาว ต.คำเตย<br />อ.เมือง จ.นครพนม<br /><small>โรงสีข้าวแม่โขงพืชผล + ศูนย์เพาะกล้า</small>
                    </Popup>
                  </Marker>
                  {customers.map((c, i) => (
                    <CircleMarker 
                      key={i} 
                      center={[c.lat, c.lng]} 
                      radius={6}
                      pathOptions={{ 
                        fillColor: getRiceColor(c.type), 
                        fillOpacity: 0.8, 
                        color: '#fff', 
                        weight: 1.5 
                      }}
                    >
                      <Popup>
                        <div className="font-bold text-[13px] text-dark">{c.type || "ไม่ระบุประเภท"}</div>
                        <div className="text-[11px] text-light mt-0.5">{c.lat.toFixed(5)}, {c.lng.toFixed(5)}</div>
                      </Popup>
                    </CircleMarker>
                  ))}
                  <MapBounds bounds={bounds} />
                </MapContainer>
              </div>
              <div className="bg-white px-4 py-2.5 flex items-center justify-between flex-wrap gap-1.5">
                <div className="text-[12px] text-mid">📍 ตำแหน่งลูกค้าในพื้นที่ จ.นครพนม</div>
                <div className="text-[12px] font-semibold text-g7">
                  {loading ? "กำลังโหลดข้อมูล…" : `พบลูกค้า ${customers.length} ราย`}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-[11px] text-mid">
                <span className="inline-block w-3 h-3 rounded-full bg-g9 border-2 border-white shadow-[0_0_0_2px_#1B5E20]"></span>ฐานปฏิบัติการหลัก
              </span>
              {Object.entries(RICE_COLOR_MAP).map(([type, color]) => (
                <span key={type} className="inline-flex items-center gap-1.5 text-[11px] text-mid">
                  <span className="inline-block w-3 h-3 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.1)]" style={{ backgroundColor: color }}></span>{type}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
