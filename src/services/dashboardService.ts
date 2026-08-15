import axios from 'axios';
import Papa from 'papaparse';

const SHEET_ID = '1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg';
const MILL_SHEET_NAME = 'ข้อมูลการรับบริการ';

export interface MillRecord {
  date: string;
  customerName: string;
  phone: string;
  riceType: string;
  bags: number;
  weight: number;
  location?: [number, number];
  serviceType?: string;
  status?: string;
  
  // New raw fields requested
  riceBagImg?: string;
  riceInboundImg?: string;
  brownRiceImg?: string;
  milledRiceImg?: string;
  outboundWeight?: number;

  // Saved analysis results and feedback
  impurityPercent?: number;
  redContaminationPercent?: number;
  chalkyPercent?: number;
  mixedGlutinousPercent?: number;
  qualityGrade?: string;
  grainCountSimulated?: {
    paddyGrains?: number;
    foreignItems?: number;
    cleanBrownGrains?: number;
    redOrBlackGrains?: number;
  };
  userAnnotatedPoints?: { x: number; y: number; label: string; timestamp: string }[];
  dismissedSystemBoxes?: { x: number; y: number }[];
  aiAnalysisResult?: any;
  aiAnalysisActiveType?: string;
}

export interface PointsRecord {
  date: string;
  earned: number;
  used: number;
}

export interface MemberRecord {
  lineId: string;
  name: string;
  phone: string;
  address: string;
  registrationDate: string;
  profilePic?: string;
  status: string;
  earnedPoints: number;
  usedPoints: number;
  balancePoints: number;
  location?: [number, number];
}

export async function fetchPointsData(): Promise<PointsRecord[]> {
  const GID_EARNED = '0';
  const GID_USED = '1056042178';
  const urlEarned = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_EARNED}`;
  const urlUsed = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_USED}`;
  
  try {
    const [resEarned, resUsed] = await Promise.all([
      axios.get(urlEarned),
      axios.get(urlUsed)
    ]);

    const pointsEarned = Papa.parse(resEarned.data, { header: true, skipEmptyLines: true }).data.map((row: any) => {
      const keys = Object.keys(row);
      const dateKey = keys.find(k => k.includes('วัน') || k.toLowerCase().includes('date')) || '';
      // Specific detection for "แต้มที่ได้" as requested
      const earnedKey = keys.find(k => k.includes('แต้มที่ได้') || k.includes('ได้รับ') || k.includes('สะสม')) || '';
      return {
        date: row[dateKey] || '',
        earned: parseFloat(row[earnedKey]?.toString().replace(/,/g, '')) || 0,
        used: 0
      };
    });

    const pointsUsed = Papa.parse(resUsed.data, { header: true, skipEmptyLines: true }).data.map((row: any) => {
      const keys = Object.keys(row);
      const dateKey = keys.find(k => k.includes('วัน') || k.toLowerCase().includes('date')) || '';
      // Looking for "แต้มที่ใช้ (สมาชิก)" or related
      const usedKey = keys.find(k => k.includes('แต้มที่ใช้') || k.includes('สมาชิก') || k.toLowerCase().includes('used')) || '';
      return {
        date: row[dateKey] || '',
        earned: 0,
        used: parseFloat(row[usedKey]?.toString().replace(/,/g, '')) || 0
      };
    });

    return [...pointsEarned, ...pointsUsed];
  } catch (error) {
    console.error('Error fetching points data:', error);
    return [];
  }
}

export function formatGoogleDriveUrl(url: string | undefined): string {
  if (!url) return '';
  // Robustly extract Google Drive file identifier (alphanumeric, 19-80 chars)
  const driveRegex = /(?:id=|file\/d\/|open\?id=)([a-zA-Z0-9_-]{19,80})/;
  const match = url.match(driveRegex);
  if (match && match[1]) {
    // Utilize Google's reliable public CDN for seamless cookie-free embedded images
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

export interface CustomerFieldPlot {
  id: string;
  customerName: string;
  locationName: string;
  areaRai: number;
  areaNgan?: number;
  areaWah?: number;
  areaSqm?: number;
  riceVariety: string;
  transplanterModel?: string;
  status: string;
  averageYieldKgPerRai?: number;
  yieldEstimateKg?: number;
  yieldEstimateTon: number;
  coords: [number, number];
  polygon: [number, number][];
}

export const DEFAULT_RICE_YIELDS: Record<string, number> = {
  'ขาวดอกมะลิ 105': 540,
  'กข15': 560,
  'กข6': 666,
  'กข83 (มะลิดำหนองคาย 62)': 570,
  'ข้าวเหนียวดำ': 650,
  'ไรซ์เบอร์รี่': 500,
  'กข10': 660,
  'กข22': 750,
  'กข6 ธัญสิริน': 798,
  'เบญจเมฆา 1': 600,
};

export async function fetchRiceVarietyYields(): Promise<Record<string, number>> {
  const SPREADSHEET_ID = '1OSP-CnYKWGQRk4och-jE-TskxvcuQ14iScvPn6q9MvM';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=` + encodeURIComponent('พันธุ์ข้าว');

  const yieldMap: Record<string, number> = { ...DEFAULT_RICE_YIELDS };

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });
    
    (parsed.data as any[]).forEach((row) => {
      const name = row.name ? String(row.name).trim() : '';
      const avgYield = parseFloat(row.averageYield);
      if (name && !isNaN(avgYield) && avgYield > 0) {
        yieldMap[name] = avgYield;
      }
    });
  } catch (err) {
    console.warn('Could not fetch rice variety yields from sheet, using default yield map:', err);
  }

  return yieldMap;
}

export function getAverageYieldForVariety(variety: string, yieldMap: Record<string, number> = DEFAULT_RICE_YIELDS): number {
  if (!variety) return 540;
  const clean = variety.trim();
  if (yieldMap[clean]) return yieldMap[clean];

  for (const [key, val] of Object.entries(yieldMap)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }

  if (clean.includes('เหนียว') || clean.includes('กข6')) return 666;
  if (clean.includes('เจ้า') || clean.includes('มะลิ') || clean.includes('105')) return 540;
  return 600;
}

export async function fetchTransplanterCustomerFields(): Promise<CustomerFieldPlot[]> {
  const SPREADSHEET_ID = '1OSP-CnYKWGQRk4och-jE-TskxvcuQ14iScvPn6q9MvM';
  const GID = '817298370';
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

  try {
    const [yieldMap, response] = await Promise.all([
      fetchRiceVarietyYields(),
      axios.get(url)
    ]);

    const parsed = Papa.parse(response.data, { header: false, skipEmptyLines: true });
    
    const rows = (parsed.data as string[][]).slice(1);
    
    const fields: CustomerFieldPlot[] = rows.map((row, idx) => {
      const plotId = row[0]?.trim() || `PLOT-${String(idx + 1).padStart(3, '0')}`;
      const customerName = row[1]?.trim() || 'ลูกค้าบริการรถดำนา';
      const locationName = row[2]?.trim() || `แปลงนาของคุณ ${customerName}`;
      const geojsonRaw = row[3];
      const lat = parseFloat(row[4]);
      const lng = parseFloat(row[5]);
      const areaRai = parseFloat(row[6]) || 0;
      const areaNgan = parseFloat(row[7]) || 0;
      const areaWah = parseFloat(row[8]) || 0;
      const areaSqmRaw = parseFloat(row[9]);

      const areaSqm = (!isNaN(areaSqmRaw) && areaSqmRaw > 0)
        ? areaSqmRaw
        : (areaRai * 1600) + (areaNgan * 400) + (areaWah * 4);

      const totalRai = areaSqm / 1600;
      const riceVariety = row[10]?.trim() || 'ขาวดอกมะลิ 105';
      const averageYieldKgPerRai = getAverageYieldForVariety(riceVariety, yieldMap);

      let polygon: [number, number][] = [];
      if (geojsonRaw) {
        try {
          const parsedGeo = JSON.parse(geojsonRaw);
          if (parsedGeo.coordinates && Array.isArray(parsedGeo.coordinates[0])) {
            polygon = parsedGeo.coordinates[0].map((pt: [number, number]) => [pt[1], pt[0]]);
          }
        } catch (e) {
          console.warn('GeoJSON parse error for plot:', plotId, e);
        }
      }

      if (polygon.length === 0 && !isNaN(lat) && !isNaN(lng)) {
        polygon = [
          [lat + 0.001, lng - 0.001],
          [lat + 0.001, lng + 0.001],
          [lat - 0.001, lng + 0.001],
          [lat - 0.001, lng - 0.001],
        ];
      }

      // Formula: =(area_sqm/1600)*averageYield
      const yieldEstimateKg = (areaSqm / 1600) * averageYieldKgPerRai;
      const yieldEstimateTon = parseFloat((yieldEstimateKg / 1000).toFixed(2));

      return {
        id: plotId,
        customerName,
        locationName,
        areaRai: parseFloat(totalRai.toFixed(2)),
        areaNgan,
        areaWah,
        areaSqm: Math.round(areaSqm),
        riceVariety,
        transplanterModel: 'รถดำนาเดินตาม / นั่งขับ 4-6 แถว',
        status: 'SRP Low Carbon',
        averageYieldKgPerRai,
        yieldEstimateKg: Math.round(yieldEstimateKg),
        yieldEstimateTon: yieldEstimateTon > 0 ? yieldEstimateTon : 3.5,
        coords: [!isNaN(lat) ? lat : 17.135, !isNaN(lng) ? lng : 104.748] as [number, number],
        polygon
      };
    }).filter(f => !isNaN(f.coords[0]) && !isNaN(f.coords[1]));

    return fields.length > 0 ? fields : [];
  } catch (err) {
    console.error('Error fetching transplanter customer field plots:', err);
    return [];
  }
}

export async function fetchMemberMasterCount(): Promise<number> {
  const MEMBER_GID = "982879969";
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${MEMBER_GID}`;
  try {
    const response = await axios.get(url);
    const results = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true,
    });
    return results.data.length > 0 ? results.data.length : 917;
  } catch (err) {
    console.error('Error fetching member master count:', err);
    return 917;
  }
}

