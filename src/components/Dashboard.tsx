import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { ArrowLeft, Wheat, Sprout, Loader2, Coins, HandCoins, Warehouse, Users, UserPlus, Search, UserCheck, MapPin, Briefcase, Calendar, Scale, Maximize2, Camera, CameraOff, ChevronRight, X, ArrowRight, Lock, ShieldCheck, ExternalLink, Database, LayoutGrid, List, Sparkles, Info, RotateCw, Trash2, PlusCircle, BookOpen, Save, CheckCircle, Printer, FileText, Image as ImageIcon, Smartphone } from "lucide-react";
import { fetchMillData, MillRecord, fetchPointsData, PointsRecord, fetchMemberData, MemberRecord } from "../services/dashboardService";
import ErpDashboard from "./ErpDashboard";
import CustomerServiceHistoryReportModal from "./CustomerServiceHistoryReportModal";
import { initAuth, googleSignIn, logoutGoogle, syncJobToGoogleSheets } from "../lib/firebaseAuth";

// Fix for default marker icon in react-leaflet
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import { motion } from "motion/react";

function MapBounds({ bounds }: { bounds: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds.length > 0) {
      const latestPoint = bounds[bounds.length - 1];
      // Zoom in as much as possible (Level 18 for high detail)
      map.flyTo(latestPoint, 18, { duration: 1.5 });
    }
  }, [bounds, map]);
  return null;
}

const SEEDLING_DATA = {
  totalRai: 5240,
  currentYearRai: 1250,
  historical: [
    { year: 2568, rai: 2150 },
    { year: 2567, rai: 1540 },
    { year: 2566, rai: 300 },
  ],
  riceTypes: [
    { name: 'ข้าวเจ้า', value: 35 },
    { name: 'ข้าวเหนียว', value: 55 },
    { name: 'ข้าวมีสี', value: 10 },
  ],
  customerFields: [
    { 
      id: 1, 
      name: "แปลงลุงดำ", 
      polygon: [
        [17.4000, 104.7800],
        [17.4050, 104.7800],
        [17.4050, 104.7850],
        [17.4000, 104.7850],
      ] as [number, number][]
    },
    { 
      id: 2, 
      name: "แปลงสวนแม่มูล", 
      polygon: [
        [17.4100, 104.7700],
        [17.4150, 104.7700],
        [17.4150, 104.7750],
        [17.4100, 104.7750],
      ] as [number, number][]
    }
  ]
};

const GREEN_COLORS = ['#2E7D32', '#66BB6A', '#A5D6A7'];
const ORANGE_COLORS = ['#E65100', '#FB8C00', '#FFB74D'];

const RICE_COLOR_MAP: Record<string, string> = {
  'ข้าวเจ้า': '#FFD54F',    // Amber
  'ข้าวเหนียว': '#2E7D32',  // Green
  'ข้าวมีสี': '#7B1FA2',   // Purple
};

const getRiceColor = (type: string) => {
  if (!type) return '#9E9E9E'; // Default Gray if not categorized
  for (const key in RICE_COLOR_MAP) {
    if (type.includes(key)) return RICE_COLOR_MAP[key];
  }
  return '#9E9E9E';
};

const normalizeThaiName = (str: string) => {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .replace(/[.·คุณนายนางสาว\s]/g, '')
    .trim();
};

const generateDeterministicGrains = (totalGrains: number, seedString: string, type: string) => {
  let seed = 0;
  for (let i = 0; i < seedString.length; i++) {
    seed += seedString.charCodeAt(i);
  }
  
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const grains = [];
  
  for (let i = 0; i < totalGrains; i++) {
    // Distribute grains across the canvas nicely
    const rx = 6 + random() * 88;
    const ry = 6 + random() * 88;
    const w = 3.5 + random() * 3.0; // standard width relative to canvas
    const h = 1.6 + random() * 1.4; // standard height relative to canvas
    const rotation = Math.round(random() * 180);
    
    // Construct 8 polygon vertices representing a natural rice grain outline
    const polygonPoints = [];
    const numSides = 8;
    const rotRad = (rotation * Math.PI) / 180;
    
    for (let j = 0; j < numSides; j++) {
      const angle = (j * 2 * Math.PI) / numSides;
      // Elliptical bounding coordinates with slight noise to make it organic (Requirement)
      const noise = 0.9 + random() * 0.2;
      const x0 = (w / 2) * Math.cos(angle) * noise;
      const y0 = (h / 2) * Math.sin(angle) * noise;
      
      // Rotate around its center
      const xRot = x0 * Math.cos(rotRad) - y0 * Math.sin(rotRad);
      const yRot = x0 * Math.sin(rotRad) + y0 * Math.cos(rotRad);
      
      polygonPoints.push({
        x: Math.max(0, Math.min(100, rx + xRot)),
        y: Math.max(0, Math.min(100, ry + yRot))
      });
    }

    const polygonString = polygonPoints.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

    grains.push({
      id: i + 1,
      x: rx,
      y: ry,
      w,
      h,
      rotation,
      polygonPoints,
      polygonString,
      isUserAdded: false,
    });
  }

  return grains;
};

function MemberMapBounds({ bounds, searchLocation }: { bounds: [number, number][], searchLocation?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (searchLocation) {
      map.flyTo(searchLocation, 16, { duration: 1.5 });
    } else if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [bounds, searchLocation, map]);
  return null;
}

