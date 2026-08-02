import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, MapPin, CheckCircle, AlertTriangle, RefreshCw, Smartphone, 
  User, ShieldCheck, Clock, Check, HelpCircle, Eye, AlertCircle,
  Printer, Download, QrCode, X, ExternalLink
} from "lucide-react";
import { Employee, Attendance } from "./ErpDashboard";

// Mekong Rice Mill Main Coordinates (Center)
const MILL_LAT = 15.24440;
const MILL_LNG = 104.85550;
const WORKSPACE_RADIUS_METERS = 200; // Allowed radius

interface LineClockInPortalProps {
  employees: Employee[];
  attendanceLog: Attendance;
  onClockInSuccess: (employeeId: string, status: "present" | "late", photoUrl: string, distance: number) => void;
}

interface LineLogItem {
  id: string;
  employeeId: string;
  name: string;
  lineNick: string;
  time: string;
  gpsLoc: string;
  distance: number;
  photoUrl: string;
  status: "present" | "late" | "failed";
  reason?: string;
}

export default function LineClockInPortal({ employees, attendanceLog, onClockInSuccess }: LineClockInPortalProps) {
  // Mobile UI simulations
  const [showQrPoster, setShowQrPoster] = useState<boolean>(false);
  const [selectedEmpId, setSelectedEmpId] = useState<string>(employees[0]?.id || "");
  const [useRealGps, setUseRealGps] = useState<boolean>(false);
  const [simulatedLoc, setSimulatedLoc] = useState<string>("in1");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; precision?: number }>({
    lat: MILL_LAT,
    lng: MILL_LNG
  });
  
  // Geolocation states
  const [locating, setLocating] = useState<boolean>(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [computedDistance, setComputedDistance] = useState<number>(0);
  
  // Camera/Photo States
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Simulated LINE Clock-In History timeline
  const [lineHistory, setLineHistory] = useState<LineLogItem[]>([
    {
      id: "line-hist-1",
      employeeId: "emp-1",
      name: "นายนิกร แก้วใส",
      lineNick: "Nikorn_K",
      time: "07:55 น.",
      gpsLoc: "15.24442, 104.85548",
      distance: 5,
      photoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80",
      status: "present"
    },
    {
      id: "line-hist-2",
      employeeId: "emp-2",
      name: "นายสมาน วันดี",
      lineNick: "Saman_W",
      time: "08:12 น.",
      gpsLoc: "15.24445, 104.85560",
      distance: 12,
      photoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80",
      status: "present"
    },
    {
      id: "line-hist-3",
      employeeId: "emp-4",
      name: "นางวันเพ็ญ สินธร",
      lineNick: "PenSimple",
      time: "08:45 น.",
      gpsLoc: "15.24430, 104.85530",
      distance: 25,
      photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80",
      status: "late"
    }
  ]);

  // Handle Location calculation (Haversine formula to compute distance in meters)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); // Distance in meters
  };

  // Preset Simulated Locations
  const presetLocations: Record<string, { name: string; lat: number; lng: number; isOut: boolean }> = {
    in1: { name: "เครื่องชั่งข้าวเปลือกหลัก (ในบริเวณ)", lat: 15.24442, lng: 104.85548, isOut: false },
    in2: { name: "โกดังพักรำบดละเอียด (ในบริเวณ)", lat: 15.24455, lng: 104.85565, isOut: false },
    in3: { name: "กิโลตราชั่งที่ #2 (ห่าง 85ม.)", lat: 15.24410, lng: 104.85490, isOut: false },
    out1: { name: "ร้านน้ำปั่นสามแยกทางเข้า (นอกพิกัด 450ม.)", lat: 15.24720, lng: 104.85810, isOut: true },
    out2: { name: "ตัวเมืองศรีสะเกษ / บขส. (นอกพิกัด 18กม.)", lat: 15.11020, lng: 104.32980, isOut: true }
  };

  // Re-evaluate whenever simulated coords of useRealGps outputs change
  useEffect(() => {
    if (!useRealGps) {
      const loc = presetLocations[simulatedLoc];
      if (loc) {
        setGpsCoords({ lat: loc.lat, lng: loc.lng });
        const dist = calculateDistance(MILL_LAT, MILL_LNG, loc.lat, loc.lng);
        setComputedDistance(dist);
        setLocErr(null);
      }
    }
  }, [simulatedLoc, useRealGps]);

  // Request actual Geolocation using navigator
  const handleRetrieveRealGps = () => {
    if (!navigator.geolocation) {
      setLocErr("บราวเซอร์ของคุณไม่รองรับการดึงค่าพิกัดพ้นที่");
      return;
    }
    setLocating(true);
    setLocErr(null);
    setUseRealGps(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude, precision: accuracy });
        const dist = calculateDistance(MILL_LAT, MILL_LNG, latitude, longitude);
        setComputedDistance(dist);
        setLocating(false);
      },
      (err) => {
        console.warn("Geolocation premium capture failed:", err);
        setLocErr(`ไม่สามารถดึงตำแหน่งพิกัด: ${err.message}`);
        setLocating(false);
        setUseRealGps(false); // Back to simulate
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  // Start Real Video Stream
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    setIsCapturing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCapturing(false);
    } catch (err: any) {
      console.warn("Webcam access rejected or not available:", err);
      setCameraError("ไม่พบกล้องเว็บแคม หรือระบบถูกบล็อกสิทธิ์ชั่วคราว");
      setIsCapturing(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Capture image frame
  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      
      if (context) {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        // flip photo horizontal for selfie style
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL("image/jpeg");
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  // Helper dynamic avatar generation for fallback offline photos
  const generateSimulatedPhoto = (empId: string) => {
    // Return sample colored avatar when webcam isn't linked
    const colors = ["F97316", "10B981", "3B82F6", "8B5CF6", "EC4899", "EF4444"];
    const hash = empId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const color = colors[hash % colors.length];
    return `https://images.unsplash.com/photo-${1500000000000 + (hash * 1000)}?w=120&auto=format&fit=crop&q=80`;
  };

  // Finalize clock-in processing
  const handleClockInSubmit = () => {
    const selectedEmp = employees.find(e => e.id === selectedEmpId);
    if (!selectedEmp) return;

    // Check GPS Locking condition
    const isAllowed = computedDistance <= WORKSPACE_RADIUS_METERS;

    if (!isAllowed) {
      alert(`⚠️ ปฏิเสธการลงเวลา! พิกัดปัจจุบันห่างจากโรงสี ${computedDistance.toLocaleString()} เมตร (กำหนดห้ามเกิน ${WORKSPACE_RADIUS_METERS} เมตร)`);
      
      // Still log a failed record in simulated history for debug audit
      const failedItem: LineLogItem = {
        id: `line-fail-${Date.now()}`,
        employeeId: selectedEmp.id,
        name: selectedEmp.name,
        lineNick: `${selectedEmp.name.split(" ")[0]}_L`,
        time: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.",
        gpsLoc: `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`,
        distance: computedDistance,
        photoUrl: capturedPhoto || generateSimulatedPhoto(selectedEmp.id),
        status: "failed",
        reason: `อยู่นอกพิกัดอนุญาต (${computedDistance} เมตร)`
      };
      setLineHistory([failedItem, ...lineHistory]);
      return;
    }

    // Determine status based on current clock time
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    
    // threshold: 08:30 is late limit
    const isLate = currentHour > 8 || (currentHour === 8 && currentMin > 30);
    const status: "present" | "late" = isLate ? "late" : "present";

    const finalPhoto = capturedPhoto || generateSimulatedPhoto(selectedEmp.id);

    // Call state update on parent (ERP Dashboard) so stats/wage calculates immediately
    onClockInSuccess(selectedEmp.id, status, finalPhoto, computedDistance);

    // Log success in history Timeline
    const successItem: LineLogItem = {
      id: `line-suc-${Date.now()}`,
      employeeId: selectedEmp.id,
      name: selectedEmp.name,
      lineNick: `${selectedEmp.name.split(" ")[0]}_Line`,
      time: now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.",
      gpsLoc: `${gpsCoords.lat.toFixed(5)}, ${gpsCoords.lng.toFixed(5)}`,
      distance: computedDistance,
      photoUrl: finalPhoto,
      status: status
    };

    setLineHistory([successItem, ...lineHistory]);
    setCapturedPhoto(null); // Clear active card selfie
    
    alert(`🎉 ลงเวลากู้พิกัดผ่าน LINE สำเร็จ!\nพนักงาน: ${selectedEmp.name}\nสถานะ: ${status === "present" ? "มาทำงาน (ปกติ)" : "มาสาย"}\nพิกัดห่าง: ${computedDistance} เมตร`);
  };

  // QR Code Type Selector inside Poster modal
  const [qrCodeType, setQrCodeType] = useState<"real" | "mock">("real");
  const liveUrlForQr = typeof window !== "undefined" ? (`${window.location.origin}/?tab=hr&v=line`) : "https://ai.studio/build";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" id="line-liff-portal">
      {/* Simulation Controller Panel: Left Side */}
      <div className="xl:col-span-8 space-y-6">
        <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-5 rounded-2xl shadow-md border border-emerald-800">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded uppercase">LINE LIFF API v2</span>
                <span className="text-xs text-emerald-350 flex items-center gap-1 font-mono uppercase tracking-widest font-black">
                  ● GPS Geo-Fence Established
                </span>
              </div>
              <h3 className="text-lg font-black tracking-tight font-sans">
                สถาปัตยกรรมลงเวลาเข้างานผ่านระบบ LINE (LINE Geo-Lock Portal)
              </h3>
              <p className="text-xs text-slate-300 leading-normal max-w-2xl">
                ระบบจัดการและตรวจสอบตัวตนพนักงานหน้าเครื่องสีอัตโนมัติ โดยพนักงานสแกน QR Code เพื่อเปิดหน้าเบราว์เซอร์ลัด (LINE LIFF) คอยดึงพิกัด (GPS) ความแม่นยำสูงพร้อมวิเคราะห์ใบหน้าพนักงาน ป้องกันการเซ็นชื่อแทนกันได้อย่างสมบูรณ์
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
              <div className="bg-white/10 hover:bg-white/15 border border-white/10 p-3 rounded-2xl flex flex-col items-center justify-center text-center shrink-0 min-w-[120px]">
                <span className="text-[10px] text-emerald-300 font-extrabold">ศูนย์พิกัดโรงสีหลัก</span>
                <span className="font-mono text-xs font-bold mt-1 text-white">15.2444, 104.8555</span>
                <span className="text-[9px] text-slate-400 mt-1">รัศมีตรวจคัดสรร 200 ม.</span>
              </div>
              <button
                type="button"
                onClick={() => setShowQrPoster(true)}
                className="w-full bg-emerald-500 hover:bg-emerald-450 text-slate-950 text-xs font-black py-2 px-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <QrCode size={13} /> พิมพ์แผ่นป้าย QR Code LINE
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Checklist Steps on LINE setup */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <h4 className="text-sm font-black text-slate-800 flex items-center gap-1.5 border-b border-rose-50/50 pb-2.5">
            <ShieldCheck className="text-emerald-500 w-5 h-5 animate-pulse" />
            ตู้จำลองสั่งงาน LINE Front-End Integration Sandbox
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Step 1: Select Employee & Simulated GPS */}
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/50">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 flex items-center gap-1.5 uppercase">
                  <span className="bg-emerald-100 text-emerald-800 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">1</span>
                  เลือกพนักงานที่เชื่อมกับระบบ LINE
                </label>
                <select 
                  value={selectedEmpId}
                  onChange={(e) => {
                    setSelectedEmpId(e.target.value);
                    setCapturedPhoto(null);
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs outline-none focus:border-emerald-500 font-bold text-slate-800 cursor-pointer"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Coordinate Simulation */}
              <div className="space-y-2 border-t border-slate-200/65 pt-3">
                <label className="text-[11px] font-black text-slate-500 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 uppercase">
                    <span className="bg-emerald-100 text-emerald-800 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">2</span>
                    ระบุตำแหน่ง/ทดสอบ GPS ล็อคสถานที่
                  </span>
                  {useRealGps && (
                    <span className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black">
                      GPS จริงมือถือ
                    </span>
                  )}
                </label>

                {!useRealGps ? (
                  <div className="space-y-1.5">
                    <select 
                      value={simulatedLoc}
                      onChange={(e) => setSimulatedLoc(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-xs outline-none focus:border-emerald-500 text-slate-700 cursor-pointer"
                    >
                      {Object.entries(presetLocations).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.name} - {item.isOut ? "🔴 อยู่นอกระยะโรงสี" : "🟢 ภายในรัศมีปฏิบัติการ"}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      พิกัดที่คิดระยะห่าง: <span className="font-mono text-slate-600 font-bold">{gpsCoords.lat.toFixed(5)}, {gpsCoords.lng.toFixed(5)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-150 rounded-lg text-xs space-y-1">
                    <p className="font-bold text-emerald-800 flex items-center gap-1">
                      <MapPin size={12} /> ได้รับพิกัดปัจจุบันจากเบราว์เซอร์สำเร็จ!
                    </p>
                    <p className="font-mono text-[10.5px] text-slate-700 text-xs">
                      Lat: {gpsCoords.lat.toFixed(6)} | Lng: {gpsCoords.lng.toFixed(6)}
                    </p>
                    {gpsCoords.precision && (
                      <p className="text-[9px] text-slate-400">ความคลาดเคลื่อนสัญญาณ: ± {Math.round(gpsCoords.precision)} เมตร</p>
                    )}
                    <button 
                      onClick={() => setUseRealGps(false)}
                      className="mt-1.5 font-bold text-[10px] text-orange-600 hover:underline cursor-pointer block"
                    >
                      ↩️ สลับกลับมาใช้พิกัดจำลองในบราวเซอร์
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={handleRetrieveRealGps}
                    disabled={locating}
                    type="button"
                    className="flex-1 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-250 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {locating ? <RefreshCw size={13} className="animate-spin" /> : <MapPin size={13} />}
                    {locating ? "กำลังดึงสายคาดจีพีเอส..." : "ดึงพิกัด GPS จริงพิศิษฐ์"}
                  </button>
                </div>
                {locErr && <p className="text-[10px] text-red-500 font-bold mt-1">⚠️ {locErr}</p>}
              </div>

              {/* Distance Output Metric */}
              <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-black block">ระยะห่างถึงแท่นสีศูนย์กลาง</span>
                  <span className={`text-lg font-black font-mono ${computedDistance <= WORKSPACE_RADIUS_METERS ? "text-emerald-600" : "text-red-500"}`}>
                    {computedDistance.toLocaleString()} เมตร
                  </span>
                </div>
                <div>
                  {computedDistance <= WORKSPACE_RADIUS_METERS ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-black flex items-center gap-1">
                      <CheckCircle size={10} /> ในเขตโรงสี ({WORKSPACE_RADIUS_METERS}ม.)
                    </span>
                  ) : (
                    <span className="text-[10px] bg-red-105 text-red-700 bg-red-50 px-3 py-1 rounded-full font-black flex items-center gap-1 border border-red-200">
                      <AlertTriangle size={10} /> นอกอาณาเขต
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Step 3: Web Camera Snap Photo */}
            <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 flex items-center justify-between uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="bg-emerald-100 text-emerald-800 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">3</span>
                    สแกนใบหน้า ถ่ายรูปยืนยันตัวตน
                  </span>
                </label>

                {/* Webcam Visualizer Stage */}
                <div className="relative w-full aspect-video rounded-xl bg-slate-900 border-2 border-dashed border-slate-300 overflow-hidden flex flex-col items-center justify-center text-center">
                  {cameraActive ? (
                    <>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                      />
                      {/* Face scanner HUD overlay target screen */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[110px] h-[110px] rounded-full border-2 border-emerald-500 animate-pulse relative">
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 bg-emerald-500 text-[8px] font-black px-1.5 py-0.2 rounded text-slate-950 font-mono tracking-widest uppercase">
                            FACIAL TARGET
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={handleCapturePhoto}
                        className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs py-1.5 px-4 rounded-full shadow-lg flex items-center gap-1 z-10 cursor-pointer"
                      >
                        <Camera size={13} /> กดลั่นชัตเตอร์ถ่ายรูป
                      </button>
                    </>
                  ) : capturedPhoto ? (
                    <div className="absolute inset-0 w-full h-full bg-slate-100 flex flex-col items-center justify-center">
                      <img src={capturedPhoto} alt="Captured Selfie" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        type="button" 
                        onClick={() => {
                          setCapturedPhoto(null);
                          startCamera();
                        }}
                        className="absolute bottom-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded font-bold backdrop-blur-xs cursor-pointer"
                      >
                        ถ่ายใหม่
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2 flex flex-col items-center">
                      <div className="p-3 bg-slate-800 rounded-full text-slate-400">
                        <Camera size={26} />
                      </div>
                      <p className="text-xs text-slate-400 font-bold">ไม่ได้เปิดกล้องถ่ายเซ็นใบหน้า</p>
                      <button 
                        type="button"
                        onClick={startCamera}
                        disabled={isCapturing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-1.5 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        {isCapturing ? <RefreshCw size={12} className="animate-spin" /> : "เปิดกล้องแท่นถ่ายรูป"}
                      </button>
                      <p className="text-[10px] text-slate-400">ระบบจำลองรูปโปรไฟล์อัตโนมัติหากไม่ประสงค์เปิดใช้กล้อง</p>
                    </div>
                  )}

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-4 text-center z-20 space-y-2">
                      <AlertCircle className="text-amber-500 w-8 h-8" />
                      <p className="text-xs text-slate-205 font-bold text-slate-300">แจ้งเตือน: {cameraError}</p>
                      <button 
                        onClick={() => { setCameraError(null); setCameraActive(false); }}
                        className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1 rounded"
                      >
                        สลับข้ามใช้รูปโปรไฟล์แทน
                      </button>
                    </div>
                  )}
                </div>
                {/* Hidden canvas tool */}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Submit Clock in final */}
              <div className="pt-2 border-t border-slate-200/60 flex flex-col gap-2">
                <button 
                  onClick={handleClockInSubmit}
                  type="button"
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black text-xs py-2.5 rounded-xl text-center shadow-xs cursor-pointer flex items-center justify-center gap-1"
                >
                  🚀 นำส่งข้อมูลเช็คลงเวลางานผ่าน LINE LIFF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LINE App Mock Frame Integration on the Right Side */}
      <div className="xl:col-span-4 space-y-6">
        {/* Smartphone Frame Simulation Container */}
        <div className="bg-slate-950 border-[8px] border-slate-850 rounded-[30px] p-0.5 shadow-xl select-none mx-auto max-w-[280px] xs:max-w-[325px]">
          <div className="bg-slate-900 rounded-[22px] overflow-hidden flex flex-col min-h-[460px] relative font-sans text-xs">
            {/* Top Smartphone notch / speaker */}
            <div className="h-5 w-full bg-slate-900 flex justify-center items-center">
              <div className="w-16 h-3 bg-black rounded-full text-[8px] text-slate-600 font-mono flex items-center justify-center tracking-widest leading-none">
                09:41
              </div>
            </div>

            {/* LINE LIFF Browser Header */}
            <div className="bg-[#06C755] text-white p-3 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Smartphone size={13} className="text-white animate-bounce" />
                <span className="font-extrabold text-[10px] tracking-wide uppercase">LINE Mini-App (LIFF)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] bg-emerald-700/50 px-2 py-0.5 rounded-full font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Mekong Lync</span>
              </div>
            </div>

            {/* Application Mock Body */}
            <div className="bg-slate-50 flex-1 p-3.5 space-y-3.5 overflow-y-auto max-h-[380px]">
              {/* LINE Header Greeting of chosen user */}
              {(() => {
                const activeE = employees.find(e => e.id === selectedEmpId);
                const isCheckToday = attendanceLog[selectedEmpId] && attendanceLog[selectedEmpId] !== "leave" && attendanceLog[selectedEmpId] !== "absent";
                return (
                  <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-2xs space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs">
                        {activeE?.name[4] || "L"}
                      </div>
                      <div className="space-y-0.2">
                        <p className="text-[9px] text-slate-400 font-bold font-mono">LINE ACCOUNT LINKED</p>
                        <p className="text-[11px] font-black text-slate-800">{activeE?.name || "ไม่ทราบชื่อ"}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-450 text-slate-500 leading-snug border-t border-slate-50 pt-2 flex items-center justify-between">
                      <span>สถานะเข้างานวันนี้:</span>
                      {isCheckToday ? (
                        <span className="text-emerald-600 font-bold bg-emerald-100/50 px-2 py-0.2 rounded">
                          เช็คชื่อแล้ว ({attendanceLog[selectedEmpId]})
                        </span>
                      ) : (
                        <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.2 rounded">
                          ยังไม่ลงชื่อผ่าน LINE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Location Checker Visual Block in LIFF Screen */}
              <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-2xs space-y-2.5">
                <p className="text-[10px] font-extrabold text-slate-800 flex items-center gap-1">
                  <MapPin size={11} className="text-[#06C755]" /> ตรวจพิกัดเพื่อปลดล็อคกฐิน
                </p>
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1 font-mono text-[9.5px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">พิกัด Lat:</span>
                    <span className="text-slate-850 font-bold">{gpsCoords.lat.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">พิกัด Lng:</span>
                    <span className="text-slate-850 font-bold">{gpsCoords.lng.toFixed(5)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-1 mt-1 font-sans">
                    <span className="text-slate-400 font-semibold">ระยะห่างวัดได้:</span>
                    <span className={`font-black ${computedDistance <= WORKSPACE_RADIUS_METERS ? "text-emerald-600" : "text-red-500"}`}>
                      {computedDistance} ม.
                    </span>
                  </div>
                </div>

                <div className="text-[10px] rounded-lg p-2 flex items-start gap-1.5 leading-snug bg-[#06C755]/10 text-emerald-800 border border-[#06C755]/20">
                  <ShieldCheck size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                  <p>พิกัดของท่านจะต้องอยู่ในระยะ <span className="font-bold">200 เมตร</span> จากเครื่องสกัดสีโรงสีเทคโนโลยีแม่โขงเพื่อเช็คชื่อผ่าน</p>
                </div>
              </div>

              {/* Clock Timer in LIFF */}
              <div className="bg-white border border-slate-100 p-3 rounded-xl shadow-2xs text-center space-y-1">
                <Clock size={16} className="text-slate-450 mx-auto text-slate-400" />
                <p className="text-[9px] text-slate-400 font-extrabold uppercase uppercase">เวลาเซ็นชื่อเรียลไทม์</p>
                <p className="text-base font-black text-slate-800 font-mono tracking-tight">
                  {new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} น.
                </p>
              </div>
            </div>

            {/* Bottom System Bar */}
            <div className="bg-slate-900 h-9 p-2 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800 font-semibold px-4">
              <span className="hover:text-white cursor-pointer select-none">Mekong Technology Co.</span>
              <span className="text-xs text-[#06C755] font-black">⚙️ LIFF CLI</span>
            </div>
          </div>
        </div>

        {/* Audit Stream History logs list client side */}
        <div className="bg-white border border-slate-200/60 p-4 rounded-xl shadow-xs space-y-3.5">
          <div>
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1">
              <Clock className="text-amber-500 w-4 h-4" />
              การเช็คลงเวลางานผ่าน LINE ล่าสุด
            </h4>
            <p className="text-[10px] text-slate-400">ประวัตินำพิกัด GPS แอนด์เซลฟี่ตรวจสอบย้อนหลังพนักงาน</p>
          </div>

          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {lineHistory.map((item, idx) => {
              const isSuccess = item.status === "present" || item.status === "late";
              return (
                <div key={item.id || idx} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex gap-2 w-full text-xs hover:bg-slate-50 transition-colors">
                  <img src={item.photoUrl} alt="Facial Snap" className="w-10 h-10 rounded-lg object-cover bg-slate-200 border border-slate-200 shrink-0" referrerPolicy="no-referrer" />
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-extrabold text-slate-800 truncate leading-none">{item.name}</p>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                        item.status === "present" ? "bg-emerald-100 text-emerald-805 text-emerald-700" :
                        item.status === "late" ? "bg-amber-100 text-amber-805 text-amber-700" :
                        "bg-red-100 text-red-805 text-red-700"
                      }`}>
                        {item.status === "present" ? "ปกติ" : item.status === "late" ? "สาย" : "ไม่ผ่าน"}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-405 text-slate-400 leading-none">LINE Nick: <span className="text-slate-600 font-mono font-bold">@{item.lineNick}</span></p>
                    <div className="flex flex-wrap items-center justify-between text-[9px] text-slate-400 pt-1 font-mono">
                      <span>เวลา {item.time}</span>
                      <span>พิกัดห่าง: <span className="font-bold">{item.distance} ม.</span></span>
                    </div>
                    {item.reason && (
                      <p className="text-[9px] text-red-500 font-black pt-0.5 border-t border-slate-200 border-dashed">
                        ⚠️ {item.reason}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Printable official LINE QR Poster Modal overlay */}
      {showQrPoster && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200 print:bg-white print:absolute print:inset-0 print:z-50 print:p-0">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-205 max-w-lg w-full overflow-hidden flex flex-col relative print:border-none print:shadow-none print:rounded-none">
            {/* Close button - hidden when printing */}
            <button
              onClick={() => setShowQrPoster(false)}
              className="absolute top-4 right-4 bg-slate-150 hover:bg-slate-200 text-slate-700 p-2 rounded-full transition-all cursor-pointer z-10 print:hidden"
              title="ปิดหน้าต่าง"
            >
              <X size={18} />
            </button>

            {/* Print Poster Command Header - hidden when printing */}
            <div className="bg-slate-950 text-slate-300 p-4 border-b border-slate-800 flex items-center justify-between print:hidden">
              <div className="flex items-center gap-1.5">
                <Printer size={15} className="text-emerald-500" />
                <span className="text-xs font-black uppercase">แท่นพิมพ์แผ่นป้ายสแตนด์ลงเวลางาน (A4 Print Preview)</span>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-[#06C755] hover:bg-[#05b04b] text-slate-950 px-3.5 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-all"
              >
                <Printer size={13} /> สั่งพิมพ์ด้วยกระดาษ A4
              </button>
            </div>

            {/* Poster Sheet Body */}
            <div className="p-8 space-y-6 flex-1 text-center bg-white print:p-12 print:border-none">
              {/* Rice Seed Mill Official Stamp Top Header */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full border-4 border-emerald-600 flex items-center justify-center text-emerald-600 font-extrabold rotate-[-12deg] bg-white shadow-sm shrink-0">
                    <span className="text-[10px] uppercase font-black tracking-tighter">MEKONG</span>
                  </div>
                  <div className="text-left">
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">คู่มือลงเวลาด้วยระบบ LINE GEO-LOCK</h2>
                    <p className="text-xs text-slate-500 font-bold leading-normal">แผ่นป้ายสแตนด์ลงประจำหน้าร้าน/โรงงาน - กลุ่มโรงสีข้าวเทคโนโลยีแม่โขง</p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-emerald-600 via-yellow-500 to-emerald-600 rounded-full w-full mt-3"></div>
              </div>

              {/* Optional dynamic QR code selection - Hidden when printing */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-4 print:hidden max-w-xs mx-auto text-xs">
                <button
                  type="button"
                  onClick={() => setQrCodeType("real")}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                    qrCodeType === "real" ? "bg-emerald-600 text-white shadow-xs" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  🟢 สแกนทดสอบจริง (Live URL)
                </button>
                <button
                  type="button"
                  onClick={() => setQrCodeType("mock")}
                  className={`flex-1 py-1.5 font-bold rounded-lg transition-all ${
                    qrCodeType === "mock" ? "bg-slate-800 text-white shadow-xs" : "text-slate-500 hover:text-slate-705"
                  }`}
                >
                  🎨 บลูพริ้นท์แบรนดิ้ง LINE
                </button>
              </div>

              {/* Main Simulated or Active LINE QR Code Area with Beautiful Custom Design */}
              <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 max-w-xs mx-auto flex flex-col items-center justify-center space-y-4 shadow-inner">
                <div className="relative p-4 bg-white rounded-xl shadow-md border border-slate-200/60 w-[212px] h-[212px] flex items-center justify-center">
                  {/* Outer Frame dots / corners */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-4 border-l-4 border-emerald-600"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-4 border-r-4 border-emerald-600"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-4 border-l-4 border-emerald-600"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-4 border-r-4 border-emerald-600"></div>
                  
                  {qrCodeType === "real" ? (
                    <div className="relative">
                      {/* Generates a real functional QR Code redirecting to current deployment/dev workspace portal on scan! */}
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(liveUrlForQr)}&color=06c755`}
                        alt="Real Live Scan QR Code" 
                        width="180" 
                        height="180"
                        className="mx-auto rounded-lg"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow">
                          <span className="text-[7px] text-white font-black truncate">LIVE</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Simulating a highly realistic QR Code matrix using nice SVG graphics with LINE logo */
                    <svg width="180" height="180" className="mx-auto" viewBox="0 0 100 100">
                      {/* Corner Position Detection Blocks */}
                      <rect x="5" y="5" width="22" height="22" fill="#1e293b" rx="2" />
                      <rect x="9" y="9" width="14" height="14" fill="#ffffff" />
                      <rect x="12" y="12" width="8" height="8" fill="#06C755" rx="1" />

                      <rect x="73" y="5" width="22" height="22" fill="#1e293b" rx="2" />
                      <rect x="77" y="9" width="14" height="14" fill="#ffffff" />
                      <rect x="80" y="12" width="8" height="8" fill="#06C755" rx="1" />

                      <rect x="5" y="73" width="22" height="22" fill="#1e293b" rx="2" />
                      <rect x="9" y="77" width="14" height="14" fill="#ffffff" />
                      <rect x="12" y="80" width="8" height="8" fill="#06C755" rx="1" />

                      {/* Smaller Finder Block */}
                      <rect x="73" y="73" width="10" height="10" fill="#1e293b" />
                      <rect x="75" y="75" width="6" height="6" fill="#ffffff" />
                      <rect x="77" y="77" width="2" height="2" fill="#1e293b" />

                      {/* Dynamic QR Dots/Lines to simulate actual high density matrix */}
                      <path d="M32,5 h5 v3 h-5 z M42,5 h8 v2 h-8 z M54,5 h12 v3 h-12 z M32,12 h15 v2 h-15 z M52,12 h5 v5 h-5 z M62,12 h5 v2 h-5 z M32,18 h4 v4 h-4 z M40,18 h10 v2 h-10 z M54,18 h14 v3 h-14 z" fill="#334155" />
                      <path d="M5,32 h10 v4 h-10 z M18,32 h6 v2 h-6 z M28,32 h10 v3 h-10 z M42,32 h15 v2 h-15 z M62,32 h12 v4 h-12 z M78,32 h17 v3 h-17 z" fill="#1e293b" />
                      <path d="M5,40 h15 v2 h-15 z M24,40 h6 v5 h-6 z M34,40 h12 v3 h-12 z M50,40 h8 v3 h-8 z M62,40 h15 v2 h-15 z M82,40 h13 v2 h-13 z" fill="#334155" />
                      <path d="M5,48 h8 v3 h-8 z M18,48 h12 v2 h-12 z M34,48 h22 v3 h-22 z M60,48 h10 v3 h-10 z M74,48 h6 v2 h-6 z M84,48 h11 v4 h-11 z" fill="#1e293b" />
                      <path d="M5,56 h22 v3 h-22 z M32,56 h12 v2 h-12 z M50,56 h18 v4 h-18 z M72,56 h8 v2 h-8 z M84,56 h11 v3 h-11 z" fill="#334155" />
                      <path d="M32,64 h12 v2 h-12 z M48,64 h10 v3 h-10 z M62,64 h12 v3 h-12 z M78,64 h17 v2 h-17 z" fill="#1e293b" />
                      <path d="M32,72 h8 v3 h-8 z M44,72 h12 v4 h-12 z M60,72 h8 v2 h-8 z M32,80 h15 v2 h-15 z M52,80 h14 v4 h-14 z" fill="#334155" />
                      <path d="M32,88 h22 v3 h-22 z M58,88 h12 v2 h-12 z M74,88 h10 v3 h-10 z" fill="#1e293b" />

                      {/* Official LINE Logo in the direct center */}
                      <circle cx="50" cy="50" r="14" fill="#1e293b" />
                      <circle cx="50" cy="50" r="12" fill="#06C755" />
                      {/* Mock Text inside LINE center */}
                      <text x="50" y="52" fill="#ffffff" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">LINE</text>
                    </svg>
                  )}
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {qrCodeType === "real" ? "SCAN ACTIVE WORKSPACE LINK" : "SCAN TO CLOCK IN ON LINE"}
                  </span>
                  <p className="text-[11px] text-slate-450 font-bold pt-1.5 text-slate-500">
                    {qrCodeType === "real" 
                      ? "สแกนด้วยโทรศัพท์เพื่อทดสอบระบุพิกัด GPS และเซลฟี่ย้อนหลังจริง" 
                      : "สแกนเข้าสู่หน้าบริการกลุ่มสารสนเทศและลงเวลาแม่โขง"}
                  </p>
                  {qrCodeType === "real" && (
                    <p className="text-[9px] text-[#06C755] font-black break-all font-mono leading-tight mt-1 max-w-[240px]">
                      {liveUrlForQr}
                    </p>
                  )}
                </div>
              </div>

              {/* Instruction Steps - visual layout inside A4 standee */}
              <div className="grid grid-cols-3 gap-3 text-left">
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-center space-y-1">
                  <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs font-black mx-auto">1</div>
                  <h4 className="text-[11px] font-black text-slate-800">เปิดสแกนคิวอาร์</h4>
                  <p className="text-[9px] text-slate-500 leading-tight">ใช้กล้องสแกนเพื่อเปลี่ยนหน้าเบราว์เซอร์อัตโนมัติ</p>
                </div>
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-center space-y-1">
                  <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs font-black mx-auto">2</div>
                  <h4 className="text-[11px] font-black text-slate-800">แชร์พิกัด GPS</h4>
                  <p className="text-[9px] text-slate-500 leading-tight">ยืนยันพิกัด ณ หน้าที่ทำงานโรงสีในรัศมี 200 เมตร</p>
                </div>
                <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-center space-y-1">
                  <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs font-black mx-auto">3</div>
                  <h4 className="text-[11px] font-black text-slate-800">ถ่ายรูปเซลฟี่</h4>
                  <p className="text-[9px] text-slate-500 leading-tight">ถ่ายภาพเพื่อยืนยันใบหน้าร่วมลงคะแนนเข้างานหลัก</p>
                </div>
              </div>

              {/* Geo-Location Locking Metric Warning stamp */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-1 flex items-start gap-2.5">
                <ShieldCheck size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[11px] font-extrabold text-amber-900 uppercase">ขอบเขตล็อกระบบดาวเทียมรักษาความปลอดภัย</h5>
                  <p className="text-[9.5px] text-amber-800 leading-snug">
                    ระบบห้ามพนักงานลงชื่อแทนผู้ร่วมงานโดยเด็ดขาด การสแกนนอกรัศมีพื้นที่โรงสีหลัก <span className="font-extrabold">({WORKSPACE_RADIUS_METERS} เมตร)</span> จะถูกปฏิเสธบันทึก และถือว่าขาดการปฏิบัติงานในวันดังกล่าว
                  </p>
                </div>
              </div>

              {/* Bottom Authority signatures placeholder */}
              <div className="pt-4 border-t border-slate-150 flex items-center justify-between text-slate-400 font-bold text-[9px] font-mono">
                <div className="text-left leading-normal space-y-0.2">
                  <p>พิกัดลอยตัว: 15.24440, 104.85550</p>
                  <p className="font-sans font-semibold">ฝ่ายสารสนเทศทรัพยากรบุคคล (Mekong HR Cloud)</p>
                </div>
                <div className="text-right flex items-center gap-1 leading-normal font-sans text-slate-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                  <span>ระบบตรวจสอบความปลอดภัยดาวเทียมเกตเวย์</span>
                </div>
              </div>
            </div>

            {/* Modal actions footer - hidden when printing */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 print:hidden rounded-b-3xl">
              <button
                type="button"
                onClick={() => setShowQrPoster(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-250 text-slate-700 text-xs font-black rounded-lg cursor-pointer transition-all"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-[#06C755] hover:bg-[#05b04b] text-slate-950 text-xs font-black rounded-lg cursor-pointer transition-all flex items-center gap-1"
              >
                <Printer size={13} /> พิมพ์/บันทึก PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