export async function fetchMillData(): Promise<MillRecord[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MILL_SHEET_NAME)}`;
  
  try {
    const response = await axios.get(url);
    const results = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true,
    });

    return results.data.map((row: any) => {
      const keys = Object.keys(row);
      
      const dateKey = keys.find(k => k.includes('วัน') || k.toLowerCase().includes('date')) || '';
      const nameKey = keys.find(k => k.includes('ชื่อ') || k.toLowerCase().includes('name')) || '';
      const phoneKey = keys.find(k => k.includes('โทร') || k.toLowerCase().includes('phone')) || '';
      const typeKey = keys.find(k => k.includes('ประเภท') || k.toLowerCase().includes('type')) || '';
      const bagsKey = keys.find(k => k.includes('กระสอบ') || k.toLowerCase().includes('bags')) || '';
      const weightKey = keys.find(k => k.includes('น้ำหนัก') || k.toLowerCase().includes('weight')) || '';
      const serviceKey = keys.find(k => k === 'บริการหลัก') || keys.find(k => k.includes('บริการหลัก')) || keys.find(k => k.includes('บริการ') && !k.includes('วัน')) || '';
      const statusKey = keys.find(k => k === 'สถานะการส่งข้าว' || k.includes('สถานะการส่งข้าว') || k.includes('สถานะ') || k.toLowerCase().includes('status')) || '';
      
      const riceBagImgKey = keys.find(m => m === 'ลิงก์รูปกระสอบข้าว') ||
                            keys.find(m => m.includes('ลิงก์รูปกระสอบ') || m.includes('ลิงก์กระสอบ') || m.includes('linkรูปกระสอบ')) ||
                            keys.find(m => m === 'รูปกระสอบข้าว') ||
                            keys.find(m => m.includes('รูปกระสอบ') || m.includes('ภาพกระสอบ') || (m.includes('กระสอบ') && m.includes('รูป'))) || '';
      
      const riceInboundImgKey = keys.find(m => m === 'ลิงก์รูปข้าวขาเข้า') ||
                                keys.find(m => m.includes('ลิงก์รูปข้าวขาเข้า') || m.includes('ลิงก์ข้าวขาเข้า') || m.includes('linkรูปข้าวขาเข้า')) ||
                                keys.find(m => m === 'รูปข้าวขาเข้า') ||
                                keys.find(m => m.includes('รูปข้าวขาเข้า') || m.includes('ข้าวขาเข้า') || m.includes('ขาเข้า') || (m.includes('ข้าวเข้า') && m.includes('รูป'))) || '';
      
      const brownRiceImgKey = keys.find(m => m === 'ลิงก์รูปข้าวกล้อง') ||
                              keys.find(m => m.includes('ลิงก์รูปข้าวกล้อง') || m.includes('ลิงก์ข้าวกล้อง') || m.includes('linkรูปข้าวกล้อง')) ||
                              keys.find(m => m === 'รูปข้าวกล้อง') ||
                              keys.find(m => m.includes('รูปข้าวกล้อง') || m.includes('ข้าวกล้อง') || (m.includes('ข้าวกล้อง') && m.includes('รูป'))) || '';
      
      const milledRiceImgKey = keys.find(m => m === 'ลิงก์รูปข้าวสาร') ||
                               keys.find(m => m.includes('ลิงก์รูปข้าวสาร') || m.includes('ลิงก์ข้าวสาร') || m.includes('linkรูปข้าวสาร')) ||
                               keys.find(m => m === 'รูปข้าวสาร') ||
                               keys.find(m => m.includes('รูปข้าวสาร') || m.includes('ข้าวสาร') || (m.includes('ข้าวสาร') && m.includes('รูป'))) || '';
      const outboundWeightKey = keys.find(m => m.includes('น้ำหนักข้าวขาออก') || m.includes('ขาออก') || (m.includes('น้ำหนัก') && m.includes('ออก'))) || '';

      // Coordinate detection (Aggressive)
      const latKey = keys.find(k => {
        const lower = k.toLowerCase();
        return lower === 'lat' || lower === 'latitude' || lower.includes('ละติจูด') || lower === 'y' || lower.includes('lat');
      });
      const lngKey = keys.find(k => {
        const lower = k.toLowerCase();
        return lower === 'lng' || lower === 'lon' || lower === 'longitude' || lower.includes('ลองจิจูด') || lower === 'x' || lower.includes('lng') || lower.includes('long');
      });
      const combinedLocKey = keys.find(k => {
        const lower = k.toLowerCase();
        return lower.includes('พิกัด') || lower.includes('ที่อยู่') || lower.includes('location') || lower.includes('coord') || lower.includes('map') || lower.includes('gps');
      });

      let location: [number, number] | undefined = undefined;
      
      const parseCoords = (val: any): [number, number] | undefined => {
        if (!val || typeof val !== 'string') return undefined;
        
        // Regex to find two numbers (possibly negative, with decimals)
        // This handles "17.4, 104.7", "(17.4, 104.7)", "17.4 104.7", etc.
        const regex = /(-?\d+\.\d+)\s*[,;\s]\s*(-?\d+\.\d+)/;
        const match = val.match(regex);
        
        if (match) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }
        
        // Fallback: just find any two numbers
        const allNumbers = val.match(/-?\d+\.\d+/g);
        if (allNumbers && allNumbers.length >= 2) {
          const lat = parseFloat(allNumbers[0]);
          const lng = parseFloat(allNumbers[1]);
          if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
        }
        
        return undefined;
      };

      // Priority 1: Combined location field (e.g., "พิกัด")
      if (combinedLocKey && row[combinedLocKey]) {
        const coords = parseCoords(row[combinedLocKey]);
        if (coords) location = coords;
      }

      // Priority 2: Separate lat/lng fields
      if (!location && latKey && lngKey && row[latKey] && row[lngKey]) {
        const lat = parseFloat(row[latKey]);
        const lng = parseFloat(row[lngKey]);
        if (!isNaN(lat) && !isNaN(lng)) {
          location = [lat, lng];
        }
      } 
      
      // Priority 3: Search all keys for something that looks like coords
      if (!location) {
        for (const k of keys) {
          if (k === combinedLocKey || k === latKey || k === lngKey) continue;
          const loc = parseCoords(row[k]);
          if (loc) {
            location = loc;
            break;
          }
        }
      }

      // Sync columns keys
      const feedbackPointsKey = keys.find(k => k.includes('พิกัดป้อนกลับ')) || '';
      const dismissedPointsKey = keys.find(k => k.includes('พิกัดตัดออก')) || '';
      const impurityPercentKey = keys.find(k => k === 'อัตราส่วนสิ่งเจือปนปะปน' || k.includes('สิ่งเจือปนปะปน')) || '';
      const redContaminationPercentKey = keys.find(k => k === 'สัดส่วนการปนเปื้อนข้าวแดง' || k.includes('ปนเปื้อนข้าวแดง')) || '';
      const chalkyPercentKey = keys.find(k => k === 'อัตราข้าวมีท้องไข่' || k.includes('ท้องไข่')) || '';
      const adjustedPercentKey = keys.find(k => k.includes('เปอร์เซ็นต์เจือปนปรับปรุง')) || '';
      const adjustedGradeKey = keys.find(k => k.includes('เกรดคุณภาพปรับปรุง')) || '';

      const parsePercent = (val: any): number | undefined => {
        if (val === undefined || val === null || val === '') return undefined;
        const clean = String(val).replace(/%/g, '').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? undefined : num;
      };

      const parseFeedbackPoints = (val: any): any[] => {
        if (!val) return [];
        const str = String(val);
        const points: any[] = [];
        const parts = str.split(' | ');
        parts.forEach(part => {
          const regex = /\[\d+\]\s*(.*?)\s*\(X:\s*([\d.]+)\s*%,\s*Y:\s*([\d.]+)\s*%\)/;
          const match = part.match(regex);
          if (match) {
            points.push({
              x: parseFloat(match[2]),
              y: parseFloat(match[3]),
              label: match[1].trim(),
              timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
            });
          }
        });
        return points;
      };

      const parseDismissedPoints = (val: any): any[] => {
        if (!val) return [];
        const str = String(val);
        const points: any[] = [];
        const parts = str.split(' | ');
        parts.forEach(part => {
          const regex = /\[\d+\]\s*ตัดจุดผิดพลาด\s*\(X:\s*([\d.]+)\s*%,\s*Y:\s*([\d.]+)\s*%\)/;
          const match = part.match(regex);
          if (match) {
            points.push({
              x: parseFloat(match[1]),
              y: parseFloat(match[2])
            });
          }
        });
        return points;
      };

      const customImpurity = impurityPercentKey ? parsePercent(row[impurityPercentKey]) : undefined;
      const customRed = redContaminationPercentKey ? parsePercent(row[redContaminationPercentKey]) : undefined;
      const customChalky = chalkyPercentKey ? parsePercent(row[chalkyPercentKey]) : undefined;
      const customAdjusted = adjustedPercentKey ? parsePercent(row[adjustedPercentKey]) : undefined;
      const customGrade = adjustedGradeKey ? row[adjustedGradeKey] || '' : '';
      const parsedUserAnnotatedPoints = feedbackPointsKey ? parseFeedbackPoints(row[feedbackPointsKey]) : [];
      const parsedDismissedSystemBoxes = dismissedPointsKey ? parseDismissedPoints(row[dismissedPointsKey]) : [];

      return {
        date: row[dateKey] || '',
        customerName: row[nameKey] || 'ไม่ระบุชื่อ',
        phone: row[phoneKey] || '',
        riceType: row[typeKey] || 'ไม่ระบุประเภท',
        bags: parseInt(row[bagsKey]) || 0,
        weight: parseFloat(row[weightKey]) || 0,
        location,
        serviceType: serviceKey ? (row[serviceKey] || '') : '',
        status: statusKey ? (row[statusKey] || '') : '',
        riceBagImg: riceBagImgKey ? formatGoogleDriveUrl(row[riceBagImgKey]) : '',
        riceInboundImg: riceInboundImgKey ? formatGoogleDriveUrl(row[riceInboundImgKey]) : '',
        brownRiceImg: brownRiceImgKey ? formatGoogleDriveUrl(row[brownRiceImgKey]) : '',
        milledRiceImg: milledRiceImgKey ? formatGoogleDriveUrl(row[milledRiceImgKey]) : '',
        outboundWeight: outboundWeightKey ? parseFloat(row[outboundWeightKey]?.toString().replace(/,/g, '')) || 0 : 0,
        impurityPercent: customImpurity,
        redContaminationPercent: customRed,
        chalkyPercent: customChalky,
        adjustedPercent: customAdjusted,
        qualityGrade: customGrade || undefined,
        userAnnotatedPoints: parsedUserAnnotatedPoints.length > 0 ? parsedUserAnnotatedPoints : undefined,
        dismissedSystemBoxes: parsedDismissedSystemBoxes.length > 0 ? parsedDismissedSystemBoxes : undefined,
      };
    });
  } catch (error) {
    console.error('Error fetching mill data:', error);
    return [];
  }
}

export async function fetchMemberData(): Promise<MemberRecord[]> {
  const GID_MEMBER = '982879969';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID_MEMBER}`;
  
  try {
    const response = await axios.get(url);
    const results = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true,
    });

    return results.data.map((row: any) => {
      let location: [number, number] | undefined = undefined;
      const addr = row['ที่อยู่'] || '';
      if (addr) {
        const parts = addr.split(',');
        if (parts.length === 2) {
          const lat = parseFloat(parts[0].trim());
          const lng = parseFloat(parts[1].trim());
          if (!isNaN(lat) && !isNaN(lng)) {
            location = [lat, lng];
          }
        }
      }

      return {
        lineId: row['LineID'] || '',
        name: row['ชื่อ-สกุล'] || '',
        phone: row['เบอร์โทร'] || '',
        address: addr,
        registrationDate: row['วันกรอกข้อมูล'] || '',
        profilePic: row['รูปสมาชิก'] || '',
        status: row['สถานะ'] || '',
        earnedPoints: parseFloat(row['แต้มที่ได้สะสม']) || 0,
        usedPoints: parseFloat(row['แต้มที่ใช้สะสม']) || 0,
        balancePoints: parseFloat(row['แต้มที่คงเหลือสะสม']) || 0,
        location,
      };
    });
  } catch (error) {
    console.error('Error fetching member data:', error);
    return [];
  }
}

export interface SalesRecord {
  id: string;
  date: string;
  customerName: string;
  productName: string;
  quantity: number; // bags / bags / packages
  weight: number; // kg
  pricePerUnit: number; // cost per bag or per kg
  totalAmount: number; // total in THB
  paymentStatus: 'paid' | 'pending';
  salesperson: string;
}

export async function fetchSalesData(): Promise<SalesRecord[]> {
  const PRIMARY_SHEET_NAME = 'ขายของ';
  const SECONDARY_SHEET_NAME = 'รายการขาย';
  
  // Try 'ขายของ' first
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(PRIMARY_SHEET_NAME)}`;
    const response = await axios.get(url);
    const results = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true,
    });

    if (results.data && results.data.length > 0) {
      return parseSalesDataRows(results.data);
    }
  } catch (err) {
    console.log(`Failed to fetch from sheet '${PRIMARY_SHEET_NAME}', trying secondary sheet '${SECONDARY_SHEET_NAME}'...`);
  }

  // Try 'รายการขาย' second
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SECONDARY_SHEET_NAME)}`;
    const response = await axios.get(url);
    const results = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true,
    });

    if (results.data && results.data.length > 0) {
      return parseSalesDataRows(results.data);
    }
  } catch (err) {
    console.warn('Could not fetch sales from any Google Sheet name, utilizing fallback offline data...');
  }

  return getFallbackSalesData();
}