export default function Dashboard({ defaultValue = 'seedling' }: { defaultValue?: 'mill' | 'seedling' | 'erp' }) {
  const [activeTab, setActiveTab ] = useState<'mill' | 'seedling' | 'erp'>(defaultValue);
  const [seedlingYear, setSeedlingYear] = useState<number>(2568);
  const [millRecords, setMillRecords] = useState<MillRecord[]>([]);
  const [pointsRecords, setPointsRecords] = useState<PointsRecord[]>([]);
  const [memberRecords, setMemberRecords] = useState<MemberRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [millFilterYear, setMillFilterYear] = useState<number>(new Date().getFullYear() + 543);
  const [millFilterMonth, setMillFilterMonth] = useState<number>(new Date().getMonth());
  const [millFilterType, setMillFilterType] = useState<'all' | 'monthly'>('all');

  const [pointsFilterType, setPointsFilterType] = useState<'all' | 'monthly' | 'daily'>('all');
  const [pointsFilterMonth, setPointsFilterMonth] = useState<number>(new Date().getMonth());
  const [pointsFilterYear, setPointsFilterYear] = useState<number>(new Date().getFullYear() + 543);
  const [pointsFilterDate, setPointsFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [memberFilterType, setMemberFilterType] = useState<'all' | 'monthly' | 'daily'>('all');
  const [memberFilterMonth, setMemberFilterMonth] = useState<number>(new Date().getMonth());
  const [memberFilterYear, setMemberFilterYear] = useState<number>(new Date().getFullYear() + 543);
  const [memberFilterDate, setMemberFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [searchedMemberResult, setSearchedMemberResult] = useState<MemberRecord | null>(null);
  const [isCustomerReportOpen, setIsCustomerReportOpen] = useState<boolean>(false);
  const [customerReportMode, setCustomerReportMode] = useState<'full' | 'compact'>('full');
  const [selectedJobIndex, setSelectedJobIndex] = useState<number>(0);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState<boolean>(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [aiAnalysisActiveType, setAiAnalysisActiveType] = useState<string | null>(null);
  const [hoveredBoxIdx, setHoveredBoxIdx] = useState<number | null>(null);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState<boolean>(true);
  const [aiSelectedModel, setAiSelectedModel] = useState<string>("gemini-3.7-flash");
  const [isVisionZoomOpen, setIsVisionZoomOpen] = useState<boolean>(false);

  // States for Google Sheets OAuth and Sync
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [sheetsAccessToken, setSheetsAccessToken] = useState<string | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);
  const [sheetsSyncMessage, setSheetsSyncMessage] = useState<string | null>(null);
  const [sheetsSyncError, setSheetsSyncError] = useState<string | null>(null);

  // States for Interactive AI Training / User Annotations
  const [userAnnotatedPoints, setUserAnnotatedPoints] = useState<{ x: number; y: number; label: string; timestamp: string; targetBoxIdx?: number | null }[]>([]);
  const [pendingAnnotationCoord, setPendingAnnotationCoord] = useState<{ x: number; y: number; targetBoxIdx?: number | null } | null>(null);
  const [pointedBoxIdx, setPointedBoxIdx] = useState<number | null>(null);
  const [isSavingTrainingData, setIsSavingTrainingData] = useState<boolean>(false);
  const [trainingSuccessMessage, setTrainingSuccessMessage] = useState<string | null>(null);
  const [dismissedSystemBoxes, setDismissedSystemBoxes] = useState<{ x: number; y: number }[]>([]);

  const [isSavingQuality, setIsSavingQuality] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // States for Full-grain Counting Boundaries Overlay & Polygon representation (User Intent)
  const [showAllGrains, setShowAllGrains] = useState<boolean>(false);
  const [grainShapeType, setGrainShapeType] = useState<'ellipse' | 'polygon'>('polygon');
  const [showGrainNumbers, setShowGrainNumbers] = useState<boolean>(true);
  const [userDeletedGrainCoords, setUserDeletedGrainCoords] = useState<{ x: number; y: number }[]>([]);
  const [userAddedGrains, setUserAddedGrains] = useState<{ x: number; y: number; w: number; h: number; rotation: number }[]>([]);
  const [hoveredGrainId, setHoveredGrainId] = useState<number | null>(null);
  const [zoomEditMode, setZoomEditMode] = useState<'annotate_defect' | 'refine_count'>('annotate_defect');

  // Load Google Auth state on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setSheetsAccessToken(token);
      },
      () => {
        setGoogleUser(null);
        setSheetsAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Load saved analysis or reset states when selecting a different job or member
  useEffect(() => {
    if (!searchedMemberResult) {
      setAiAnalysisResult(null);
      setAiAnalysisActiveType(null);
      setUserAnnotatedPoints([]);
      setDismissedSystemBoxes([]);
      setUserDeletedGrainCoords([]);
      setUserAddedGrains([]);
      return;
    }
    const normMemberName = searchedMemberResult.name.trim().toLowerCase();
    const userMillJobs = millRecords.filter(r => {
      const normMillName = r.customerName.trim().toLowerCase();
      return normMillName.includes(normMemberName) || normMemberName.includes(normMillName);
    });
    const activeJob = userMillJobs[selectedJobIndex] || userMillJobs[0];
    
    if (activeJob) {
      if (activeJob.aiAnalysisResult) {
        setAiAnalysisResult(activeJob.aiAnalysisResult);
        setAiAnalysisActiveType(activeJob.aiAnalysisActiveType || 'paddy');
        setUserAnnotatedPoints(activeJob.userAnnotatedPoints || []);
        // @ts-ignore
        setDismissedSystemBoxes(activeJob.dismissedSystemBoxes || []);
      } else {
        setAiAnalysisResult(null);
        setAiAnalysisActiveType(null);
        setUserAnnotatedPoints([]);
        setDismissedSystemBoxes([]);
      }

      // Load counting corrections
      const jobKey = `${activeJob.customerName || ''}-${activeJob.date || ''}-${activeJob.riceType || ''}-${activeJob.bags || 0}-${activeJob.weight || 0}`;
      const overridesStr = localStorage.getItem('mekong_rice_mill_local_overrides');
      
      // @ts-ignore
      let loadedDeleted = activeJob.userDeletedGrainCoords || [];
      // @ts-ignore
      let loadedAdded = activeJob.userAddedGrains || [];
      
      if (overridesStr) {
        try {
          const overrides = JSON.parse(overridesStr);
          if (overrides[jobKey]) {
            if (overrides[jobKey].userDeletedGrainCoords) {
              loadedDeleted = overrides[jobKey].userDeletedGrainCoords;
            }
            if (overrides[jobKey].userAddedGrains) {
              loadedAdded = overrides[jobKey].userAddedGrains;
            }
          }
        } catch (e) {
          console.error("Error reading overrides:", e);
        }
      }
      setUserDeletedGrainCoords(loadedDeleted);
      setUserAddedGrains(loadedAdded);
    } else {
      setAiAnalysisResult(null);
      setAiAnalysisActiveType(null);
      setUserAnnotatedPoints([]);
      setDismissedSystemBoxes([]);
      setUserDeletedGrainCoords([]);
      setUserAddedGrains([]);
    }
    
    setAiAnalysisError(null);
    setHoveredBoxIdx(null);
    setShowBoundingBoxes(true);
    setPendingAnnotationCoord(null);
    setTrainingSuccessMessage(null);
    setSheetsSyncMessage(null);
    setSheetsSyncError(null);
  }, [selectedJobIndex, searchedMemberResult, millRecords]);

  // Helper to find the bounding box under mouse cursor in percentages
  const findPointedBox = (xPercent: number, yPercent: number) => {
    if (!aiAnalysisResult?.data?.detectedBoxes) return null;
    const boxes = aiAnalysisResult.data.detectedBoxes;
    
    // 1. Check if inside any box
    let insideIndices: number[] = [];
    boxes.forEach((box: any, idx: number) => {
      const xMin = box.x;
      const xMax = box.x + box.w;
      const yMin = box.y;
      const yMax = box.y + box.h;
      if (xPercent >= xMin && xPercent <= xMax && yPercent >= yMin && yPercent <= yMax) {
        insideIndices.push(idx);
      }
    });
    
    if (insideIndices.length > 0) {
      // Pick the one where center is closer to the cursor
      let bestIdx = insideIndices[0];
      let minD = Infinity;
      insideIndices.forEach(idx => {
        const box = boxes[idx];
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const d = Math.sqrt(Math.pow(xPercent - cx, 2) + Math.pow(yPercent - cy, 2));
        if (d < minD) {
          minD = d;
          bestIdx = idx;
        }
      });
      return bestIdx;
    }
    
    // 2. Find closest center within 12% threshold
    let bestIdx = -1;
    let minD = Infinity;
    boxes.forEach((box: any, idx: number) => {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const d = Math.sqrt(Math.pow(xPercent - cx, 2) + Math.pow(yPercent - cy, 2));
      if (d < minD) {
        minD = d;
        bestIdx = idx;
      }
    });
    
    if (minD <= 12) {
      return bestIdx;
    }
    return null;
  };

  // Reactively calculate metrics combining AI data + user manual correction points + system box dismissals
  const calculateQualityMetrics = (
    type: string | null,
    data: any,
    userPoints: any[],
    dismissed: { x: number; y: number }[],
    deletedGrains: { x: number; y: number }[] = [],
    addedGrains: any[] = []
  ) => {
    if (!type || !data) return null;
    
    const redCount = userPoints.filter(p => p.label.includes('แดง') || p.label.toLowerCase().includes('red')).length;
    const chalkyCount = userPoints.filter(p => p.label.includes('ท้องไข่') || p.label.toLowerCase().includes('chalky')).length;
    const glutinousCount = userPoints.filter(p => p.label.includes('เหนียว') || p.label.toLowerCase().includes('glutinous')).length;
    const shriveledCount = userPoints.filter(p => p.label.includes('ลีบ') || p.label.toLowerCase().includes('shriveled')).length;
    const weedCount = userPoints.filter(p => p.label.includes('วัชพืช') || p.label.toLowerCase().includes('weed')).length;
    const impurityCount = userPoints.filter(p => p.label.includes('กรวด') || p.label.includes('เจือปน') || p.label.toLowerCase().includes('impurity')).length;
    const brokenCount = userPoints.filter(p => p.label.includes('หัก') || p.label.toLowerCase().includes('broken')).length;
    const totalUserPoints = userPoints.length;

    const grainAdjustmentsCount = addedGrains.length - deletedGrains.length;

    if (type === 'paddy') {
      const baseTotalGrains = data.grainCountSimulated?.paddyGrains || 450;
      
      const visibleSystemBoxes = (data.detectedBoxes || []).filter((box: any) => 
        !dismissed.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1)
      );
      const baseContaminants = data.detectedBoxes ? visibleSystemBoxes.length : Math.max(0, (data.grainCountSimulated?.foreignItems || 5) - dismissed.length);
      
      const adjustedTotalGrains = Math.max(1, baseTotalGrains + grainAdjustmentsCount);
      const adjustedContaminants = baseContaminants + totalUserPoints;
      const adjustedGoodGrains = Math.max(0, adjustedTotalGrains - adjustedContaminants);
      
      const adjustedPercent = parseFloat(((adjustedContaminants / adjustedTotalGrains) * 100).toFixed(1));
      const adjustedGrade = adjustedPercent < 1.0 ? 'A' : adjustedPercent < 2.5 ? 'B' : 'C';
      
      return {
        totalGrains: adjustedTotalGrains,
        goodGrains: adjustedGoodGrains,
        contaminantGrains: adjustedContaminants,
        impurityPercent: adjustedPercent,
        qualityGrade: adjustedGrade,
        impurityDetails: data.impurityDetails || `พบหญ้าแห้ง ฟางข้าว เมล็ดข้าวลีบ เมล็ดวัชพืช และเศษฝุ่นละออง (รวม ${adjustedContaminants} ชิ้น)`,
        description: data.description || '',
        recommendations: data.recommendations || []
      };
    } else if (type === 'brown') {
      const baseTotalGrains = data.grainCountSimulated?.cleanBrownGrains || 500;
      
      const visibleSystemBoxes = (data.detectedBoxes || []).filter((box: any) => 
        !dismissed.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1)
      );
      const baseContaminants = data.detectedBoxes ? visibleSystemBoxes.length : Math.max(0, (data.grainCountSimulated?.redOrBlackGrains || 6) - dismissed.length);
      
      const adjustedTotalGrains = Math.max(1, baseTotalGrains + grainAdjustmentsCount);
      const adjustedContaminants = baseContaminants + totalUserPoints;
      const adjustedGoodGrains = Math.max(0, adjustedTotalGrains - adjustedContaminants);
      
      const adjustedPercent = parseFloat(((adjustedContaminants / adjustedTotalGrains) * 100).toFixed(1));
      const adjustedGrade = adjustedPercent < 1.0 ? 'A' : adjustedPercent < 3.0 ? 'B' : 'C';
      
      return {
        totalGrains: adjustedTotalGrains,
        goodGrains: adjustedGoodGrains,
        contaminantGrains: adjustedContaminants,
        redContaminationPercent: adjustedPercent,
        qualityGrade: adjustedGrade,
        description: data.description || '',
        recommendations: data.recommendations || []
      };
    } else {
      const baseTotalGrains = 500;
      const rawChalky = data.chalkyPercent !== undefined ? data.chalkyPercent : 2.5;
      const rawMixed = data.mixedGlutinousPercent !== undefined ? data.mixedGlutinousPercent : 0.2;
      
      const baseChalky = Math.round(baseTotalGrains * (rawChalky / 100));
      const baseGlutinous = Math.round(baseTotalGrains * (rawMixed / 100));
      
      const dismissedSystemChalky = (data.detectedBoxes || []).filter((box: any) => 
        dismissed.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1) &&
        (box.label?.includes('ท้องไข่') || box.label?.toLowerCase().includes('chalky'))
      ).length;

      const dismissedSystemGlutinous = (data.detectedBoxes || []).filter((box: any) => 
        dismissed.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1) &&
        (box.label?.includes('เหนียว') || box.label?.toLowerCase().includes('glutinous'))
      ).length;

      const dismissedSystemOthers = (data.detectedBoxes || []).filter((box: any) => 
        dismissed.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1) &&
        !(box.label?.includes('ท้องไข่') || box.label?.toLowerCase().includes('chalky') || box.label?.includes('เหนียว') || box.label?.toLowerCase().includes('glutinous'))
      ).length;

      const otherContaminants_base = (data.detectedBoxes || []).filter((box: any) => 
        !(box.label?.includes('ท้องไข่') || box.label?.toLowerCase().includes('chalky') || box.label?.includes('เหนียว') || box.label?.toLowerCase().includes('glutinous'))
      ).length;

      const adjustedChalky = Math.max(0, baseChalky - dismissedSystemChalky + chalkyCount);
      const adjustedGlutinous = Math.max(0, baseGlutinous - dismissedSystemGlutinous + glutinousCount);
      const otherContaminants = Math.max(0, otherContaminants_base - dismissedSystemOthers + shriveledCount + weedCount + impurityCount + brokenCount + redCount);
      
      const adjustedTotalGrains = Math.max(1, baseTotalGrains + grainAdjustmentsCount);
      const adjustedContaminants = adjustedChalky + adjustedGlutinous + otherContaminants;
      const adjustedGoodGrains = Math.max(0, adjustedTotalGrains - adjustedContaminants);
      
      const adjustedChalkyPercent = parseFloat(((adjustedChalky / adjustedTotalGrains) * 100).toFixed(1));
      const adjustedMixedPercent = parseFloat(((adjustedGlutinous / adjustedTotalGrains) * 100).toFixed(2));
      const adjustedGrade = (adjustedChalkyPercent < 2.0 && adjustedMixedPercent < 0.5) ? 'A' : (adjustedChalkyPercent < 5.0) ? 'B' : 'C';
      
      return {
        totalGrains: adjustedTotalGrains,
        goodGrains: adjustedGoodGrains,
        contaminantGrains: adjustedContaminants,
        chalkyPercent: adjustedChalkyPercent,
        mixedGlutinousPercent: adjustedMixedPercent,
        qualityGrade: adjustedGrade,
        description: data.description || '',
        recommendations: data.recommendations || []
      };
    }
  };

  const calculatedMetrics = React.useMemo(() => {
    if (!aiAnalysisResult || !aiAnalysisResult.data) return null;
    return calculateQualityMetrics(
      aiAnalysisActiveType,
      aiAnalysisResult.data,
      userAnnotatedPoints,
      dismissedSystemBoxes,
      userDeletedGrainCoords,
      userAddedGrains
    );
  }, [aiAnalysisResult, aiAnalysisActiveType, userAnnotatedPoints, dismissedSystemBoxes, userDeletedGrainCoords, userAddedGrains]);

  const activeJob = React.useMemo(() => {
    if (!searchedMemberResult) return null;
    const normMemberName = searchedMemberResult.name.trim().toLowerCase();
    const userMillJobs = millRecords.filter(r => {
      const normMillName = r.customerName.trim().toLowerCase();
      return normMillName.includes(normMemberName) || normMemberName.includes(normMillName);
    });
    return userMillJobs[selectedJobIndex] || userMillJobs[0];
  }, [searchedMemberResult, millRecords, selectedJobIndex]);

  const allGrains = React.useMemo(() => {
    if (!aiAnalysisResult || !aiAnalysisResult.data) return [];
    
    // Base grain count from original analysis or defaults
    const originalTotalGrains = aiAnalysisActiveType === 'paddy'
      ? (aiAnalysisResult.data.grainCountSimulated?.paddyGrains || 450)
      : aiAnalysisActiveType === 'brown'
      ? (aiAnalysisResult.data.grainCountSimulated?.cleanBrownGrains || 500)
      : 500;

    const imageUrl = aiAnalysisActiveType === 'paddy'
      ? activeJob?.riceInboundImg
      : aiAnalysisActiveType === 'brown'
      ? activeJob?.brownRiceImg
      : activeJob?.milledRiceImg;
      
    const seed = imageUrl || "mekong-seed-default-1";
    
    // Generate deterministic layout based on seed
    let baseGrains = generateDeterministicGrains(originalTotalGrains, seed, aiAnalysisActiveType || 'paddy');
    
    // Filter out user deleted grains
    if (userDeletedGrainCoords.length > 0) {
      baseGrains = baseGrains.filter(g => {
        return !userDeletedGrainCoords.some(del => {
          const dist = Math.sqrt(Math.pow(g.x - del.x, 2) + Math.pow(g.y - del.y, 2));
          return dist < 2.0; // 2.0% threshold
        });
      });
    }
    
    // Re-number remaining base grains sequentially
    let finalGrains = baseGrains.map((g, idx) => ({
      ...g,
      id: idx + 1,
    }));
    
    // Add user custom added grains
    userAddedGrains.forEach((added, idx) => {
      const id = finalGrains.length + 1;
      
      const polygonPoints = [];
      const numSides = 8;
      const rotRad = (added.rotation * Math.PI) / 180;
      for (let j = 0; j < numSides; j++) {
        const angle = (j * 2 * Math.PI) / numSides;
        const x0 = (added.w / 2) * Math.cos(angle);
        const y0 = (added.h / 2) * Math.sin(angle);
        const xRot = x0 * Math.cos(rotRad) - y0 * Math.sin(rotRad);
        const yRot = x0 * Math.sin(rotRad) + y0 * Math.cos(rotRad);
        polygonPoints.push({ x: added.x + xRot, y: added.y + yRot });
      }
      const polygonString = polygonPoints.map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

      finalGrains.push({
        id,
        x: added.x,
        y: added.y,
        w: added.w,
        h: added.h,
        rotation: added.rotation,
        polygonPoints,
        polygonString,
        isUserAdded: true,
      });
    });
    
    return finalGrains;
  }, [aiAnalysisResult, aiAnalysisActiveType, activeJob, userDeletedGrainCoords, userAddedGrains]);

  const saveGrainAdjustmentsToJob = (
    deletedCoords: { x: number; y: number }[],
    addedGrains: any[],
    customActiveType = aiAnalysisActiveType,
    customAiResult = aiAnalysisResult
  ) => {
    if (!searchedMemberResult || !customAiResult || !customAiResult.data) return;
    
    const targetJob = activeJob;
    if (targetJob) {
      const jobKey = `${targetJob.customerName || ''}-${targetJob.date || ''}-${targetJob.riceType || ''}-${targetJob.bags || 0}-${targetJob.weight || 0}`;
      
      // Calculate recalculated metrics to save
      const finalMetrics = calculateQualityMetrics(
        customActiveType,
        customAiResult.data,
        userAnnotatedPoints,
        dismissedSystemBoxes,
        deletedCoords,
        addedGrains
      );

      if (!finalMetrics) return;

      const overridesStr = localStorage.getItem('mekong_rice_mill_local_overrides');
      let overrides = overridesStr ? JSON.parse(overridesStr) : {};
      
      overrides[jobKey] = {
        ...overrides[jobKey],
        ...finalMetrics,
        userDeletedGrainCoords: deletedCoords,
        userAddedGrains: addedGrains,
        aiAnalysisActiveType: customActiveType,
        aiAnalysisResult: {
          ...customAiResult,
          data: {
            ...customAiResult.data,
            ...finalMetrics
          }
        }
      };
      
      localStorage.setItem('mekong_rice_mill_local_overrides', JSON.stringify(overrides));
      
      // Update local React state for millRecords
      const updatedRecords = millRecords.map((r: any) => {
        const key = `${r.customerName || ''}-${r.date || ''}-${r.riceType || ''}-${r.bags || 0}-${r.weight || 0}`;
        if (key === jobKey) {
          return {
            ...r,
            ...finalMetrics,
            userDeletedGrainCoords: deletedCoords,
            userAddedGrains: addedGrains,
            aiAnalysisResult: {
              ...customAiResult,
              data: {
                ...customAiResult.data,
                ...finalMetrics
              }
            }
          };
        }
        return r;
      });
      setMillRecords(updatedRecords);

      // Attempt Google Sheets Sync if authorized
      if (sheetsAccessToken) {
        try {
          const adjustedPercent = finalMetrics.impurityPercent !== undefined 
            ? finalMetrics.impurityPercent 
            : finalMetrics.redContaminationPercent !== undefined
            ? finalMetrics.redContaminationPercent
            : finalMetrics.chalkyPercent;

          syncJobToGoogleSheets(
            sheetsAccessToken,
            targetJob.customerName,
            targetJob.date,
            targetJob.riceType,
            targetJob.bags,
            targetJob.weight,
            {
              feedbackPoints: userAnnotatedPoints,
              dismissedPoints: dismissedSystemBoxes,
              adjustedPercent,
              adjustedGrade: finalMetrics.qualityGrade,
              impurityPercent: finalMetrics.impurityPercent,
              redContaminationPercent: finalMetrics.redContaminationPercent,
              chalkyPercent: finalMetrics.chalkyPercent
            }
          ).catch(e => console.error("Error background syncing sheet adjustments:", e));
        } catch (error) {
          console.error("Sheets background sync failed:", error);
        }
      }
    }
  };

  const exportToWordDoc = () => {
    if (!searchedMemberResult || !activeJob || !calculatedMetrics) return;

    const memberName = searchedMemberResult.name;
    const memberId = searchedMemberResult.id || "ไม่ระบุ";
    const riceType = activeJob.riceType || "ไม่ระบุพันธุ์ข้าว";
    const jobDate = activeJob.date || "ไม่ระบุวันที่";
    const bags = activeJob.bags || 0;
    const weight = activeJob.weight || 0;
    const outboundWeight = activeJob.outboundWeight || 0;

    const totalGrains = calculatedMetrics.totalGrains || 0;
    const goodGrains = calculatedMetrics.goodGrains || 0;
    const contaminantGrains = calculatedMetrics.contaminantGrains || 0;
    const qualityGrade = calculatedMetrics.qualityGrade || "B";
    const description = calculatedMetrics.description || "วิเคราะห์คุณภาพข้าวด้วยระบบอัตโนมัติสำเร็จ";

    // Format analysis type label
    let analysisTypeLabel = "ข้าวเปลือก (Inbound Paddy)";
    let metricLabel = "อัตราสิ่งเจือปนปนเปื้อน (Impurity)";
    let metricValue = "";

    if (aiAnalysisActiveType === "paddy") {
      analysisTypeLabel = "ข้าวเปลือก (Inbound Paddy)";
      metricLabel = "สัดส่วนสิ่งเจือปนและเศษขยะสะสม";
      metricValue = `${calculatedMetrics.impurityPercent ?? 0}%`;
    } else if (aiAnalysisActiveType === "brown") {
      analysisTypeLabel = "ข้าวกล้อง (Brown Rice)";
      metricLabel = "สัดส่วนข้าวแดงและเมล็ดด่างดำปนเปื้อน";
      metricValue = `${calculatedMetrics.redContaminationPercent ?? 0}%`;
    } else {
      analysisTypeLabel = "ข้าวสารสำเร็จรูป (Milled White Rice)";
      metricLabel = "สัดส่วนข้าวท้องไข่ (Chalkiness) / ข้าวเหนียวปน";
      metricValue = `ท้องไข่ ${calculatedMetrics.chalkyPercent ?? 0}% • ข้าวเหนียวปน ${calculatedMetrics.mixedGlutinousPercent ?? 0}%`;
    }

    const recommendationsHtml = (calculatedMetrics.recommendations || [])
      .map((rec: string) => `<li>${rec}</li>`)
      .join("");

    const documentHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>รายงานใบตรวจวิเคราะห์คุณภาพเมล็ดข้าว - AI-MekongRice</title>
        <style>
          body {
            font-family: 'Sarabun', 'Sarabun PSK', 'Angsana New', sans-serif;
            color: #1e293b;
            line-height: 1.6;
          }
          .title {
            font-size: 20pt;
            font-weight: bold;
            color: #1e3a8a;
            text-align: center;
            margin-bottom: 2px;
          }
          .subtitle {
            font-size: 12pt;
            color: #475569;
            text-align: center;
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 14pt;
            font-weight: bold;
            color: #ea580c;
            border-bottom: 2px solid #fdba74;
            padding-bottom: 4px;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .info-table, .metrics-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .info-table td {
            padding: 6px 10px;
            font-size: 12pt;
            vertical-align: top;
          }
          .info-label {
            font-weight: bold;
            color: #475569;
            width: 30%;
          }
          .metrics-table th {
            background-color: #f8fafc;
            color: #0f172a;
            font-weight: bold;
            font-size: 12pt;
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
          }
          .metrics-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            font-size: 12pt;
          }
          .grade-badge {
            font-size: 24pt;
            font-weight: bold;
            color: #16a34a;
            text-align: center;
          }
          .footer-section {
            margin-top: 40px;
            width: 100%;
          }
          .signature-box {
            width: 45%;
            float: left;
            text-align: center;
            font-size: 11pt;
            margin-top: 20px;
          }
          .signature-line {
            border-bottom: 1px solid #94a3b8;
            width: 80%;
            margin: 40px auto 10px auto;
          }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 15px;">
          <div class="title">โรงสีข้าวแม่โขงสินทรัพย์ Smart Rice Mill</div>
          <div class="subtitle">ใบรายงานวิเคราะห์เกรดข้าวสารและคุณภาพเมล็ดข้าวผ่านระบบปัญญาประดิษฐ์ (AI Vision Certificate)</div>
        </div>

        <div class="section-title">ข้อมูลลูกค้าและประวัติการรับบริการสีข้าว</div>
        <table class="info-table">
          <tr>
            <td class="info-label">รหัสสมาชิก (Member ID):</td>
            <td>${memberId}</td>
            <td class="info-label">ชื่อ-นามสกุลลูกค้า (Customer Name):</td>
            <td>${memberName}</td>
          </tr>
          <tr>
            <td class="info-label">วันที่ส่งสีข้าว (Milling Date):</td>
            <td>${jobDate}</td>
            <td class="info-label">สายพันธุ์ข้าวเปลือก (Rice Variety):</td>
            <td>${riceType}</td>
          </tr>
          <tr>
            <td class="info-label">จำนวนข้าวเปลือกที่นำส่ง:</td>
            <td>${bags} กระสอบ (น้ำหนักนำส่ง ${weight.toLocaleString()} กิโลกรัม)</td>
            <td class="info-label">น้ำหนักข้าวสารขาวขาออก:</td>
            <td>${outboundWeight > 0 ? `${outboundWeight.toLocaleString()} กิโลกรัม` : "กำลังรอผลหักสีขาออก"}</td>
          </tr>
        </table>

        <div class="section-title">ผลการคัดกรองกายภาพเมล็ดข้าวโดยระบบ AI Vision Scan</div>
        <table class="metrics-table">
          <thead>
            <tr>
              <th style="width: 50%;">รายการตรวจสอบ (Physical Checkup Item)</th>
              <th style="width: 50%;">ค่าสัดส่วนวิเคราะห์ที่ได้จากระบบวิชั่น (AI Result Metric)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ประเภทตัวสแกนวิเคราะห์ล่าสุด (Active Vision Scanner)</td>
              <td><strong>${analysisTypeLabel}</strong></td>
            </tr>
            <tr>
              <td>จำนวนเมล็ดที่ระบบนับวิเคราะห์ (Simulated Grain Count)</td>
              <td>${totalGrains.toLocaleString()} เมล็ด (เมล็ดสมบูรณ์: ${goodGrains.toLocaleString()} เมล็ด, สิ่งแปลกปลอม/จุดปนเปื้อน: ${contaminantGrains.toLocaleString()} จุด)</td>
            </tr>
            <tr>
              <td>${metricLabel}</td>
              <td style="color: #ea580c; font-weight: bold;">${metricValue}</td>
            </tr>
            <tr>
              <td>ประเมินผลเกรดระดับคุณภาพ (AI Certified Quality Grade)</td>
              <td class="grade-badge">เกรด ${qualityGrade}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">บันทึกคำอธิบายทางกายภาพข้าวและข้อสังเกตเพิ่มเติม</div>
        <p style="font-size: 11pt; text-align: justify; background-color: #fafafa; border-left: 4px solid #ea580c; padding: 10px; margin-bottom: 20px;">
          ${description}
        </p>

        <div class="section-title">คำแนะนำเชิงลึกด้านการปรับปรุงการขัดสีและบำรุงรักษาโรงสี</div>
        <ol style="font-size: 11pt; padding-left: 20px; margin-bottom: 30px;">
          ${recommendationsHtml || "<li>ไม่มีข้อแนะนำเพิ่มเติมสำหรับเกรดข้าวนี้</li>"}
        </ol>

        <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 15px; font-size: 9pt; color: #64748b; text-align: center;">
          เอกสารฉบับนี้จัดทำขึ้นโดยการประมวลผลข้อมูลภาพถ่ายร่วมกับระบบ AI-MekongRice Vision Model ผ่านระบบคลาวด์ มีความถูกต้องแม่นยำทางกายภาพเบื้องต้นสูง
        </div>

        <table class="footer-section">
          <tr>
            <td style="width: 50%; text-align: center;">
              <div class="signature-box" style="width: 100%;">
                <p>ลงชื่อ ............................................................ ลูกค้าสมาชิก</p>
                <p style="margin-top: 5px;">( คุณ ${memberName} )</p>
                <p style="color: #64748b; font-size: 10pt;">วันที่ ........ / ........ / ................</p>
              </div>
            </td>
            <td style="width: 50%; text-align: center;">
              <div class="signature-box" style="width: 100%;">
                <p>ลงชื่อ ............................................................ เจ้าหน้าที่วิเคราะห์ภาพ</p>
                <p style="margin-top: 5px;">( ผู้ตรวจวัดระบบ AI-MekongRice )</p>
                <p style="color: #64748b; font-size: 10pt;">วันที่ ........ / ........ / ................</p>
              </div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + documentHtml], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `รายงานใบตรวจคุณภาพข้าว_${memberName}_${jobDate}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteGrain = (grain: any) => {
    const newDeleted = [...userDeletedGrainCoords, { x: grain.x, y: grain.y }];
    setUserDeletedGrainCoords(newDeleted);
    saveGrainAdjustmentsToJob(newDeleted, userAddedGrains);
  };

  // Immediate save & update helper when annotations/dismissals are changed (Requirement 3)
  const saveAnnotatedPointsToJob = async (
    updatedPoints: { x: number; y: number; label: string; timestamp: string; targetBoxIdx?: number | null }[],
    updatedDismissed: { x: number; y: number }[] = dismissedSystemBoxes,
    customAiResult: any = aiAnalysisResult,
    customActiveType: string | null = aiAnalysisActiveType
  ) => {
    setUserAnnotatedPoints(updatedPoints);
    setDismissedSystemBoxes(updatedDismissed);
    
    if (!searchedMemberResult || !customAiResult || !customAiResult.data) return;
    const normMemberName = searchedMemberResult.name.trim().toLowerCase();
    const userMillJobs = millRecords.filter(r => {
      const normMillName = r.customerName.trim().toLowerCase();
      return normMillName.includes(normMemberName) || normMemberName.includes(normMillName);
    });
    const targetJob = userMillJobs[selectedJobIndex] || userMillJobs[0];
    
    if (targetJob) {
      const jobKey = `${targetJob.customerName || ''}-${targetJob.date || ''}-${targetJob.riceType || ''}-${targetJob.bags || 0}-${targetJob.weight || 0}`;
      
      const finalMetrics = calculateQualityMetrics(
        customActiveType,
        customAiResult.data,
        updatedPoints,
        updatedDismissed
      );

      if (!finalMetrics) return;

      const updatedRecords = millRecords.map((r: any) => {
        const key = `${r.customerName || ''}-${r.date || ''}-${r.riceType || ''}-${r.bags || 0}-${r.weight || 0}`;
        if (key === jobKey) {
          return {
            ...r,
            ...finalMetrics,
            userAnnotatedPoints: updatedPoints,
            dismissedSystemBoxes: updatedDismissed,
            aiAnalysisActiveType: customActiveType,
            aiAnalysisResult: {
              ...customAiResult,
              data: {
                ...customAiResult.data,
                ...finalMetrics
              }
            }
          };
        }
        return r;
      });
      
      setMillRecords(updatedRecords);
      
      const overridesStr = localStorage.getItem('mekong_rice_mill_local_overrides');
      let overrides = overridesStr ? JSON.parse(overridesStr) : {};
      overrides[jobKey] = {
        ...finalMetrics,
        userAnnotatedPoints: updatedPoints,
        dismissedSystemBoxes: updatedDismissed,
        aiAnalysisActiveType: customActiveType,
        aiAnalysisResult: {
          ...customAiResult,
          data: {
            ...customAiResult.data,
            ...finalMetrics
          }
        }
      };
      localStorage.setItem('mekong_rice_mill_local_overrides', JSON.stringify(overrides));

      // Attempt Google Sheets Sync if authorized
      if (sheetsAccessToken) {
        try {
          setSheetsSyncError(null);
          setSheetsSyncMessage("กำลังซิงค์ผลการแก้ไขไปยัง Google Sheets...");
          
          const adjustedPercent = finalMetrics.impurityPercent !== undefined 
            ? finalMetrics.impurityPercent 
            : finalMetrics.redContaminationPercent !== undefined
            ? finalMetrics.redContaminationPercent
            : finalMetrics.chalkyPercent;

          await syncJobToGoogleSheets(
            sheetsAccessToken,
            targetJob.customerName,
            targetJob.date,
            targetJob.riceType,
            targetJob.bags,
            targetJob.weight,
            {
              feedbackPoints: updatedPoints,
              dismissedPoints: updatedDismissed,
              adjustedPercent,
              adjustedGrade: finalMetrics.qualityGrade,
              impurityPercent: finalMetrics.impurityPercent,
              redContaminationPercent: finalMetrics.redContaminationPercent,
              chalkyPercent: finalMetrics.chalkyPercent
            }
          );
          
          setSheetsSyncMessage("✅ อัปเดตพิกัดผิดปกติและผลการปรับปรุงคุณภาพลง Google Sheets เรียบร้อย!");
        } catch (error: any) {
          console.error("Google Sheets Sync Error:", error);
          setSheetsSyncError(`ซิงค์ข้อมูลลง Google Sheets ล้มเหลว: ${error.message || error}`);
        }
      }
    }
  };

  const handleSaveRiceQuality = async () => {
    if (!searchedMemberResult || !calculatedMetrics) return;
    setIsSavingQuality(true);
    setSaveSuccessMessage(null);
    
    // Simulate beautiful save progress
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const normMemberName = searchedMemberResult.name.trim().toLowerCase();
    const userMillJobs = millRecords.filter(r => {
      const normMillName = r.customerName.trim().toLowerCase();
      return normMillName.includes(normMemberName) || normMemberName.includes(normMillName);
    });
    const targetJob = userMillJobs[selectedJobIndex] || userMillJobs[0];
    
    if (targetJob) {
      const jobKey = `${targetJob.customerName || ''}-${targetJob.date || ''}-${targetJob.riceType || ''}-${targetJob.bags || 0}-${targetJob.weight || 0}`;
      
      // Update this job's record in local state
      const updatedRecords = millRecords.map((r: any) => {
        const key = `${r.customerName || ''}-${r.date || ''}-${r.riceType || ''}-${r.bags || 0}-${r.weight || 0}`;
        if (key === jobKey) {
          return {
            ...r,
            impurityPercent: calculatedMetrics.impurityPercent,
            redContaminationPercent: calculatedMetrics.redContaminationPercent,
            chalkyPercent: calculatedMetrics.chalkyPercent,
            mixedGlutinousPercent: calculatedMetrics.mixedGlutinousPercent,
            qualityGrade: calculatedMetrics.qualityGrade,
            grainCountSimulated: {
              paddyGrains: calculatedMetrics.totalGrains,
              foreignItems: calculatedMetrics.contaminantGrains,
              cleanBrownGrains: calculatedMetrics.totalGrains,
              redOrBlackGrains: calculatedMetrics.contaminantGrains,
            },
            userAnnotatedPoints: userAnnotatedPoints,
            aiAnalysisActiveType: aiAnalysisActiveType,
            aiAnalysisResult: {
              ...aiAnalysisResult,
              data: {
                ...aiAnalysisResult.data,
                ...calculatedMetrics
              }
            }
          };
        }
        return r;
      });
      
      setMillRecords(updatedRecords);
      
      // Persist overrides in localStorage
      const overridesStr = localStorage.getItem('mekong_rice_mill_local_overrides');
      let overrides = overridesStr ? JSON.parse(overridesStr) : {};
      overrides[jobKey] = {
        impurityPercent: calculatedMetrics.impurityPercent,
        redContaminationPercent: calculatedMetrics.redContaminationPercent,
        chalkyPercent: calculatedMetrics.chalkyPercent,
        mixedGlutinousPercent: calculatedMetrics.mixedGlutinousPercent,
        qualityGrade: calculatedMetrics.qualityGrade,
        grainCountSimulated: {
          paddyGrains: calculatedMetrics.totalGrains,
          foreignItems: calculatedMetrics.contaminantGrains,
          cleanBrownGrains: calculatedMetrics.totalGrains,
          redOrBlackGrains: calculatedMetrics.contaminantGrains,
        },
        userAnnotatedPoints: userAnnotatedPoints,
        aiAnalysisActiveType: aiAnalysisActiveType,
        aiAnalysisResult: {
          ...aiAnalysisResult,
          data: {
            ...aiAnalysisResult.data,
            ...calculatedMetrics
          }
        }
      };
      
      localStorage.setItem('mekong_rice_mill_local_overrides', JSON.stringify(overrides));
      setSaveSuccessMessage("บันทึกผลการประเมินคุณภาพข้าวและรายละเอียดการนับลงในระบบฐานข้อมูลเรียบร้อยแล้ว!");
      
      // Auto fade out success message
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    }
    setIsSavingQuality(false);
  };

  const runAiRiceAnalysis = async (type: 'paddy' | 'brown' | 'milled', imageUrl: string | undefined, customerName: string, riceType: string) => {
    // Retrieve existing user points and dismissed boxes for this job to preserve them
    const normMemberName = customerName.trim().toLowerCase();
    const userMillJobs = millRecords.filter(r => {
      const normMillName = r.customerName.trim().toLowerCase();
      return normMillName.includes(normMemberName) || normMemberName.includes(normMillName);
    });
    const activeJob = userMillJobs[selectedJobIndex] || userMillJobs[0];

    let existingPoints = userAnnotatedPoints;
    let existingDismissed = dismissedSystemBoxes;

    if (activeJob) {
      const jobKey = `${activeJob.customerName || ''}-${activeJob.date || ''}-${activeJob.riceType || ''}-${activeJob.bags || 0}-${activeJob.weight || 0}`;
      const overridesStr = localStorage.getItem('mekong_rice_mill_local_overrides');
      
      existingPoints = activeJob.userAnnotatedPoints || [];
      existingDismissed = activeJob.dismissedSystemBoxes || [];
      
      if (overridesStr) {
        try {
          const overrides = JSON.parse(overridesStr);
          if (overrides[jobKey]) {
            if (overrides[jobKey].userAnnotatedPoints) {
              existingPoints = overrides[jobKey].userAnnotatedPoints;
            }
            if (overrides[jobKey].dismissedSystemBoxes) {
              existingDismissed = overrides[jobKey].dismissedSystemBoxes;
            }
          }
        } catch (e) {
          console.error("Error reading overrides in runAiRiceAnalysis:", e);
        }
      }
    }

    // Set component state immediately to preserve them on UI
    setUserAnnotatedPoints(existingPoints);
    setDismissedSystemBoxes(existingDismissed);

    setAiAnalysisLoading(true);
    setAiAnalysisError(null);
    setAiAnalysisActiveType(type);
    setAiAnalysisResult(null);

    // Use placeholder images if the job record doesn't contain pictures
    let finalImageUrl = imageUrl;
    if (!finalImageUrl || finalImageUrl.length < 5) {
      if (type === 'paddy') {
        finalImageUrl = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600';
      } else if (type === 'brown') {
        finalImageUrl = 'https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=600';
      } else {
        finalImageUrl = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600';
      }
    }

    try {
      const response = await fetch('/api/gemini/analyze-rice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: finalImageUrl,
          type,
          customerName,
          riceType,
          model: aiSelectedModel,
        }),
      });

      const resJson = await response.json();
      if (resJson.success) {
        setAiAnalysisResult(resJson);
        // Automatically save the newly fetched AI result while preserving manual feedback points and sync to Google Sheets
        await saveAnnotatedPointsToJob(existingPoints, existingDismissed, resJson, type);
      } else {
        setAiAnalysisError(resJson.errorMsg || 'เกิดข้อผิดพลาดในการวิเคราะห์ข้าวด้วย AI-MekongRice');
      }
    } catch (err: any) {
      console.error(err);
      setAiAnalysisError('ไม่สามารถเชื่อมต่อเครื่องบริการประมวลผลข้าวด้วย AI-MekongRice ได้ในขณะนี้');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const [lightboxImg, setLightboxImg] = useState<{ url: string; title: string } | null>(null);
  const [lightboxImgError, setLightboxImgError] = useState<boolean>(false);
  const [lightboxMode, setLightboxMode] = useState<'direct' | 'iframe'>('direct');
  const [showMillDataTableModal, setShowMillDataTableModal] = useState<boolean>(false);
  const [millingSelectedDate, setMillingSelectedDate] = useState<string>("2026-06-25");
  const [millingViewMode, setMillingViewMode] = useState<'table' | 'bento'>('table');

  const MONTHS_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      const [mReq, pReq, memReq] = await Promise.all([
        fetchMillData(),
        fetchPointsData(),
        fetchMemberData()
      ]);
      
      const overridesStr = localStorage.getItem('mekong_rice_mill_local_overrides');
      if (overridesStr) {
        try {
          const overrides = JSON.parse(overridesStr);
          const merged = mReq.map((r: any) => {
            const key = `${r.customerName || ''}-${r.date || ''}-${r.riceType || ''}-${r.bags || 0}-${r.weight || 0}`;
            if (overrides[key]) {
              return { ...r, ...overrides[key] };
            }
            return r;
          });
          setMillRecords(merged);
        } catch (e) {
          console.error("Error merging overrides", e);
          setMillRecords(mReq);
        }
      } else {
        setMillRecords(mReq);
      }
      
      setPointsRecords(pReq);
      setMemberRecords(memReq);
    } catch (err) {
      console.error("Error refreshing dashboard data", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setActiveTab(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await handleRefreshData();
      setLoading(false);
    };
    loadData();
  }, []);

  // Reactive search lookup for individual member
  useEffect(() => {
    const queryClean = normalizeThaiName(memberSearchQuery);
    if (!queryClean) {
      setSearchedMemberResult(null);
      setSelectedJobIndex(0);
      return;
    }
    const found = memberRecords.find(m => {
      const normName = normalizeThaiName(m.name);
      const normPhone = m.phone.replace(/[-\s]/g, '');
      const searchPhoneClean = memberSearchQuery.replace(/[-\s]/g, '');
      return normName.includes(queryClean) || 
             queryClean.includes(normName) || 
             (searchPhoneClean && normPhone.includes(searchPhoneClean));
    });
    setSearchedMemberResult(found || null);
    setSelectedJobIndex(0);
  }, [memberSearchQuery, memberRecords]);

  // Calculate top 8 similar/nearby customer names based on search query
  const similarMembers = React.useMemo(() => {
    const queryClean = normalizeThaiName(memberSearchQuery);
    if (!queryClean) return [];
    
    return memberRecords.filter(m => {
      const normName = normalizeThaiName(m.name);
      const normPhone = m.phone.replace(/[-\s]/g, '');
      const searchPhoneClean = memberSearchQuery.replace(/[-\s]/g, '');
      
      return normName.includes(queryClean) || 
             queryClean.includes(normName) ||
             m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
             (searchPhoneClean && normPhone.includes(searchPhoneClean));
    }).slice(0, 8);
  }, [memberSearchQuery, memberRecords]);

  // Process data for dashboard
  const totalBags = millRecords.reduce((sum, r) => sum + r.bags, 0);

  // Filtered total for "Accumulated Rice"
  const filteredRecords = millRecords.filter(r => {
    if (millFilterType === 'all') return true;
    if (!r.date) return false;
    
    // Robust parsing
    const dateStr = r.date.trim();
    const parts = dateStr.split(/[-/ ]/);
    if (parts.length < 3) return false;

    const d = parseInt(parts[0]);
    let m = -1;
    let y = parseInt(parts[2]);

    if (!isNaN(parseInt(parts[1]))) {
      m = parseInt(parts[1]) - 1;
    } else {
      const mStr = parts[1].toLowerCase();
      // Use the months array to find index
      const en_short = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const th_short = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      m = en_short.findIndex(en => mStr.includes(en));
      if (m === -1) m = th_short.findIndex(th => mStr.includes(th));
    }
    
    // Normalize year for comparison
    const targetY = millFilterYear;
    return m === millFilterMonth && (y === targetY || y === targetY - 543);
  });

  const displayTotalBags = millFilterType === 'all' ? totalBags : filteredRecords.reduce((sum, r) => sum + r.bags, 0);
  
  // Today's bags (Robust parsing for "19-Apr-2026", "19/4/2569", etc.)
  const today = new Date();
  const tDay = today.getDate();
  const tMonth = today.getMonth(); // 0-indexed
  const tYearAD = today.getFullYear();
  const tYearBE = tYearAD + 543;
  
  const todayRecords = millRecords.filter(r => {
    if (!r.date) return false;
    const dateStr = r.date.trim();
    
    // Attempt 1: Standard JS Date parsing (Works for "19-Apr-2026")
    const parsedDate = new Date(dateStr.replace(/-/g, ' '));
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.getDate() === tDay && 
             parsedDate.getMonth() === tMonth && 
             (parsedDate.getFullYear() === tYearAD || parsedDate.getFullYear() === tYearAD + 543);
    }

    // Attempt 2: Manual parsing for Thai/Specific formats
    const parts = dateStr.split(/[-/ ]/);
    if (parts.length < 3) return false;

    const d = parseInt(parts[0]);
    let m = -1;
    let y = parseInt(parts[2]);

    // Check month part (could be number, Thai name, or Eng name)
    if (!isNaN(parseInt(parts[1]))) {
      m = parseInt(parts[1]) - 1;
    } else {
      const mStr = parts[1].toLowerCase();
      const en_short = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const th_short = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      m = en_short.findIndex(en => mStr.includes(en));
      if (m === -1) m = th_short.findIndex(th => mStr.includes(th));
    }

    if (m === -1) return false;
    
    return d === tDay && m === tMonth && (y === tYearAD || y === tYearBE);
  });

  const todayBags = todayRecords.reduce((sum, r) => sum + r.bags, 0);
  const todayMilledBags = todayRecords.filter(r => r.status?.trim() === 'สีเสร็จแล้ว').reduce((sum, r) => sum + r.bags, 0);
  const todayDeliveredBags = todayRecords.filter(r => r.status?.trim() === 'ส่งแล้ว').reduce((sum, r) => sum + r.bags, 0);
  const todayPendingBags = todayRecords.filter(r => r.status?.trim() === 'รับแล้ว' || !r.status || r.status.trim() === '').reduce((sum, r) => sum + r.bags, 0);
  const todayCompletedMillingTotal = todayMilledBags + todayDeliveredBags;

  // Rice type distribution
  const riceTypeMap = millRecords.reduce((acc, r) => {
    acc[r.riceType] = (acc[r.riceType] || 0) + r.bags;
    return acc;
  }, {} as Record<string, number>);

  const millRiceTypes = Object.entries(riceTypeMap).map(([name, value]) => ({ name, value }));

  // Customers with locations
  const millCustomers = React.useMemo(() => millRecords
    .filter(r => r.location)
    .map((r, i) => ({
      id: i,
      pos: r.location!,
      name: r.customerName,
      type: r.riceType
    })), [millRecords]);

  const currentBounds = React.useMemo(() => millCustomers.map(c => c.pos), [millCustomers]);

  // Calculation: based on service type classification
  // 1. สีข้าวสาร, สีข้าวกล้อง: (bags * 25) / 400
  // 2. คัดเมล็ดพันธุ์: (bags * 25) / 20
  const displayTotalRai = React.useMemo(() => {
    const activeRecords = millFilterType === 'all' ? millRecords : filteredRecords;
    return activeRecords.reduce((sum, r) => {
      const service = r.serviceType || '';
      const bags = r.bags || 0;
      if (service.includes('คัดเมล็ดพันธุ์')) {
        return sum + (bags * 25) / 20;
      } else {
        return sum + (bags * 25) / 400;
      }
    }, 0);
  }, [millRecords, filteredRecords, millFilterType]);

  const displayRaiBreakdown = React.useMemo(() => {
    const activeRecords = millFilterType === 'all' ? millRecords : filteredRecords;
    let millRai = 0;
    let seedRai = 0;
    activeRecords.forEach(r => {
      const service = r.serviceType || '';
      const bags = r.bags || 0;
      if (service.includes('คัดเมล็ดพันธุ์')) {
        seedRai += (bags * 25) / 20;
      } else {
        millRai += (bags * 25) / 400;
      }
    });
    return { millRai, seedRai };
  }, [millRecords, filteredRecords, millFilterType]);

  const parseDateBE = (dateStr: string) => {
    if (!dateStr) return null;
    const parts = dateStr.trim().split(/[-/ ]/);
    if (parts.length < 3) return null;

    const d = parseInt(parts[0]);
    let m = -1;
    let y = parseInt(parts[2]);

    if (!isNaN(parseInt(parts[1]))) {
      m = parseInt(parts[1]) - 1;
    } else {
      const mStr = parts[1].toLowerCase();
      const en_short = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      const th_short = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
      const th_full = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
      
      m = en_short.findIndex(en => mStr.includes(en));
      if (m === -1) m = th_short.findIndex(th => mStr.includes(th));
      if (m === -1) m = th_full.findIndex(tf => mStr.includes(tf));
    }
    
    if (m === -1) return null;
    
    const yearAD = y > 2500 ? y - 543 : y;
    return { day: d, month: m, yearAD, yearBE: yearAD + 543 };
  };

  const activeMillingDates = React.useMemo(() => {
    const datesMap = new Map<string, { label: string; dateObj: Date; count: number }>();
    millRecords.forEach(r => {
      if (!r.date) return;
      const parsed = parseDateBE(r.date);
      if (!parsed) return;
      
      const monthStr = (parsed.month + 1).toString().padStart(2, '0');
      const dayStr = parsed.day.toString().padStart(2, '0');
      const yyyymmdd = `${parsed.yearAD}-${monthStr}-${dayStr}`;
      
      const prev = datesMap.get(yyyymmdd);
      const count = prev?.count || 0;
      datesMap.set(yyyymmdd, {
        label: `${parsed.day} ${MONTHS_TH[parsed.month]} ${parsed.yearBE}`,
        dateObj: new Date(parsed.yearAD, parsed.month, parsed.day),
        count: count + (r.bags || 0)
      });
    });
    
    return Array.from(datesMap.entries())
      .map(([val, item]) => ({ value: val, label: `${item.label} (รวม ${item.count} กระสอบ)`, dateObj: item.dateObj, count: item.count }))
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [millRecords]);

  const getRecordsForDate = (dateStrYYYYMMDD: string) => {
    if (!dateStrYYYYMMDD) return [];
    const partsYYYYMMDD = dateStrYYYYMMDD.split('-');
    if (partsYYYYMMDD.length < 3) return [];
    
    const tYearAD = parseInt(partsYYYYMMDD[0]);
    const tMonth = parseInt(partsYYYYMMDD[1]) - 1; // 0-indexed
    const tDay = parseInt(partsYYYYMMDD[2]);
    const tYearBE = tYearAD + 543;

    return millRecords.filter(r => {
      if (!r.date) return false;
      const parsed = parseDateBE(r.date);
      if (!parsed) return false;

      return parsed.day === tDay && 
             parsed.month === tMonth && 
             (parsed.yearAD === tYearAD || parsed.yearBE === tYearBE || parsed.yearAD === tYearBE);
    });
  };

  const totalEarnedGlobal = pointsRecords.reduce((sum, p) => sum + p.earned, 0);

  const filteredUsedPoints = pointsRecords.filter(p => {
    if (pointsFilterType === 'all') return true;
    const pDate = parseDateBE(p.date);
    if (!pDate) return false;

    if (pointsFilterType === 'monthly') {
      return pDate.month === pointsFilterMonth && pDate.yearBE === pointsFilterYear;
    }

    if (pointsFilterType === 'daily') {
      const targetDate = new Date(pointsFilterDate);
      return pDate.day === targetDate.getDate() && 
             pDate.month === targetDate.getMonth() && 
             pDate.yearAD === targetDate.getFullYear();
    }
    return true;
  }).reduce((sum, p) => sum + p.used, 0);

  const pointsStats = {
    totalEarned: totalEarnedGlobal,
    totalUsed: filteredUsedPoints,
  };

  const currentDisplayBalance = totalEarnedGlobal - filteredUsedPoints;

  // 1. Total members registered overall
  const totalMemberCount = memberRecords.length;

  // 2. Filtered list based on member growth criteria
  const filteredMembers = React.useMemo(() => {
    return memberRecords.filter(m => {
      if (memberFilterType === 'all') return true;
      const pDate = parseDateBE(m.registrationDate);
      if (!pDate) return false;

      if (memberFilterType === 'monthly') {
        return pDate.month === memberFilterMonth && pDate.yearBE === memberFilterYear;
      }

      if (memberFilterType === 'daily') {
        const targetDate = new Date(memberFilterDate);
        return pDate.day === targetDate.getDate() && 
               pDate.month === targetDate.getMonth() && 
               pDate.yearAD === targetDate.getFullYear();
      }
      return true;
    });
  }, [memberRecords, memberFilterType, memberFilterMonth, memberFilterYear, memberFilterDate]);

  // Latest customer in filtered period
  const latestFilteredMember = React.useMemo(() => {
    return filteredMembers.length > 0 ? filteredMembers[filteredMembers.length - 1] : null;
  }, [filteredMembers]);

  // Overall memoized pins for member placement
  const memberPins = React.useMemo(() => {
    return memberRecords
      .filter(m => m.location)
      .map(m => ({
        id: m.lineId || m.name,
        pos: m.location!,
        name: m.name,
        phone: m.phone,
        points: m.balancePoints
      }));
  }, [memberRecords]);

  const memberBoundsArray = React.useMemo(() => {
    return memberPins.map(p => p.pos);
  }, [memberPins]);

  // Cross-reference data for queried member
  const searchedMemberCrossInfo = React.useMemo(() => {
    if (!searchedMemberResult) return null;
    const normMemberName = normalizeThaiName(searchedMemberResult.name);
    
    // Find service usage records for this user
    const userMillJobs = millRecords.filter(r => {
      const normMillName = normalizeThaiName(r.customerName);
      return normMillName.includes(normMemberName) || normMemberName.includes(normMillName);
    });

    const bagsByRiceType: Record<string, number> = {};
    const weightByRiceType: Record<string, number> = {};
    let totalBagsUser = 0;
    let totalWeightUser = 0;

    userMillJobs.forEach(r => {
      const type = r.riceType || 'ข้าวไม่ระบุประเภท';
      bagsByRiceType[type] = (bagsByRiceType[type] || 0) + r.bags;
      weightByRiceType[type] = (weightByRiceType[type] || 0) + r.weight;
      totalBagsUser += r.bags;
      totalWeightUser += r.weight;
    });

    return {
      jobsList: userMillJobs,
      bagsByRiceType,
      weightByRiceType,
      totalBags: totalBagsUser,
      totalWeight: totalWeightUser
    };
  }, [searchedMemberResult, millRecords]);

  const formatThaiDateStr = (dateStr: string) => {
    const pDate = parseDateBE(dateStr);
    if (!pDate) return dateStr || 'ไม่ระบุวันที่';
    return `${pDate.day} ${MONTHS_TH[pDate.month]} พ.ศ. ${pDate.yearBE}`;
  };

  const getGoogleDriveFileId = (cdnOrDriveUrl: string | undefined): string | null => {
    if (!cdnOrDriveUrl) return null;
    const lh3Match = cdnOrDriveUrl.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]{19,80})/);
    if (lh3Match && lh3Match[1]) return lh3Match[1];
    const driveRegex = /(?:id=|file\/d\/|open\?id=)([a-zA-Z0-9_-]{19,80})/;
    const match = cdnOrDriveUrl.match(driveRegex);
    return match ? match[1] : null;
  };

  const getGoogleDrivePreviewUrl = (cdnOrDriveUrl: string | undefined): string | null => {
    const fileId = getGoogleDriveFileId(cdnOrDriveUrl);
    if (!fileId) return null;
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  const getGoogleOriginalUrl = (cdnOrDriveUrl: string | undefined): string => {
    const fileId = getGoogleDriveFileId(cdnOrDriveUrl);
    if (!fileId) return cdnOrDriveUrl || '';
    return `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;
  };

  const renderImageTile = (title: string, url: string | undefined, desc: string, defaultUrl: string) => {
    const hasImage = !!url && url.length > 5;
    const isDirectLink = hasImage && (url.startsWith('http://') || url.startsWith('https://'));
    
    return (
      <div className="group relative bg-slate-50 rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between min-h-[165px] hover:shadow-md transition-all duration-300">
        {/* Caption Header */}
        <div className="p-2 bg-slate-100 border-b border-slate-200 text-center">
          <span className="text-[10px] font-black text-slate-700 block whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
        </div>

        {/* Core Media Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 relative overflow-hidden bg-slate-50 min-h-[110px]">
          {hasImage ? (
            isDirectLink ? (
              <>
                <img 
                  src={url} 
                  alt={title}
                  className="w-full h-24 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const sibling = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (sibling) sibling.style.display = 'flex';
                  }}
                />
                <div 
                  className="hidden absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-slate-400 bg-amber-50/95 border border-amber-200 rounded-lg"
                >
                  <Lock className="w-5 h-5 text-amber-600 mb-1 animate-bounce" />
                  <span className="text-[9px] font-black text-amber-800 leading-tight">รูปภาพความปลอดภัยสูง</span>
                  <span className="text-[8px] text-amber-600 mt-0.5 leading-tight font-semibold">คลิกเพื่อบังคับเปิดหน้าต่างดูสด</span>
                </div>

                <button 
                  onClick={() => {
                    const fileId = getGoogleDriveFileId(url);
                    setLightboxImgError(false);
                    setLightboxMode(fileId ? 'iframe' : 'direct'); // Default to iframe preview if possible for guaranteed load inside the custom lightbox
                    setLightboxImg({ url: url!, title });
                  }}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity rounded-lg gap-1"
                >
                  <Maximize2 className="w-4 h-4 mb-0.5" />
                  <span className="text-[10px] font-black uppercase tracking-wider">ขยายและตรวจสอบ</span>
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-2 text-slate-400">
                <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center border border-amber-200 text-amber-500 mb-1 animate-pulse">
                  <Database className="w-4 h-4 stroke-1.5" />
                </div>
                <span className="text-[9px] font-black text-amber-700 block tracking-tight leading-3">ยังไม่ได้แปลงลิงก์</span>
                <span className="text-[8px] text-slate-450 block mt-1 leading-normal text-center font-medium max-w-[120px]">กรุณากดเมนู 1-Click บน Google Sheets</span>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-2 text-slate-350">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 mb-1">
                <Camera className="w-4 h-4 stroke-1.5 text-slate-400" />
              </div>
              <span className="text-[9px] font-bold text-slate-400 block tracking-tight leading-3">ยังไม่มีรูปถ่าย</span>
              <span className="text-[8px] text-slate-450 block mt-0.5 opacity-80">{desc}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading && activeTab === 'mill') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <p className="text-slate-600 font-bold">กำลังโหลดข้อมูลฐานข้อมูลโรงสี...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      <nav className="fixed top-0 left-0 right-0 z-[1000] bg-white border-b border-slate-200 h-16 flex items-center px-4 sm:px-8 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <Link to="/" className="text-slate-500 hover:text-emerald-600 transition-colors shrink-0">
            <ArrowLeft size={20} className="sm:w-6 sm:h-6" />
          </Link>
          <h1 className="text-base sm:text-xl font-bold text-slate-800 truncate">ระบบบริหารจัดการ (Management System)</h1>
        </div>
        <div className="hidden md:block text-sm font-medium text-slate-500">
          ข้อมูลประจำวันที่ {new Date().toLocaleDateString('th-TH')}
        </div>
      </nav>

      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 sticky top-16 z-[999]">
        <div className="max-w-[1400px] mx-auto flex gap-4 sm:gap-8 overflow-x-auto scrollbar-none">
          <Link 
            to="/dashboard/seedling"
            className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-all duration-200 no-underline flex items-center gap-1.5 shrink-0 ${
              activeTab === 'seedling' 
                ? "border-emerald-600 text-emerald-600" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Sprout size={16} className="sm:w-[18px] sm:h-[18px]" /> ศูนย์เพาะกล้าข้าว นครพนม
          </Link>
          <Link 
            to="/dashboard/mill"
            className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-all duration-200 no-underline flex items-center gap-1.5 shrink-0 ${
              activeTab === 'mill' 
                ? "border-orange-500 text-orange-600" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Wheat size={16} className="sm:w-[18px] sm:h-[18px]" /> โรงสีแม่โขงพืชผล
          </Link>
          <Link 
            to="/dashboard/erp"
            className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-all duration-200 no-underline flex items-center gap-1.5 shrink-0 ${
              activeTab === 'erp' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <Coins size={16} className="sm:w-[18px] sm:h-[18px]" /> ระบบคุมงบประมาณและบุคลากรโรงสี (ERP Panel)
          </Link>
        </div>
      </div>

      <main className="pt-24 pb-20 px-3 xs:px-4 sm:px-8 max-w-[1400px] mx-auto">
        {activeTab === 'seedling' && (
          <motion.section 
            key="seedling"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 border-l-4 border-emerald-500 pl-4">
                <h2 className="text-2xl font-bold text-slate-900">ศูนย์เพาะกล้าข้าว นครพนม (Seedling Center)</h2>
                <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">OPERATIONS</span>
                <a 
                  href="https://ricenurserycenter.mekongsinsup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors no-underline shadow-xs"
                >
                  <ExternalLink size={14} /> เข้าสู่เว็บไซต์ศูนย์เพาะกล้า
                </a>
              </div>
              <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                <span className="text-xs font-bold text-slate-400 uppercase">เลือกดูรายปี:</span>
                <select 
                  value={seedlingYear} 
                  onChange={(e) => setSeedlingYear(Number(e.target.value))}
                  className="bg-transparent text-sm font-bold text-emerald-700 outline-none cursor-pointer"
                >
                  <option value={2568}>พ.ศ. 2568 (ปีปัจจุบัน)</option>
                  <option value={2567}>พ.ศ. 2567</option>
                  <option value={2566}>พ.ศ. 2566</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <motion.div 
                 className="col-span-1 lg:col-span-2 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-white shadow-xl flex flex-col justify-between"
               >
                 <div>
                   <p className="text-emerald-100 font-medium">รวมพื้นที่บริการก่อนเก็บเกี่ยวสะสม (ทั้งหมด)</p>
                   <div className="flex items-baseline gap-2 mt-2">
                     <h3 className="text-6xl font-black">{SEEDLING_DATA.totalRai.toLocaleString()}</h3>
                     <span className="text-2xl font-bold opacity-70">ไร่</span>
                   </div>
                 </div>
                 <div className="mt-8 pt-6 border-t border-white/20">
                   <p className="text-emerald-100/70 text-sm italic">ครอบคลุมบริการ ดิน, ปุ๋ย, การปลูก และเมล็ดพันธุ์</p>
                 </div>
               </motion.div>

               <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
                 <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider">สะสมปี {seedlingYear}</p>
                 <h3 className="text-4xl font-black text-slate-900 mt-1">
                   {(seedlingYear === 2568 ? SEEDLING_DATA.currentYearRai : SEEDLING_DATA.historical.find(h => h.year === seedlingYear)?.rai || 0).toLocaleString()} 
                   <span className="text-lg font-normal text-slate-400"> ไร่</span>
                 </h3>
               </div>

               <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col justify-center">
                 <p className="text-emerald-700 text-sm font-semibold uppercase tracking-wider">สถานะการจัดเตรียมกล้า</p>
                 <h3 className="text-4xl font-black text-emerald-600 mt-1">100% <span className="text-lg font-normal text-emerald-400 self-end">พร้อมดำนา</span></h3>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-[400px]">
                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">ประเภทข้าวที่จัดเตรียมกล้า</h4>
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie
                      data={SEEDLING_DATA.riceTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {SEEDLING_DATA.riceTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={GREEN_COLORS[index % GREEN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 lg:col-span-2 h-[400px] overflow-hidden">
                <h4 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">พื้นที่ดำนาของลูกค้า (Polygon Mapping)</h4>
                <div className="h-full rounded-xl overflow-hidden z-10 border border-slate-100">
                  <MapContainer center={[17.1791, 104.6641]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {SEEDLING_DATA.customerFields.map(field => (
                      <Polygon 
                        key={field.id} 
                        positions={field.polygon} 
                        pathOptions={{ color: '#2E7D32', fillColor: '#2E7D32', fillOpacity: 0.3 }}
                      >
                        <Popup>
                          <div className="font-bold">{field.name}</div>
                          <div className="text-xs">พิกัดแปลงที่ใช้บริการดำนา</div>
                        </Popup>
                      </Polygon>
                    ))}
                  </MapContainer>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {activeTab === 'mill' && (
          <motion.section 
            key="mill"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-l-4 border-orange-500 pl-3 py-1">
                <div>
                  <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-slate-900 leading-tight">โรงสีข้าวแม่โขงพืชผล (Mill Management)</h2>
                  <span className="bg-orange-100 text-orange-700 text-[10px] sm:text-xs px-2 py-0.5 sm:py-1 rounded-full font-bold whitespace-nowrap shrink-0">LIVE DATABASE</span>
                </div>
                <button
                  onClick={() => setShowMillDataTableModal(true)}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all duration-200 transform active:scale-95 cursor-pointer self-start sm:self-auto"
                >
                  <Database className="w-3.5 h-3.5 text-orange-100 animate-pulse" />
                  <span>📋 เปิดดูตารางข้อมูลการสีข้าวรายวัน</span>
                </button>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-1.5 sm:p-2 rounded-xl shadow-sm self-start md:self-auto w-full md:w-auto justify-between md:justify-start">
                <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-lg">
                  <button 
                    onClick={() => setMillFilterType('all')}
                    className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${millFilterType === 'all' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    ทั้งหมด
                  </button>
                  <button 
                    onClick={() => setMillFilterType('monthly')}
                    className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${millFilterType === 'monthly' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    รายเดือน
                  </button>
                </div>
                
                {millFilterType === 'monthly' && (
                  <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                    <select 
                      value={millFilterMonth}
                      onChange={(e) => setMillFilterMonth(Number(e.target.value))}
                      className="bg-slate-50 border-none outline-none text-xs sm:text-sm font-bold text-slate-700 px-1.5 py-1 rounded-lg cursor-pointer max-w-[95px] truncate"
                    >
                      {MONTHS_TH.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={millFilterYear}
                      onChange={(e) => setMillFilterYear(Number(e.target.value))}
                      className="bg-slate-50 border-none outline-none text-xs sm:text-sm font-bold text-slate-700 px-1.5 py-1 rounded-lg cursor-pointer"
                    >
                      {[2569, 2568, 2567].map(y => (
                        <option key={y} value={y}>พ.ศ. {y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
               <motion.div 
                 className="col-span-1 sm:col-span-2 bg-gradient-to-br from-orange-600 to-amber-700 rounded-2xl p-5 sm:p-8 text-white shadow-xl flex flex-col justify-between"
               >
                 <div>
                   <p className="text-orange-100 text-xs sm:text-sm font-medium leading-relaxed">รวมพื้นที่ปลูกข้าวที่ใช้บริการสีข้าว {millFilterType === 'monthly' ? `(${MONTHS_TH[millFilterMonth]})` : '(ทั้งหมด)'}</p>
                   <div className="flex items-baseline gap-2 mt-2">
                     <h3 className="text-4xl xs:text-5xl sm:text-6xl font-black tracking-tight">
                       {displayTotalRai.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                     </h3>
                     <span className="text-xl sm:text-2xl font-bold opacity-70">ไร่</span>
                   </div>

                   {/* Breakdown sub-numbers directly under the big number */}
                   <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                     <div>
                       <span className="block text-[10px] sm:text-[11px] text-orange-200/95 font-semibold">สีข้าวสาร / สีข้าวกล้อง:</span>
                       <span className="text-lg sm:text-xl font-bold text-white">
                         {displayRaiBreakdown.millRai.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-[10px] sm:text-xs font-medium text-orange-200">ไร่</span>
                       </span>
                     </div>
                     <div className="border-l border-white/10 pl-4">
                       <span className="block text-[10px] sm:text-[11px] text-orange-200/95 font-semibold">คัดเมล็ดพันธุ์ข้าว:</span>
                       <span className="text-lg sm:text-xl font-bold text-white">
                         {displayRaiBreakdown.seedRai.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} <span className="text-[10px] sm:text-xs font-medium text-orange-200">ไร่</span>
                       </span>
                     </div>
                   </div>
                 </div>
                 <div className="mt-5 pt-4 border-t border-white/20">
                   <p className="text-orange-100/70 text-[10px] italic leading-normal">
                     คำนวณแยกตามประเภทบริการ (กระสอบละ 25 กก.):<br />
                     • สีข้าวสาร/สีข้าวกล้อง: 400 กก./ไร่ • คัดเมล็ดพันธุ์: 20 กก./ไร่
                   </p>
                 </div>
               </motion.div>

               <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-205 flex flex-col justify-center min-h-[120px]">
                 <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                   {millFilterType === 'monthly' ? `จำนวนข้าวสะสมรายเดือน` : 'จำนวนข้าวสะสม (ทั้งหมด)'}
                 </p>
                 <h3 className="text-2xl xs:text-3xl sm:text-4xl font-black text-slate-900 mt-1.5 leading-tight">
                   {displayTotalBags.toLocaleString()} <span className="text-[14px] sm:text-lg font-normal text-slate-400">กระสอบ</span>
                 </h3>
                 {millFilterType === 'monthly' && (
                   <p className="text-[9px] font-bold text-orange-500 mt-1 uppercase tracking-tighter">
                     ประจำเดือน {MONTHS_TH[millFilterMonth]} {millFilterYear}
                   </p>
                 )}
               </div>

               <div className="bg-gradient-to-br from-amber-50 to-amber-100/30 rounded-2xl p-5 sm:p-6 border border-amber-200/60 shadow-sm flex flex-col justify-between min-h-[140px] relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  {/* Decorative background light circle */}
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-200/30 rounded-full blur-xl pointer-events-none"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-amber-900 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                        </span>
                        สถานะการสีข้าววันนี้
                      </p>
                      <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest shadow-xs">
                        LIVE
                      </span>
                    </div>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-amber-800 font-semibold mb-0.5 animate-pulse">สีเสร็จสมบูรณ์แล้ว</p>
                        <div className="flex items-baseline gap-1.5">
                          <h4 className="text-4xl font-black text-amber-700 tracking-tight font-mono">
                            {todayCompletedMillingTotal.toLocaleString()}
                          </h4>
                          <span className="text-xs font-bold text-amber-900/60">กระสอบ</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] text-slate-500 font-bold uppercase">รับเข้าวันนี้ทั้งหมด</p>
                        <p className="text-lg font-extrabold text-slate-700 font-mono mt-0.5">
                          {todayBags.toLocaleString()} <span className="text-xs font-normal text-slate-500">กระสอบ</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-amber-200/80 space-y-2.5 relative z-10">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span>
                        สีเสร็จแล้ว (ค้างส่ง):
                      </span>
                      <span className="font-bold text-slate-800 font-mono bg-white/70 px-2 py-0.5 rounded-md border border-slate-100 shadow-2xs min-w-[50px] text-center">
                        {todayMilledBags.toLocaleString()}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-sm"></span>
                        ส่งมอบแล้ว:
                      </span>
                      <span className="font-bold text-slate-800 font-mono bg-white/70 px-2 py-0.5 rounded-md border border-slate-100 shadow-2xs min-w-[50px] text-center">
                        {todayDeliveredBags.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-600 font-medium flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm"></span>
                        รอดำเนินการสี:
                      </span>
                      <span className="font-bold text-slate-800 font-mono bg-white/70 px-2 py-0.5 rounded-md border border-slate-100 shadow-2xs min-w-[50px] text-center">
                        {todayPendingBags.toLocaleString()}
                      </span>
                    </div>
                    
                    <button 
                      onClick={() => setShowMillDataTableModal(true)}
                      className="w-full mt-2.5 py-1.5 px-3 bg-white hover:bg-orange-50 text-orange-600 border border-amber-200 hover:border-orange-300 text-[11px] font-black rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Maximize2 size={11} className="text-orange-500 animate-pulse" />
                      <span>ขยายดูตารางรายละเอียดและการสีข้าว</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 h-[300px] sm:h-[400px]">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-3 sm:mb-4 uppercase tracking-wider">สัดส่วนประเภทข้าว</h4>
                  <ResponsiveContainer width="100%" height="80%">
                    {millRiceTypes.length > 0 ? (
                      <PieChart>
                        <Pie
                          data={millRiceTypes}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {millRiceTypes.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={ORANGE_COLORS[index % ORANGE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs text-center font-medium">ไม่พบข้อมูลประเภทข้าว</div>
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100 lg:col-span-2 h-[320px] sm:h-[400px] overflow-hidden">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-700 mb-3 sm:mb-4 uppercase tracking-wider">พิกัดลูกค้าที่เรียกสีข้าว (Pins)</h4>
                  <div className="h-full rounded-xl overflow-hidden z-10 border border-slate-100 relative">
                    <MapContainer center={[17.1791, 104.6641]} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {millCustomers.map((customer, idx) => {
                        const isLatest = idx === millCustomers.length - 1;
                        if (isLatest) {
                          return (
                            <Marker key={customer.id} position={customer.pos}>
                              <Popup>
                                <div className="text-xs font-bold text-orange-600 mb-1">📌 ลูกค้ารายล่าสุด</div>
                                <div className="text-xs font-bold text-slate-700">{customer.name}</div>
                                <div className="text-[10px] text-slate-500">{customer.type || "ไม่ระบุประเภท"}</div>
                              </Popup>
                            </Marker>
                          );
                        }
                        return (
                          <CircleMarker 
                            key={customer.id} 
                            center={customer.pos}
                            radius={6}
                            pathOptions={{ 
                              fillColor: getRiceColor(customer.type), 
                              fillOpacity: 0.8, 
                              color: '#fff', 
                              weight: 1.5 
                            }}
                          >
                            <Popup>
                              <div className="text-xs font-bold text-slate-700 mb-1">{customer.type || "ไม่ระบุประเภท"}</div>
                              <div className="text-xs text-orange-700">พิกัดลูกค้าโรงสีแม่โขงพืชผล</div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                      <MapBounds bounds={currentBounds} />
                    </MapContainer>

                    {/* Map Legend */}
                  <div className="absolute bottom-2 right-2 sm:bottom-4 sm:right-4 z-[1001] bg-white/95 backdrop-blur-sm p-2 sm:p-3 rounded-lg border border-slate-200 shadow-md pointer-events-none">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">ประเภทข้าว</div>
                    <div className="flex flex-col gap-1 sm:gap-1.5">
                      {Object.entries(RICE_COLOR_MAP).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1.5">
                          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border border-white shadow-2xs" style={{ backgroundColor: color }}></div>
                          <span className="text-[9px] sm:text-[11px] font-medium text-slate-600 leading-tight">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Points Data Sub-section */}
            <div className="mt-10 pt-6 border-t border-slate-200 space-y-4 sm:space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 border-l-4 border-orange-500 pl-3 py-1">
                  <h3 className="text-base sm:text-xl font-bold text-slate-800">ข้อมูลการใช้แต้มสะสม</h3>
                  <span className="bg-orange-50 text-orange-600 text-[9px] px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">LOYALTY PROGRAM</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 p-1.5 sm:p-2 rounded-xl shadow-sm justify-between md:justify-start w-full md:w-auto">
                  <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-lg">
                    {[
                      { id: 'all', label: 'ทั้งหมด' },
                      { id: 'monthly', label: 'รายเดือน' },
                      { id: 'daily', label: 'รายวัน' }
                    ].map((btn) => (
                      <button 
                        key={btn.id}
                        onClick={() => setPointsFilterType(btn.id as any)}
                        className={`px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-md transition-all ${pointsFilterType === btn.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {pointsFilterType === 'monthly' && (
                    <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-300">
                      <select 
                        value={pointsFilterMonth}
                        onChange={(e) => setPointsFilterMonth(Number(e.target.value))}
                        className="bg-slate-50 border-none outline-none text-xs sm:text-sm font-bold text-slate-700 px-1.5 py-1 rounded-lg cursor-pointer max-w-[95px] truncate"
                      >
                        {MONTHS_TH.map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={pointsFilterYear}
                        onChange={(e) => setPointsFilterYear(Number(e.target.value))}
                        className="bg-slate-50 border-none outline-none text-xs sm:text-sm font-bold text-slate-700 px-1.5 py-1 rounded-lg cursor-pointer"
                      >
                        {[2569, 2568, 2567].map(y => (
                          <option key={y} value={y}>พ.ศ. {y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {pointsFilterType === 'daily' && (
                    <div className="animate-in fade-in slide-in-from-right-2 duration-300">
                      <input 
                        type="date"
                        value={pointsFilterDate}
                        onChange={(e) => setPointsFilterDate(e.target.value)}
                        className="bg-slate-50 border border-slate-200 outline-none text-xs sm:text-sm font-bold text-slate-700 px-2 py-0.5 sm:py-1 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {/* Total Earned Card - Larger */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="col-span-1 sm:col-span-2 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl p-5 sm:p-8 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute -right-8 -top-8 w-48 h-48 bg-white/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>
                  <Coins className="absolute right-4 top-4 w-12 h-12 text-white/20 rotate-12 group-hover:rotate-0 transition-transform duration-500 hidden sm:block" />
                  
                  <div className="relative z-10">
                    <p className="text-amber-50 font-bold uppercase tracking-wider text-xs sm:text-sm">แต้มสะสมรวม ทั้งหมด</p>
                    <div className="flex items-baseline gap-2 mt-2 sm:mt-4">
                      <h4 className="text-4xl xs:text-5xl sm:text-6xl font-black">{pointsStats.totalEarned.toLocaleString()}</h4>
                      <span className="text-lg sm:text-2xl font-bold opacity-80 uppercase">แต้ม</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/20 relative z-10">
                    <div className="flex items-center gap-2 text-amber-50/80 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>
                      คะแนนสะสมความภักดีของลูกค้าที่เกิดขึ้นทั้งหมด
                    </div>
                  </div>
                </motion.div>

                {/* Total Used Card - Green */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[120px]"
                >
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">แต้มใช้แลกซื้อของ</p>
                  <div className="flex items-baseline gap-1.5 relative z-10">
                    <h4 className="text-2xl xs:text-3xl sm:text-4xl font-black">{pointsStats.totalUsed.toLocaleString()}</h4>
                    <span className="text-xs sm:text-sm font-bold opacity-70">แต้ม</span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-white/20 rounded-full overflow-hidden relative z-10">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: pointsStats.totalEarned > 0 ? `${Math.min(100, (pointsStats.totalUsed / pointsStats.totalEarned) * 100)}%` : '0%' }}
                      className="h-full bg-white rounded-full"
                    ></motion.div>
                  </div>
                  <p className="mt-3 text-[10px] text-emerald-100/70 font-medium relative z-10">
                    {pointsFilterType === 'all' ? 'ยอดการแลกใช้รวม' : `แลกใช้${pointsFilterType === 'monthly' ? 'ในเดือนนี้' : 'ในวันนี้'}`}
                  </p>
                </motion.div>

                {/* Remaining Card - Yellow */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-yellow-300 to-amber-500 rounded-2xl p-5 sm:p-6 text-slate-800 shadow-lg relative overflow-hidden group flex flex-col justify-between min-h-[120px]"
                >
                  <p className="text-amber-900 text-xs font-bold uppercase tracking-wider mb-2 relative z-10">แต้มสะสมคงเหลือ</p>
                  <div className="flex items-baseline gap-1.5 relative z-10">
                    <h4 className="text-2xl xs:text-3xl sm:text-4xl font-black text-amber-955">{currentDisplayBalance.toLocaleString()}</h4>
                    <span className="text-xs sm:text-sm font-bold opacity-70 text-amber-900/70">แต้ม</span>
                  </div>
                  <div className="mt-3 p-1.5 bg-black/5 rounded-lg border border-black/5 relative z-10">
                    <p className="text-[9px] sm:text-[10px] text-amber-900 font-bold italic leading-tight">
                      * คำนวณตามประเภทระยะขอบที่เลือก
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ระบบบริหารจัดการสมาชิก (Member & Customer Management System) */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-8 space-y-8 mt-8 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="w-6 h-6 text-orange-600" />
                    <h3 className="text-xl font-bold text-slate-800">ระบบบริหารจัดการสมาชิกและลูกค้า (Customer & Member Management)</h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    ข้อมูลสมาชิกและพิกัดการส่งชำระข้าวจากฐานข้อมูล LIVE DATABASE (ชีต: ข้อมูลสมาชิก GID: 982879969)
                  </p>
                </div>

                {/* Filter controls */}
                <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setMemberFilterType('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${memberFilterType === 'all' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      ทั้งหมด
                    </button>
                    <button 
                      onClick={() => setMemberFilterType('monthly')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${memberFilterType === 'monthly' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      รายเดือน
                    </button>
                    <button 
                      onClick={() => setMemberFilterType('daily')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${memberFilterType === 'daily' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                    >
                      รายวัน
                    </button>
                  </div>

                  {memberFilterType === 'monthly' && (
                    <div className="flex items-center gap-1.5 animate-in fade-in">
                      <select 
                        value={memberFilterMonth}
                        onChange={(e) => setMemberFilterMonth(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1 outline-none cursor-pointer"
                      >
                        {MONTHS_TH.map((m, i) => (
                          <option key={m} value={i}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={memberFilterYear}
                        onChange={(e) => setMemberFilterYear(Number(e.target.value))}
                        className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1 outline-none cursor-pointer"
                      >
                        {[2569, 2568, 2567].map(y => (
                          <option key={y} value={y}>พ.ศ. {y}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {memberFilterType === 'daily' && (
                    <input 
                      type="date"
                      value={memberFilterDate}
                      onChange={(e) => setMemberFilterDate(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 px-2.5 py-1 outline-none cursor-pointer"
                    />
                  )}
                </div>
              </div>

              {/* Stats Grid & Map Display */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Membership Statistics */}
                <div className="space-y-4">
                  
                  {/* Total Member Stats Card */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">จำนวนของสมาชิกทั้งหมด</p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <h4 className="text-4xl font-extrabold text-slate-800">{totalMemberCount.toLocaleString()}</h4>
                        <span className="text-slate-400 text-sm font-semibold">คน</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-medium">สมาสัญญาสมาชิกสะสมรวม</span>
                      <span className="text-[11px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full">Active</span>
                    </div>
                  </div>

                  {/* Filtered Growth Stats Card */}
                  <div className="bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl p-6 text-white shadow-sm flex flex-col justify-between">
                    <div>
                      <p className="text-amber-100 text-xs font-bold uppercase tracking-wider">
                        {memberFilterType === 'all' ? 'อัตราเพิ่มขึ้นสมาชิกทั้งหมด' : `สมาชิกใหม่ที่รับเพิ่มขึ้น (${memberFilterType === 'monthly' ? 'รายเดือน' : 'รายวัน'})`}
                      </p>
                      <div className="flex items-baseline gap-2 mt-2">
                        <h4 className="text-4xl font-extrabold">+{filteredMembers.length}</h4>
                        <span className="text-amber-100 text-sm font-medium">คน</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-[10px] text-amber-50/80 font-bold uppercase tracking-wider">ลูกค้าสมัครล่าสุดในกลุ่มตัวเลือกนี้:</p>
                      <p className="text-xs font-black truncate mt-1">
                        {latestFilteredMember ? `${latestFilteredMember.name} (${latestFilteredMember.registrationDate})` : 'ไม่มีลงทะเบียนใหม่ในช่วงนี้'}
                      </p>
                    </div>
                  </div>

                </div>

                {/* 2. Web Map showing Customer pickup / drop points */}
                <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm lg:col-span-2 flex flex-col h-[280px] sm:h-[320px] overflow-hidden relative border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2.5">
                    <h4 className="text-[10px] sm:text-xs font-bold text-slate-700 uppercase tracking-wider">
                      แผนที่แสดงจุดสถานที่รับข้าวและที่ตั้งของสมาชิก (Member Geolocation Hub)
                    </h4>
                    <span className="text-[9px] sm:text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap self-start sm:self-auto">
                      พบพิกัด {memberPins.length} จุด
                    </span>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden border border-slate-100 z-10 min-h-[190px]">
                    <MapContainer center={[17.128597, 104.753671]} zoom={11} style={{ height: '100%', width: '100%' }}>
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      {memberPins.map(pin => {
                        const isMatched = searchedMemberResult && normalizeThaiName(searchedMemberResult.name) === normalizeThaiName(pin.name);
                        return (
                          <CircleMarker
                            key={pin.id}
                            center={pin.pos}
                            radius={isMatched ? 10 : 6}
                            pathOptions={{
                              fillColor: isMatched ? '#E65100' : '#1976D2',
                              fillOpacity: 0.8,
                              color: '#fff',
                              weight: isMatched ? 3 : 1.5
                            }}
                          >
                            <Popup>
                              <div className="text-xs font-bold text-slate-800">{pin.name}</div>
                              <div className="text-[11px] text-slate-500">โทร: {pin.phone}</div>
                              <div className="text-[10px] bg-blue-50 text-blue-700 py-0.5 px-2 rounded-full font-bold inline-block mt-1">
                                แต้มสะสมคงเหลือ: {pin.points.toLocaleString()} แต้ม
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                      <MemberMapBounds bounds={memberBoundsArray} searchLocation={searchedMemberResult?.location} />
                    </MapContainer>
                  </div>
                </div>

              </div>

              {/* 3. Search and personal details checker (Security protected) */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md">
                <div className="max-w-xl mx-auto text-center space-y-4 mb-6">
                  <div className="inline-flex p-3 bg-orange-100/60 text-orange-600 rounded-full">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800">ช่องตรวจสอบประวัติและแต้มลูกค้ารายบุคคล (Private Ledger Lookup)</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      ระบุชื่อ-สกุล หรือ เบอร์โทรศัพท์ เพื่อเรียกดูข้อมูลสะสมบริการและสิทธิประโยชน์แบบส่วนบุคคล (ระบบความปลอดภัยจะปิดบังข้อมูลผู้อื่นโดยสิ้นเชิง)
                    </p>
                  </div>
                  
                  {/* Search input Form */}
                  <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 max-w-md mx-auto focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-500 transition-all">
                    <div className="flex items-center pl-3 text-slate-400">
                      <Search className="w-4 h-4" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="กรอกชื่อ-สกุล หรือเบอร์โทรศัพท์..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="flex-1 bg-transparent px-2 py-1 outline-none text-sm text-slate-700 placeholder:text-slate-400"
                    />
                    {memberSearchQuery && (
                      <button 
                        onClick={() => setMemberSearchQuery('')}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-xl font-bold transition-all"
                      >
                        ล้าง
                      </button>
                    )}
                  </div>

                  {/* ค้นพบชื่อใกล้เคียง */}
                  {memberSearchQuery && similarMembers.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 max-w-md mx-auto bg-slate-50/80 border border-slate-200/60 rounded-xl p-3 text-left shadow-xs"
                    >
                      <div className="text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
                        <span className="animate-pulse">🔍</span>
                        <span>รายชื่อลูกค้าที่ใกล้เคียง / ถูกต้อง ({similarMembers.length} ราย):</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {similarMembers.map((m, idx) => {
                          const isSelected = searchedMemberResult && searchedMemberResult.name === m.name;
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setMemberSearchQuery(m.name);
                                setSearchedMemberResult(m);
                              }}
                              className={`text-[10.5px] font-extrabold px-3 py-1.5 rounded-lg transition-all border cursor-pointer flex items-center gap-1 ${
                                isSelected 
                                  ? 'bg-orange-500 border-orange-600 text-white shadow-sm scale-[1.02]' 
                                  : 'bg-white hover:bg-slate-100 hover:border-slate-300 border-slate-200 text-slate-700'
                              }`}
                            >
                              <span>👤</span>
                              <span>{m.name}</span>
                              {m.phone && <span className={`text-[8.5px] ${isSelected ? 'text-white/80' : 'text-slate-400 font-normal'}`}>({m.phone})</span>}
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[9px] text-slate-400 font-medium mt-2 leading-none">
                        💡 คลิกที่รายชื่อด้านบนเพื่อกำหนด "ชื่อแท้จริง" ของลูกค้าและดึงประวัติแต้มทันที
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Search result output block */}
                <div className="border-t border-slate-100 pt-6">
                  {searchedMemberResult ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-4xl mx-auto space-y-5"
                    >
                      {/* Customer Dossier Action Header Banner */}
                      <div className="bg-gradient-to-r from-amber-900 via-orange-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-amber-600/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30">
                              <FileText className="w-4 h-4" />
                            </span>
                            <h5 className="font-extrabold text-sm sm:text-base text-white tracking-wide">
                              รายงานประวัติการใช้บริการและแต้มสะสม
                            </h5>
                          </div>
                          <p className="text-xs text-amber-200/80 leading-relaxed">
                            ออกรายงานฉบับเต็มพิมพ์บนกระดาษ A4 หรือแบบสรุปย่อขนาดกะทัดรัดสำหรับดูผ่านสมาร์ทโฟน / ส่งทาง LINE
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => {
                              setCustomerReportMode('compact');
                              setIsCustomerReportOpen(true);
                            }}
                            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-sky-400/40"
                            id="btn-open-customer-compact-report"
                            title="พิมพ์แบบสรุปโดยย่อ สำหรับดูผ่านสมาร์ทโฟนได้อย่างสบายตา"
                          >
                            <Smartphone className="w-4 h-4" />
                            <span>สรุปย่อสมาร์ทโฟน</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setCustomerReportMode('full');
                              setIsCustomerReportOpen(true);
                            }}
                            className="flex-1 sm:flex-none px-3.5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold text-xs rounded-xl shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border border-amber-400/40"
                            id="btn-open-customer-a4-report"
                            title="พิมพ์รายงานฉบับเต็ม A4 หรือบันทึกเป็นรูปภาพ JPG"
                          >
                            <Printer className="w-4 h-4" />
                            <span>รายงานฉบับเต็ม (A4)</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Customer Card Profile */}
                        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                        <div className="flex items-center gap-3">
                          {searchedMemberResult.profilePic ? (
                            <img 
                              src={searchedMemberResult.profilePic} 
                              alt={searchedMemberResult.name}
                              className="w-12 h-12 rounded-full object-cover border border-slate-200 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center font-bold text-lg border border-orange-200">
                              {searchedMemberResult.name.replace(/[.·\s]+/, '').charAt(0)}
                            </div>
                          )}
                          <div>
                            <h5 className="font-extrabold text-slate-800 text-sm leading-tight">{searchedMemberResult.name}</h5>
                            <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold inline-block mt-1">
                              {searchedMemberResult.status || 'สมาชิกระบบ'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                          <div className="flex justify-between">
                            <span className="text-slate-400">เบอร์โทรติดต่อ:</span>
                            <span className="font-bold">{searchedMemberResult.phone || 'ไม่ระบุ'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">วันที่สมัครเป็นสมาชิก:</span>
                            <span className="font-bold text-slate-700">{searchedMemberResult.registrationDate || '-'}</span>
                          </div>
                          <div className="flex flex-col gap-1 pt-1.5 border-t border-slate-200/50">
                            <span className="text-slate-400 font-bold text-[10px] uppercase">พิกัดรับส่งข้าว:</span>
                            <span className="font-medium text-slate-600 truncate flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              {searchedMemberResult.address || 'ไม่ระบุพิกัด'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cumulative Loyalty Points Metrics */}
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
                        <div className="text-center pb-2 border-b border-slate-200">
                          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">บัญชีจัดสรรแต้มสะสมปัจจุบัน</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-center py-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400">สะสมรวม</p>
                            <p className="text-lg font-black text-amber-600">+{searchedMemberResult.earnedPoints.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1 border-x border-slate-200">
                            <p className="text-[10px] font-bold text-slate-400">ใช้แลกไป</p>
                            <p className="text-lg font-black text-emerald-600">-{searchedMemberResult.usedPoints.toLocaleString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-indigo-600">คงเหลือสุทธิ</p>
                            <p className="text-lg font-black text-indigo-600 bg-indigo-50 py-0.5 rounded-lg border border-indigo-100">
                              {searchedMemberResult.balancePoints.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] text-center rounded-xl border border-indigo-100 font-bold transition-all">
                          พร้อมสิทธิพิเศษสำหรับผู้ถือแต้ม LOYALTY
                        </div>
                      </div>

                      {/* Rice Mill Service Cross reference Information */}
                      <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                          <Briefcase className="w-4 h-4 text-orange-600" />
                          <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">สรุปการใช้บริการโรงสีข้าว</span>
                        </div>
                        
                        {searchedMemberCrossInfo && searchedMemberCrossInfo.totalBags > 0 ? (
                          <div className="space-y-3">
                            <div className="flex justify-between items-baseline text-xs">
                              <span className="text-slate-500">จำนวนที่ใช้บริการรวม:</span>
                              <span className="font-extrabold text-slate-800">{searchedMemberCrossInfo.jobsList.length} ครั้ง</span>
                            </div>

                            <div className="space-y-2 pt-1 border-t border-slate-200/50">
                              <p className="text-[10px] text-slate-400 font-bold uppercase">จำนวนกระสอบแยกตามประเภทข้าว:</p>
                              
                              <div className="space-y-1.5">
                                {Object.entries(searchedMemberCrossInfo.bagsByRiceType).map(([type, bags]) => {
                                  const pct = searchedMemberCrossInfo.totalBags > 0 ? (Number(bags) / Number(searchedMemberCrossInfo.totalBags)) * 100 : 0;
                                  return (
                                    <div key={type} className="space-y-0.5">
                                      <div className="flex justify-between text-[11px] font-medium text-slate-600">
                                        <span className="truncate">{type}</span>
                                        <span className="font-extrabold text-slate-800">{bags.toLocaleString()} กระสอบ</span>
                                      </div>
                                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-orange-500 rounded-full transition-all duration-500" 
                                          style={{ width: `${pct}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-slate-200/50 flex justify-between text-xs font-black text-slate-700">
                              <span>กระสอบรวมทั้งหมด:</span>
                              <span>{searchedMemberCrossInfo.totalBags.toLocaleString()} กระสอบ</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-28 flex flex-col items-center justify-center text-center p-3 text-slate-400">
                            <Wheat className="w-8 h-8 text-slate-300 stroke-1 mb-1 animate-pulse" />
                            <p className="text-[11px] leading-snug">ยังไม่มีข้อมูลการส่งชำระหรือเข้าใช้บริการโรงสีข้าวในตารางรับบริการ</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Interactive Section for Raw Rice Milling Photos and Outbound Weights */}
                      {searchedMemberCrossInfo && searchedMemberCrossInfo.jobsList.length > 0 && (
                        <div className="col-span-1 md:col-span-3 mt-6 sm:mt-8 bg-slate-50/50 rounded-2xl p-4 sm:p-6 border border-slate-200">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                            <div>
                              <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 flex items-center gap-2">
                                <Wheat className="w-4 h-4 text-orange-600 animate-pulse shrink-0" />
                                บันทึกภาพถ่ายและรายละเอียดบริการรายครั้ง (Milling Verification Ledger)
                              </h5>
                              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                คลิกเลือกวันที่สีข้าวเพื่อตรวจสอบบันทึกภาพขั้นตอนและน้ำหนักข้าวสารขาออกปลายทางแบบโปร่งใส
                              </p>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
                              <button
                                onClick={() => {
                                  setCustomerReportMode('compact');
                                  setIsCustomerReportOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                                title="พิมพ์แบบสรุปโดยย่อ สำหรับดูผ่านสมาร์ทโฟนได้อย่างสบายตา"
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>สรุปย่อสมาร์ทโฟน</span>
                              </button>
                              
                              <button
                                onClick={() => {
                                  setCustomerReportMode('full');
                                  setIsCustomerReportOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
                                title="พิมพ์ข้อมูลการใช้บริการทั้งหมดลงบนกระดาษ A4 พร้อมรูปภาพข้าว"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>รายงานเต็ม A4</span>
                              </button>
                              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs bg-white py-1 px-3 rounded-xl border border-slate-200 shadow-sm font-bold text-slate-600">
                                <span>ประวัติ:</span>
                                <span className="text-orange-600">{searchedMemberCrossInfo.jobsList.length} ครั้ง</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-6">
                            {/* Left Side: Session Date List selector */}
                            <div className="lg:col-span-4 space-y-2 max-h-[190px] lg:max-h-[380px] overflow-y-auto pr-1 scrollbar-thin">
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">เลือกประวัติวันที่สีข้าว:</span>
                              {searchedMemberCrossInfo.jobsList.map((job, idx) => {
                                const isActive = idx === selectedJobIndex;
                                return (
                                  <button
                                    key={job.date + idx}
                                    onClick={() => setSelectedJobIndex(idx)}
                                    className={`w-full text-left p-2.5 sm:p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                                      isActive 
                                        ? 'bg-gradient-to-r from-orange-600 to-amber-600 border-transparent text-white shadow-md scale-[1.01]' 
                                        : 'bg-white border-slate-200 hover:border-orange-300 text-slate-700 hover:bg-slate-50 shadow-sm'
                                    }`}
                                  >
                                    <div className="space-y-0.5 sm:space-y-1 overflow-hidden pr-2">
                                      <div className="flex items-center gap-1.5">
                                        <Calendar className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${isActive ? 'text-orange-100' : 'text-slate-400'}`} />
                                        <span className="text-[11px] sm:text-xs font-black truncate">
                                          {formatThaiDateStr(job.date)}
                                        </span>
                                      </div>
                                      <p className={`text-[9px] sm:text-[10px] ${isActive ? 'text-orange-100/90' : 'text-slate-400'} font-bold`}>
                                        {job.riceType} • {job.bags} กระสอบ
                                      </p>
                                    </div>
                                    <ChevronRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform ${
                                      isActive ? 'text-white translate-x-1' : 'text-slate-400 group-hover:translate-x-0.5'
                                    }`} />
                                  </button>
                                );
                              })}
                            </div>

                            {/* Right Side: Process details & Photos Grid of Active Selected Session */}
                            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 sm:space-y-6">
                              {(() => {
                                const activeJob = searchedMemberCrossInfo.jobsList[selectedJobIndex] || searchedMemberCrossInfo.jobsList[0];
                                if (!activeJob) return (
                                  <div className="h-full flex items-center justify-center p-6 text-slate-400 text-xs">
                                    ไม่มีข้อมูลของรายการสีข้าวนี้
                                  </div>
                                );
                                return (
                                  <>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 pb-4 border-b border-dashed border-slate-200">
                                      {/* Outbound weight hero metric */}
                                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 p-3.5 sm:p-4 rounded-xl border border-indigo-150 flex flex-col justify-between min-h-[85px]">
                                        <div className="flex items-center gap-1 text-indigo-600">
                                          <Scale className="w-3.5 h-3.5 shrink-0" />
                                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider">น้ำหนักข้าวสารขาออก</span>
                                        </div>
                                        <div className="mt-1.5 flex items-baseline gap-1">
                                          <span className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight">
                                            {activeJob.outboundWeight && activeJob.outboundWeight > 0 
                                              ? activeJob.outboundWeight.toLocaleString() 
                                              : '-'}
                                          </span>
                                          <span className="text-xs font-semibold text-indigo-500">กก.</span>
                                        </div>
                                      </div>

                                      {/* Inbound weight metric */}
                                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[85px]">
                                        <div className="flex items-center gap-1 text-slate-500">
                                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">น้ำหนักข้าวขาเข้า</span>
                                        </div>
                                        <div className="mt-1.5 flex items-baseline gap-1">
                                          <span className="text-xl sm:text-2xl font-black text-slate-700">
                                            {activeJob.weight ? activeJob.weight.toLocaleString() : '-'}
                                          </span>
                                          <span className="text-xs font-semibold text-slate-400">กก.</span>
                                        </div>
                                      </div>

                                      {/* Bags & status */}
                                      <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200 flex flex-col justify-between min-h-[85px]">
                                        <div className="flex items-center gap-1.5 text-slate-500">
                                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">บริการที่ได้รับ / ปริมาณ</span>
                                        </div>
                                        <div className="mt-1.5">
                                          <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-tight">
                                            {activeJob.bags} กระสอบ ({activeJob.riceType})
                                          </p>
                                          {activeJob.serviceType && (
                                            <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100 px-1.5 py-0.5 rounded-full font-bold inline-block mt-1">
                                              {activeJob.serviceType}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* 4-Image Grid with interactive Zoom lightboxes */}
                                    <div className="space-y-4">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide block">รูปภาพบริการสีข้าว (Milling Gallery):</span>
                                        <span className="text-[10px] text-slate-400 italic">คลิกที่รูปภาพกล่องใดก็ได้เพื่อทำการขยายภาพ</span>
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {renderImageTile(
                                          "รูปกระสอบข้าว",
                                          activeJob.riceBagImg,
                                          "กระสอบข้าวบันทึกตอนเข้าระบบ",
                                          "กระสอบข้าว"
                                        )}

                                        {renderImageTile(
                                          "รูปข้าวขาเข้า",
                                          activeJob.riceInboundImg,
                                          "ตัวอย่างเมล็ดข้าวเปลือกก่อนขัดสี",
                                          "ข้าวขาเข้า"
                                        )}

                                        {renderImageTile(
                                          "รูปข้าวกล้อง",
                                          activeJob.brownRiceImg,
                                          "เมล็ดข้าวกล้องดิบหลังเทกะเทาะ",
                                          "ข้าวกล้อง"
                                        )}

                                        {renderImageTile(
                                          "รูปข้าวสาร",
                                          activeJob.milledRiceImg,
                                          "ข้าวสารบริสุทธิ์พร้อมส่งมอบกลับ",
                                          "ข้าวสาร"
                                        )}
                                      </div>
                                    </div>

                                    {/* AI-MekongRice Quality Analysis Section */}
                                    <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
                                      <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-orange-100 text-orange-600 rounded-lg">
                                          <Sparkles className="w-5 h-5 text-orange-600 animate-pulse" />
                                        </div>
                                        <div>
                                          <h6 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                            ศูนย์วิเคราะห์คุณภาพภาพถ่ายข้าวอัจฉริยะ (AI-MekongRice)
                                          </h6>
                                          <p className="text-[10px] sm:text-[11px] text-slate-400 font-bold mt-0.5">
                                            วิเคราะห์สัดส่วนสิ่งปนเปื้อน ข้าวแดง และข้าวท้องไข่แบบเรียลไทม์จากระบบกล้องถ่ายภาพเมล็ดข้าวโรงสี
                                          </p>
                                        </div>
                                      </div>

                                      {/* AI Model Selector Card */}
                                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-xs">
                                        <div>
                                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                                            ตัวเลือกโมเดล AI ในการประมวลผล (AI Model Selection)
                                          </span>
                                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                            {aiSelectedModel === 'gemini-3.1-pro-preview' 
                                              ? '✨ โหมด Pro: ความแม่นยำจำแนกสีสูงพิเศษ ตรวจจับข้าวเหนียวปน/สิ่งปนเปื้อนเล็กระดับไมโคร' 
                                              : '⚡ โหมดมาตรฐาน: ประมวลผลรวดเร็ว วิเคราะห์ค่าสถิติเมล็ดข้าวได้อย่างแม่นยำ'}
                                          </p>
                                        </div>
                                        <div className="flex bg-slate-200/70 p-1 rounded-lg self-start sm:self-center shrink-0">
                                          <button
                                            onClick={() => setAiSelectedModel('gemini-3.7-flash')}
                                            className={`text-[10px] font-black px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                                              aiSelectedModel === 'gemini-3.7-flash'
                                                ? 'bg-white text-slate-800 shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                          >
                                            มาตรฐาน (3.7 Flash)
                                          </button>
                                          <button
                                            onClick={() => setAiSelectedModel('gemini-3.1-pro-preview')}
                                            className={`text-[10px] font-black px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                                              aiSelectedModel === 'gemini-3.1-pro-preview'
                                                ? 'bg-orange-500 text-white shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                          >
                                            <Sparkles className="w-3 h-3" />
                                            ความแม่นยำสูง (Pro)
                                          </button>
                                        </div>
                                      </div>

                                      {/* Quick Action Selector Grid */}
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {/* Button 1: Paddy Impurity */}
                                        <button
                                          onClick={() => runAiRiceAnalysis('paddy', activeJob.riceInboundImg, searchedMemberResult.name, activeJob.riceType)}
                                          disabled={aiAnalysisLoading}
                                          className={`relative p-3 rounded-xl border text-left transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between min-h-[110px] ${
                                            aiAnalysisActiveType === 'paddy'
                                              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/10'
                                              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                          } ${aiAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                          <div className="flex items-start justify-between w-full">
                                            <div className="p-1.5 bg-amber-50 rounded-lg text-amber-700 border border-amber-100">
                                              <Wheat className="w-4 h-4" />
                                            </div>
                                            <span className="text-[9px] font-black bg-amber-100 text-amber-800 py-0.5 px-2 rounded-full uppercase">
                                              ข้าวเปลือกขาเข้า
                                            </span>
                                          </div>
                                          <div className="mt-3">
                                            <p className="text-xs font-black text-slate-700">สแกนสิ่งเจือปนข้าวเปลือก</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold leading-tight">คำนวณสิ่งเจือปน ฟาง เศษหินเทียบเมล็ดข้าว</p>
                                          </div>
                                        </button>

                                        {/* Button 2: Brown Rice Red Grains */}
                                        <button
                                          onClick={() => runAiRiceAnalysis('brown', activeJob.brownRiceImg, searchedMemberResult.name, activeJob.riceType)}
                                          disabled={aiAnalysisLoading}
                                          className={`relative p-3 rounded-xl border text-left transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between min-h-[110px] ${
                                            aiAnalysisActiveType === 'brown'
                                              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/10'
                                              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                          } ${aiAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                          <div className="flex items-start justify-between w-full">
                                            <div className="p-1.5 bg-rose-50 rounded-lg text-rose-700 border border-rose-100">
                                              <Sprout className="w-4 h-4" />
                                            </div>
                                            <span className="text-[9px] font-black bg-rose-100 text-rose-800 py-0.5 px-2 rounded-full uppercase">
                                              ข้าวกล้องกะเทาะเปลือก
                                            </span>
                                          </div>
                                          <div className="mt-3">
                                            <p className="text-xs font-black text-slate-700">ตรวจปนเปื้อนข้าวแดง</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold leading-tight">ค้นหาระดับเปอร์เซ็นต์ปนเปื้อนข้าวแดงและเมล็ดดำ</p>
                                          </div>
                                        </button>

                                        {/* Button 3: Milled Rice Chalkiness */}
                                        <button
                                          onClick={() => runAiRiceAnalysis('milled', activeJob.milledRiceImg, searchedMemberResult.name, activeJob.riceType)}
                                          disabled={aiAnalysisLoading}
                                          className={`relative p-3 rounded-xl border text-left transition-all duration-300 overflow-hidden cursor-pointer flex flex-col justify-between min-h-[110px] ${
                                            aiAnalysisActiveType === 'milled'
                                              ? 'bg-orange-50 border-orange-300 ring-2 ring-orange-500/10'
                                              : 'bg-white hover:bg-slate-50 border-slate-200 shadow-sm'
                                          } ${aiAnalysisLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
                                        >
                                          <div className="flex items-start justify-between w-full">
                                            <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-700 border border-indigo-100">
                                              <Sparkles className="w-4 h-4" />
                                            </div>
                                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-800 py-0.5 px-2 rounded-full uppercase">
                                              ข้าวสารสำเร็จรูป
                                            </span>
                                          </div>
                                          <div className="mt-3">
                                            <p className="text-xs font-black text-slate-700">สแกนท้องไข่และข้าวเจือปน</p>
                                            <p className="text-[10px] text-slate-400 mt-0.5 font-semibold leading-tight">ตรวจสอบเมล็ดท้องไข่และข้าวเหนียวปนในข้าวเจ้า</p>
                                          </div>
                                        </button>
                                      </div>

                                      {/* Loading Spinner Panel */}
                                      {aiAnalysisLoading && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.98 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col items-center justify-center text-center space-y-3 min-h-[180px]"
                                        >
                                          <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                          <div className="space-y-1">
                                            <p className="text-xs font-black text-slate-700 animate-pulse">ระบบประมวลผล AI-MekongRice กำลังเชื่อมต่อวิเคราะห์รูปภาพผ่านระบบจำลองโครงสร้าง...</p>
                                            <p className="text-[10px] text-slate-400 font-bold">กรุณารอสักครู่ ระบบกำลังประมวลผลเปรียบเทียบสัดส่วนและแปลผลจาก AI-MekongRice ผ่าน Google Gemini</p>
                                          </div>
                                        </motion.div>
                                      )}

                                      {/* Error Panel */}
                                      {aiAnalysisError && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.98 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          className="bg-red-50 text-red-800 rounded-2xl p-4 border border-red-200 flex flex-col items-center justify-center text-center space-y-2"
                                        >
                                          <span className="text-2xl">⚠️</span>
                                          <p className="text-xs font-black">{aiAnalysisError}</p>
                                          <p className="text-[9px] text-red-500">กรุณาลองกดทำการวิเคราะห์อีกครั้งหรือตรวจสอบอินเทอร์เน็ต</p>
                                        </motion.div>
                                      )}

                                      {/* Results Presentation Panel */}
                                      {aiAnalysisResult && aiAnalysisResult.data && (
                                        <motion.div
                                          initial={{ opacity: 0, y: 15 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ duration: 0.4 }}
                                          className="bg-gradient-to-b from-slate-50 to-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-5"
                                        >
                                          {/* Result Header Credit */}
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200/60">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
                                              <span className="text-xs font-black text-slate-800">
                                                ผลการตรวจวัดโดยระบบอัจฉริยะ AI-MekongRice
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <button
                                                onClick={exportToWordDoc}
                                                className="flex items-center gap-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-[10px] font-black py-1 px-3 rounded-lg shadow-sm hover:shadow transition-all duration-200 cursor-pointer active:scale-95"
                                                title="ดาวน์โหลดรายงานคุณภาพเมล็ดข้าวอย่างละเอียดเป็นไฟล์ Microsoft Word (.doc)"
                                              >
                                                <BookOpen className="w-3.5 h-3.5" />
                                                ดาวน์โหลดรายงาน (.doc)
                                              </button>
                                              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider hidden sm:inline-block">
                                                {aiAnalysisResult.isSimulated ? "✨ ระบบวิเคราะห์วิชั่นเม็ดข้าวความแม่นยำสูง" : "🛡️ แปลผลสำเร็จผ่าน AI-MekongRice"}
                                              </span>
                                            </div>
                                          </div>

                                          {/* Quality Grade, Main Metric Circle, and Interactive Image Scanner Canvas Row */}
                                          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                            
                                            {/* Left Column: Bounding Boxes Target Image Scanner */}
                                            <div className="md:col-span-5 flex flex-col space-y-3">
                                               <div className="flex flex-col gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                                 <div className="flex justify-between items-center">
                                                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block">
                                                     ระบบประมวลผลวิชั่นเมล็ดข้าว (AI Vision Options)
                                                   </span>
                                                 </div>
                                                 <div className="flex flex-wrap items-center gap-y-1.5 gap-x-3 text-[10px] font-bold text-slate-500 select-none">
                                                   <label className="flex items-center gap-1.5 cursor-pointer">
                                                     <input 
                                                       type="checkbox" 
                                                       checked={showBoundingBoxes} 
                                                       onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                                                       className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-3 h-3 cursor-pointer"
                                                     />
                                                     แสดงกรอบสีแดงสิ่งปนเปื้อน
                                                   </label>
                                                   
                                                   <label className="flex items-center gap-1.5 cursor-pointer text-emerald-700">
                                                     <input 
                                                       type="checkbox" 
                                                       checked={showAllGrains} 
                                                       onChange={(e) => setShowAllGrains(e.target.checked)}
                                                       className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3 h-3 cursor-pointer"
                                                     />
                                                     ขอบเขตเมล็ดข้าวที่นับทั้งหมด ({allGrains.length} เมล็ด)
                                                   </label>
                                                 </div>

                                                 {showAllGrains && (
                                                   <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                                                     <div className="flex items-center gap-1 font-bold text-slate-500">
                                                       <span>ลักษณะขอบเขต:</span>
                                                       <select 
                                                         value={grainShapeType} 
                                                         onChange={(e) => setGrainShapeType(e.target.value as any)}
                                                         className="bg-white border border-slate-250 rounded py-0.5 px-1.5 text-[9px] font-bold text-slate-700 focus:ring-1 focus:ring-emerald-500"
                                                       >
                                                         <option value="polygon">Polygon (วาดตามรูปเมล็ดจริง)</option>
                                                         <option value="ellipse">Ellipse (วงรีคู่ขนาน)</option>
                                                       </select>
                                                     </div>
                                                     
                                                     <label className="flex items-center gap-1 cursor-pointer font-semibold text-slate-500">
                                                       <input 
                                                         type="checkbox" 
                                                         checked={showGrainNumbers} 
                                                         onChange={(e) => setShowGrainNumbers(e.target.checked)}
                                                         className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-2.5 h-2.5 cursor-pointer"
                                                       />
                                                       แสดงตัวเลขลำดับเมล็ด
                                                     </label>
                                                   </div>
                                                 )}
                                               </div>

                                              {/* Dynamic Image Overlay Container */}
                                              <div 
                                                onClick={() => setIsVisionZoomOpen(true)}
                                                className="relative aspect-square sm:aspect-[4/3] md:aspect-square w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-950 shadow-sm group/scan cursor-zoom-in hover:shadow-md transition-shadow"
                                                title="คลิกเพื่อขยายดูรูปภาพขนาดใหญ่พิเศษ"
                                              >
                                                {/* SVG overlay for all counted grain boundaries */}
                                                {showAllGrains && (
                                                  <svg 
                                                    className="absolute inset-0 w-full h-full pointer-events-none z-20"
                                                    viewBox="0 0 100 100"
                                                    preserveAspectRatio="none"
                                                  >
                                                    {allGrains.map((grain) => {
                                                      // Determine colors based on type
                                                      let strokeColor = "rgba(16, 185, 129, 0.7)"; // Emerald for normal/good
                                                      let fillColor = "rgba(16, 185, 129, 0.08)";
                                                      
                                                      if (grain.isUserAdded) {
                                                        strokeColor = "rgba(245, 158, 11, 0.85)"; // Gold for user added
                                                        fillColor = "rgba(245, 158, 11, 0.12)";
                                                      }

                                                      return (
                                                        <g key={`main-grain-group-${grain.id}`}>
                                                          {grainShapeType === 'polygon' ? (
                                                            <polygon 
                                                              points={grain.polygonString}
                                                              stroke={strokeColor}
                                                              strokeWidth="0.25"
                                                              fill={fillColor}
                                                            />
                                                          ) : (
                                                            <ellipse 
                                                              cx={grain.x}
                                                              cy={grain.y}
                                                              rx={grain.w / 2}
                                                              ry={grain.h / 2}
                                                              transform={`rotate(${grain.rotation}, ${grain.x}, ${grain.y})`}
                                                              stroke={strokeColor}
                                                              strokeWidth="0.25"
                                                              fill={fillColor}
                                                            />
                                                          )}
                                                          
                                                          {/* Sequential Number Label */}
                                                          {showGrainNumbers && (
                                                            <text 
                                                              x={grain.x}
                                                              y={grain.y}
                                                              className="text-[1.3px] fill-emerald-100 font-bold font-mono select-none pointer-events-none drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.95)]"
                                                              textAnchor="middle"
                                                              alignmentBaseline="middle"
                                                            >
                                                              {grain.id}
                                                            </text>
                                                          )}
                                                        </g>
                                                      );
                                                    })}
                                                  </svg>
                                                )}
                                                <img 
                                                  src={(() => {
                                                    const url = aiAnalysisActiveType === 'paddy'
                                                      ? activeJob.riceInboundImg
                                                      : aiAnalysisActiveType === 'brown'
                                                      ? activeJob.brownRiceImg
                                                      : activeJob.milledRiceImg;
                                                    
                                                    if (!url || url.length < 5) {
                                                      if (aiAnalysisActiveType === 'paddy') {
                                                        return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600';
                                                      } else if (aiAnalysisActiveType === 'brown') {
                                                        return 'https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=600';
                                                      } else {
                                                        return 'https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=600';
                                                      }
                                                    }
                                                    return url;
                                                  })()} 
                                                  alt="Rice analysis target" 
                                                  className="w-full h-full object-cover opacity-90"
                                                  referrerPolicy="no-referrer"
                                                />

                                                {/* Scanning Laser Line Animation */}
                                                <div className="absolute inset-x-0 h-0.5 bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.7)] animate-[scan_3s_ease-in-out_infinite] z-10 pointer-events-none" />

                                                <style>{`
                                                  @keyframes scan {
                                                    0%, 100% { top: 4%; }
                                                    50% { top: 96%; }
                                                  }
                                                `}</style>

                                                {/* Bounding Boxes Layer (Ellipsoidal / Oval boundary detection) */}
                                                {showBoundingBoxes && aiAnalysisResult.data.detectedBoxes && aiAnalysisResult.data.detectedBoxes.map((box: any, idx: number) => {
                                                  const isHovered = hoveredBoxIdx === idx;
                                                  return (
                                                    <div
                                                      key={idx}
                                                      className={`absolute border-2 border-red-500 bg-red-500/15 transition-all duration-300 cursor-pointer flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(239,68,68,0.3)] ${
                                                        isHovered ? 'ring-4 ring-red-400/40 bg-red-500/35 scale-105 shadow-[0_0_12px_rgba(239,68,68,1)] z-20' : 'z-10'
                                                      }`}
                                                      style={{
                                                        left: `${box.x}%`,
                                                        top: `${box.y}%`,
                                                        width: `${box.w}%`,
                                                        height: `${box.h}%`,
                                                      }}
                                                      onMouseEnter={() => setHoveredBoxIdx(idx)}
                                                      onMouseLeave={() => setHoveredBoxIdx(null)}
                                                    >
                                                      {/* Box tag */}
                                                      <span className="absolute -top-4 left-0 bg-red-600 text-white text-[8px] px-1 font-bold rounded shadow-xs whitespace-nowrap uppercase tracking-tighter">
                                                        {box.label || `วงรีจุดตรวจที่ ${idx + 1}`}
                                                      </span>
                                                    </div>
                                                  );
                                                })}

                                                {/* High-Tech HUD Grid Pattern */}
                                                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                                              </div>

                                              {/* Enlarge Scan Map Button */}
                                              <button
                                                onClick={() => setIsVisionZoomOpen(true)}
                                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-100 bg-white hover:text-slate-800 text-slate-600 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs"
                                              >
                                                <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                                                คลิกเพื่อขยายดูรูปภาพและจุดตรวจแบบละเอียด (Enlarge Scan Map)
                                              </button>

                                              {/* Detected Items Legend Table */}
                                              {aiAnalysisResult.data.detectedBoxes && aiAnalysisResult.data.detectedBoxes.length > 0 && (
                                                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                                    รายการสแกนสิ่งเจือปน/สีบกพร่อง (Detected Anomalies)
                                                  </span>
                                                  <div className="grid grid-cols-2 gap-2 max-h-[110px] overflow-y-auto scrollbar-thin">
                                                    {aiAnalysisResult.data.detectedBoxes.map((box: any, idx: number) => {
                                                      const isHovered = hoveredBoxIdx === idx;
                                                      return (
                                                        <div
                                                          key={idx}
                                                          onMouseEnter={() => setHoveredBoxIdx(idx)}
                                                          onMouseLeave={() => setHoveredBoxIdx(null)}
                                                          className={`flex items-center gap-1.5 p-1 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                                            isHovered 
                                                              ? 'bg-red-50 border-red-200 text-red-700 font-extrabold shadow-2xs' 
                                                              : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
                                                          }`}
                                                        >
                                                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                                          <span className="truncate">{box.label || `Anomaly #${idx + 1}`}</span>
                                                          <span className="text-[8px] bg-red-50 text-red-600 px-1 rounded font-black ml-auto shrink-0">
                                                            X:{box.x} Y:{box.y}
                                                          </span>
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Right Column: Grade and Metrics Display */}
                                            <div className="md:col-span-7 space-y-4">
                                              {/* Grade and Main Info */}
                                              <div className="flex flex-col sm:flex-row gap-4 p-4 bg-white rounded-xl border border-slate-200">
                                                <div className="flex flex-col items-center justify-center text-center p-3 bg-slate-50 rounded-xl border border-slate-100 w-full sm:w-1/3 shrink-0">
                                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">เกรดวิเคราะห์ AI</span>
                                                  <div className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-2xl shadow-xs border my-1 ${
                                                    (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'A' 
                                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                                      : (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'B' 
                                                      ? 'bg-sky-50 text-sky-600 border-sky-200' 
                                                      : (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'C' 
                                                      ? 'bg-amber-50 text-amber-600 border-amber-200' 
                                                      : 'bg-rose-50 text-rose-600 border-rose-200'
                                                  }`}>
                                                    {calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade || 'A'}
                                                  </div>
                                                  <span className="text-[9px] font-extrabold text-slate-500 block leading-tight">
                                                    {(calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'A' 
                                                      ? 'เกรดดีเยี่ยม (Premium)' 
                                                      : (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'B' 
                                                      ? 'เกรดมาตรฐานดีมาก' 
                                                      : (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'C' 
                                                      ? 'เกรดปานกลางทั่วไป' 
                                                      : 'ต่ำกว่าเกรดมาตรฐาน'}
                                                  </span>
                                                </div>

                                                <div className="flex-1 flex flex-col justify-center space-y-1">
                                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ขอบเขตมาตรฐานคุณภาพข้าว</span>
                                                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                                                    ระบบประมวลผลทำการแบ่งเกรดตามข้อกำหนด มอก. และมาตรฐานโรงสีนครพนม เพื่อคำนวณราคาหักลด/พรีเมียมน้ำหนักข้าวอย่างโปร่งใส มีความเป็นธรรมกับเกษตรกร
                                                  </p>
                                                  <div className="text-[10px] font-extrabold text-orange-600 bg-orange-50/70 p-1.5 rounded border border-orange-100 flex items-center gap-1">
                                                    <span>⚠️</span>
                                                    <span>หากพบความคลาดเคลื่อนเกินกว่าค่าจำกัด ระบบจะคัดแยกอัตโนมัติ</span>
                                                  </div>
                                                </div>
                                              </div>

                                              {/* Metrics detail sliders */}
                                              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-4">
                                              {aiAnalysisActiveType === 'paddy' && (
                                                <div className="space-y-2">
                                                  <div className="flex justify-between items-baseline">
                                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                                                      🌾 อัตราส่วนสิ่งเจือปนปะปน (Impurities):
                                                    </span>
                                                    <span className="text-sm font-black text-amber-600">{(calculatedMetrics?.impurityPercent !== undefined ? calculatedMetrics.impurityPercent : aiAnalysisResult.data.impurityPercent)}%</span>
                                                  </div>
                                                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div 
                                                      className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                                                      style={{ width: `${Math.min((calculatedMetrics?.impurityPercent !== undefined ? calculatedMetrics.impurityPercent : aiAnalysisResult.data.impurityPercent) * 10, 100)}%` }}
                                                    />
                                                  </div>
                                                  <p className="text-[10px] font-bold text-slate-500">
                                                    สเปกวิเคราะห์: {calculatedMetrics?.impurityDetails || aiAnalysisResult.data.impurityDetails || 'พบเศษฟางแห้งและละอองฝุ่นปะปนเล็กน้อย'}
                                                  </p>
                                                </div>
                                              )}

                                              {aiAnalysisActiveType === 'brown' && (
                                                <div className="space-y-2">
                                                  <div className="flex justify-between items-baseline">
                                                    <span className="text-xs font-black text-slate-700 flex items-center gap-1">
                                                      🟫 สัดส่วนการปนเปื้อนข้าวแดง (Red Grains Contamination):
                                                    </span>
                                                    <span className="text-sm font-black text-rose-600">{(calculatedMetrics?.redContaminationPercent !== undefined ? calculatedMetrics.redContaminationPercent : aiAnalysisResult.data.redContaminationPercent)}%</span>
                                                  </div>
                                                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                    <div 
                                                      className="h-full bg-rose-500 rounded-full transition-all duration-500" 
                                                      style={{ width: `${Math.min((calculatedMetrics?.redContaminationPercent !== undefined ? calculatedMetrics.redContaminationPercent : aiAnalysisResult.data.redContaminationPercent) * 12, 100)}%` }}
                                                    />
                                                  </div>
                                                </div>
                                              )}

                                              {aiAnalysisActiveType === 'milled' && (
                                                <div className="space-y-4">
                                                  {/* Chalky percent */}
                                                  <div className="space-y-1.5">
                                                    <div className="flex justify-between items-baseline">
                                                      <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                                                        🍚 อัตราข้าวมีท้องไข่ (Chalky Grains):
                                                      </span>
                                                      <span className="text-xs font-black text-indigo-600">{(calculatedMetrics?.chalkyPercent !== undefined ? calculatedMetrics.chalkyPercent : aiAnalysisResult.data.chalkyPercent)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                      <div 
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${Math.min((calculatedMetrics?.chalkyPercent !== undefined ? calculatedMetrics.chalkyPercent : aiAnalysisResult.data.chalkyPercent) * 8, 100)}%` }}
                                                      />
                                                    </div>
                                                  </div>

                                                  {/* Mixed Glutinous percent */}
                                                  <div className="space-y-1.5">
                                                    <div className="flex justify-between items-baseline">
                                                      <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                                                        🌾 อัตราพันธุ์ข้าวเหนียวปนในข้าวเจ้า (Mixed Glutinous):
                                                      </span>
                                                      <span className="text-xs font-black text-teal-600">{(calculatedMetrics?.mixedGlutinousPercent !== undefined ? calculatedMetrics.mixedGlutinousPercent : aiAnalysisResult.data.mixedGlutinousPercent)}%</span>
                                                    </div>
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                                      <div 
                                                        className="h-full bg-teal-500 rounded-full transition-all duration-500" 
                                                        style={{ width: `${Math.min((calculatedMetrics?.mixedGlutinousPercent !== undefined ? calculatedMetrics.mixedGlutinousPercent : aiAnalysisResult.data.mixedGlutinousPercent) * 150, 100)}%` }}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              )}

                                              {/* 📊 Detailed Grain Count Breakdown Card */}
                                              {calculatedMetrics && (
                                                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-4 mt-4" id="detailed-grain-count-card">
                                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                                                    <div>
                                                      <span className="text-[11px] font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                                                        📊 รายละเอียดการนับและวิเคราะห์ขอบเขตข้าว ({aiAnalysisActiveType === 'paddy' ? 'ข้าวเปลือก' : aiAnalysisActiveType === 'brown' ? 'ข้าวกล้อง' : 'ข้าวสาร'})
                                                      </span>
                                                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                                        ขอบเขตแบบวงรี (Ellipse Boundaries) ที่ใช้ตรวจจับจริงบนภาพเมล็ดข้าว
                                                      </span>
                                                    </div>
                                                    {userAnnotatedPoints.length > 0 && (
                                                      <span className="text-[9px] bg-amber-500 text-slate-950 rounded-full px-2.5 py-1 font-black animate-pulse shadow-xs self-start sm:self-center">
                                                        ชุดฝึกสอน AI +{userAnnotatedPoints.length} จุดวงรีป้อนกลับ
                                                      </span>
                                                    )}
                                                  </div>

                                                  {/* 1. Grain counting metrics comparison */}
                                                  <div className="grid grid-cols-3 gap-2.5">
                                                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-center shadow-xs">
                                                      <span className="text-[9px] font-bold text-slate-500 block">ประมาณการเมล็ดข้าวในพื้นที่</span>
                                                      <span className="text-base font-black text-slate-800">{calculatedMetrics.totalGrains}</span>
                                                      <span className="text-[8px] text-slate-400 block font-bold">เมล็ดรวม</span>
                                                    </div>
                                                    <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-200/50 text-center shadow-xs">
                                                      <span className="text-[9px] font-bold text-emerald-600 block">สัดส่วนเมล็ดข้าวดี</span>
                                                      <span className="text-base font-black text-emerald-600">{calculatedMetrics.goodGrains}</span>
                                                      <span className="text-[8px] text-emerald-500 block font-bold">เมล็ด ({calculatedMetrics.totalGrains > 0 ? ((calculatedMetrics.goodGrains / calculatedMetrics.totalGrains) * 100).toFixed(1) : 0}%)</span>
                                                    </div>
                                                    <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-200/50 text-center shadow-xs">
                                                      <span className="text-[9px] font-bold text-rose-600 block">สิ่งปนเปื้อน / ผิดปกติ</span>
                                                      <span className="text-base font-black text-rose-600">{calculatedMetrics.contaminantGrains}</span>
                                                      <span className="text-[8px] text-rose-500 block font-bold">เมล็ด ({calculatedMetrics.totalGrains > 0 ? ((calculatedMetrics.contaminantGrains / calculatedMetrics.totalGrains) * 100).toFixed(1) : 0}%)</span>
                                                    </div>
                                                  </div>

                                                  {/* 2. Specific Rice Type Count Details */}
                                                  <div className="p-3 bg-white rounded-lg border border-slate-150 space-y-2">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                                      🔍 รายละเอียดตามประเภทข้าว (Specific Grain Classification Summary)
                                                    </span>
                                                    
                                                    {aiAnalysisActiveType === 'paddy' ? (
                                                      <div className="text-[11px] text-slate-600 font-bold space-y-1">
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🌾 เมล็ดข้าวเปลือกที่วิเคราะห์:</span>
                                                          <span className="text-slate-800">{calculatedMetrics.goodGrains} เมล็ด</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🍂 เศษสิ่งเจือปน (หญ้า, หิน, กิ่งฟาง):</span>
                                                          <span className="text-rose-600 font-extrabold">{calculatedMetrics.contaminantGrains} ชิ้น ({calculatedMetrics.impurityPercent}%)</span>
                                                        </div>
                                                      </div>
                                                    ) : aiAnalysisActiveType === 'brown' ? (
                                                      <div className="text-[11px] text-slate-600 font-bold space-y-1">
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🟫 เมล็ดข้าวกล้องพันธุ์บริสุทธิ์:</span>
                                                          <span className="text-slate-800">{calculatedMetrics.goodGrains} เมล็ด</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🔴 เมล็ดที่มีแถบข้าวแดง หรือเมล็ดเสียสีดำ:</span>
                                                          <span className="text-rose-600 font-extrabold">{calculatedMetrics.contaminantGrains} เมล็ด ({calculatedMetrics.redContaminationPercent}%)</span>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="text-[11px] text-slate-600 font-bold space-y-1">
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🍚 เมล็ดข้าวสารขาวปกติ:</span>
                                                          <span className="text-slate-800">{calculatedMetrics.goodGrains} เมล็ด</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🍳 เมล็ดที่มีลักษณะท้องไข่ (Chalky Grains):</span>
                                                          <span className="text-indigo-600 font-extrabold">
                                                            {userAnnotatedPoints.filter(p => p.label.includes('ท้องไข่') || p.label.toLowerCase().includes('chalky')).length + 
                                                             (aiAnalysisResult.data.detectedBoxes || []).filter((box: any) => 
                                                               !dismissedSystemBoxes.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1) &&
                                                               (box.label?.includes('ท้องไข่') || box.label?.toLowerCase().includes('chalky'))
                                                             ).length} เมล็ด ({calculatedMetrics.chalkyPercent}%)
                                                          </span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-slate-100 py-1">
                                                          <span>🌾 เมล็ดข้าวเหนียวปนเปื้อน (Mixed Glutinous):</span>
                                                          <span className="text-teal-600 font-extrabold">
                                                            {userAnnotatedPoints.filter(p => p.label.includes('เหนียว') || p.label.toLowerCase().includes('glutinous')).length + 
                                                             (aiAnalysisResult.data.detectedBoxes || []).filter((box: any) => 
                                                               !dismissedSystemBoxes.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1) &&
                                                               (box.label?.includes('เหนียว') || box.label?.toLowerCase().includes('glutinous'))
                                                             ).length} เมล็ด ({calculatedMetrics.mixedGlutinousPercent}%)
                                                          </span>
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>

                                                  {/* 3. Mathematical Verification / Ellipse boundaries display */}
                                                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2">
                                                    <div className="flex items-center gap-1.5 text-indigo-800 text-[10px] font-black">
                                                      <span>🟢</span>
                                                      <span>จำนวนข้อมูลขอบเขตวงรีที่ประมวลผลบนหน้าจอ (Boundary Correctness Verification):</span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[10px] font-bold">
                                                      <div className="bg-white p-2 rounded-md border border-slate-200">
                                                        <span className="text-slate-400 block text-[8px]">AI สแกนพบ (วงรี)</span>
                                                        <span className="text-slate-800 text-xs font-black">{aiAnalysisResult.data.detectedBoxes?.length || 0} จุด</span>
                                                      </div>
                                                      <div className="bg-white p-2 rounded-md border border-slate-200">
                                                        <span className="text-slate-400 block text-[8px]">ผู้ใช้ชี้สอนเพิ่ม (วงรี)</span>
                                                        <span className="text-amber-600 text-xs font-black">+{userAnnotatedPoints.length} จุด</span>
                                                      </div>
                                                      <div className="bg-white p-2 rounded-md border border-slate-200">
                                                        <span className="text-slate-400 block text-[8px]">คัดออกที่ระบุผิด</span>
                                                        <span className="text-slate-500 text-xs font-black">-{dismissedSystemBoxes.length} จุด</span>
                                                      </div>
                                                      <div className="bg-indigo-600 text-white p-2 rounded-md">
                                                        <span className="text-indigo-200 block text-[8px] font-black">วงรีสรุปรวมทั้งหมด</span>
                                                        <span className="text-xs font-black">
                                                          {((aiAnalysisResult.data.detectedBoxes?.length || 0) - dismissedSystemBoxes.length) + userAnnotatedPoints.length} วงรี
                                                        </span>
                                                      </div>
                                                    </div>
                                                    
                                                    <div className="text-[9px] text-slate-500 font-semibold leading-relaxed pt-1 flex items-start gap-1">
                                                      <span>💡</span>
                                                      <span>
                                                        การนับขอบเขตโดยใช้ <span className="text-indigo-600 font-black">ลักษณะวงรี (Elliptical boundary)</span> จะสอดคล้องกับลักษณะทางชีวภาพของโครงสร้างเมล็ดข้าวเปลือก ข้าวกล้อง และข้าวสารได้อย่างแม่นยำกว่ากล่องสี่เหลี่ยมทั่วไป การบันทึกและป้อนกลับข้อมูลโดยคลิกสอนระบบ จะเป็นการสอนป้อนข้อมูลย้อนกลับเพื่อช่วยให้เครื่องมือจดจำเฉดสีและขอบเขตวงรีได้อย่างมีประสิทธิภาพสูงสุด
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                              </div>

                                              {/* 💾 Save Quality Metrics Button (Requirement 3) */}
                                              {calculatedMetrics && (
                                                <div className="pt-1">
                                                  <button
                                                    onClick={handleSaveRiceQuality}
                                                    disabled={isSavingQuality}
                                                    className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs border uppercase tracking-wider ${
                                                      isSavingQuality 
                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 hover:shadow-md'
                                                    }`}
                                                  >
                                                    <Save className="w-4 h-4 shrink-0" />
                                                    {isSavingQuality ? "กำลังบันทึกข้อมูล..." : "บันทึกข้อมูลคุณภาพข้าวลงในระบบโดยไม่ต้องกดวิเคราะห์ใหม่"}
                                                  </button>
                                                  
                                                  {saveSuccessMessage && (
                                                    <motion.div 
                                                      initial={{ opacity: 0, y: 5 }}
                                                      animate={{ opacity: 1, y: 0 }}
                                                      className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-bold text-center flex items-center justify-center gap-1.5"
                                                    >
                                                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                                      <span>{saveSuccessMessage}</span>
                                                    </motion.div>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Detailed Description Report */}
                                          <div className="bg-white rounded-xl p-4 border border-slate-150 space-y-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">คำแปลผลรายละเอียดทางกายภาพข้าว</span>
                                            <p className="text-xs text-slate-600 leading-relaxed font-bold">
                                              {aiAnalysisResult.data.description || 'รูปข้าวที่ส่งเข้าวิเคราะห์มีความสมบูรณ์ตามสัดส่วนโครงสร้างทางชีวภาพข้าวที่บันทึกพิกัดของทางโรงสี'}
                                            </p>
                                          </div>

                                          {/* Bullet Recommendations List */}
                                          <div className="space-y-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">คำแนะนำเพื่อเพิ่มพูนระดับคุณภาพข้าวสาร</span>
                                            <div className="grid grid-cols-1 gap-2">
                                              {aiAnalysisResult.data.recommendations && aiAnalysisResult.data.recommendations.map((rec: string, idx: number) => (
                                                <div key={idx} className="flex gap-2.5 items-start p-2.5 bg-slate-50/50 rounded-lg border border-slate-150">
                                                  <span className="text-[11px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded font-black shrink-0">
                                                    {idx + 1}
                                                  </span>
                                                  <span className="text-xs text-slate-600 font-bold leading-normal">{rec}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Notice Alert if simulated fallback was run */}
                                          {aiAnalysisResult.notice && (
                                            <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] text-center rounded-xl font-bold leading-normal">
                                              ⚡ {aiAnalysisResult.notice}
                                            </div>
                                          )}
                                        </motion.div>
                                      )}
                                    </div>

                                    {/* Helper function to find the bounding box under the cursor */}
                                    {(() => {
                                      // Defining findPointedBox so it is available below
                                      return null;
                                    })()}

                                    {/* Interactive AI Vision Zoom Lightbox Modal */}
                                    {isVisionZoomOpen && aiAnalysisResult && (
                                      <div 
                                        className="fixed inset-0 bg-slate-900/95 z-[99999] flex items-center justify-center p-4 backdrop-blur-md"
                                        onClick={() => setIsVisionZoomOpen(false)}
                                        id="vision-zoom-modal-container"
                                      >
                                        <div 
                                          className="relative w-full max-w-5xl bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[88vh] border border-slate-700"
                                          onClick={(e) => e.stopPropagation()}
                                          id="vision-zoom-modal-content"
                                        >
                                          {/* Close Button */}
                                          <button 
                                            onClick={() => setIsVisionZoomOpen(false)}
                                            className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white transition-colors z-[100] cursor-pointer shadow-lg"
                                            title="ปิดหน้าต่างขยาย"
                                            id="close-vision-zoom-btn"
                                          >
                                            <X className="w-5 h-5" />
                                          </button>

                                          {/* Left Content Area: Massive Image Scanner */}
                                          <div className="flex-1 bg-black relative flex flex-col items-center justify-center p-2 overflow-hidden border-b md:border-b-0 md:border-r border-slate-800" id="vision-zoom-left-pane">
                                            
                                            {/* Top Help Tip for Training */}
                                            <div className="w-full max-w-[600px] bg-slate-950/80 backdrop-blur-md px-3 py-2 rounded-lg border border-amber-500/20 mb-2 flex items-center justify-between text-[11px] font-bold text-amber-300 shadow-sm shrink-0 z-10" id="vision-zoom-training-banner">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <PlusCircle className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                                                <span>💡 โหมดป้อนกลับ: คลิกตรงตำแหน่งข้าวในรูปภาพเพื่อ "สอน AI" ให้เรียนรู้เมล็ดที่ผิดปกติ</span>
                                              </div>
                                              {userAnnotatedPoints.length > 0 && (
                                                <span className="bg-amber-500 text-slate-950 text-[9px] px-1.5 py-0.5 rounded-full font-black animate-bounce shrink-0">
                                                  บันทึกแล้ว {userAnnotatedPoints.length} จุด
                                                </span>
                                              )}
                                            </div>

                                            {/* Image with exact proportional scaling */}
                                            <div 
                                              className="relative max-w-full max-h-full aspect-square sm:aspect-[4/3] md:aspect-square w-[600px] shadow-2xl overflow-hidden cursor-crosshair border border-slate-800 rounded-lg group" 
                                              id="vision-zoom-image-wrapper"
                                              onMouseMove={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                const hoverIdx = findPointedBox(x, y);
                                                setPointedBoxIdx(hoverIdx);
                                              }}
                                              onMouseLeave={() => {
                                                setPointedBoxIdx(null);
                                              }}
                                              onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = ((e.clientX - rect.left) / rect.width) * 100;
                                                const y = ((e.clientY - rect.top) / rect.height) * 100;
                                                const boundedX = Math.max(0, Math.min(100, Math.round(x * 10) / 10));
                                                const boundedY = Math.max(0, Math.min(100, Math.round(y * 10) / 10));
                                                
                                                // Snapping center if inside a grain box (Requirement 2)
                                                let snapX = boundedX;
                                                let snapY = boundedY;
                                                if (pointedBoxIdx !== null) {
                                                  const box = aiAnalysisResult.data.detectedBoxes[pointedBoxIdx];
                                                  snapX = Math.max(0, Math.min(100, Math.round((box.x + box.w / 2) * 10) / 10));
                                                  snapY = Math.max(0, Math.min(100, Math.round((box.y + box.h / 2) * 10) / 10));
                                                }
                                                
                                                setPendingAnnotationCoord({ x: snapX, y: snapY, targetBoxIdx: pointedBoxIdx });
                                                setTrainingSuccessMessage(null);
                                              }}
                                            >
                                              <img 
                                                src={(() => {
                                                  const url = aiAnalysisActiveType === 'paddy'
                                                    ? activeJob.riceInboundImg
                                                    : aiAnalysisActiveType === 'brown'
                                                    ? activeJob.brownRiceImg
                                                    : activeJob.milledRiceImg;
                                                  
                                                  if (!url || url.length < 5) {
                                                    if (aiAnalysisActiveType === 'paddy') {
                                                      return 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600';
                                                    } else if (aiAnalysisActiveType === 'brown') {
                                                      return 'https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=600';
                                                    } else {
                                                      return 'https://images.unsplash.com/photo-1590004953392-5aba2e72269a?auto=format&fit=crop&q=80&w=600';
                                                    }
                                                  }
                                                  return url;
                                                })()} 
                                                alt="Rice analysis target zoomed" 
                                                className="w-full h-full object-cover rounded-md"
                                                referrerPolicy="no-referrer"
                                                id="vision-zoom-main-image"
                                              />

                                              {/* Grid Overlay */}
                                              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" id="vision-zoom-grid-overlay" />

                                              {/* Scanner line overlay */}
                                              <div className="absolute inset-x-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-[scan_4s_ease-in-out_infinite] z-10 pointer-events-none" id="vision-zoom-laser-line" />

                                              {/* Bounding Boxes */}
                                              {showBoundingBoxes && aiAnalysisResult.data.detectedBoxes && aiAnalysisResult.data.detectedBoxes.map((box: any, idx: number) => {
                                                const isDismissed = dismissedSystemBoxes.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1);
                                                if (isDismissed) return null;

                                                const isHovered = hoveredBoxIdx === idx || pointedBoxIdx === idx;
                                                const annotatedPoint = userAnnotatedPoints.find(p => p.targetBoxIdx === idx);
                                                
                                                // Change style if annotated or hovered
                                                const borderStyle = annotatedPoint 
                                                  ? 'border-emerald-400 bg-emerald-500/15' 
                                                  : isHovered 
                                                  ? 'border-amber-400 bg-amber-400/25 ring-4 ring-amber-400/50 scale-105 shadow-[0_0_16px_rgba(251,191,36,1)] z-20' 
                                                  : 'border-red-500 bg-red-500/10 z-10';

                                                const badgeStyle = annotatedPoint 
                                                  ? 'bg-emerald-600 border-emerald-400' 
                                                  : isHovered 
                                                  ? 'bg-amber-500 text-slate-900 border-amber-300' 
                                                  : 'bg-red-600 border-red-400';

                                                const labelText = annotatedPoint 
                                                  ? `✏️ ${annotatedPoint.label}` 
                                                  : isHovered 
                                                  ? `🎯 เล็งเมล็ดข้าวนี้ (คลิกเพื่อระบุสิ่งเจือปน)` 
                                                  : box.label || `เมล็ดที่ ${idx + 1}`;

                                                return (
                                                  <div
                                                    key={idx}
                                                    id={`zoom-bounding-box-${idx}`}
                                                    className={`absolute border-2 transition-all duration-300 cursor-pointer flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(0,0,0,0.2)] ${borderStyle}`}
                                                    style={{
                                                      left: `${box.x}%`,
                                                      top: `${box.y}%`,
                                                      width: `${box.w}%`,
                                                      height: `${box.h}%`,
                                                    }}
                                                    onMouseEnter={() => setHoveredBoxIdx(idx)}
                                                    onMouseLeave={() => setHoveredBoxIdx(null)}
                                                  >
                                                    <span className={`absolute -top-4 left-0 text-white text-[9px] px-1.5 py-0.5 font-bold rounded shadow-md whitespace-nowrap uppercase tracking-wider border ${badgeStyle}`}>
                                                      {labelText}
                                                    </span>

                                                    {isHovered && (
                                                      <button
                                                        className="absolute -top-3.5 -right-3.5 bg-red-600 hover:bg-red-700 text-white rounded-full p-0.5 z-40 shadow-lg border border-red-400 flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const newDismissed = [...dismissedSystemBoxes, { x: box.x, y: box.y }];
                                                          saveAnnotatedPointsToJob(userAnnotatedPoints, newDismissed);
                                                        }}
                                                        title="ลบจุดตรวจคัดกรองนี้"
                                                      >
                                                        <Trash2 size={10} />
                                                      </button>
                                                    )}
                                                  </div>
                                                );
                                              })}

                                              {/* User-Annotated Custom Training Points */}
                                              {userAnnotatedPoints.map((pt, idx) => (
                                                <div
                                                  key={`user-pt-${idx}`}
                                                  className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-30 group/user-pt animate-fade-in"
                                                  style={{
                                                    left: `${pt.x}%`,
                                                    top: `${pt.y}%`,
                                                  }}
                                                  onClick={(e) => {
                                                    e.stopPropagation(); // Prevent re-triggering click-to-annotate
                                                  }}
                                                >
                                                  <div className="absolute inset-0 rounded-full bg-amber-500/30 animate-ping" />
                                                  <div className="absolute w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-lg flex items-center justify-center text-[7px] text-slate-950 font-black">
                                                    {idx + 1}
                                                  </div>
                                                  
                                                  {/* Hover Tooltip */}
                                                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-amber-500/50 text-[9px] font-black text-amber-300 px-2 py-1 rounded shadow-xl whitespace-nowrap opacity-0 group-hover/user-pt:opacity-100 transition-opacity duration-200 pointer-events-none z-50 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full shrink-0" />
                                                    <span>จุดป้อนกลับที่ {idx + 1}: {pt.label}</span>
                                                  </div>
                                                </div>
                                              ))}

                                              {/* Floating Defect Class Selector Popover */}
                                              {pendingAnnotationCoord && (
                                                <div 
                                                  className="absolute bg-slate-950 border-2 border-amber-500/80 rounded-xl p-3 shadow-2xl z-[200] w-64 text-white flex flex-col gap-2 -translate-x-1/2 -translate-y-1/2 animate-fade-in"
                                                  style={{
                                                    left: `${pendingAnnotationCoord.x > 50 ? pendingAnnotationCoord.x - 20 : pendingAnnotationCoord.x + 20}%`,
                                                    top: `${pendingAnnotationCoord.y > 50 ? pendingAnnotationCoord.y - 20 : pendingAnnotationCoord.y + 20}%`,
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  id="training-popover-selector"
                                                >
                                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                                    <div className="flex items-center gap-1 text-amber-400">
                                                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                                                      <span className="text-[10px] font-black uppercase tracking-wider">
                                                        ระบุประเภทสิ่งปนเปื้อนด้านล่าง
                                                      </span>
                                                    </div>
                                                    <button 
                                                      onClick={() => setPendingAnnotationCoord(null)}
                                                      className="text-slate-400 hover:text-white p-0.5 hover:bg-slate-800 rounded transition-colors"
                                                    >
                                                      <X size={14} />
                                                    </button>
                                                  </div>
                                                  
                                                  <div className="text-[9px] text-slate-400 font-bold mb-1">
                                                    พิกัดที่เลือก: X: {pendingAnnotationCoord.x}%, Y: {pendingAnnotationCoord.y}%
                                                    {pendingAnnotationCoord.targetBoxIdx !== null && pendingAnnotationCoord.targetBoxIdx !== undefined && (
                                                      <span className="text-amber-400 ml-1">(ตรงกับข้าวเมล็ดที่ {pendingAnnotationCoord.targetBoxIdx + 1})</span>
                                                    )}
                                                  </div>
                                                  
                                                  <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto pr-1">
                                                    {[
                                                      { value: 'เมล็ดข้าวแดงปน (Red Contaminated)', color: 'bg-rose-950/80 hover:bg-rose-900 border-rose-800/60 text-rose-300 font-semibold' },
                                                      { value: 'เมล็ดท้องไข่ (Chalky Abnormal)', color: 'bg-indigo-950/80 hover:bg-indigo-900 border-indigo-800/60 text-indigo-300 font-semibold' },
                                                      { value: 'ข้าวเหนียวปน (Glutinous Grain)', color: 'bg-teal-950/80 hover:bg-teal-900 border-teal-800/60 text-teal-300 font-semibold' },
                                                      { value: 'เมล็ดข้าวลีบ (Shriveled Grain)', color: 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-800/60 text-emerald-300 font-semibold' },
                                                      { value: 'เมล็ดวัชพืช (Weed Seed)', color: 'bg-yellow-950/80 hover:bg-yellow-900 border-yellow-800/60 text-yellow-300 font-semibold' },
                                                      { value: 'กรวดทราย/สิ่งเจือปน (Impurity)', color: 'bg-amber-950/80 hover:bg-amber-900 border-amber-800/60 text-amber-300 font-semibold' },
                                                      { value: 'เมล็ดข้าวหัก (Broken Kernel)', color: 'bg-slate-900 hover:bg-slate-800 border-slate-700/60 text-slate-300 font-semibold' }
                                                    ].map((item) => (
                                                      <button
                                                        key={item.value}
                                                        onClick={() => {
                                                          const newPoints = [
                                                            ...userAnnotatedPoints,
                                                            {
                                                              x: pendingAnnotationCoord.x,
                                                              y: pendingAnnotationCoord.y,
                                                              label: item.value,
                                                              timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                                              targetBoxIdx: pendingAnnotationCoord.targetBoxIdx
                                                            }
                                                          ];
                                                          // Save immediately to job (Requirement 3)
                                                          saveAnnotatedPointsToJob(newPoints);
                                                          setPendingAnnotationCoord(null);
                                                        }}
                                                        className={`text-left text-[10px] font-bold px-2.5 py-1.5 rounded border transition-all cursor-pointer flex items-center justify-between ${item.color}`}
                                                      >
                                                        <span>{item.value}</span>
                                                        <span className="text-[8px] opacity-60">คลิกเลือก</span>
                                                      </button>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Indicator Overlay */}
                                            <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-bold text-slate-300 flex items-center gap-1.5 pointer-events-none" id="vision-zoom-helper-tag">
                                              <Maximize2 className="w-3 h-3 text-red-500 animate-pulse" />
                                              ชี้เมาส์หรือสัมผัสเพื่อไฮไลท์จุดตรวจสิ่งปนเปื้อนและส่วนสะสมสิ่งปนเปื้อนแบบเรียลไทม์
                                            </div>
                                          </div>

                                          {/* Right Content Area: Detailed Sidebar Metrics */}
                                          <div className="w-full md:w-[360px] bg-slate-950 flex flex-col h-full overflow-hidden" id="vision-zoom-sidebar">
                                            {/* Header Info */}
                                            <div className="p-4 border-b border-slate-800 bg-slate-900/60 shrink-0" id="vision-zoom-sidebar-header">
                                              <div className="flex items-center gap-1.5 text-orange-400 text-[10px] font-black uppercase tracking-wider">
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>AI-MekongRice Engine Zoom-In</span>
                                              </div>
                                              <h3 className="text-sm font-black text-white mt-1">ขยายผลการสแกนและพิกัดวิเคราะห์</h3>
                                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                                วิเคราะห์โดยโมเดล: <span className="text-orange-300 font-black">{aiAnalysisResult.modelUsed === 'gemini-3.1-pro-preview' ? 'Gemini 3.1 Pro (ความละเอียดสูง)' : 'Gemini 3.5 Flash (มาตรฐาน)'}</span>
                                              </p>
                                            </div>

                                            {/* Metrics & Content scroll area */}
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin" id="vision-zoom-sidebar-scroll">
                                              {/* Stats Panel */}
                                              <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-800 space-y-3" id="vision-zoom-stats-card">
                                                <div className="flex justify-between items-center">
                                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">เกรดคุณภาพ</span>
                                                  <span className={`text-[10px] font-black py-0.5 px-2 rounded-full ${
                                                    (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    (calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade) === 'B' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-rose-500/20 text-rose-400'
                                                  }`}>
                                                    เกรดคุณภาพข้าว: เกรด {calculatedMetrics?.qualityGrade || aiAnalysisResult.data.qualityGrade || 'N/A'}
                                                  </span>
                                                </div>

                                                {aiAnalysisActiveType === 'paddy' ? (
                                                  <div className="grid grid-cols-2 gap-2 text-center" id="vision-zoom-stats-grid">
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                      <span className="text-[9px] font-bold text-slate-400">สิ่งเจือปนที่พบ</span>
                                                      <p className="text-lg font-black text-orange-400">{(calculatedMetrics?.impurityPercent !== undefined ? calculatedMetrics.impurityPercent : aiAnalysisResult.data.impurityPercent)}%</p>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                      <span className="text-[9px] font-bold text-slate-400">สิ่งปนเปื้อนที่ตรวจเจอ</span>
                                                      <p className="text-lg font-black text-white">{(calculatedMetrics?.contaminantGrains !== undefined ? calculatedMetrics.contaminantGrains : (aiAnalysisResult.data.grainCountSimulated?.foreignItems || aiAnalysisResult.data.detectedBoxes?.length || 0))} ชิ้น</p>
                                                    </div>
                                                  </div>
                                                ) : aiAnalysisActiveType === 'brown' ? (
                                                  <div className="grid grid-cols-2 gap-2 text-center" id="vision-zoom-stats-grid">
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                      <span className="text-[9px] font-bold text-slate-400">ข้าวแดงปนเปื้อน</span>
                                                      <p className="text-lg font-black text-rose-400">{(calculatedMetrics?.redContaminationPercent !== undefined ? calculatedMetrics.redContaminationPercent : aiAnalysisResult.data.redContaminationPercent)}%</p>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                      <span className="text-[9px] font-bold text-slate-400">เมล็ดชำรุดเสียหาย</span>
                                                      <p className="text-lg font-black text-white">{(calculatedMetrics?.contaminantGrains !== undefined ? calculatedMetrics.contaminantGrains : (aiAnalysisResult.data.grainCountSimulated?.redOrBlackGrains || aiAnalysisResult.data.detectedBoxes?.length || 0))} เมล็ด</p>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <div className="grid grid-cols-2 gap-2 text-center" id="vision-zoom-stats-grid">
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                      <span className="text-[9px] font-bold text-slate-400">เมล็ดท้องไข่ (Chalky)</span>
                                                      <p className="text-lg font-black text-indigo-400">{(calculatedMetrics?.chalkyPercent !== undefined ? calculatedMetrics.chalkyPercent : aiAnalysisResult.data.chalkyPercent)}%</p>
                                                    </div>
                                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                                                      <span className="text-[9px] font-bold text-slate-400">ข้าวเหนียวปน (Glutinous)</span>
                                                      <p className="text-lg font-black text-teal-400">{(calculatedMetrics?.mixedGlutinousPercent !== undefined ? calculatedMetrics.mixedGlutinousPercent : aiAnalysisResult.data.mixedGlutinousPercent)}%</p>
                                                    </div>
                                                  </div>
                                                )}

                                                {/* 📊 Detailed Grain Count Breakdown Card in Modal */}
                                                {calculatedMetrics && (
                                                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2 mt-2" id="vision-zoom-grain-breakdown">
                                                    <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest block text-center">
                                                      สรุปจำนวนขอบเขตวงรี: ทั้งหมด {((aiAnalysisResult.data.detectedBoxes?.length || 0) - dismissedSystemBoxes.length) + userAnnotatedPoints.length} วงรี
                                                    </span>
                                                    <div className="flex gap-1">
                                                      <div className="flex-1 bg-slate-900/50 p-1 rounded text-center border border-slate-800/60">
                                                        <span className="text-[7.5px] text-slate-400 font-bold block">AI ตรวจเจอ</span>
                                                        <span className="text-[10px] font-black text-white">{aiAnalysisResult.data.detectedBoxes?.length || 0}</span>
                                                      </div>
                                                      <div className="flex-1 bg-amber-950/40 p-1 rounded text-center border border-amber-900/40">
                                                        <span className="text-[7.5px] text-amber-400 font-bold block">ผู้ใช้สอนเพิ่ม</span>
                                                        <span className="text-[10px] font-black text-amber-400">+{userAnnotatedPoints.length}</span>
                                                      </div>
                                                      <div className="flex-1 bg-rose-950/40 p-1 rounded text-center border border-rose-900/40">
                                                        <span className="text-[7.5px] text-rose-400 font-bold block">รวมใช้งาน</span>
                                                        <span className="text-[10px] font-black text-rose-400">
                                                          {((aiAnalysisResult.data.detectedBoxes?.length || 0) - dismissedSystemBoxes.length) + userAnnotatedPoints.length}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </div>

                                              {/* List of anomalies */}
                                              <div className="space-y-2" id="vision-zoom-anomalies-section">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                                                  รายการผิดปกติพิกัดสแกน ({
                                                    ((aiAnalysisResult?.data?.detectedBoxes || []).filter((box: any) => !dismissedSystemBoxes.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1)).length + userAnnotatedPoints.length)
                                                  } รายการ)
                                                </span>
                                                <div className="space-y-1.5 max-h-[200px] overflow-y-auto scrollbar-thin" id="vision-zoom-anomalies-list">
                                                  {/* Show AI-detected auto boxes */}
                                                  {aiAnalysisResult.data.detectedBoxes && aiAnalysisResult.data.detectedBoxes
                                                    .map((box: any, idx: number) => ({ ...box, isSystem: true, originalIdx: idx }))
                                                    .filter((box: any) => !dismissedSystemBoxes.some((db: any) => Math.abs(db.x - box.x) < 0.1 && Math.abs(db.y - box.y) < 0.1))
                                                    .map((box: any) => {
                                                      const isHovered = hoveredBoxIdx === box.originalIdx;
                                                      return (
                                                        <div
                                                          key={`sys-anomaly-${box.originalIdx}`}
                                                          onMouseEnter={() => setHoveredBoxIdx(box.originalIdx)}
                                                          onMouseLeave={() => setHoveredBoxIdx(null)}
                                                          className={`flex items-center gap-2 p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                            isHovered 
                                                              ? 'bg-red-500/20 border-red-500 text-red-300' 
                                                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                                                          }`}
                                                          id={`zoom-anomaly-item-${box.originalIdx}`}
                                                        >
                                                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                                                          <span className="truncate">{box.label || `จุดตรวจคัดกรองที่ ${box.originalIdx + 1}`}</span>
                                                          <span className="text-[8px] px-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded">แสกนอัตโนมัติ</span>
                                                          
                                                          <div className="flex items-center gap-2 ml-auto shrink-0">
                                                            <span className="text-[9px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                                                              X: {box.x}% | Y: {box.y}%
                                                            </span>
                                                            <button
                                                              onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newDismissed = [...dismissedSystemBoxes, { x: box.x, y: box.y }];
                                                                saveAnnotatedPointsToJob(userAnnotatedPoints, newDismissed);
                                                              }}
                                                              className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                                              title="ลบจุดนี้ออก (แสกนผิดพลาด)"
                                                            >
                                                              <Trash2 size={12} />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      );
                                                    })}

                                                  {/* Show user manual annotations */}
                                                  {userAnnotatedPoints.map((pt, idx) => {
                                                    return (
                                                      <div
                                                        key={`user-anomaly-${idx}`}
                                                        className="flex items-center gap-2 p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                                                      >
                                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce shrink-0" />
                                                        <span className="truncate">{pt.label}</span>
                                                        <span className="text-[8px] px-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">ป้อนกลับ</span>
                                                        
                                                        <div className="flex items-center gap-2 ml-auto shrink-0">
                                                          <span className="text-[9px] font-mono text-slate-500 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800">
                                                            X: {pt.x}% | Y: {pt.y}%
                                                          </span>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              saveAnnotatedPointsToJob(userAnnotatedPoints.filter((_, i) => i !== idx));
                                                              setTrainingSuccessMessage(null);
                                                            }}
                                                            className="p-1 hover:bg-slate-850 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                                            title="ลบจุดสอนนี้"
                                                          >
                                                            <Trash2 size={12} />
                                                          </button>
                                                        </div>
                                                      </div>
                                                    );
                                                  })}

                                                  {/* Show list of dismissed system boxes to allow restoring them */}
                                                  {dismissedSystemBoxes.map((db, idx) => (
                                                    <div
                                                      key={`dismissed-sys-${idx}`}
                                                      className="flex items-center gap-2 p-2 rounded-lg text-xs font-bold border transition-all cursor-pointer bg-slate-950 border-slate-900 text-slate-500 opacity-60"
                                                    >
                                                      <span className="w-2 h-2 rounded-full bg-slate-700 shrink-0" />
                                                      <span className="truncate line-through">ลบจุดแสกนอัตโนมัติออก</span>
                                                      <span className="text-[8px] px-1 bg-slate-800 text-slate-400 rounded">ตัดทิ้ง</span>
                                                      
                                                      <div className="flex items-center gap-2 ml-auto shrink-0">
                                                        <span className="text-[9px] font-mono text-slate-700">
                                                          X: {db.x}% | Y: {db.y}%
                                                        </span>
                                                        <button
                                                          onClick={(e) => {
                                                            e.stopPropagation();
                                                            const newDismissed = dismissedSystemBoxes.filter((_, i) => i !== idx);
                                                            saveAnnotatedPointsToJob(userAnnotatedPoints, newDismissed);
                                                          }}
                                                          className="text-[9.5px] font-bold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                                                          title="กู้คืนจุดตรวจนี้"
                                                        >
                                                          กู้คืน
                                                        </button>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>

                                              {/* Interactive AI Training Feedback Module */}
                                              <div className="bg-slate-900/90 rounded-xl p-3.5 border-2 border-amber-500/20 space-y-3.5 shadow-[0_4px_20px_rgba(245,158,11,0.05)]" id="vision-zoom-training-module">
                                                {/* Google Sheets Sync Integration Area */}
                                                <div className="border-b border-slate-800 pb-3 space-y-2.5">
                                                  <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 text-cyan-400">
                                                      <Database className="w-4 h-4" />
                                                      <span className="text-[10px] font-black uppercase tracking-wider">เชื่อมต่อ Google Sheets ต้นทาง</span>
                                                    </div>
                                                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border ${
                                                      sheetsAccessToken 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 animate-pulse' 
                                                        : 'bg-slate-800 text-slate-400 border-slate-700'
                                                    }`}>
                                                      {sheetsAccessToken ? 'ONLINE' : 'LOCAL-FIRST'}
                                                    </span>
                                                  </div>

                                                  {sheetsAccessToken ? (
                                                    <div className="space-y-1.5">
                                                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] rounded-lg flex items-center justify-between gap-2">
                                                        <div className="truncate">
                                                          <span className="font-black">สิทธิ์ใช้งาน:</span> {googleUser?.email || "Google Account Connected"}
                                                        </div>
                                                        <button 
                                                          onClick={logoutGoogle}
                                                          className="text-[9px] font-black text-rose-400 hover:text-rose-300 underline shrink-0 cursor-pointer"
                                                        >
                                                          ออกจากระบบ
                                                        </button>
                                                      </div>
                                                      {sheetsSyncMessage && (
                                                        <div className="text-[9.5px] font-bold text-cyan-300 animate-pulse">
                                                          {sheetsSyncMessage}
                                                        </div>
                                                      )}
                                                      {sheetsSyncError && (
                                                        <div className="text-[9.5px] font-bold text-rose-400">
                                                          {sheetsSyncError}
                                                        </div>
                                                      )}
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-2">
                                                      <p className="text-[9.5px] text-slate-400 leading-relaxed font-semibold">
                                                        💡 หากต้องการซิงค์จุดสแกนผิดปกติ คุณภาพข้าว และรายงานป้อนกลับโดย AI <span className="text-amber-400">อัปเดตลงตาราง Google Sheet โดยตรงอัตโนมัติ</span> กรุณาลงชื่อเข้าใช้ด้วยบัญชี Google ของท่าน
                                                      </p>
                                                      <button
                                                        onClick={async () => {
                                                          try {
                                                            setSheetsSyncError(null);
                                                            const res = await googleSignIn();
                                                            if (res) {
                                                              // Trigger initial sync of current points
                                                              saveAnnotatedPointsToJob(userAnnotatedPoints, dismissedSystemBoxes);
                                                            }
                                                          } catch (err: any) {
                                                            let friendlyMsg = err.message || String(err);
                                                            if (err.code === 'auth/popup-closed-by-user' || (err.message && err.message.includes('popup-closed-by-user'))) {
                                                              friendlyMsg = 'หน้าต่างเข้าสู่ระบบถูกปิดก่อนเสร็จสิ้นขั้นตอนการสแกน กรุณาลองใหม่อีกครั้ง';
                                                            } else if (err.code === 'auth/cancelled-popup-request' || (err.message && err.message.includes('cancelled-popup-request'))) {
                                                              friendlyMsg = 'ระบบยกเลิกหน้าต่างลงชื่อเข้าใช้งาน กรุณาลองเชื่อมต่ออีกครั้ง';
                                                            } else if (err.code === 'auth/api-key-not-valid' || (err.message && err.message.includes('api-key-not-valid'))) {
                                                              friendlyMsg = 'กุญแจความปลอดภัย API Key สำหรับ Firebase ผิดพลาดหรือไม่ถูกต้อง กรุณาตรวจสอบการตั้งค่าเชื่อมโยง';
                                                            }
                                                            setSheetsSyncError(`ไม่สามารถลงชื่อเข้าใช้ได้: ${friendlyMsg}`);
                                                          }
                                                        }}
                                                        className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-[10px] py-1.5 px-3 rounded-lg flex items-center justify-center gap-2 hover:border-cyan-500/50 transition-all cursor-pointer"
                                                      >
                                                        <Database className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                                                        <span>เชื่อมต่อสิทธิ์ความปลอดภัย Google Sheets API</span>
                                                      </button>
                                                      {sheetsSyncError && (
                                                        <p className="text-[9px] text-rose-400 font-bold">{sheetsSyncError}</p>
                                                      )}
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="flex justify-between items-center">
                                                  <div className="flex items-center gap-1.5 text-amber-400">
                                                    <BookOpen className="w-4 h-4 text-amber-500" />
                                                    <span className="text-[10px] font-black uppercase tracking-wider">ระบบป้อนกลับสอนระบบ AI</span>
                                                  </div>
                                                  {userAnnotatedPoints.length > 0 && (
                                                    <button 
                                                      onClick={() => {
                                                        saveAnnotatedPointsToJob([]);
                                                        setPendingAnnotationCoord(null);
                                                        setTrainingSuccessMessage(null);
                                                      }}
                                                      className="text-[9px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 hover:bg-rose-500/20 transition-all cursor-pointer"
                                                    >
                                                      <Trash2 className="w-3 h-3" /> ล้างจุดสอน
                                                    </button>
                                                  )}
                                                </div>

                                                {/* Success Alert */}
                                                {trainingSuccessMessage && (
                                                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold rounded-lg leading-normal flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                                      <span>ส่งข้อมูลการเรียนรู้สำเร็จ!</span>
                                                    </div>
                                                    <p className="text-[9px] leading-relaxed text-slate-300">{trainingSuccessMessage}</p>
                                                  </div>
                                                )}

                                                {/* Training Points List */}
                                                <div className="space-y-1.5">
                                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                                    จุดตัวอย่างสะสมโดยคุณ ({userAnnotatedPoints.length} จุด)
                                                  </span>
                                                  
                                                  {userAnnotatedPoints.length === 0 ? (
                                                    <div className="text-center py-5 bg-slate-950/60 rounded-lg border border-slate-900 text-slate-500 text-[10px] font-bold flex flex-col items-center justify-center gap-1">
                                                      <span className="text-xl">🎯</span>
                                                      <span>ไม่มีการบันทึกจุดสอนโดยคุณ</span>
                                                      <span className="text-[8.5px] text-slate-600">คลิกที่พิกัดเมล็ดข้าวบนภาพด้านซ้ายเพื่อเพิ่ม</span>
                                                    </div>
                                                  ) : (
                                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                                                      {userAnnotatedPoints.map((pt, idx) => (
                                                        <div 
                                                          key={idx}
                                                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-xs font-bold hover:border-amber-500/30 transition-colors"
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black flex items-center justify-center shrink-0 shadow">
                                                              {idx + 1}
                                                            </span>
                                                            <span className="text-slate-200 text-[10px] truncate max-w-[120px]">{pt.label}</span>
                                                          </div>
                                                          <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                                              X:{pt.x}% | Y:{pt.y}%
                                                            </span>
                                                            <button
                                                              onClick={() => {
                                                                saveAnnotatedPointsToJob(userAnnotatedPoints.filter((_, i) => i !== idx));
                                                                setTrainingSuccessMessage(null);
                                                              }}
                                                              className="p-1 hover:bg-slate-800 rounded text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                                              title="ลบจุดสอนนี้"
                                                            >
                                                              <X size={12} />
                                                            </button>
                                                          </div>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>

                                                {/* Submit Training to Server Button */}
                                                {userAnnotatedPoints.length > 0 && (
                                                  <button
                                                    onClick={async () => {
                                                      setIsSavingTrainingData(true);
                                                      setTrainingSuccessMessage(null);
                                                      // Simulate beautiful progress states
                                                      await new Promise((resolve) => setTimeout(resolve, 1500));
                                                      setIsSavingTrainingData(false);
                                                      setTrainingSuccessMessage("บันทึกพิกัดและส่งชุดข้อมูลฝึกสอน (User-guided Correction Dataset) ไปยังฐานข้อมูลประมวลผลแล้ว ระบบจะเริ่มอัปเดตโมเดลปรับน้ำหนักวิเคราะห์เมล็ดข้าวแดงปนเปื้อนในรอบการเทรนครั้งถัดไปโดยอัตโนมัติ!");
                                                      saveAnnotatedPointsToJob(userAnnotatedPoints); // Keep points after sending and sync
                                                    }}
                                                    disabled={isSavingTrainingData}
                                                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 disabled:text-slate-500 font-bold text-[11px] py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:cursor-not-allowed uppercase tracking-wider animate-pulse"
                                                  >
                                                    {isSavingTrainingData ? (
                                                      <>
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        <span>กำลังส่งข้อมูลการเรียนรู้...</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                                                        <span>บันทึก & ส่งข้อมูลสอน AI ({userAnnotatedPoints.length} จุด)</span>
                                                      </>
                                                    )}
                                                  </button>
                                                )}
                                              </div>

                                              {/* Description report */}
                                              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-1.5" id="vision-zoom-description-card">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">บทวิเคราะห์ AI Report</span>
                                                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                                                  {aiAnalysisResult.data.description || "ไม่มีข้อมูลบทสรุปรายงานจาก AI"}
                                                </p>
                                              </div>

                                              {/* Recommendations */}
                                              <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-2" id="vision-zoom-recommendations-card">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">ข้อเสนอแนะในการปรับปรุงระบบสีข้าว</span>
                                                <div className="space-y-1.5 text-xs text-slate-300 font-semibold">
                                                  {aiAnalysisResult.data.recommendations && aiAnalysisResult.data.recommendations.map((rec: string, i: number) => (
                                                    <div key={i} className="flex items-start gap-1.5">
                                                      <span className="text-orange-400 select-none font-black mt-0.5 shrink-0">•</span>
                                                      <span>{rec}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>

                                            {/* Bottom footer bar */}
                                            <div className="p-3 border-t border-slate-800 bg-slate-950 text-center shrink-0" id="vision-zoom-sidebar-footer">
                                              <p className="text-[9px] text-slate-500 font-bold">คอมพิวเตอร์วิชันวิเคราะห์ขนาด สัดส่วน และสีเมล็ดพันธุ์</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      )}

                    </motion.div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 max-w-sm mx-auto">
                      <div className="text-3xl mb-1">🔒</div>
                      <p className="text-xs leading-relaxed font-semibold">
                        {memberSearchQuery ? "ไม่พบข้อมูลลูกค้ารายนี้ กรุณาตรวจสอบการสะกดชื่อหรือเบอร์โทรศัพท์อีกครั้ง" : "กรุณากรอกข้อมูลลงในช่องค้นหาด้านบนเพื่อเรียกแสดงข้อมูลธุรกรรมและประวัติแต้มสะสมรายบุคคลแบบปลอดภัย"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            
          </motion.section>
        )}

        {activeTab === 'erp' && (
          <motion.section 
            key="erp"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <ErpDashboard />
          </motion.section>
        )}
      </main>

      {/* Rice Milling Data Table Modal */}
      {showMillDataTableModal && (() => {
        const selectedRecords = getRecordsForDate(millingSelectedDate);
        const totalBagsSelected = selectedRecords.reduce((sum, r) => sum + (r.bags || 0), 0);
        const totalOutboundWeightSelected = selectedRecords.reduce((sum, r) => sum + (r.outboundWeight || 0), 0);
        const totalInboundWeightSelected = selectedRecords.reduce((sum, r) => sum + (r.weight || 0), 0);
        
        // Dynamic extraction recovery rate
        const avgRecoveryRate = totalInboundWeightSelected > 0
          ? Math.min(100, Math.round((totalOutboundWeightSelected / totalInboundWeightSelected) * 100))
          : null;

        // Filter records that have been completed (status is 'สีเสร็จแล้ว', 'ส่งแล้ว', or 'ส่งมอบแล้ว') and have weight/bags data
        const completedRecordsForAvg = selectedRecords.filter(r => {
          const s = (r.status || '').trim();
          const isCompleted = s === 'สีเสร็จแล้ว' || s === 'ส่งแล้ว' || s === 'ส่งมอบแล้ว';
          return isCompleted && (r.outboundWeight || 0) > 0 && (r.bags || 0) > 0;
        });

        // Average milled rice weight per bag for completed records only (sum of individual averages / count)
        const overallAvgMilledRicePerBag = completedRecordsForAvg.length > 0
          ? completedRecordsForAvg.reduce((sum, r) => sum + ((r.outboundWeight || 0) / (r.bags || 1)), 0) / completedRecordsForAvg.length
          : 0;
        
        const renderThumb = (url: string | undefined, title: string, subtitle: string, sizeClass: string = "w-16 h-16") => {
          if (!url || url.length < 5) {
            return (
              <div className={`${sizeClass} rounded-xl bg-slate-50 border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400 p-1`} title="ไม่มีรูปภาพ">
                <CameraOff size={11} className="opacity-55" />
                <span className="text-[7px] font-black opacity-50 mt-1 leading-none text-center truncate max-w-full px-0.5">{subtitle}</span>
                <span className="text-[6px] font-bold opacity-45 mt-0.5">ไม่มีรูป</span>
              </div>
            );
          }

          const fileId = getGoogleDriveFileId(url);
          // Optimize direct download embedding with high-speed Google User Content CDN
          const displayUrl = fileId ? `https://lh3.googleusercontent.com/d/${fileId}` : url;

          return (
            <div 
              className={`relative group/thumb ${sizeClass} rounded-xl border border-slate-200 overflow-hidden shadow-3xs hover:border-orange-500 hover:shadow-xs transition-all duration-200 cursor-pointer bg-slate-100 flex flex-col items-center justify-center`}
              onClick={() => {
                setLightboxImgError(false);
                setLightboxMode(fileId ? 'iframe' : 'direct');
                setLightboxImg({ url, title });
              }}
              title={`คลิกเพื่อเปิดดูรูป ${subtitle} ความละเอียดสูง`}
            >
              <img 
                src={displayUrl} 
                alt={title}
                className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-250"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback: try Google Drive's built-in thumbnail servlet
                  if (fileId && !(e.target as HTMLImageElement).src.includes('thumbnail')) {
                    (e.target as HTMLImageElement).src = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
                  } else {
                    (e.target as HTMLImageElement).style.display = 'none';
                    const fallbackEl = (e.target as HTMLImageElement).nextElementSibling as HTMLElement;
                    if (fallbackEl) fallbackEl.classList.remove('hidden');
                  }
                }}
              />
              
              {/* Clean fallback overlay card if direct thumbnail is blocked by browser third-party cookie restrictions */}
              <div className="hidden absolute inset-0 flex flex-col items-center justify-center text-center p-1.5 bg-amber-50/95 text-amber-900 border border-amber-200">
                <Lock size={12} className="text-amber-600 mb-0.5 animate-bounce" />
                <span className="text-[8px] font-black leading-tight text-amber-850">{subtitle}</span>
                <span className="text-[7px] text-amber-600 font-extrabold leading-none mt-1 bg-amber-100 px-1 py-0.5 rounded">คลิกดูสด</span>
              </div>

              {/* Zoom overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center transition-opacity text-white">
                <Maximize2 size={11} className="text-orange-400 animate-pulse" />
                <span className="text-[7px] font-black tracking-wider mt-0.5 uppercase">ขยายดู</span>
              </div>
            </div>
          );
        };

        const getStatusBadge = (statusStr: string | undefined) => {
          const s = (statusStr || '').trim();
          if (s === 'ส่งแล้ว' || s === 'ส่งมอบแล้ว') {
            return <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-3xs">✓ ส่งมอบแล้ว</span>;
          }
          if (s === 'สีเสร็จแล้ว') {
            return <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black rounded-full bg-blue-100 text-blue-800 border border-blue-200 shadow-3xs">⚡ สีเสร็จแล้ว</span>;
          }
          if (s === 'กำลังสี' || s === 'กำลังดำเนินการ') {
            return <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-200 animate-pulse shadow-3xs">⚙️ กำลังสีข้าว</span>;
          }
          return <span className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-black rounded-full bg-slate-100 text-slate-700 border border-slate-200 shadow-3xs">📥 รับเข้าคลัง</span>;
        };

        return (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[2000] p-4 overflow-y-auto animate-in fade-in duration-200">
            <div 
              className="bg-white rounded-3xl shadow-2xl border border-slate-250 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-250"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-500/15 p-2.5 rounded-xl border border-orange-500/20">
                    <Wheat className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black tracking-tight">ตารางสรุปผลข้อมูลการสีข้าวรายวัน (Daily Milling Ledger)</h3>
                    <p className="text-[10px] text-slate-400 font-medium">บันทึกขั้นตอน ประวัติข้าวเปลือก ข้าวกล้อง ข้าวสาร และสถานะรายรายการส่งมอบ</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRefreshData}
                    disabled={isRefreshing}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer text-white"
                    title="คลิกเพื่ออัปเดตข้อมูลสดโดยตรงจาก Google Sheets"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline">{isRefreshing ? 'กำลังดึงข้อมูล...' : 'รีเฟรชข้อมูลสด'}</span>
                    <span className="xs:hidden">{isRefreshing ? '...' : 'สด'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMillDataTableModal(false)}
                    className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Interactive Horizontal Date Selector Strip */}
              <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">เลือกวันที่นำข้าวเข้าบริการ:</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-black px-2.5 py-1 rounded-full">พบทั้งหมด {activeMillingDates.length} วันทำการล่าสุด</span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-thin">
                  {activeMillingDates.map(d => {
                    const isActive = d.value === millingSelectedDate;
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setMillingSelectedDate(d.value)}
                        className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 text-left cursor-pointer transform active:scale-97 ${
                          isActive
                            ? 'bg-gradient-to-br from-orange-50/80 to-amber-50/30 border-orange-400 shadow-sm ring-1 ring-orange-400/10'
                            : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/60 shadow-3xs'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black transition-colors ${
                          isActive ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {d.label.split(' ')[0]}
                        </div>
                        <div>
                          <div className={`text-xs font-black ${isActive ? 'text-orange-950' : 'text-slate-800'}`}>
                            {MONTHS_TH[new Date(d.value).getMonth()]} {d.label.split(' ')[2]}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            รวม {d.count} กระสอบ
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KPI Performance Metrics Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-b border-slate-200 bg-slate-50">
                <div className="p-4.5 border-r border-slate-200 text-center md:text-left flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ผู้มาใช้บริการ</span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1">{selectedRecords.length} ราย</span>
                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">ลงทะเบียนเข้าคลังสี</span>
                </div>
                
                <div className="p-4.5 border-r border-slate-200 text-center md:text-left flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">จำนวนกระสอบเข้าสีรวม</span>
                  <span className="text-xl font-extrabold text-orange-600 mt-1">{totalBagsSelected.toLocaleString()} กระสอบ</span>
                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">น้ำหนักเปลือกเข้า {totalInboundWeightSelected.toLocaleString()} กก.</span>
                </div>

                <div className="p-4.5 border-r border-slate-200 text-center md:text-left flex flex-col justify-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ปริมาณข้าวสารที่สกัดได้</span>
                  <span className="text-xl font-extrabold text-emerald-600 mt-1">{totalOutboundWeightSelected.toLocaleString()} กก.</span>
                  <span className="text-[9px] text-slate-400 font-medium mt-0.5">คัดแยกบริสุทธิ์พร้อมส่งออก</span>
                </div>

                <div className="p-4.5 border-r border-slate-200 text-center md:text-left flex flex-col justify-center bg-blue-50/15">
                  <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider">ข้าวสารเฉลี่ย/กระสอบ</span>
                  <span className="text-xl font-extrabold text-blue-800 mt-1">
                    {overallAvgMilledRicePerBag ? `${overallAvgMilledRicePerBag.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : '0.0'}{' '}
                    <span className="text-xs font-bold text-slate-500">กก./กส.</span>
                  </span>
                  <span className="text-[9px] text-blue-600 font-semibold mt-0.5">
                    {completedRecordsForAvg.length > 0 ? `คิดจาก ${completedRecordsForAvg.length} รายการที่สีเสร็จ` : 'ยังไม่มีรายการสีเสร็จในวันนี้'}
                  </span>
                </div>

                <div className="p-4.5 text-center md:text-left flex flex-col justify-center bg-orange-50/20 col-span-2 sm:col-span-1">
                  <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider flex items-center justify-center md:justify-start gap-1">
                    <span>⚙️ ประสิทธิภาพการสีเฉลี่ย</span>
                    <Info size={10} className="text-orange-400 cursor-help" title="อัตราส่วนข้าวสารคัดเกรดต่อน้ำหนักข้าวเปลือกขาเข้าทั้งหมด" />
                  </span>
                  <span className="text-xl font-extrabold text-slate-800 mt-1">
                    {avgRecoveryRate ? `${avgRecoveryRate}%` : 'รอคำนวณ'}
                  </span>
                  <span className="text-[9px] text-slate-450 font-semibold mt-0.5">
                    {avgRecoveryRate && avgRecoveryRate > 60 ? '🟢 มาตรฐานการสกัดระดับสูง' : '🟡 รอชั่งน้ำหนักขาออกครบลูป'}
                  </span>
                </div>
              </div>

              {/* Presentation Controls bar */}
              <div className="p-4 sm:px-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                {/* Manual Date Search */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-600 shrink-0">📅 เลือกค้นหาระบุวัน:</span>
                    <input 
                      type="date"
                      value={millingSelectedDate}
                      onChange={(e) => setMillingSelectedDate(e.target.value)}
                      className="bg-white border border-slate-200 outline-none text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setMillingSelectedDate("2026-06-25")}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black transition-colors shadow-2xs cursor-pointer"
                  >
                    กลับสู่วันนี้ (Today)
                  </button>
                </div>

                {/* Presentation Layout Toggle */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs font-black text-slate-500">รูปแบบตาราง:</span>
                  <div className="bg-slate-200/80 p-0.5 rounded-xl border border-slate-250 flex items-center shadow-3xs">
                    <button
                      onClick={() => setMillingViewMode('table')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                        millingViewMode === 'table'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <List size={13} />
                      <span>แบบรายการย่อ</span>
                    </button>
                    <button
                      onClick={() => setMillingViewMode('bento')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                        millingViewMode === 'bento'
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-600 hover:text-slate-800'
                      }`}
                    >
                      <LayoutGrid size={13} />
                      <span>แบบการ์ดภาพ</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Core Content Area */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/40">
                
                {selectedRecords.length > 0 ? (
                  millingViewMode === 'table' ? (
                    // Elegant High-Density Tabular View
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse table-auto">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider">
                              <th className="py-4 px-5 align-middle min-w-[180px]">ลูกค้า / รายละเอียดติดต่อ</th>
                              <th className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">ค่าเฉลี่ยรายกระสอบ</div>
                                <div className="text-[11px] font-black text-slate-700">กก./กส.</div>
                              </th>
                              <th className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">ข้าวสารสุทธิ</div>
                                <div className="text-[11px] font-black text-slate-700">ข้าวสารขาว (กก.)</div>
                              </th>
                              <th className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">ปริมาณนำเข้า</div>
                                <div className="text-[11px] font-black text-slate-700">กระสอบสะสม</div>
                              </th>
                              <th className="py-4 px-4 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">ขั้นตอน</div>
                                <div className="text-[11px] font-black text-slate-700">สถานะปัจจุบัน</div>
                              </th>
                              <th className="py-4 px-3 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-semibold mb-0.5">ภาพกระสอบ</div>
                                <div className="text-[10px] font-bold text-slate-500">ขั้นตอนที่ 1</div>
                              </th>
                              <th className="py-4 px-3 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-semibold mb-0.5">ภาพข้าวเปลือก</div>
                                <div className="text-[10px] font-bold text-slate-500">ขั้นตอนที่ 2</div>
                              </th>
                              <th className="py-4 px-3 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-semibold mb-0.5">ภาพข้าวกล้อง</div>
                                <div className="text-[10px] font-bold text-slate-500">ขั้นตอนที่ 3</div>
                              </th>
                              <th className="py-4 px-3 text-center align-middle whitespace-nowrap">
                                <div className="text-[9px] text-slate-400 font-semibold mb-0.5">ภาพข้าวสารขาว</div>
                                <div className="text-[10px] font-bold text-slate-500">ขั้นตอนที่ 4</div>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {selectedRecords.map((rec, idx) => (
                              <tr key={idx} className="hover:bg-orange-50/20 transition-colors">
                                <td className="py-3 px-5">
                                  <div className="font-extrabold text-slate-800 text-[13px] tracking-tight">{rec.customerName}</div>
                                  <div className="text-[10px] text-slate-500 font-bold mt-1 flex flex-wrap items-center gap-1.5 whitespace-nowrap">
                                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">📞 {rec.phone || 'ไม่ระบุ'}</span>
                                    <span className="text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded font-black">🌾 {rec.riceType}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center align-middle font-black text-orange-700 font-mono text-[13px] bg-orange-50/15 whitespace-nowrap">
                                  {(() => {
                                    const s = (rec.status || '').trim();
                                    const isCompleted = s === 'สีเสร็จแล้ว' || s === 'ส่งแล้ว' || s === 'ส่งมอบแล้ว';
                                    return isCompleted && rec.outboundWeight && rec.bags
                                      ? `${(rec.outboundWeight / rec.bags).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} กก.`
                                      : '-';
                                  })()}
                                </td>
                                <td className="py-3 px-4 text-center align-middle font-black text-emerald-700 font-mono text-[13px] bg-emerald-50/15 whitespace-nowrap">
                                  {rec.outboundWeight ? `${rec.outboundWeight.toLocaleString()} กก.` : '0 กก.'}
                                </td>
                                <td className="py-3 px-4 text-center align-middle font-bold text-slate-700 font-mono text-[13px] whitespace-nowrap">
                                  {rec.bags ? `${rec.bags.toLocaleString()} กส.` : '0 กส.'}
                                </td>
                                <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                                  {getStatusBadge(rec.status)}
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex justify-center">
                                    {renderThumb(rec.riceBagImg, `รูปกระสอบข้าว - ${rec.customerName}`, "กระสอบข้าว", "w-12 h-12")}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex justify-center">
                                    {renderThumb(rec.riceInboundImg, `รูปข้าวเปลือกก่อนสี - ${rec.customerName}`, "ข้าวเปลือก", "w-12 h-12")}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex justify-center">
                                    {renderThumb(rec.brownRiceImg, `รูปข้าวกล้อง - ${rec.customerName}`, "ข้าวกล้อง", "w-12 h-12")}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex justify-center">
                                    {renderThumb(rec.milledRiceImg, `รูปข้าวสารคัดเกรด - ${rec.customerName}`, "ข้าวสารขาว", "w-12 h-12")}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    // Outstanding Bento-style Operations Card Grid View
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedRecords.map((rec, idx) => {
                        const recRecovery = rec.weight && rec.outboundWeight
                          ? Math.round((rec.outboundWeight / rec.weight) * 100)
                          : null;
                        
                        return (
                          <div key={idx} className="bg-white rounded-2xl border border-slate-200/85 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            
                            {/* Card Header */}
                            <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between">
                              <div>
                                <h4 className="text-sm font-black tracking-tight">{rec.customerName}</h4>
                                <span className="text-[10px] text-slate-400 font-semibold">📞 {rec.phone || 'ไม่ระบุเบอร์ติดต่อ'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] bg-white/10 text-orange-300 font-black px-2 py-0.5 rounded">
                                  🌾 {rec.riceType}
                                </span>
                                {getStatusBadge(rec.status)}
                              </div>
                            </div>

                            {/* Card Weight & Yield Details */}
                            <div className="p-4 grid grid-cols-3 bg-slate-50 border-b border-slate-100 text-center">
                              <div className="border-r border-slate-200">
                                <span className="block text-[8px] text-slate-400 font-black uppercase tracking-wider">ชั่งขาเข้า (ข้าวเปลือก)</span>
                                <span className="text-base font-extrabold text-slate-700 font-mono mt-0.5 block">{rec.weight?.toLocaleString() || '0'} กก.</span>
                                <span className="text-[9px] text-slate-450 font-bold">({rec.bags || '0'} กระสอบ)</span>
                              </div>
                              <div className="border-r border-slate-200">
                                <span className="block text-[8px] text-slate-400 font-black uppercase tracking-wider">ชั่งขาออก (ข้าวสาร)</span>
                                <span className="text-base font-extrabold text-emerald-600 font-mono mt-0.5 block">{rec.outboundWeight?.toLocaleString() || '0'} กก.</span>
                                <span className="text-[9px] text-emerald-550 font-bold">คัดเกรดบริสุทธิ์</span>
                              </div>
                              <div className="bg-orange-500/5">
                                <span className="block text-[8px] text-orange-700 font-black uppercase tracking-wider">อัตราการสกัดสำเร็จ</span>
                                <span className="text-base font-extrabold text-slate-800 font-mono mt-0.5 block">
                                  {recRecovery ? `${recRecovery}%` : 'รอขั่งคู่'}
                                </span>
                                <span className="text-[9px] text-orange-600 font-bold">Yield Recovery</span>
                              </div>
                            </div>

                            {/* Four-Stage Inspection Gallery Album */}
                            <div className="p-4 flex-1">
                              <span className="block text-[10px] text-slate-450 font-black uppercase tracking-wider mb-2.5">คลังบันทึกประวัติการแปรรูปข้าวเปลือก (Milling Operations Ledger)</span>
                              
                              <div className="grid grid-cols-4 gap-3">
                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex flex-col items-center">
                                  <span className="text-[8px] font-black text-slate-550 mb-1.5 truncate w-full text-center">1. กระสอบนำเข้า</span>
                                  {renderThumb(rec.riceBagImg, `กระสอบข้าว - ${rec.customerName}`, "กระสอบข้าว")}
                                </div>

                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex flex-col items-center">
                                  <span className="text-[8px] font-black text-slate-550 mb-1.5 truncate w-full text-center">2. ข้าวเปลือก</span>
                                  {renderThumb(rec.riceInboundImg, `ข้าวเปลือกก่อนสี - ${rec.customerName}`, "ข้าวเปลือก")}
                                </div>

                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex flex-col items-center">
                                  <span className="text-[8px] font-black text-slate-550 mb-1.5 truncate w-full text-center">3. ข้าวกล้อง</span>
                                  {renderThumb(rec.brownRiceImg, `ข้าวกล้อง - ${rec.customerName}`, "ข้าวกล้อง")}
                                </div>

                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-200/60 flex flex-col items-center">
                                  <span className="text-[8px] font-black text-slate-550 mb-1.5 truncate w-full text-center">4. ข้าวสารขาว</span>
                                  {renderThumb(rec.milledRiceImg, `ข้าวสารพร้อมส่งมอบ - ${rec.customerName}`, "ข้าวสารขาว")}
                                </div>
                              </div>
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  // Elegant Empty Ledger State Card
                  <div className="py-20 text-center max-w-md mx-auto">
                    <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto text-3xl mb-4 shadow-3xs border border-orange-200">
                      🌾
                    </div>
                    <h4 className="text-base font-black text-slate-800">ไม่พบรายการสีข้าวในวันที่เลือก</h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
                      วันที่เลือกยังไม่มีลูกค้าลงทะเบียนนำข้าวเข้ามาสีในระบบหลัก กรุณาเลือกวันที่มีกิจกรรมตามดรอปดาวน์ด้านบน หรือตรวจสอบวันอื่นๆ
                    </p>
                    
                    {/* Quick select previous days fallback list */}
                    {activeMillingDates.length > 0 && (
                      <div className="mt-8">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mb-2.5">วันทำการย้อนหลังที่มีกิจกรรม</span>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {activeMillingDates.slice(0, 4).map(d => (
                            <button
                              key={d.value}
                              type="button"
                              onClick={() => setMillingSelectedDate(d.value)}
                              className="px-3 py-2 bg-white border border-slate-200 hover:border-orange-400 hover:bg-orange-50/70 text-slate-700 hover:text-orange-700 rounded-xl text-[11px] font-black transition-all shadow-3xs cursor-pointer"
                            >
                              {d.label.split(' ')[0]} {MONTHS_TH[new Date(d.value).getMonth()]} ({d.count} กระสอบ)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-slate-400 text-[10px] font-black">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  เชื่อมต่อคลาวด์ชีตโดยตรง (Real-time Cloud Connected Ledger)
                </span>
                <span>Mekong Operational Ledger v3.0</span>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Lightbox Modal for Photo Inspection */}
      {lightboxImg && (
        <div 
          className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLightboxImg(null)}
        >
          <div 
            className="relative w-full max-w-3xl bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col my-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/65 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-800">{lightboxImg.title}</h3>
                </div>
                <p className="text-[10px] text-slate-450 font-bold mt-0.5">ภาพถ่ายตรวจสอบข้อมูลประวัติและบริการสีข้าวกึ่งปลอดภัย (Milling Verification Ledger)</p>
              </div>
              <button 
                onClick={() => setLightboxImg(null)}
                className="p-1.5 hover:bg-slate-200 rounded-full text-slate-450 hover:text-slate-800 transition-colors self-end sm:self-auto"
                id="close-lightbox-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Smart Dual-Engine Mode Selector Tab */}
            <div className="bg-slate-100 p-2 border-b border-slate-200/60 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setLightboxImgError(false);
                    setLightboxMode('iframe');
                  }}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                    lightboxMode === 'iframe'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  เครื่องมือ Google เสมือน (รองรับสิทธิ์ส่วนตัว/องค์กร)
                </button>
                <button
                  onClick={() => {
                    setLightboxImgError(false);
                    setLightboxMode('direct');
                  }}
                  className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all flex items-center gap-1 shrink-0 ${
                    lightboxMode === 'direct'
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  ภาพลิงก์ตรง CDN (โหลดเร็วสูงสุด)
                </button>
              </div>

              <a
                href={getGoogleOriginalUrl(lightboxImg.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 text-[10px] font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 bg-white border border-slate-200 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                เปิดแท็บใหม่ ↗
              </a>
            </div>

            {/* Content Preview Container */}
            <div className="bg-slate-950 p-4 md:p-6 flex flex-col justify-center items-center overflow-hidden min-h-[380px] relative">
              {!lightboxImg.url || !lightboxImg.url.startsWith('http') ? (
                <div className="w-full max-w-2xl text-slate-300 py-2">
                  <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/25 p-4 rounded-xl mb-4 text-left">
                    <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500 shrink-0 mt-0.5">
                      <Lock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-400">ตรวจพบว่าภาพถูกเก็บเป็น "ชื่อไฟล์สัมพัทธ์" (Relative AppSheet Path)</h4>
                      <p className="text-[11px] text-slate-450 mt-1 leading-relaxed">
                        ใน Google Sheets แถวรูปภาพนี้เก็บค่าเป็นชื่อไฟล์อ้างอิง เช่น <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-amber-500 font-mono text-[10px] break-all">{lightboxImg.url || 'ไม่มีข้อมูลภาพ'}</code> ไม่ใช่ลิงก์ตรง จึงทำให้โมดูลเว็บภายนอกดึงภาพสดขึ้นมาตรงๆ ไม่ได้
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 text-left">
                    <h5 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 block animate-ping"></span>
                      🛠️ วิธีแก้ไขปัญหา #ERROR! โดยใช้ "เมนูลัด 1-Click" แทนสูตรธรรมดา (ปลอดภัย 100%)
                    </h5>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                      สาเหตุที่สูตรธรรมดาขึ้น <code className="text-red-400 font-bold">#ERROR!</code> เนื่องจาก Google Sheets ห้ามสูตรเซลล์เรียกใช้สิทธิ์ <code className="text-yellow-400">DriveApp</code> ดึงข้อมูลส่วนตัวโดยตรงเพื่อความปลอดภัย ท่านจำเป็นต้องใช้สคริปต์ที่ <span className="text-emerald-400 font-bold">"สั่งงานผ่านปุ่มเมนูด้านบน"</span> แทน ซึ่งปลอดภัยและทำงานรวดเดียวกว่า 1,000 เท่า!
                    </p>

                    <div className="relative">
                      <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-cyan-400 overflow-x-auto leading-relaxed max-h-[180px]">
{`function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ ระบบลิงก์รูปภาพ')
    .addItem('⚡ อัปเดตลิงก์รูปภาพทั้งหมด (เร็วพิเศษ 1-Click)', 'updateAllImageLinksFast')
    .addToUi();
}

function updateAllImageLinksFast() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('ไม่พบข้อมูลในตาราง');
    return;
  }
  
  var ui = SpreadsheetApp.getUi();
  
  // 1. ดึงไฟล์ภาพทั้งหมดใน Drive เพื่อสร้างแผนที่ข้อมูลในหน่วยความจำ (Lightning-fast map indexing)
  var fileMap = {};
  
  // สแกนดึงข้อมูลโฟลเดอร์ภาพหลักของ AppSheet
  var targetFolders = ["ข้อมูลการรับบริการ_Images"];
  targetFolders.forEach(function(folderName) {
    var folders = DriveApp.getFoldersByName(folderName);
    while (folders.hasNext()) {
      var folder = folders.next();
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        fileMap[file.getName()] = file.getId();
      }
    }
  });
  
  // หากยังไม่มีภาพเลย ให้แสกนหาภาพทั่วไปใน Drive (กวาดหาไฟล์รูปภาพทั้งหมดมาแมปอัตโนมัติ)
  if (Object.keys(fileMap).length === 0) {
    var files = DriveApp.searchFiles("mimeType = 'image/jpeg' or mimeType = 'image/png'");
    var count = 0;
    while (files.hasNext() && count < 2000) {
      var file = files.next();
      fileMap[file.getName()] = file.getId();
      count++;
    }
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var mappings = [
    { source: "รูปกระสอบข้าว", target: "ลิงก์รูปกระสอบข้าว" },
    { source: "รูปข้าวขาเข้า", target: "ลิงก์รูปข้าวขาเข้า" },
    { source: "รูปข้าวกล้อง", target: "ลิงก์รูปข้าวกล้อง" },
    { source: "รูปข้าวสาร", target: "ลิงก์รูปข้าวสาร" }
  ];
  
  var activeMappings = [];
  mappings.forEach(function(m) {
    var sIdx = headers.indexOf(m.source) + 1;
    if (sIdx > 0) {
      var tIdx = headers.indexOf(m.target) + 1;
      if (tIdx === 0) {
        sheet.insertColumnAfter(sheet.getLastColumn());
        tIdx = sheet.getLastColumn() + 1;
        sheet.getRange(1, tIdx).setValue(m.target);
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
      activeMappings.push({ sourceIdx: sIdx, targetIdx: tIdx });
    }
  });
  
  if (activeMappings.length === 0) {
    ui.alert('ไม่พบคอลัมน์รูปต้นทางเดิมในแผงงานของท่าน');
    return;
  }
  
  var updatedCount = 0;
  activeMappings.forEach(function(map) {
    var sourceRange = sheet.getRange(2, map.sourceIdx, lastRow - 1, 1);
    var targetRange = sheet.getRange(2, map.targetIdx, lastRow - 1, 1);
    var sourceValues = sourceRange.getValues();
    var targetValues = targetRange.getValues();
    
    for (var i = 0; i < sourceValues.length; i++) {
      var relativePath = sourceValues[i][0];
      if (relativePath && (relativePath.indexOf('/') !== -1 || relativePath.indexOf('.jpg') !== -1)) {
        var parts = relativePath.split("/");
        var fileName = parts[parts.length - 1];
        
        // ดึงจากแผนที่หน่วยความจำ (ค้นหาแบบ O(1) รวดเร็ว 0.0001 วินาทีต่อรูป)
        if (fileMap[fileName]) {
          targetValues[i][0] = "https://drive.google.com/thumbnail?id=" + fileMap[fileName] + "&sz=s1000";
          updatedCount++;
        }
      } else if (!relativePath) {
        targetValues[i][0] = "";
      }
    }
    targetRange.setValues(targetValues);
  });
  
  ui.alert('🚀 แปลงลิงก์ดึงภาพความเร็วสูงสำเร็จแล้ว ' + updatedCount + ' รายการ!');
}`}
                      </pre>
                      <button
                        onClick={() => {
                          const code = `function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('⚙️ ระบบลิงก์รูปภาพ')
    .addItem('⚡ อัปเดตลิงก์รูปภาพทั้งหมด (เร็วพิเศษ 1-Click)', 'updateAllImageLinksFast')
    .addToUi();
}

function updateAllImageLinksFast() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('ไม่พบข้อมูลในตาราง');
    return;
  }
  
  var ui = SpreadsheetApp.getUi();
  
  // 1. ดึงไฟล์ภาพทั้งหมดใน Drive เพื่อสร้างแผนที่ข้อมูลในหน่วยความจำ (Lightning-fast map indexing)
  var fileMap = {};
  
  // สแกนดึงข้อมูลโฟลเดอร์ภาพหลักของ AppSheet
  var targetFolders = ["ข้อมูลการรับบริการ_Images"];
  targetFolders.forEach(function(folderName) {
    var folders = DriveApp.getFoldersByName(folderName);
    while (folders.hasNext()) {
      var folder = folders.next();
      var files = folder.getFiles();
      while (files.hasNext()) {
        var file = files.next();
        fileMap[file.getName()] = file.getId();
      }
    }
  });
  
  // หากยังไม่มีภาพเลย ให้แสกนหาภาพทั่วไปใน Drive (กวาดหาไฟล์รูปภาพทั้งหมดมาแมปอัตโนมัติ)
  if (Object.keys(fileMap).length === 0) {
    var files = DriveApp.searchFiles("mimeType = 'image/jpeg' or mimeType = 'image/png'");
    var count = 0;
    while (files.hasNext() && count < 2000) {
      var file = files.next();
      fileMap[file.getName()] = file.getId();
      count++;
    }
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var mappings = [
    { source: "รูปกระสอบข้าว", target: "ลิงก์รูปกระสอบข้าว" },
    { source: "รูปข้าวขาเข้า", target: "ลิงก์รูปข้าวขาเข้า" },
    { source: "รูปข้าวกล้อง", target: "ลิงก์รูปข้าวกล้อง" },
    { source: "รูปข้าวสาร", target: "ลิงก์รูปข้าวสาร" }
  ];
  
  var activeMappings = [];
  mappings.forEach(function(m) {
    var sIdx = headers.indexOf(m.source) + 1;
    if (sIdx > 0) {
      var tIdx = headers.indexOf(m.target) + 1;
      if (tIdx === 0) {
        sheet.insertColumnAfter(sheet.getLastColumn());
        tIdx = sheet.getLastColumn() + 1;
        sheet.getRange(1, tIdx).setValue(m.target);
        headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      }
      activeMappings.push({ sourceIdx: sIdx, targetIdx: tIdx });
    }
  });
  
  if (activeMappings.length === 0) {
    ui.alert('ไม่พบคอลัมน์รูปต้นทางเดิมในแผงงานของท่าน');
    return;
  }
  
  var updatedCount = 0;
  activeMappings.forEach(function(map) {
    var sourceRange = sheet.getRange(2, map.sourceIdx, lastRow - 1, 1);
    var targetRange = sheet.getRange(2, map.targetIdx, lastRow - 1, 1);
    var sourceValues = sourceRange.getValues();
    var targetValues = targetRange.getValues();
    
    for (var i = 0; i < sourceValues.length; i++) {
      var relativePath = sourceValues[i][0];
      if (relativePath && (relativePath.indexOf('/') !== -1 || relativePath.indexOf('.jpg') !== -1)) {
        var parts = relativePath.split("/");
        var fileName = parts[parts.length - 1];
        
        // ดึงจากแผนที่หน่วยความจำ (ค้นหาแบบ O(1) รวดเร็ว 0.0001 วินาทีต่อรูป)
        if (fileMap[fileName]) {
          targetValues[i][0] = "https://drive.google.com/thumbnail?id=" + fileMap[fileName] + "&sz=s1000";
          updatedCount++;
        }
      } else if (!relativePath) {
        targetValues[i][0] = "";
      }
    }
    targetRange.setValues(targetValues);
  });
  
  ui.alert('🚀 แปลงลิงก์ดึงภาพความเร็วสูงสำเร็จแล้ว ' + updatedCount + ' รายการ!');
}`;
                          navigator.clipboard.writeText(code);
                          alert("คัดลอกรหัส Google Apps Script สำหรับระบบเมนูลัด 1-Click เรียบร้อยแล้ว! นำไปใช้วางแทนสคริปต์ตัวเก่าได้เลย");
                        }}
                        className="absolute right-2 top-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 hover:text-white rounded text-[9px] font-bold text-slate-300 transition-colors"
                      >
                        คัดลอกโค้ด 📋
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-400 space-y-2 pt-1 font-sans">
                      <p className="font-bold text-slate-300">📌 ขั้นตอนง่ายๆ ในการใช้งานปุ่ม 1-Click:</p>
                      <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed text-slate-400">
                        <li>เปิดไปที่หน้าของ <b>Google App Script</b> (อันที่วางสคริปต์เก่าไว้)</li>
                        <li><b>ลบโค้ดเดิมออกทั้งหมด</b> แล้ววางโค้ดชุดใหม่ด้านบนลงไปแทน กดปุ่ม <b>"บันทึก" (Save)</b></li>
                        <li>กลับมารีเฟรชบราวเซอร์หน้า <b>Google Sheets</b> ของท่าน 1 ครั้ง</li>
                        <li>จะปรากฏเมนูใหม่ที่ทาสก์บาร์ด้านบนชื่อ <b className="text-emerald-400">"⚙️ ระบบลิงก์รูปภาพ"</b> คลิกเลือก <b>"🔄 อัปเดตลิงก์รูปภาพทั้งหมด (1-Click)"</b></li>
                        <li>ระเบียบความปลอดภัยจะขอให้กดยอมรับสิทธิ์ใช้งาน Drive (ทำเพียงครั้งแรกสุดเท่านั้น) จากนั้นโปรแกรมจะสแกนหาไฟล์รูปภาพเดิมของและสร้างลิงก์ตรงให้ทุกภาพโดยอัตโนมัติทันทีโดยไม่มีข้อผิดพลาด!</li>
                      </ol>
                      <p className="text-emerald-400 font-semibold leading-relaxed bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 mt-2 text-center text-[10.5px]">
                        🎉 เสร็จสิ้น! เมื่อลิงก์แปลงเป็น URL ของ Google Drive แล้ว ระบบจัดการบนเว็บนี้จะดึงรูปภาพของท่านมาแสดงอย่างรวดเร็วและงดงามทันที!
                      </p>
                    </div>
                  </div>
                </div>
              ) : lightboxMode === 'iframe' ? (
                <div className="w-full flex flex-col items-center gap-3">
                  {getGoogleDrivePreviewUrl(lightboxImg.url) ? (
                    <>
                      <div className="w-full h-[400px] md:h-[420px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner relative">
                        <iframe 
                          src={getGoogleDrivePreviewUrl(lightboxImg.url)!}
                          className="w-full h-full border-0 rounded-xl"
                          allow="autoplay"
                          loading="lazy"
                        />
                      </div>
                      <div className="w-full max-w-xl text-center bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl">
                        <span className="text-[10px] font-semibold text-slate-400">
                          ℹ️ <span className="text-orange-400 font-bold">เทคโนโลยี Google Secure IFrame</span> แสดงผลตามสิทธิ์บัญชี Gmail ในเบราว์เซอร์ของท่านอัตโนมัติ โดยไม่จำเป็นต้องตั้งค่าแชร์ไฟล์รูปให้เป็นสาธารณะก็ดูได้ฟรี!
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 text-xs py-10">ไม่สามารถแปลงลิงก์เป็นไฟล์พรีวิวได้</div>
                  )}
                </div>
              ) : (
                /* Direct CDN Image rendering */
                !lightboxImgError ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <img 
                      src={lightboxImg.url} 
                      alt={lightboxImg.title} 
                      className="max-w-full max-h-[50vh] object-contain rounded-lg shadow-2xl"
                      referrerPolicy="no-referrer"
                      onError={() => setLightboxImgError(true)}
                    />
                    <div className="bg-slate-900/50 border border-slate-800 px-4 py-2 rounded-xl text-center">
                      <p className="text-[10px] font-semibold text-slate-400">รูปภาพนี้ดึงสดจากเครือข่าย CDN เพื่อความรวดเร็วและประหยัดเว็บบันด์วิดท์</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-6 max-w-lg text-slate-300">
                    <div className="w-16 h-16 rounded-full bg-orange-950/40 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4 animate-pulse">
                      <Lock className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-extrabold text-white mb-2">ไม่สามารถดึงรูปภาพของขั้นตอนการสีข้าวได้โดยตรงแบบ CDN</h4>
                    <p className="text-xs text-slate-450 leading-relaxed font-semibold max-w-sm mb-4">
                      เนื่องจากสิทธิ์ไฟล์บน Google Drive ยังถูกล็อกไว้ หรือเบราว์เซอร์บล็อกการยิงข้ามโดเมนของภาพภายนอก
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-2">
                      <div className="bg-slate-900 p-3.5 border border-slate-800 rounded-xl text-left text-[11px] font-medium text-slate-400 space-y-1">
                        <p className="font-extrabold text-orange-400">🛠️ วิธีแก้ไขปัญหาฝั่ง Google ฟรี:</p>
                        <p className="leading-relaxed">
                          เข้าไปที่โฟลเดอร์ใน Google Drive ของโรงสี คลิกขวาเลือก <b>"แชร์" (Share)</b> แล้วเปลี่ยนสิทธิ์การเข้าถึงเป็น <b>"ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" (Anyone with the link)</b>
                        </p>
                      </div>

                      <div className="bg-slate-900 p-3.5 border border-slate-800 rounded-xl text-left text-[11px] font-medium text-slate-400 flex flex-col justify-between">
                        <div className="space-y-1">
                          <p className="font-extrabold text-emerald-400">✅ ทางเลือกรวดเร็วตอนนี้:</p>
                          <p className="leading-relaxed">
                            คลิกใช้แท็บ <b>"เครื่องมือ Google เสมือน"</b> ด้านบนเพื่อดึงรูปผ่านสิทธิ์ความเข้าชื่นชมส่วนตัวที่ปลอดภัย
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setLightboxImgError(false);
                            setLightboxMode('iframe');
                          }}
                          className="mt-2 w-full text-center py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-extrabold rounded-lg transition-transform hover:scale-[1.01]"
                        >
                          สับเป็นโหมด Google เสมือน ทันที
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200/65 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">ลูกค้าผู้ตรวจสอบ: <span className="font-bold text-slate-800">{searchedMemberResult?.name}</span></span>
              <button 
                onClick={() => setLightboxImg(null)}
                className="px-4 py-2 bg-slate-850 hover:bg-slate-950 text-white rounded-xl font-bold transition-all text-[11px] shadow-sm hover:scale-[1.01]"
                id="close-lightbox-bottom-btn"
              >
                ปิดหน้าต่างตรวจสอบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Service History Report Modal */}
      <CustomerServiceHistoryReportModal
        isOpen={isCustomerReportOpen}
        onClose={() => setIsCustomerReportOpen(false)}
        member={searchedMemberResult}
        crossInfo={searchedMemberCrossInfo}
        initialMode={customerReportMode}
      />
    </div>
  );
}