function parseSalesDataRows(data: any[]): SalesRecord[] {
  return data.map((row: any, idx: number) => {
    const keys = Object.keys(row);
    
    const dateKey = keys.find(k => k.includes('วัน') || k.toLowerCase().includes('date')) || '';
    const nameKey = keys.find(k => k.includes('ชื่อ') || k.toLowerCase().includes('customer') || k.toLowerCase().includes('name')) || '';
    const productKey = keys.find(k => k.includes('สินค้า') || k.includes('รายการ') || k.toLowerCase().includes('product')) || '';
    const qtyKey = keys.find(k => k.includes('จำนวน') || k.toLowerCase().includes('quantity') || k.toLowerCase().includes('qty')) || '';
    const weightKey = keys.find(k => k.includes('น้ำหนัก') || k.toLowerCase().includes('weight')) || '';
    const priceKey = keys.find(k => k.includes('ราคา') || k.toLowerCase().includes('price')) || '';
    const totalKey = keys.find(k => k.includes('รวม') || k.includes('เงิน') || k.toLowerCase().includes('total') || k.toLowerCase().includes('amount')) || '';
    const statusKey = keys.find(k => k.includes('สถานะ') || k.toLowerCase().includes('status') || k.toLowerCase().includes('payment')) || '';
    const salesPersonKey = keys.find(k => k.includes('พนักงาน') || k.toLowerCase().includes('salesperson') || k.toLowerCase().includes('seller')) || '';

    const totalAmount = parseFloat(row[totalKey]?.toString().replace(/,/g, '')) || 0;
    const quantity = parseFloat(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
    const weight = parseFloat(row[weightKey]?.toString().replace(/,/g, '')) || 0;
    const pricePerUnit = parseFloat(row[priceKey]?.toString().replace(/,/g, '')) || 0;
    
    const statusRaw = (row[statusKey] || '').toString().toLowerCase();
    const paymentStatus: 'paid' | 'pending' = (statusRaw.includes('ค้าง') || statusRaw.includes('pending') || statusRaw.includes('ยังไม่')) ? 'pending' : 'paid';

    return {
      id: `sales-${idx}-${Date.now()}`,
      date: row[dateKey] || '',
      customerName: row[nameKey] || 'ไม่ระบุชื่อ',
      productName: row[productKey] || 'ข้าวสาร',
      quantity: quantity || 1,
      weight: weight || 0,
      pricePerUnit: pricePerUnit || (quantity ? totalAmount / quantity : totalAmount),
      totalAmount: totalAmount || (quantity * pricePerUnit),
      paymentStatus,
      salesperson: row[salesPersonKey] || 'ผู้จัดการโรงสี',
    };
  });
}

export interface StockRecord {
  id: string;
  productName: string;
  category: string;
  quantity: number; // in bags
  weight: number; // in kg
  costPrice: number; // cost per bag / unit
  minThreshold: number; // low stock warn
  lastUpdated: string;
}

export async function fetchStockData(): Promise<StockRecord[]> {
  const STOCK_SHEET_NAME = 'คลังสินค้า';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(STOCK_SHEET_NAME)}`;

  try {
    const response = await axios.get(url);
    const results = Papa.parse(response.data, {
      header: true,
      skipEmptyLines: true,
    });

    if (!results.data || results.data.length === 0) {
      return getFallbackStockData();
    }

    return results.data.map((row: any, idx: number) => {
      const keys = Object.keys(row);
      const nameKey = keys.find(k => k.includes('สินค้า') || k.includes('รายการ') || k.toLowerCase().includes('product') || k.toLowerCase().includes('name')) || '';
      const categoryKey = keys.find(k => k.includes('ประเภท') || k.includes('หมวดหมู่') || k.toLowerCase().includes('category')) || '';
      const qtyKey = keys.find(k => k.includes('คงเหลือ') || k.includes('จำนวน') || k.toLowerCase().includes('quantity') || k.toLowerCase().includes('qty') || k.toLowerCase().includes('stock')) || '';
      const weightKey = keys.find(k => k.includes('น้ำหนักรวม') || k.includes('น้ำหนัก') || k.toLowerCase().includes('weight')) || '';
      const costKey = keys.find(k => k.includes('ต้นทุน') || k.toLowerCase().includes('cost') || k.toLowerCase().includes('price')) || '';
      const minKey = keys.find(k => k.includes('ขั้นต่ำ') || k.includes('เตือน') || k.toLowerCase().includes('threshold') || k.toLowerCase().includes('min')) || '';
      const dateKey = keys.find(k => k.includes('อัปเดต') || k.includes('วันที่') || k.toLowerCase().includes('date') || k.toLowerCase().includes('updated')) || '';

      const productName = row[nameKey] || 'สินค้าทั่วไป';
      const category = row[categoryKey] || 'ข้าวสาร';
      const quantity = parseFloat(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
      const weight = parseFloat(row[weightKey]?.toString().replace(/,/g, '')) || 0;
      const costPrice = parseFloat(row[costKey]?.toString().replace(/,/g, '')) || 0;
      const minThreshold = parseFloat(row[minKey]?.toString().replace(/,/g, '')) || 15;
      const lastUpdated = row[dateKey] || new Date().toLocaleDateString('th-TH');

      return {
        id: `stock-${idx}-${Date.now()}`,
        productName,
        category,
        quantity,
        weight: weight || quantity * 45,
        costPrice,
        minThreshold,
        lastUpdated
      };
    });
  } catch (error) {
    console.warn('Could not fetch Google Sheet stock data, utilizing offline fallback dataset:', error);
    return getFallbackStockData();
  }
}

function getFallbackStockData(): StockRecord[] {
  return [
    { id: 'stock-1', productName: 'แกลบเผากระสอบเหลือง', category: 'ผลพลอยได้', quantity: 140, weight: 2100, costPrice: 80, minThreshold: 20, lastUpdated: '21/06/2026' },
    { id: 'stock-2', productName: 'ขี้เถ้าแกลบอบแห้ง', category: 'ผลพลอยได้', quantity: 95, weight: 1425, costPrice: 60, minThreshold: 15, lastUpdated: '22/06/2026' },
    { id: 'stock-3', productName: 'ข้าวปลายเกรดซี (Feed Rice)', category: 'ผลพลอยได้', quantity: 180, weight: 7200, costPrice: 450, minThreshold: 30, lastUpdated: '22/06/2026' },
    { id: 'stock-4', productName: 'รำข้าวบดละเอียด (Bran)', category: 'ผลพลอยได้', quantity: 410, weight: 12300, costPrice: 280, minThreshold: 80, lastUpdated: '20/06/2026' },
    { id: 'stock-5', productName: 'แกลบดิบแห้งเศษ (Rice Husk)', category: 'ผลพลอยได้', quantity: 950, weight: 23750, costPrice: 110, minThreshold: 100, lastUpdated: '18/06/2026' },
    { id: 'stock-6', productName: 'ปลายข้าวหอมมะลิ (Broken Rice)', category: 'ผลพลอยได้', quantity: 150, weight: 6750, costPrice: 620, minThreshold: 30, lastUpdated: '22/06/2026' }
  ];
}

// Generate beautiful, realistic ERP sales transaction data for Mekong Rice Mill
function getFallbackSalesData(): SalesRecord[] {
  const products = [
    { name: 'รำข้าวบดละเอียด (Bran)', price: 420, weightPerBag: 30 },
    { name: 'แกลบดิบแห้งเศษ (Rice Husk)', price: 180, weightPerBag: 25 },
    { name: 'ปลายข้าวหอมมะลิ (Broken Rice)', price: 850, weightPerBag: 45 },
    { name: 'แกลบเผากระสอบเหลือง', price: 120, weightPerBag: 15 },
    { name: 'ขี้เถ้าแกลบอบแห้ง', price: 90, weightPerBag: 15 },
    { name: 'ข้าวปลายเกรดซี (Feed Rice)', price: 650, weightPerBag: 40 }
  ];
  
  const customers = [
    'วิศวะ กุลนา', 'บจก. นครพนมค้าข้าว', 'ร้านสหกรณ์ชุมชนเรณูนคร', 'ทองใบ ใจดี', 'สมจิตร พูนผล',
    'สุรพล เกษตรมั่งคั่ง', 'นงนุช ข้าวยิ้ม', 'โรงสีข้าวเรณูพัฒนา', 'สนั่น ผาสุข', 'บจก. ลุ่มน้ำโขงค้าพืชผล'
  ];

  const sellers = ['สมเจตน์ มีโชค', 'ปิยะมาศ รักข้าว', 'ณรงค์ คุมเครื่อง', 'นภาพร ยอดบัญชี'];

  const rawData = [
    { date: '10/01/2026', q: 40 },
    { date: '15/01/2026', q: 15 },
    { date: '22/01/2026', q: 80 },
    { date: '04/02/2026', q: 120 },
    { date: '12/02/2026', q: 35 },
    { date: '28/02/2026', q: 50 },
    { date: '05/03/2026', q: 22 },
    { date: '15/03/2026', q: 90 },
    { date: '21/03/2026', q: 150 },
    { date: '01/04/2026', q: 65 },
    { date: '10/04/2026', q: 30 },
    { date: '18/04/2026', q: 20 },
    { date: '29/04/2026', q: 110 },
    { date: '06/05/2026', q: 85 },
    { date: '14/05/2026', q: 12 },
    { date: '20/05/2026', q: 200 },
    { date: '27/05/2026', q: 45 },
    { date: '04/06/2026', q: 95 },
    { date: '11/06/2026', q: 130 },
    { date: '18/06/2026', q: 75 },
    { date: '21/06/2026', q: 25 },
  ];

  return rawData.map((item, idx) => {
    // Deterministic randomize
    const pIdx = idx % products.length;
    const cIdx = (idx * 3) % customers.length;
    const sIdx = (idx + 2) % sellers.length;
    const p = products[pIdx];
    
    const qty = item.q;
    const weight = qty * p.weightPerBag;
    const totalAmount = qty * p.price;
    const paymentStatus: 'paid' | 'pending' = (idx % 7 === 0) ? 'pending' : 'paid';

    return {
      id: `sales-fallback-${idx}`,
      date: item.date,
      customerName: customers[cIdx],
      productName: p.name,
      quantity: qty,
      weight: weight,
      pricePerUnit: p.price,
      totalAmount: totalAmount,
      paymentStatus,
      salesperson: sellers[sIdx]
    };
  }).reverse(); // Latest transaction first
}

// ==========================================
// NEW MEKONG ERP & SHEETS CONTROL CENTER DATA
// ==========================================

// 1.1 Bran Stock Sheet Interface & Fetcher (gid=1629903525)
export interface BranStockItem {
  id: string;
  date: string;
  time: string;
  itemName: string;
  quantity: number;
  inspector: string;
  imageUrl: string;
}

export async function fetchBranStockSheetData(): Promise<BranStockItem[]> {
  const GID = '1629903525';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      return (parsed.data as any[]).map((row, idx) => {
        const keys = Object.keys(row);
        const dateKey = keys.find(k => k.includes('วันที่') || k.toLowerCase().includes('date')) || '';
        const timeKey = keys.find(k => k.includes('เวลา') || k.toLowerCase().includes('time')) || '';
        const itemKey = keys.find(k => k.includes('รายการ') || k.includes('ของ') || k.includes('สินค้า')) || '';
        const qtyKey = keys.find(k => k.includes('จำนวน') || k.toLowerCase().includes('qty')) || '';
        const inspectorKey = keys.find(k => k.includes('คนตรวจ') || k.includes('ผู้ตรวจ') || k.includes('พนักงาน')) || '';
        const imgKey = keys.find(k => k.includes('รูป') || k.includes('ภาพ') || k.includes('ลิงก์')) || '';

        const qty = parseFloat(row[qtyKey]?.toString().replace(/,/g, '')) || 0;
        const imgRaw = row[imgKey] || '';

        return {
          id: `bran-${idx}-${Date.now()}`,
          date: row[dateKey] || '',
          time: row[timeKey] || '',
          itemName: row[itemKey] || 'รำละเอียด',
          quantity: qty,
          inspector: row[inspectorKey] || 'เจ้าหน้าที่คลัง',
          imageUrl: formatGoogleDriveUrl(imgRaw)
        };
      });
    }
  } catch (err) {
    console.warn('Could not fetch Bran Stock sheet, using default fallback dataset:', err);
  }

  return getFallbackBranStockData();
}

function getFallbackBranStockData(): BranStockItem[] {
  return [
    { id: 'bran-1', date: '28/07/2026', time: '14:30', itemName: 'รำบดละเอียด เกรด A', quantity: 120, inspector: 'สมชาย คุ้มวงศ์', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60' },
    { id: 'bran-2', date: '28/07/2026', time: '10:15', itemName: 'รำผสมอาหารสัตว์', quantity: 85, inspector: 'ปิยะวรรณ ใจเย็น', imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=60' },
    { id: 'bran-3', date: '27/07/2026', time: '16:00', itemName: 'รำสกัดน้ำมัน (Defatted Bran)', quantity: 200, inspector: 'สมชาย คุ้มวงศ์', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60' },
    { id: 'bran-4', date: '26/07/2026', time: '11:45', itemName: 'รำบดละเอียด เกรด A', quantity: 150, inspector: 'วิศวะ กุลนา', imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=500&auto=format&fit=crop&q=60' },
    { id: 'bran-5', date: '25/07/2026', time: '09:20', itemName: 'รำหยาบ (แกลบปนรำ)', quantity: 310, inspector: 'ปิยะวรรณ ใจเย็น', imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=60' }
  ];
}

// 1.2 Sales & Services Sheet Interface & Fetcher (gid=1056042178)
export interface SaleServiceTransaction {
  id: string;
  date: string;
  customerName: string;
  itemOrService: string;
  sacks: number;
  pricePerUnit: number;
  otherFees: number;
  totalProductPrice: number;
  moneyReceived: number;
  change: number;
  paymentMethod: string; // 'เงินสด' | 'โอนเงิน'
  slipUrl: string;
  seller: string;
  deliveryLocation: string;
  pointsUsed: number;
  discountAmount: number;
  finalPriceToPay: number;
}

export async function fetchSalesAndServicesSheetData(): Promise<SaleServiceTransaction[]> {
  const GID = '1056042178';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      return (parsed.data as any[]).map((row, idx) => {
        const keys = Object.keys(row);
        const dateKey = keys.find(k => k.includes('วันที่')) || '';
        const customerKey = keys.find(k => k.includes('ลูกค้า')) || '';
        const itemKey = keys.find(k => k.includes('สินค้า') || k.includes('บริการ')) || '';
        const sacksKey = keys.find(k => k.includes('กระสอบ')) || '';
        const priceKey = keys.find(k => k.includes('ราคา/หน่วย')) || '';
        const otherFeeKey = keys.find(k => k.includes('ค่าอื่นๆ')) || '';
        const totalKey = keys.find(k => k.includes('ราคาสินค้ารวม')) || '';
        const recvKey = keys.find(k => k.includes('เงินที่รับ')) || '';
        const changeKey = keys.find(k => k.includes('เงินทอน')) || '';
        const payMethodKey = keys.find(k => k.includes('วิธีการจ่าย')) || '';
        const slipKey = keys.find(k => k.includes('สลิป')) || '';
        const sellerKey = keys.find(k => k.includes('คนขาย')) || '';
        const locationKey = keys.find(k => k.includes('สถานที่')) || '';
        const pointsKey = keys.find(k => k.includes('แต้มที่ใช้')) || '';
        const discKey = keys.find(k => k.includes('ส่วนลด')) || '';
        const finalKey = keys.find(k => k.includes('ราคาที่ต้องจ่าย')) || '';

        const sacks = parseFloat(row[sacksKey]?.toString().replace(/,/g, '')) || 0;
        const pricePerUnit = parseFloat(row[priceKey]?.toString().replace(/,/g, '')) || 0;
        const otherFees = parseFloat(row[otherFeeKey]?.toString().replace(/,/g, '')) || 0;
        const totalProductPrice = parseFloat(row[totalKey]?.toString().replace(/,/g, '')) || 0;
        const moneyReceived = parseFloat(row[recvKey]?.toString().replace(/,/g, '')) || 0;
        const change = parseFloat(row[changeKey]?.toString().replace(/,/g, '')) || 0;
        const pointsUsed = parseFloat(row[pointsKey]?.toString().replace(/,/g, '')) || 0;
        const discountAmount = parseFloat(row[discKey]?.toString().replace(/,/g, '')) || 0;
        const finalPriceToPay = parseFloat(row[finalKey]?.toString().replace(/,/g, '')) || totalProductPrice - discountAmount + otherFees;

        return {
          id: `sale-service-${idx}-${Date.now()}`,
          date: row[dateKey] || '',
          customerName: row[customerKey] || 'ไม่ระบุชื่อลูกค้า',
          itemOrService: row[itemKey] || 'ขายสินค้าโรงสี',
          sacks,
          pricePerUnit,
          otherFees,
          totalProductPrice: totalProductPrice || sacks * pricePerUnit,
          moneyReceived,
          change,
          paymentMethod: row[payMethodKey] || (row[slipKey] ? 'โอนเงิน' : 'เงินสด'),
          slipUrl: formatGoogleDriveUrl(row[slipKey] || ''),
          seller: row[sellerKey] || 'พนักงานหน้าร้าน',
          deliveryLocation: row[locationKey] || 'รับที่โรงสี',
          pointsUsed,
          discountAmount,
          finalPriceToPay
        };
      });
    }
  } catch (err) {
    console.warn('Could not fetch Sales & Services sheet, using fallback dataset:', err);
  }

  return getFallbackSalesAndServicesData();
}

function getFallbackSalesAndServicesData(): SaleServiceTransaction[] {
  return [
    { id: 'ss-1', date: '28/07/2026', customerName: 'วิศวะ กุลนา', itemOrService: 'รำข้าวบดละเอียด เกรด A', sacks: 20, pricePerUnit: 350, otherFees: 100, totalProductPrice: 7000, moneyReceived: 7100, change: 0, paymentMethod: 'โอนเงิน', slipUrl: '', seller: 'สมเจตน์ มีโชค', deliveryLocation: 'บ้านนาถ่อน อ.เรณูนคร', pointsUsed: 10, discountAmount: 50, finalPriceToPay: 7050 },
    { id: 'ss-2', date: '28/07/2026', customerName: 'บจก. นครพนมค้าข้าว', itemOrService: 'ค่าบริการสีข้าวเปลือกหอมมะลิ', sacks: 150, pricePerUnit: 25, otherFees: 0, totalProductPrice: 3750, moneyReceived: 3750, change: 0, paymentMethod: 'โอนเงิน', slipUrl: '', seller: 'ปิยะมาศ รักข้าว', deliveryLocation: 'จัดส่งโรงงาน นครพนม', pointsUsed: 0, discountAmount: 0, finalPriceToPay: 3750 },
    { id: 'ss-3', date: '27/07/2026', customerName: 'สนั่น ผาสุข', itemOrService: 'ปลายข้าวหอมมะลิ', sacks: 12, pricePerUnit: 680, otherFees: 50, totalProductPrice: 8160, moneyReceived: 8500, change: 290, paymentMethod: 'เงินสด', slipUrl: '', seller: 'สมเจตน์ มีโชค', deliveryLocation: 'รับหน้าร้านโรงสี', pointsUsed: 0, discountAmount: 0, finalPriceToPay: 8210 },
    { id: 'ss-4', date: '26/07/2026', customerName: 'ร้านสหกรณ์ชุมชนเรณูนคร', itemOrService: 'แกลบเผากระสอบเหลือง', sacks: 50, pricePerUnit: 90, otherFees: 200, totalProductPrice: 4500, moneyReceived: 4700, change: 0, paymentMethod: 'โอนเงิน', slipUrl: '', seller: 'ณรงค์ คุมเครื่อง', deliveryLocation: 'สหกรณ์เรณูนคร', pointsUsed: 20, discountAmount: 100, finalPriceToPay: 4600 }
  ];
}

// 1.3 Daily Cash Report Sheet Interface & Fetcher (gid=575421955)
export interface DailyCashReport {
  id: string;
  date: string;
  time: string;
  reporter: string;
  changeReceived: number;
  morningCash: number;
  eveningCash: number;
  appSalesTotal: number;
  expensesTotal: number;
  transferPayment: number;
  cashPayment: number;
  countedCash: number;
  discrepancy: number; // countedCash - (morningCash + cashPayment - expensesTotal)
}

export async function fetchDailyCashReportsSheetData(): Promise<DailyCashReport[]> {
  const GID = '575421955';
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      return (parsed.data as any[]).map((row, idx) => {
        const keys = Object.keys(row);
        const dateKey = keys.find(k => k.includes('วันที่')) || '';
        const timeKey = keys.find(k => k.includes('เวลา')) || '';
        const reporterKey = keys.find(k => k.includes('ผู้รายงาน')) || '';
        const changeKey = keys.find(k => k.includes('รับเงินทอน')) || '';
        const morningKey = keys.find(k => k.includes('เงินเช้า')) || '';
        const eveningKey = keys.find(k => k.includes('เงินเย็น')) || '';
        const appSalesKey = keys.find(k => k.includes('ขายของรวมในแอพ')) || '';
        const expKey = keys.find(k => k.includes('รายจ่าย')) || '';
        const transferKey = keys.find(k => k.includes('โอนจ่าย') || k.includes('โอน')) || '';
        const cashKey = keys.find(k => k === 'เงินสด' || k.includes('ยอดเงินสด')) || '';
        const countedKey = keys.find(k => k.includes('เงินสดที่นับได้')) || '';

        const changeReceived = parseFloat(row[changeKey]?.toString().replace(/,/g, '')) || 0;
        const morningCash = parseFloat(row[morningKey]?.toString().replace(/,/g, '')) || 0;
        const eveningCash = parseFloat(row[eveningKey]?.toString().replace(/,/g, '')) || 0;
        const appSalesTotal = parseFloat(row[appSalesKey]?.toString().replace(/,/g, '')) || 0;
        const expensesTotal = parseFloat(row[expKey]?.toString().replace(/,/g, '')) || 0;
        const transferPayment = parseFloat(row[transferKey]?.toString().replace(/,/g, '')) || 0;
        const cashPayment = parseFloat(row[cashKey]?.toString().replace(/,/g, '')) || 0;
        const countedCash = parseFloat(row[countedKey]?.toString().replace(/,/g, '')) || 0;

        const expectedCash = morningCash + cashPayment - expensesTotal;
        const discrepancy = countedCash > 0 ? countedCash - expectedCash : 0;

        return {
          id: `cash-report-${idx}-${Date.now()}`,
          date: row[dateKey] || '',
          time: row[timeKey] || '',
          reporter: row[reporterKey] || 'ผู้จัดการลิ้นชักเงินสด',
          changeReceived,
          morningCash,
          eveningCash,
          appSalesTotal,
          expensesTotal,
          transferPayment,
          cashPayment,
          countedCash,
          discrepancy
        };
      });
    }
  } catch (err) {
    console.warn('Could not fetch Daily Cash Reports sheet, using fallback dataset:', err);
  }

  return getFallbackDailyCashReportsData();
}

function getFallbackDailyCashReportsData(): DailyCashReport[] {
  return [
    { id: 'cr-1', date: '28/07/2026', time: '17:30', reporter: 'นภาพร ยอดบัญชี', changeReceived: 2000, morningCash: 5000, eveningCash: 18450, appSalesTotal: 25800, expensesTotal: 1350, transferPayment: 11000, cashPayment: 14800, countedCash: 18450, discrepancy: 0 },
    { id: 'cr-2', date: '27/07/2026', time: '17:30', reporter: 'นภาพร ยอดบัญชี', changeReceived: 2000, morningCash: 5000, eveningCash: 16200, appSalesTotal: 21400, expensesTotal: 800, transferPayment: 9400, cashPayment: 12000, countedCash: 16200, discrepancy: 0 },
    { id: 'cr-3', date: '26/07/2026', time: '17:30', reporter: 'สมเจตน์ มีโชค', changeReceived: 2000, morningCash: 5000, eveningCash: 14500, appSalesTotal: 19800, expensesTotal: 2100, transferPayment: 8200, cashPayment: 11600, countedCash: 14450, discrepancy: -50 }
  ];
}

export const EXPENSES_SPREADSHEET_ID = '1Xxr1Nz38gxRR-nQN9Zqq0zKSPb4gRkujTuKxHppVfS8';

// Local persistence helpers for deletion & custom edits
export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = val.toString().replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

export function normalizeBillingPeriod(raw: string): string {
  if (!raw) return '01/2569';
  const str = raw.trim();
  if (/^\d{1,2}\/\d{4}$/.test(str)) {
    const [m, y] = str.split('/');
    return `${m.padStart(2, '0')}/${y}`;
  }
  
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    'ม.ค.': '01', 'ก.พ.': '02', 'มี.ค.': '03', 'เม.ย.': '04', 'พ.ค.': '05', 'มิ.ย.': '06',
    'ก.ค.': '07', 'ส.ค.': '08', 'ก.ย.': '09', 'ต.ค.': '10', 'พ.ย.': '11', 'ธ.ค.': '12'
  };

  const lower = str.toLowerCase();
  for (const [key, num] of Object.entries(monthMap)) {
    if (lower.includes(key)) {
      const yearMatch = str.match(/\d{4}/);
      const year = yearMatch ? yearMatch[0] : '2569';
      return `${num}/${year}`;
    }
  }

  const parts = str.split(/[/.-]/);
  if (parts.length >= 2) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parts[2] ? parseInt(parts[2], 10) : NaN;

    if (!isNaN(p1) && !isNaN(p2)) {
      if (p1 > 31) {
        return `${String(p2).padStart(2, '0')}/${p1}`;
      }
      if (!isNaN(p3)) {
        return `${String(p2).padStart(2, '0')}/${p3}`;
      }
      return `${String(p1).padStart(2, '0')}/${p2}`;
    }
  }

  return str;
}

export function cleanRowKeys(row: Record<string, any>): Record<string, any> {
  const cleanObj: Record<string, any> = {};
  if (!row) return cleanObj;
  for (const rawKey of Object.keys(row)) {
    const key = rawKey.replace(/[\r\n"']/g, '').trim();
    cleanObj[key] = row[rawKey];
  }
  return cleanObj;
}

export function getDeletedRecordIds(category: string): Set<string> {
  try {
    const raw = localStorage.getItem(`mekong_deleted_ids_${category}`);
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch (err) {
    console.warn(`Error reading deleted ids for ${category}:`, err);
  }
  return new Set();
}

export function markRecordDeleted(category: string, id: string): void {
  try {
    const set = getDeletedRecordIds(category);
    set.add(id);
    localStorage.setItem(`mekong_deleted_ids_${category}`, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn(`Error marking record deleted for ${category}:`, err);
  }
}

export function getSavedCategoryRecords<T>(category: string): T[] | null {
  try {
    const raw = localStorage.getItem(`mekong_records_${category}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Error reading saved records for ${category}:`, err);
  }
  return null;
}

export function saveCategoryRecords<T>(category: string, records: T[]): void {
  try {
    localStorage.setItem(`mekong_records_${category}`, JSON.stringify(records));
  } catch (err) {
    console.warn(`Error saving records for ${category}:`, err);
  }
}

// 2.1 Worker Labor Sheet Interface & Fetcher (Tab "ค่าแรงงานคนงาน")
export interface WorkerLaborRecord {
  id: string;
  date: string;
  employeeName: string;
  checkInTime: string;
  checkOutTime: string;
  breakHours: number;
  workHours: number;
  otHours: number;
  baseWage: number;
  otWage: number;
  bonus?: number;
  loanDeduction?: number;
  totalWage: number;
  status: string;
  wageDayCalc?: string;
  otHoursCalc?: string;
  notes: string;
  payCyclePeriod: '1st-15th' | '16th-End';
}

export const THAI_MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTH_SHORTS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const ENG_MONTH_SHORTS = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

export const ENG_MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

export interface ParsedLaborDate {
  raw: string;
  year: number; // e.g. 2026
  thaiYear: number; // e.g. 2569
  month: number; // 1-12
  day: number; // 1-31
  isoMonth: string; // "2026-07"
  isoDate: string; // "2026-07-28"
  thaiMonthName: string; // "กรกฎาคม"
  thaiMonthShort: string; // "ก.ค."
  thaiFullDate: string; // "28 กรกฎาคม 2569"
  thaiMonthYear: string; // "กรกฎาคม 2569"
  payCyclePeriod: '1st-15th' | '16th-End';
  periodLabel: string; // e.g. "16 - 31 กรกฎาคม 2569"
  payDate: string; // e.g. "01 สิงหาคม 2569"
}

export function parseLaborDateInfo(rawDateStr: string): ParsedLaborDate {
  const defaultDate = new Date();
  let year = defaultDate.getFullYear();
  let month = defaultDate.getMonth() + 1;
  let day = defaultDate.getDate();

  if (rawDateStr && typeof rawDateStr === 'string') {
    const rawLower = rawDateStr.toLowerCase().trim();
    const cleanStr = rawLower.split(/[ T]/)[0]; // Remove timestamp if any

    // 1. Check for Thai month names in the string
    let foundMonthIdx = -1;
    for (let i = 0; i < 12; i++) {
      if (rawDateStr.includes(THAI_MONTH_NAMES[i]) || rawDateStr.includes(THAI_MONTH_SHORTS[i])) {
        foundMonthIdx = i + 1;
        break;
      }
    }

    // 2. Check for English month names (e.g. 16-Jul-2026, July 2026)
    if (foundMonthIdx === -1) {
      for (let i = 0; i < 12; i++) {
        const shortM = ENG_MONTH_SHORTS[i];
        const fullM = ENG_MONTH_NAMES[i];
        // Match word boundary or separated by - / . space
        const regex = new RegExp(`(^|[-/._\\s])${shortM}([-/._\\s]|$)|${fullM}`, 'i');
        if (regex.test(rawLower)) {
          foundMonthIdx = i + 1;
          break;
        }
      }
    }

    if (foundMonthIdx > 0) {
      month = foundMonthIdx;
      // Extract numbers for day and year
      const numbers = rawDateStr.match(/\d+/g);
      if (numbers && numbers.length >= 2) {
        day = parseInt(numbers[0]) || 1;
        let y = parseInt(numbers[1]);
        if (y < 100) y += 2000;
        if (y > 2400) y -= 543;
        if (y > 1900 && y < 2200) year = y;
      } else if (numbers && numbers.length === 1) {
        day = parseInt(numbers[0]) || 1;
      }
    } else {
      const parts = cleanStr.split(/[/.-]/);
      if (parts.length >= 3) {
        const p0 = parseInt(parts[0]);
        const p1 = parseInt(parts[1]);
        const p2 = parseInt(parts[2]);

        if (p0 > 1000) {
          // YYYY-MM-DD
          year = p0 > 2400 ? p0 - 543 : p0;
          month = !isNaN(p1) && p1 >= 1 && p1 <= 12 ? p1 : month;
          day = !isNaN(p2) && p2 >= 1 && p2 <= 31 ? p2 : day;
        } else if (p2 > 1000) {
          // DD/MM/YYYY
          year = p2 > 2400 ? p2 - 543 : p2;
          month = !isNaN(p1) && p1 >= 1 && p1 <= 12 ? p1 : month;
          day = !isNaN(p0) && p0 >= 1 && p0 <= 31 ? p0 : day;
        } else {
          // Fallback D/M/YY
          if (p0 >= 1 && p0 <= 31) day = p0;
          if (p1 >= 1 && p1 <= 12) month = p1;
          if (p2 > 0) year = p2 < 100 ? 2000 + p2 : (p2 > 2400 ? p2 - 543 : p2);
        }
      }
    }
  }

  const thaiYear = year + 543;
  const isoMonth = `${year}-${String(month).padStart(2, '0')}`;
  const isoDate = `${isoMonth}-${String(day).padStart(2, '0')}`;
  const thaiMonthName = THAI_MONTH_NAMES[month - 1] || '';
  const thaiMonthShort = THAI_MONTH_SHORTS[month - 1] || '';
  const thaiFullDate = `${day} ${thaiMonthName} ${thaiYear}`;
  const thaiMonthYear = `${thaiMonthName} ${thaiYear}`;

  const payCyclePeriod: '1st-15th' | '16th-End' = day <= 15 ? '1st-15th' : '16th-End';

  // Last day of this month
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  // Next month calculation
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const nextThaiYear = nextYear + 543;
  const nextThaiMonthName = THAI_MONTH_NAMES[nextMonth - 1];

  let periodLabel = '';
  let payDate = '';

  if (payCyclePeriod === '1st-15th') {
    periodLabel = `1 - 15 ${thaiMonthName} ${thaiYear}`;
    payDate = `16 ${thaiMonthName} ${thaiYear}`;
  } else {
    periodLabel = `16 - ${lastDayOfMonth} ${thaiMonthName} ${thaiYear}`;
    payDate = `01 ${nextThaiMonthName} ${nextThaiYear}`;
  }

  return {
    raw: rawDateStr,
    year,
    thaiYear,
    month,
    day,
    isoMonth,
    isoDate,
    thaiMonthName,
    thaiMonthShort,
    thaiFullDate,
    thaiMonthYear,
    payCyclePeriod,
    periodLabel,
    payDate
  };
}

export function getCycleInfoForMonth(isoMonth: string, cycle: '1st-15th' | '16th-End' | 'all') {
  if (!isoMonth || isoMonth === 'all') {
    return {
      periodLabel: cycle === '1st-15th' ? 'รอบ 1 - 15 (จ่ายวันที่ 16)' : (cycle === '16th-End' ? 'รอบ 16 - สิ้นเดือน (จ่ายวันที่ 1)' : 'รวมทุกรอบ (ประจำเดือน)'),
      shortLabel: cycle === '1st-15th' ? 'รอบ 1-15' : (cycle === '16th-End' ? 'รอบ 16-สิ้นเดือน' : 'รวมทุกรอบ'),
      payDate: cycle === '1st-15th' ? '16 ของเดือน' : (cycle === '16th-End' ? '1 ของเดือนถัดไป' : 'ตามรอบการทำงาน'),
      monthName: 'ทุกเดือน',
      thaiYear: ''
    };
  }

  const [yStr, mStr] = isoMonth.split('-');
  const year = parseInt(yStr) || new Date().getFullYear();
  const month = parseInt(mStr) || (new Date().getMonth() + 1);
  const thaiYear = year + 543;
  const thaiMonthName = THAI_MONTH_NAMES[month - 1] || '';
  const thaiMonthShort = THAI_MONTH_SHORTS[month - 1] || '';
  const lastDay = new Date(year, month, 0).getDate();

  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear++;
  }
  const nextThaiYear = nextYear + 543;
  const nextThaiMonthName = THAI_MONTH_NAMES[nextMonth - 1];
  const nextThaiMonthShort = THAI_MONTH_SHORTS[nextMonth - 1];

  if (cycle === '1st-15th') {
    return {
      periodLabel: `1 - 15 ${thaiMonthName} ${thaiYear}`,
      shortLabel: `รอบ 1-15 ${thaiMonthShort} (จ่าย 16 ${thaiMonthShort})`,
      payDate: `16 ${thaiMonthName} ${thaiYear}`,
      monthName: thaiMonthName,
      thaiYear: String(thaiYear)
    };
  } else if (cycle === '16th-End') {
    return {
      periodLabel: `16 - ${lastDay} ${thaiMonthName} ${thaiYear}`,
      shortLabel: `รอบ 16-${lastDay} ${thaiMonthShort} (จ่าย 1 ${nextThaiMonthShort})`,
      payDate: `01 ${nextThaiMonthName} ${nextThaiYear}`,
      monthName: thaiMonthName,
      thaiYear: String(thaiYear)
    };
  } else {
    return {
      periodLabel: `ประจำเดือน ${thaiMonthName} ${thaiYear} (รวม 2 รอบ)`,
      shortLabel: `รวม 2 รอบ (${thaiMonthShort} ${thaiYear})`,
      payDate: `ตามรอบตัดจ่าย (16 ${thaiMonthShort} & 1 ${nextThaiMonthShort})`,
      monthName: thaiMonthName,
      thaiYear: String(thaiYear)
    };
  }
}

function parseWorkerLaborCsvData(csvData: string, deletedIds: Set<string>): WorkerLaborRecord[] {
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  if (!parsed.data || parsed.data.length === 0) return [];

  return (parsed.data as any[])
    .map((rawRow, idx) => {
      const row = cleanRowKeys(rawRow);
      const keys = Object.keys(row);
      const idKey = keys.find(k => k === 'ID' || k.toLowerCase().includes('id')) || '';
      const dateKey = keys.find(k => k.includes('วันที่')) || '';
      const nameKey = keys.find(k => k.includes('ชื่อพนักงาน') || k.includes('ชื่อ-นามสกุล') || k.includes('ชื่อ') || k.includes('พนักงาน')) || keys.find(k => k.includes('รายการ') || k.includes('รายละเอียด') || k.includes('หมวดหมู่')) || '';
      const inKey = keys.find(k => k.includes('เวลามา') || k.includes('เวลาเข้า')) || '';
      const outKey = keys.find(k => k.includes('เวลากลับ') || k.includes('เวลาออก')) || '';
      const breakKey = keys.find(k => k.includes('พัก')) || '';
      const workHoursKey = keys.find(k => k === 'ชั่วโมงทำงาน' || (k.includes('ชั่วโมง') && !k.includes('OT'))) || '';
      const otHoursKey = keys.find(k => k.includes('ชั่วโมง OT') || k.includes('สำหรับคิดค่าแรง') || k.includes('OT')) || '';
      const baseWageKey = keys.find(k => k.includes('ค่าแรงปกติ') || k.includes('ค่าแรง') || k.includes('จำนวนเงิน') || k.includes('ค่าจ้าง')) || '';
      const otWageKey = keys.find(k => k.includes('ค่า OT') || k.includes('ค่าOT')) || '';
      const bonusKey = keys.find(k => k.includes('โบนัส') || k.includes('เงินพิเศษ') || k.toLowerCase().includes('bonus')) || '';
      const loanDeductionKey = keys.find(k => k.includes('หักเงินยืม') || k.includes('เงินยืม') || k.includes('ยืม')) || '';
      const totalWageKey = keys.find(k => k.includes('รวมค่าจ้าง') || k.includes('ยอดจ่าย') || k.includes('รวม') || k.includes('จำนวนเงิน')) || '';
      const statusKey = keys.find(k => k.includes('สถานะ')) || '';
      const notesKey = keys.find(k => k.includes('หมายเหตุ')) || '';

      const recordId = row[idKey] || `labor-${idx + 1}`;
      const dateStr = row[dateKey] || '';
      const dateInfo = parseLaborDateInfo(dateStr);
      const payCyclePeriod: '1st-15th' | '16th-End' = dateInfo.payCyclePeriod;

      const breakHours = parseFloat(row[breakKey]?.toString().replace(/,/g, '')) || 1;
      const workHours = parseFloat(row[workHoursKey]?.toString().replace(/,/g, '')) || 8;
      const otHours = parseFloat(row[otHoursKey]?.toString().replace(/,/g, '')) || 0;
      const baseWage = parseFloat(row[baseWageKey]?.toString().replace(/,/g, '')) || 400;
      const otWage = parseFloat(row[otWageKey]?.toString().replace(/,/g, '')) || 0;
      const bonus = parseFloat(row[bonusKey]?.toString().replace(/,/g, '')) || 0;
      const loanDeduction = parseFloat(row[loanDeductionKey]?.toString().replace(/,/g, '')) || 0;
      const totalWageParsed = parseFloat(row[totalWageKey]?.toString().replace(/,/g, ''));
      const totalWage = !isNaN(totalWageParsed) && totalWageParsed !== 0 ? totalWageParsed : (baseWage + otWage + bonus - loanDeduction);

      const empName = row[nameKey] ? String(row[nameKey]).trim() : 'คนงานโรงสี';

      return {
        id: String(recordId),
        date: dateStr || new Date().toISOString().split('T')[0],
        employeeName: empName,
        checkInTime: row[inKey] || '08:00',
        checkOutTime: row[outKey] || '17:00',
        breakHours,
        workHours,
        otHours,
        baseWage,
        otWage,
        bonus,
        loanDeduction,
        totalWage,
        status: row[statusKey] || 'ทำงานปกติ',
        notes: row[notesKey] || '',
        payCyclePeriod
      };
    })
    .filter(r => !deletedIds.has(r.id) && r.employeeName !== 'หมวดหมู่' && r.employeeName !== 'ชื่อพนักงาน');
}

export async function fetchWorkerLaborSheetData(): Promise<WorkerLaborRecord[]> {
  const category = 'worker_labor';
  const deletedIds = getDeletedRecordIds(category);

  const tabName = 'ค่าแรงงานคนงาน';
  // Try sources in order: 1) SHEET_ID with gid=264764262 2) SHEET_ID with sheet name 3) EXPENSES_SPREADSHEET_ID
  const urls = [
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=264764262`,
    `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`,
    `https://docs.google.com/spreadsheets/d/${EXPENSES_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`
  ];

  for (const url of urls) {
    try {
      const response = await axios.get(url);
      const records = parseWorkerLaborCsvData(response.data, deletedIds);

      if (records.length > 0) {
        saveCategoryRecords(category, records);
        return records;
      }
    } catch (err) {
      // Continue to next URL fallback
    }
  }

  const saved = getSavedCategoryRecords<WorkerLaborRecord>(category);
  if (saved && saved.length > 0) {
    return saved.filter(r => !deletedIds.has(r.id));
  }

  return getFallbackWorkerLaborData().filter(r => !deletedIds.has(r.id));
}

function getFallbackWorkerLaborData(): WorkerLaborRecord[] {
  return [
    { id: 'L-001', date: '28/07/2026', employeeName: 'สมศักดิ์ คุมตู้อัด', checkInTime: '08:00', checkOutTime: '19:00', breakHours: 1, workHours: 8, otHours: 2, baseWage: 450, otWage: 150, bonus: 100, loanDeduction: 50, totalWage: 650, status: 'ทำงานปกติ + OT', notes: 'คุมเครื่องขัดสีข้าวช่วงเย็น', payCyclePeriod: '16th-End' },
    { id: 'L-002', date: '28/07/2026', employeeName: 'บุญมี ยกกระสอบ', checkInTime: '08:00', checkOutTime: '17:00', breakHours: 1, workHours: 8, otHours: 0, baseWage: 400, otWage: 0, bonus: 0, loanDeduction: 100, totalWage: 300, status: 'ทำงานปกติ', notes: 'เรียงกระสอบรำและแกลบ', payCyclePeriod: '16th-End' },
    { id: 'L-003', date: '28/07/2026', employeeName: 'อำนาจ ช่างเครื่อง', checkInTime: '08:00', checkOutTime: '20:00', breakHours: 1, workHours: 8, otHours: 3, baseWage: 500, otWage: 250, bonus: 200, loanDeduction: 0, totalWage: 950, status: 'ทำงานปกติ + OT', notes: 'ซ่อมบำรุงตะแกรงคัดแยก', payCyclePeriod: '16th-End' },
    { id: 'L-004', date: '12/07/2026', employeeName: 'สมศักดิ์ คุมตู้อัด', checkInTime: '08:00', checkOutTime: '17:00', breakHours: 1, workHours: 8, otHours: 0, baseWage: 450, otWage: 0, bonus: 0, loanDeduction: 0, totalWage: 450, status: 'ทำงานปกติ', notes: 'รอบจ่ายครึ่งแรกของเดือน', payCyclePeriod: '1st-15th' },
    { id: 'L-005', date: '10/07/2026', employeeName: 'บุญมี ยกกระสอบ', checkInTime: '08:00', checkOutTime: '19:00', breakHours: 1, workHours: 8, otHours: 2, baseWage: 400, otWage: 130, bonus: 50, loanDeduction: 0, totalWage: 580, status: 'ทำงานปกติ + OT', notes: 'ขนส่งรำขึ้นรถบรรทุก', payCyclePeriod: '1st-15th' }
  ];
}

// 2.2 Fuel & Transport Expenses
export interface FuelExpenseRecord {
  id: string;
  date: string;
  vehiclePlate: string;
  stationName: string;
  fuelType: string;
  liters: number;
  pricePerLiter: number;
  totalCostBaht: number;
  previousOdometerKm: number;
  currentOdometerKm: number;
  distanceDrivenKm: number;
  kmPerLiter: number;
  costPerKm: number;
  receiptUrl?: string;
  odometerPhotoUrl?: string;
  notes?: string;
}

export function formatThaiFuelDate(rawDateStr: string): string {
  if (!rawDateStr) return '-';
  const str = String(rawDateStr).trim();

  const THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const monthMap: Record<string, number> = {
    'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4, 'พ.ค.': 5, 'มิ.ย.': 6,
    'ก.ค.': 7, 'ส.ค.': 8, 'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
    'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4, 'พฤษภาคม': 5, 'มิถุนายน': 6,
    'กรกฎาคม': 7, 'สิงหาคม': 8, 'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12,
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
  };

  const lower = str.toLowerCase();
  for (const [key, mIndex] of Object.entries(monthMap)) {
    if (lower.includes(key)) {
      const numbers = str.match(/\d+/g);
      let day = 1;
      let yearBE = 2569;
      if (numbers && numbers.length >= 1) {
        day = parseInt(numbers[0], 10);
        if (numbers.length >= 2) {
          let yr = parseInt(numbers[numbers.length - 1], 10);
          if (yr < 2400) yr += 543;
          yearBE = yr;
        }
      }
      return `${String(day).padStart(2, '0')}/${THAI_MONTHS_FULL[mIndex - 1]}/${yearBE}`;
    }
  }

  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(str)) {
    const parts = str.split(/[-/T ]/);
    let yr = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const d = parseInt(parts[2], 10);
    if (yr < 2400) yr += 543;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(d).padStart(2, '0')}/${THAI_MONTHS_FULL[m - 1]}/${yr}`;
    }
  }

  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(str)) {
    const parts = str.split(/[-/]/);
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    let yr = parseInt(parts[2], 10);
    if (yr < 2400) yr += 543;
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${String(d).padStart(2, '0')}/${THAI_MONTHS_FULL[m - 1]}/${yr}`;
    }
  }

  const dObj = new Date(str);
  if (!isNaN(dObj.getTime())) {
    const d = dObj.getDate();
    const m = dObj.getMonth() + 1;
    let yr = dObj.getFullYear();
    if (yr < 2400) yr += 543;
    return `${String(d).padStart(2, '0')}/${THAI_MONTHS_FULL[m - 1]}/${yr}`;
  }

  return str;
}

export function deduplicateFuelRecords(records: FuelExpenseRecord[]): FuelExpenseRecord[] {
  if (!records || !Array.isArray(records)) return [];

  const seenIds = new Set<string>();
  const seenSignatures = new Set<string>();
  const uniqueRecords: FuelExpenseRecord[] = [];

  for (const item of records) {
    if (!item) continue;

    const normId = String(item.id || '').trim();
    const normDate = String(item.date || '').trim();
    const normPlate = String(item.vehiclePlate || '').trim().replace(/\s+/g, '');
    const normStation = String(item.stationName || '').trim().replace(/\s+/g, '');
    const cost = Math.round((Number(item.totalCostBaht) || 0) * 100) / 100;
    const liters = Math.round((Number(item.liters) || 0) * 100) / 100;

    if (normId && seenIds.has(normId)) {
      continue;
    }

    const signature = `${normDate}_${normPlate}_${cost}_${liters}_${normStation}`;
    if (seenSignatures.has(signature)) {
      continue;
    }

    if (normId) seenIds.add(normId);
    seenSignatures.add(signature);
    uniqueRecords.push(item);
  }

  return uniqueRecords;
}

export async function fetchFuelExpensesSheetData(): Promise<FuelExpenseRecord[]> {
  const category = 'fuel';
  const deletedIds = getDeletedRecordIds(category);

  const tabName = 'ค่าน้ำมันเชื้อเพลิง';
  const url = `https://docs.google.com/spreadsheets/d/${EXPENSES_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      const records: FuelExpenseRecord[] = (parsed.data as any[])
        .map((rawRow, idx) => {
          const row = cleanRowKeys(rawRow);
          const keys = Object.keys(row);
          const idKey = keys.find(k => k === 'ID' || k.toLowerCase().includes('id')) || '';
          const dateKey = keys.find(k => k.includes('วันที่')) || '';
          const stationKey = keys.find(k => k.includes('สถานี') || k.includes('ผู้ขาย') || k.includes('ปั๊ม')) || '';
          const typeKey = keys.find(k => k.includes('ประเภท')) || '';
          const litersKey = keys.find(k => k.includes('ลิตร') || k.includes('ปริมาณ')) || '';
          const plateKey = keys.find(k => k.includes('ทะเบียน')) || '';
          const costKey = keys.find(k => k.includes('จำนวนเงิน') || k.includes('บาท') || k.includes('ยอด')) || '';
          const notesKey = keys.find(k => k.includes('หมายเหตุ') || k.includes('อ้างอิง')) || '';

          const recordId = row[idKey] || `fuel-${idx + 1}`;
          const totalCostBaht = parseFloat(row[costKey]?.toString().replace(/,/g, '')) || 0;
          const liters = parseFloat(row[litersKey]?.toString().replace(/,/g, '')) || 0;
          const pricePerLiter = liters > 0 ? parseFloat((totalCostBaht / liters).toFixed(2)) : 32.80;

          return {
            id: String(recordId),
            date: row[dateKey] || new Date().toISOString().split('T')[0],
            stationName: row[stationKey] || 'ปั๊มน้ำมัน',
            fuelType: row[typeKey] || 'ดีเซล B7',
            liters,
            vehiclePlate: row[plateKey] || 'ผก 8812 นครพนม',
            pricePerLiter,
            totalCostBaht,
            previousOdometerKm: 142100 + (idx * 300),
            currentOdometerKm: 142450 + (idx * 300),
            distanceDrivenKm: 350,
            kmPerLiter: liters > 0 ? parseFloat((350 / liters).toFixed(2)) : 10,
            costPerKm: parseFloat((totalCostBaht / 350).toFixed(2)),
            notes: row[notesKey] || ''
          };
        })
        .filter(r => !deletedIds.has(r.id) && r.stationName !== 'สถานีน้ำมัน / ผู้ขาย');

      const uniqueRecords = deduplicateFuelRecords(records);
      if (uniqueRecords.length > 0) {
        saveCategoryRecords(category, uniqueRecords);
        return uniqueRecords;
      }
    }
  } catch (err) {
    console.warn('Could not fetch Fuel Expenses sheet, checking local storage/fallback:', err);
  }

  const saved = getSavedCategoryRecords<FuelExpenseRecord>(category);
  if (saved && saved.length > 0) {
    return deduplicateFuelRecords(saved.filter(r => !deletedIds.has(r.id)));
  }

  return deduplicateFuelRecords(getFallbackFuelExpensesData().filter(r => !deletedIds.has(r.id)));
}

export function getFallbackFuelExpensesData(): FuelExpenseRecord[] {
  return [
    { id: 'fuel-1', date: '27/07/2026', vehiclePlate: 'ผก 8812 นครพนม', stationName: 'ปตท. นครพนม (มิตรภาพ)', fuelType: 'ดีเซล B7', liters: 52.4, pricePerLiter: 32.80, totalCostBaht: 1718.72, previousOdometerKm: 142100, currentOdometerKm: 142680, distanceDrivenKm: 580, kmPerLiter: 11.07, costPerKm: 2.96, notes: 'ขนส่งข้าวสารขาวให้ลูกค้า อ.เมืองนครพนม' },
    { id: 'fuel-2', date: '21/07/2026', vehiclePlate: '83-4912 นครพนม', stationName: 'เชลล์ สาขาเรณูนคร', fuelType: 'ดีเซลหมุนเร็ว B7', liters: 85.0, pricePerLiter: 32.80, totalCostBaht: 2788.00, previousOdometerKm: 185200, currentOdometerKm: 186150, distanceDrivenKm: 950, kmPerLiter: 11.18, costPerKm: 2.93, notes: 'ส่งรำบดละเอียดให้ฟาร์มหมู อ.ธาตุพนม' }
  ];
}

// 2.3 Electricity Expenses - Detailed Structures from PEA Smart Invoice PDF
export interface MeterReadingUsage {
  typeLabel: string; // e.g. "พลังไฟฟ้าสูงสุด P", "พลังงานไฟฟ้า P", "กิโลวาร์"
  code: string; // "P" | "OP" | "H" | "รวม" | "kVAR"
  recentReading: number; // เลขอ่านครั้งหลัง
  previousReading: number; // เลขอ่านครั้งก่อน
  multiplierNote?: string; // "+2%"
  consumptionUnit: number; // จำนวนที่ใช้
}

export interface TariffBreakdownItem {
  itemLabel: string; // e.g. "Peak 47.67 กว."
  quantity: number;
  unitLabel: string; // "กว." | "หน่วย"
  ratePerUnit: number; // ราคา/หน่วย (บาท)
  amountBaht: number; // จำนวนเงิน (บาท)
}

export interface FullPeaBillDetails {
  documentTitle?: string; // "ใบแจ้งค่าไฟฟ้า Smart Invoice (ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษี)"
  peaOfficeName?: string; // "การไฟฟ้าส่วนภูมิภาคจังหวัดนครพนม"
  peaOfficePhone?: string; // "0-4251-3091"
  customerName?: string; // "นายวิศวะ กุลนะ"
  address?: string; // "149 บ.หนองยาว ม.11 ต.คำเตย..."
  caNumber?: string; // "020029119125"
  invoiceNo?: string; // "000012533268"
  totalAmountDue?: number; // 13919.32
  dueDate?: string; // "23 กุมภาพันธ์ 2569"
  documentDate?: string; // "03/02/2569"
  printedDate?: string; // "31-07-2569 14:11:55"
  
  // Technical Metadata
  peaCode?: string; // "D06101"
  mru?: string; // "DNPN9021"
  peaNo?: string; // "6300584313"
  rateType?: string; // "3224"
  meterReadingDate?: string; // "29/01/2569"
  billPeriod?: string; // "01/2569"
  voltageLevel?: string; // "22-33 KV"
  multiplier?: number; // 30

  // Meter Readings & Consumption Usage
  usageReadings?: MeterReadingUsage[];

  // Tariff Calculation Breakdown
  tariffBreakdown?: TariffBreakdownItem[];
  serviceCharge?: number; // 312.24
  totalBasedAmount?: number; // 12807.79
  installationDateNote?: string; // "ติดตั้งใหม่ 15/12/2568"

  // Financial & Tax Summary
  basedAmount?: number; // 12807.79
  ftFormulaNote?: string; // "ม.ค.69-เม.ย.69=0.0972 บาท/หน่วย"
  ftRatePerUnit?: number; // 0.0972
  ftTotalAmount?: number; // 200.92
  discountAmount?: number; // 0.00
  subTotalAmount?: number; // 13008.71
  vatRatePercent?: number; // 7.00
  vatAmount?: number; // 910.61
  currentMonthTotal?: number; // 13919.32
  grandTotal?: number; // 13919.32

  // Additional Information
  barcodeNumber?: string; // "|099400016550100 020029119125..."
  announcementMsg?: string;
}

export interface ElectricityExpenseRecord {
  id: string;
  billingPeriod: string;
  caNumber: string;
  meterNumber: string;
  totalAmountBaht: number;
  totalUnitsKwh: number;
  peakUnitsKwh: number;
  offPeakUnitsKwh: number;
  peakAmountBaht: number;
  offPeakAmountBaht: number;
  ftRatePerUnit: number;
  ftTotalBaht: number;
  vatAmountBaht: number;
  peakDemandKw: number;
  powerFactorPenaltyBaht: number;
  receiptUrl?: string;
  efficiencyAnalysis?: string;
  energySavingTips?: string[];
  customerName?: string;
  invoiceNo?: string;
  dueDate?: string;
  fullBillDetails?: FullPeaBillDetails;
}

export function getFallbackElectricityExpensesData(): ElectricityExpenseRecord[] {
  return [
    {
      id: 'elec-pdf-012569',
      billingPeriod: '01/2569',
      caNumber: '020029119125',
      meterNumber: '6300584313',
      customerName: 'นายวิศวะ กุลนะ',
      invoiceNo: '000012533268',
      dueDate: '23 กุมภาพันธ์ 2569',
      totalAmountBaht: 13919.32,
      totalUnitsKwh: 2067.03,
      peakUnitsKwh: 1268.06,
      offPeakUnitsKwh: 798.97,
      peakAmountBaht: 5305.44,
      offPeakAmountBaht: 2080.28,
      ftRatePerUnit: 0.0972,
      ftTotalBaht: 200.92,
      vatAmountBaht: 910.61,
      peakDemandKw: 47.67,
      powerFactorPenaltyBaht: 0,
      efficiencyAnalysis: 'บิลค่าไฟฟ้าฉบับเต็มจากการสแกน Smart Invoice ประจำเดือน 01/2569 ผู้ใช้ไฟฟ้า นายวิศวะ กุลนะ ยอดรวมชำระ 13,919.32 บาท',
      fullBillDetails: {
        documentTitle: 'ใบแจ้งค่าไฟฟ้า Smart Invoice (ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษี)',
        peaOfficeName: 'การไฟฟ้าส่วนภูมิภาคจังหวัดนครพนม',
        peaOfficePhone: '0-4251-3091',
        customerName: 'นายวิศวะ กุลนะ',
        address: '149 บ.หนองยาว ม.11 ต.คำเตย อ.เมืองนครพนม จ.นครพนม 48000',
        caNumber: '020029119125',
        invoiceNo: '000012533268',
        totalAmountDue: 13919.32,
        dueDate: '23 กุมภาพันธ์ 2569',
        documentDate: '03/02/2569',
        printedDate: '31-07-2569 14:11:55',
        peaCode: 'D06101',
        mru: 'DNPN9021',
        peaNo: '6300584313',
        rateType: '3224',
        meterReadingDate: '29/01/2569',
        billPeriod: '01/2569',
        voltageLevel: '22-33 KV',
        multiplier: 30,
        usageReadings: [
          { typeLabel: 'พลังไฟฟ้าสูงสุด P (กิโลวัตต์)', code: 'P', recentReading: 20.618, previousReading: 19.060, multiplierNote: '+2%', consumptionUnit: 47.67 },
          { typeLabel: 'พลังไฟฟ้าสูงสุด OP (กิโลวัตต์)', code: 'OP', recentReading: 18.609, previousReading: 18.432, multiplierNote: '+2%', consumptionUnit: 5.42 },
          { typeLabel: 'พลังไฟฟ้าสูงสุด H (กิโลวัตต์)', code: 'H', recentReading: 22.629, previousReading: 21.439, multiplierNote: '+2%', consumptionUnit: 36.41 },
          { typeLabel: 'พลังงานไฟฟ้า P (หน่วย)', code: 'P', recentReading: 1959.350, previousReading: 1917.910, multiplierNote: '+2%', consumptionUnit: 1268.06 },
          { typeLabel: 'พลังงานไฟฟ้า OP (หน่วย)', code: 'OP', recentReading: 1355.100, previousReading: 1348.000, multiplierNote: '+2%', consumptionUnit: 217.26 },
          { typeLabel: 'พลังงานไฟฟ้า H (หน่วย)', code: 'H', recentReading: 1741.520, previousReading: 1722.510, multiplierNote: '+2%', consumptionUnit: 581.71 },
          { typeLabel: 'กิโลวาร์ (kVAR)', code: 'kVAR', recentReading: 10.788, previousReading: 9.279, multiplierNote: '+2%', consumptionUnit: 45.27 }
        ],
        tariffBreakdown: [
          { itemLabel: 'Peak 47.67 กว.', quantity: 47.67, unitLabel: 'กว.', ratePerUnit: 132.9300, amountBaht: 5109.83 },
          { itemLabel: 'Off Peak 36.41 กว.', quantity: 36.41, unitLabel: 'กว.', ratePerUnit: 0.0000, amountBaht: 0.00 },
          { itemLabel: 'Peak 1268.06 หน่วย', quantity: 1268.06, unitLabel: 'หน่วย', ratePerUnit: 4.1839, amountBaht: 5305.44 },
          { itemLabel: 'Off Peak 798.97 หน่วย', quantity: 798.97, unitLabel: 'หน่วย', ratePerUnit: 2.6037, amountBaht: 2080.28 },
          { itemLabel: 'ค่าบริการรายเดือน (Service Charge)', quantity: 1, unitLabel: 'เดือน', ratePerUnit: 312.2400, amountBaht: 312.24 }
        ],
        serviceCharge: 312.24,
        totalBasedAmount: 12807.79,
        installationDateNote: 'ติดตั้งใหม่ 15/12/2568',
        basedAmount: 12807.79,
        ftFormulaNote: 'ม.ค.69-เม.ย.69 = 0.0972 บาท/หน่วย',
        ftRatePerUnit: 0.0972,
        ftTotalAmount: 200.92,
        discountAmount: 0.00,
        subTotalAmount: 13008.71,
        vatRatePercent: 7.00,
        vatAmount: 910.61,
        currentMonthTotal: 13919.32,
        grandTotal: 13919.32,
        barcodeNumber: '|099400016550100 020029119125 690223 1391932',
        announcementMsg: '*** กรณีมีค่าไฟฟ้าค้างชำระเดือนก่อน โปรดชำระทันที เนื่องจากถึงกำหนดงดจ่ายไฟ ขออภัยหากชำระเงินแล้ว'
      }
    },
    {
      id: 'elec-6',
      billingPeriod: '06/2026',
      caNumber: '020001849201',
      meterNumber: '7718920',
      totalAmountBaht: 48250.75,
      totalUnitsKwh: 9850,
      peakUnitsKwh: 6150,
      offPeakUnitsKwh: 3700,
      peakAmountBaht: 26800.00,
      offPeakAmountBaht: 11200.00,
      ftRatePerUnit: 0.3982,
      ftTotalBaht: 3922.27,
      vatAmountBaht: 3156.40,
      peakDemandKw: 85.4,
      powerFactorPenaltyBaht: 0,
      efficiencyAnalysis: 'ช่วงเดินเครื่อง On-Peak สูงถึง 62.4% แนะนำสลับการสีข้าวช่วงกลางคืน (Off-Peak 22:00-09:00 น.) เพื่อลดค่าไฟ',
      energySavingTips: [
        'สลับรอบการเดินเครื่องขัดสีข้าวไปยังช่วง Off-Peak 22:00-09:00 น. ลดต้นทุนพลังงานได้ถึง 25%',
        'ติดตั้งระบบ Solar Rooftop บนหลังคาโกดังโรงสีเพื่อลดการดึงไฟฟ้า On-Peak ในช่วงกลางวัน'
      ]
    }
  ];
}

export async function fetchElectricityExpensesSheetData(): Promise<ElectricityExpenseRecord[]> {
  const category = 'electricity';
  const deletedIds = getDeletedRecordIds(category);

  const tabName = 'ค่าไฟฟ้าโรงสี';
  const url = `https://docs.google.com/spreadsheets/d/${EXPENSES_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      const records: ElectricityExpenseRecord[] = (parsed.data as any[])
        .map((rawRow, idx) => {
          const row = cleanRowKeys(rawRow);
          const keys = Object.keys(row);
          const idKey = keys.find(k => k === 'ID' || k.toLowerCase().includes('id')) || '';
          const periodKey = keys.find(k => k.includes('รอบ') || k.includes('Billing') || k.includes('เดือน') || k.includes('ประจำเดือน')) || '';
          const caKey = keys.find(k => k.includes('CA') || k.includes('ผู้ใช้')) || '';
          const meterKey = keys.find(k => k.includes('มิเตอร์')) || '';

          // Target specific columns strictly
          const totalKey = keys.find(k => k.includes('ยอดเงินรวม') || (k.includes('ยอดเงิน') && k.includes('บาท')) || (k.includes('รวม') && k.includes('บาท') && !k.includes('หน่วย'))) || '';
          const unitsKey = keys.find(k => k.includes('หน่วยรวม') || (k.includes('kWh') && k.includes('รวม'))) || '';
          const peakKey = keys.find(k => (k.includes('On-Peak') || k.includes('On Peak')) && !k.includes('Demand')) || '';
          const offPeakKey = keys.find(k => k.includes('Off-Peak') || k.includes('Off Peak')) || '';
          const peakDemandKey = keys.find(k => k.includes('Peak Demand') || (k.includes('Demand') && k.includes('kW'))) || '';
          const ftKey = keys.find(k => k.includes('FT')) || '';
          const pfKey = keys.find(k => k.includes('PF') || k.includes('Power Factor')) || '';
          const vatKey = keys.find(k => k.includes('VAT') || k.includes('ภาษี')) || '';
          const aiKey = keys.find(k => k.includes('วิเคราะห์') || k.includes('AI') || k.includes('หมายเหตุ')) || '';

          const recordId = row[idKey] || `elec-gsheet-${idx + 1}`;
          const totalAmountBaht = parseNumber(row[totalKey]);
          const totalUnitsKwhRaw = parseNumber(row[unitsKey]);
          const peakUnitsKwh = parseNumber(row[peakKey]);
          const offPeakUnitsKwh = parseNumber(row[offPeakKey]);
          const ftTotalBaht = parseNumber(row[ftKey]);
          const pfPenaltyBaht = parseNumber(row[pfKey]);
          const vatAmountBaht = parseNumber(row[vatKey]) || Math.round(totalAmountBaht * 0.07 * 100) / 100;
          const peakDemandKw = parseNumber(row[peakDemandKey]);

          const totalUnitsKwh = totalUnitsKwhRaw > 0 ? totalUnitsKwhRaw : (peakUnitsKwh + offPeakUnitsKwh);
          const normalizedPeriod = normalizeBillingPeriod(row[periodKey] || '');
          const periodStr = row[periodKey] ? String(row[periodKey]).trim() : normalizedPeriod;

          return {
            id: String(recordId),
            billingPeriod: periodStr,
            caNumber: row[caKey] ? String(row[caKey]).trim() : '20029119125',
            meterNumber: row[meterKey] ? String(row[meterKey]).trim() : '6300584313',
            totalAmountBaht: totalAmountBaht > 0 ? totalAmountBaht : parseFloat((totalUnitsKwh * 5.8).toFixed(2)),
            totalUnitsKwh,
            peakUnitsKwh,
            offPeakUnitsKwh,
            peakAmountBaht: parseFloat((peakUnitsKwh * 4.1839).toFixed(2)),
            offPeakAmountBaht: parseFloat((offPeakUnitsKwh * 2.6037).toFixed(2)),
            ftRatePerUnit: 0.0972,
            ftTotalBaht,
            vatAmountBaht,
            peakDemandKw,
            powerFactorPenaltyBaht: pfPenaltyBaht,
            efficiencyAnalysis: row[aiKey] || 'ข้อมูลเชื่อมตรงกับ Google Sheets (ชีต ค่าไฟฟ้าโรงสี)'
          };
        })
        .filter(r => !deletedIds.has(r.id) && r.billingPeriod !== 'รอบเดือน (Billing Period)' && (r.totalUnitsKwh > 0 || r.totalAmountBaht > 0));

      if (records.length > 0) {
        saveCategoryRecords(category, records);
        return records;
      }
    }
  } catch (err) {
    console.warn('Could not fetch Electricity Expenses sheet, checking local storage/fallback:', err);
  }

  const saved = getSavedCategoryRecords<ElectricityExpenseRecord>(category);
  if (saved && saved.length > 0) {
    return saved.filter(r => !deletedIds.has(r.id));
  }

  return getFallbackElectricityExpensesData().filter(r => !deletedIds.has(r.id));
}

// 2.4 Machine Maintenance Expenses
export interface MachineMaintenanceRecord {
  id: string;
  date: string;
  machineName: string;
  maintenanceType: 'ซ่อมบำรุงตามระยะ' | 'ซ่อมแซมด่วน' | 'เปลี่ยนอะไหล่' | 'ตรวจเช็คประจำเดือน';
  replacedParts: string;
  costBaht: number;
  technician: string;
  status: 'เสร็จสมบูรณ์' | 'รอดำเนินการ' | 'รออะไหล่';
  documentUrl?: string;
  notes?: string;
}

export function getFallbackMachineMaintenanceData(): MachineMaintenanceRecord[] {
  return [
    { id: 'maint-1', date: '25/07/2026', machineName: 'เครื่องขัดขาวลูกหิน 150HP', maintenanceType: 'เปลี่ยนอะไหล่', replacedParts: 'ยางขัดสีข้าว + ตะแกรงลูกหิน 4 ชุด', costBaht: 8500, technician: 'อำนาจ ช่างเครื่อง', status: 'เสร็จสมบูรณ์', notes: 'ปรับปรุงประสิทธิภาพการขัดเงาเมล็ดข้าวสาร' },
    { id: 'maint-2', date: '18/07/2026', machineName: 'เครื่องคัดสี Color Sorter 64 Ch', maintenanceType: 'ตรวจเช็คประจำเดือน', replacedParts: 'ทำความสะอาดกระจกเลนส์เซนเซอร์ + ปรับลมยิง', costBaht: 2500, technician: 'ช่างจากศูนย์ Color Sorter', status: 'เสร็จสมบูรณ์', notes: 'ทดสอบแยกข้าวท้องไข่และข้าวแดงได้อย่างแม่นยำ' },
    { id: 'maint-3', date: '10/07/2026', machineName: 'พัดลมดูดแกลบและลมลำเลียง', maintenanceType: 'ซ่อมบำรุงตามระยะ', replacedParts: 'เปลี่ยนสายพาน V-Belt B-85 จำนวน 3 เส้น', costBaht: 1800, technician: 'อำนาจ ช่างเครื่อง', status: 'เสร็จสมบูรณ์', notes: 'ป้องกันสายพานลื่นหลุดขณะเดินเครื่องเต็มพิกัด' }
  ];
}

export async function fetchMachineMaintenanceSheetData(): Promise<MachineMaintenanceRecord[]> {
  const category = 'maintenance';
  const deletedIds = getDeletedRecordIds(category);

  const tabName = 'ประวัติค่าซ่อมบำรุงเครื่องจักรโรงสี';
  const url = `https://docs.google.com/spreadsheets/d/${EXPENSES_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      const records: MachineMaintenanceRecord[] = (parsed.data as any[])
        .map((rawRow, idx) => {
          const row = cleanRowKeys(rawRow);
          const keys = Object.keys(row);
          const idKey = keys.find(k => k === 'ID' || k.toLowerCase().includes('id')) || '';
          const dateKey = keys.find(k => k.includes('วันที่')) || '';
          const machineKey = keys.find(k => k.includes('เครื่องจักร') || k.includes('อุปกรณ์') || k.includes('รายการ')) || '';
          const typeKey = keys.find(k => k.includes('ประเภท')) || '';
          const partsKey = keys.find(k => k.includes('อะไหล่') || k.includes('เปลี่ยน')) || '';
          const techKey = keys.find(k => k.includes('ช่าง') || k.includes('ผู้รับเหมา')) || '';
          const costKey = keys.find(k => k.includes('ค่าใช้จ่าย') || k.includes('บาท') || k.includes('จำนวนเงิน')) || '';
          const statusKey = keys.find(k => k.includes('สถานะ')) || '';
          const notesKey = keys.find(k => k.includes('หมายเหตุ') || k.includes('อ้างอิง')) || '';

          const recordId = row[idKey] || `maint-${idx + 1}`;
          const rawType = row[typeKey] || '';
          let maintenanceType: 'ซ่อมบำรุงตามระยะ' | 'ซ่อมแซมด่วน' | 'เปลี่ยนอะไหล่' | 'ตรวจเช็คประจำเดือน' = 'ซ่อมบำรุงตามระยะ';
          if (rawType.includes('ด่วน')) maintenanceType = 'ซ่อมแซมด่วน';
          else if (rawType.includes('อะไหล่')) maintenanceType = 'เปลี่ยนอะไหล่';
          else if (rawType.includes('เช็ค') || rawType.includes('ตรวจ')) maintenanceType = 'ตรวจเช็คประจำเดือน';

          const rawStatus = row[statusKey] || '';
          let status: 'เสร็จสมบูรณ์' | 'รอดำเนินการ' | 'รออะไหล่' = 'เสร็จสมบูรณ์';
          if (rawStatus.includes('รออะไหล่')) status = 'รออะไหล่';
          else if (rawStatus.includes('รอดำเนินการ') || rawStatus.includes('กำลัง')) status = 'รอดำเนินการ';

          return {
            id: String(recordId),
            date: row[dateKey] || new Date().toISOString().split('T')[0],
            machineName: row[machineKey] || 'เครื่องจักรโรงสี',
            maintenanceType,
            replacedParts: row[partsKey] || 'อะไหล่ซ่อมบำรุง',
            technician: row[techKey] || 'ช่างประจำโรงสี',
            costBaht: parseFloat(row[costKey]?.toString().replace(/,/g, '')) || 0,
            status,
            notes: row[notesKey] || ''
          };
        })
        .filter(r => !deletedIds.has(r.id) && r.machineName !== 'ชื่อเครื่องจักร / อุปกรณ์');

      if (records.length > 0) {
        saveCategoryRecords(category, records);
        return records;
      }
    }
  } catch (err) {
    console.warn('Could not fetch Maintenance Expenses sheet, checking local storage/fallback:', err);
  }

  const saved = getSavedCategoryRecords<MachineMaintenanceRecord>(category);
  if (saved && saved.length > 0) {
    return saved.filter(r => !deletedIds.has(r.id));
  }

  return getFallbackMachineMaintenanceData().filter(r => !deletedIds.has(r.id));
}

// 2.5 CapEx / Capital Investments
export interface CapExInvestmentRecord {
  id: string;
  date: string;
  title: string;
  category: 'เครื่องจักร/อุปกรณ์' | 'อาคาร/โกดัง' | 'โซลาร์เซลล์/พลังงาน' | 'ยานพาหนะ/เครื่องจักรหนัก' | 'ระบบไอที/ซอฟต์แวร์';
  amountBaht: number;
  expectedLifespanYears: number;
  estimatedRoiNotes: string;
  status: 'อนุมัติ/จ่ายแล้ว' | 'กำลังดำเนินการ' | 'อยู่ระหว่างพิจารณา';
  documentUrl?: string;
}

export function getFallbackCapExData(): CapExInvestmentRecord[] {
  return [
    { id: 'capex-1', date: '15/06/2026', title: 'ติดตั้งโซลาร์เซลล์หลังคาโกดังโรงสี 100 kWp', category: 'โซลาร์เซลล์/พลังงาน', amountBaht: 1850000, expectedLifespanYears: 25, estimatedRoiNotes: 'ประหยัดค่าไฟฟ้า On-Peak ได้เดือนละ ~35,000 บาท คืนทุนภายใน 4.4 ปี', status: 'อนุมัติ/จ่ายแล้ว' },
    { id: 'capex-2', date: '02/05/2026', title: 'ตู้คอนโทรลมอเตอร์อัตโนมัติ Soft Starter', category: 'เครื่องจักร/อุปกรณ์', amountBaht: 240000, expectedLifespanYears: 10, estimatedRoiNotes: 'ลดกระแสไฟกระชากช่วงสตาร์ทมอเตอร์ และยืดอายุการใช้งานเครื่องจักร', status: 'อนุมัติ/จ่ายแล้ว' },
    { id: 'capex-3', date: '10/04/2026', title: 'รถตักตักข้าวเปลือก/แกลบ KUBOTA MX5000', category: 'ยานพาหนะ/เครื่องจักรหนัก', amountBaht: 650000, expectedLifespanYears: 15, estimatedRoiNotes: 'เร่งความเร็วในการตักแกลบขึ้นรถบรรทุก ลดเวลาคอยของรถขนส่ง 50%', status: 'อนุมัติ/จ่ายแล้ว' }
  ];
}

export async function fetchCapExSheetData(): Promise<CapExInvestmentRecord[]> {
  const category = 'capex';
  const deletedIds = getDeletedRecordIds(category);

  const tabName = 'งบลงทุน';
  const url = `https://docs.google.com/spreadsheets/d/${EXPENSES_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;

  try {
    const response = await axios.get(url);
    const parsed = Papa.parse(response.data, { header: true, skipEmptyLines: true });

    if (parsed.data && parsed.data.length > 0) {
      const records: CapExInvestmentRecord[] = (parsed.data as any[])
        .map((rawRow, idx) => {
          const row = cleanRowKeys(rawRow);
          const keys = Object.keys(row);
          const idKey = keys.find(k => k === 'ID' || k.toLowerCase().includes('id')) || '';
          const dateKey = keys.find(k => k.includes('วันที่')) || '';
          const titleKey = keys.find(k => k.includes('โครงการ') || k.includes('ทรัพย์สิน') || k.includes('รายการ')) || '';
          const catKey = keys.find(k => k.includes('หมวดหมู่')) || '';
          const amountKey = keys.find(k => k.includes('มูลค่า') || k.includes('ลงทุน') || k.includes('บาท') || k.includes('จำนวนเงิน')) || '';
          const lifespanKey = keys.find(k => k.includes('อายุ') || k.includes('ปี')) || '';
          const roiKey = keys.find(k => k.includes('ROI') || k.includes('ตอบแทน') || k.includes('หมายเหตุ')) || '';
          const statusKey = keys.find(k => k.includes('สถานะ')) || '';

          const recordId = row[idKey] || `capex-${idx + 1}`;
          const rawCat = row[catKey] || '';
          let category: 'เครื่องจักร/อุปกรณ์' | 'อาคาร/โกดัง' | 'โซลาร์เซลล์/พลังงาน' | 'ยานพาหนะ/เครื่องจักรหนัก' | 'ระบบไอที/ซอฟต์แวร์' = 'เครื่องจักร/อุปกรณ์';
          if (rawCat.includes('อาคาร') || rawCat.includes('โกดัง')) category = 'อาคาร/โกดัง';
          else if (rawCat.includes('โซลาร์') || rawCat.includes('พลังงาน')) category = 'โซลาร์เซลล์/พลังงาน';
          else if (rawCat.includes('ยานพาหนะ') || rawCat.includes('หนัก')) category = 'ยานพาหนะ/เครื่องจักรหนัก';
          else if (rawCat.includes('ไอที') || rawCat.includes('ซอฟต์แวร์')) category = 'ระบบไอที/ซอฟต์แวร์';

          const rawStatus = row[statusKey] || '';
          let status: 'อนุมัติ/จ่ายแล้ว' | 'กำลังดำเนินการ' | 'อยู่ระหว่างพิจารณา' = 'อนุมัติ/จ่ายแล้ว';
          if (rawStatus.includes('กำลัง')) status = 'กำลังดำเนินการ';
          else if (rawStatus.includes('พิจารณา')) status = 'อยู่ระหว่างพิจารณา';

          return {
            id: String(recordId),
            date: row[dateKey] || new Date().toISOString().split('T')[0],
            title: row[titleKey] || 'โครงการลงทุนใหม่',
            category,
            amountBaht: parseFloat(row[amountKey]?.toString().replace(/,/g, '')) || 0,
            expectedLifespanYears: parseFloat(row[lifespanKey]?.toString().replace(/,/g, '')) || 10,
            estimatedRoiNotes: row[roiKey] || 'คุ้มค่าการลงทุนระยะยาว',
            status
          };
        })
        .filter(r => !deletedIds.has(r.id) && r.title !== 'โครงการ / ทรัพย์สิน');

      if (records.length > 0) {
        saveCategoryRecords(category, records);
        return records;
      }
    }
  } catch (err) {
    console.warn('Could not fetch CapEx sheet, checking local storage/fallback:', err);
  }

  const saved = getSavedCategoryRecords<CapExInvestmentRecord>(category);
  if (saved && saved.length > 0) {
    return saved.filter(r => !deletedIds.has(r.id));
  }

  return getFallbackCapExData().filter(r => !deletedIds.has(r.id));
}
