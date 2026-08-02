import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import axios from 'axios';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
let app;
let auth: any = null;
let provider: any = null;

try {
  // Only initialize if config has real or placeholder keys
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  provider = new GoogleAuthProvider();
  // Request Google Sheets read/write permissions
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
} catch (e) {
  console.error("Firebase Initialization Error:", e);
}

// Token and Login states
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!auth) {
    if (onAuthFailure) onAuthFailure();
    return () => {};
  }

  // Restore token from session/local storage if desired, but as per skill guidelines
  // we can keep it in-memory, or cache it securely for user experience
  const storedToken = sessionStorage.getItem('mekong_rice_sheets_access_token');
  if (storedToken) {
    cachedAccessToken = storedToken;
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      sessionStorage.removeItem('mekong_rice_sheets_access_token');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google sign-in
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  if (!auth || !provider) {
    throw new Error('ระบบล็อกอิน Google ยังไม่พร้อมใช้งานเนื่องจากไม่ได้ตั้งค่า Firebase');
  }

  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('ไม่ได้รับ Access Token จากสิทธิ์ความปลอดภัยของ Google');
    }

    cachedAccessToken = credential.accessToken;
    sessionStorage.setItem('mekong_rice_sheets_access_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogle = async () => {
  if (auth) {
    await signOut(auth);
  }
  cachedAccessToken = null;
  sessionStorage.removeItem('mekong_rice_sheets_access_token');
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

// Convert column index to Google Sheets column letter (e.g. 0 -> A, 27 -> AB)
function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// Sync feedback data to Google Sheets
export async function syncJobToGoogleSheets(
  accessToken: string,
  customerName: string,
  date: string,
  riceType: string,
  bags: number,
  weight: number,
  dataToUpdate: {
    feedbackPoints: any[];
    dismissedPoints: any[];
    adjustedPercent?: number;
    adjustedGrade?: string;
    impurityPercent?: number;
    redContaminationPercent?: number;
    chalkyPercent?: number;
  }
) {
  const spreadsheetId = '1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg';
  const rangeName = 'ข้อมูลการรับบริการ';
  const fullRange = `${rangeName}!A1:ZZ1000`;
  
  // 1. Fetch current sheet values
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}`;
  const response = await axios.get(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const rows = response.data.values;
  if (!rows || rows.length === 0) {
    throw new Error('ไม่พบข้อมูลแผ่นงานใน Google Sheets');
  }
  
  const headers = [...rows[0]]; // Make a copy
  
  // 2. Identify or create headers
  const requiredHeaders = [
    'พิกัดป้อนกลับ (Feedback Coordinates)',
    'พิกัดตัดออก (Dismissed Coordinates)',
    'เปอร์เซ็นต์เจือปนปรับปรุง (Adjusted %)',
    'เกรดคุณภาพปรับปรุง (Adjusted Grade)',
    'อัตราส่วนสิ่งเจือปนปะปน',
    'สัดส่วนการปนเปื้อนข้าวแดง',
    'อัตราข้าวมีท้องไข่'
  ];
  
  let headerUpdated = false;
  const colIndices: { [key: string]: number } = {};
  
  requiredHeaders.forEach(h => {
    let idx = headers.findIndex((head: any) => head && String(head).trim() === h.trim());
    if (idx === -1) {
      idx = headers.findIndex((head: any) => head && String(head).trim().toLowerCase() === h.trim().toLowerCase());
    }
    if (idx === -1) {
      idx = headers.length;
      headers.push(h);
      headerUpdated = true;
    }
    colIndices[h] = idx;
  });
  
  // If headers were added, update Row 1 in Google Sheet
  if (headerUpdated) {
    const updateHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rangeName + '!A1')}?valueInputOption=USER_ENTERED`;
    await axios.put(updateHeaderUrl, {
      range: `${rangeName}!A1`,
      majorDimension: 'ROWS',
      values: [headers]
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  }
  
  // 3. Find matching row index (1-based row index for Google Sheets update)
  const nameCol = headers.find((h: string) => h.includes('ชื่อ') || h.toLowerCase().includes('name'));
  const dateCol = headers.find((h: string) => h.includes('วัน') || h.toLowerCase().includes('date'));
  const typeCol = headers.find((h: string) => h.includes('ประเภท') || h.toLowerCase().includes('type'));
  const bagsCol = headers.find((h: string) => h.includes('กระสอบ') || h.toLowerCase().includes('bags'));
  const weightCol = headers.find((h: string) => h.includes('น้ำหนัก') || h.toLowerCase().includes('weight'));
  
  const nameIdx = nameCol ? headers.indexOf(nameCol) : -1;
  const dateIdx = dateCol ? headers.indexOf(dateCol) : -1;
  const typeIdx = typeCol ? headers.indexOf(typeCol) : -1;
  const bagsIdx = bagsCol ? headers.indexOf(bagsCol) : -1;
  const weightIdx = weightCol ? headers.indexOf(weightCol) : -1;
  
  let matchedRowIdx = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    
    const rowName = nameIdx !== -1 ? (row[nameIdx] || '') : '';
    const rowDate = dateIdx !== -1 ? (row[dateIdx] || '') : '';
    const rowType = typeIdx !== -1 ? (row[typeIdx] || '') : '';
    const rowBags = bagsIdx !== -1 ? (row[bagsIdx] || '') : '';
    const rowWeight = weightIdx !== -1 ? (row[weightIdx] || '') : '';
    
    // Check match
    const nameMatch = rowName.trim().toLowerCase().includes(customerName.trim().toLowerCase()) ||
                     customerName.trim().toLowerCase().includes(rowName.trim().toLowerCase());
    
    // Loose date / numeric checking as fallbacks
    const dateMatch = rowDate.includes(date) || date.includes(rowDate) || !rowDate;
    const bagsMatch = parseInt(rowBags) === bags || !rowBags;
    const weightMatch = parseFloat(rowWeight) === weight || !rowWeight;
    
    if (nameMatch && (dateMatch || (bagsMatch && weightMatch))) {
      matchedRowIdx = i + 1; // row index is 1-based (i.e. i=1 is row 2)
      break;
    }
  }
  
  if (matchedRowIdx === -1) {
    throw new Error(`ไม่พบแถวข้อมูลข้าวของลูกค้า "${customerName}" ใน Google Sheets เพื่ออัปเดต`);
  }
  
  // 4. Send PUT request for specific columns in the found row
  const formatPointsString = (pts: any[]) => {
    return pts.map((p, idx) => `[${idx+1}] ${p.label} (X:${p.x}%, Y:${p.y}%)`).join(' | ');
  };
  
  const formatDismissedString = (pts: any[]) => {
    return pts.map((p, idx) => `[${idx+1}] ตัดจุดผิดพลาด (X:${p.x}%, Y:${p.y}%)`).join(' | ');
  };
  
  const updates = [
    { header: 'พิกัดป้อนกลับ (Feedback Coordinates)', val: formatPointsString(dataToUpdate.feedbackPoints) },
    { header: 'พิกัดตัดออก (Dismissed Coordinates)', val: formatDismissedString(dataToUpdate.dismissedPoints) },
    { header: 'เปอร์เซ็นต์เจือปนปรับปรุง (Adjusted %)', val: dataToUpdate.adjustedPercent !== undefined ? `${dataToUpdate.adjustedPercent}%` : undefined },
    { header: 'เกรดคุณภาพปรับปรุง (Adjusted Grade)', val: dataToUpdate.adjustedGrade !== undefined ? dataToUpdate.adjustedGrade : undefined },
    { header: 'อัตราส่วนสิ่งเจือปนปะปน', val: dataToUpdate.impurityPercent !== undefined ? `${dataToUpdate.impurityPercent}%` : undefined },
    { header: 'สัดส่วนการปนเปื้อนข้าวแดง', val: dataToUpdate.redContaminationPercent !== undefined ? `${dataToUpdate.redContaminationPercent}%` : undefined },
    { header: 'อัตราข้าวมีท้องไข่', val: dataToUpdate.chalkyPercent !== undefined ? `${dataToUpdate.chalkyPercent}%` : undefined }
  ];
  
  const filteredUpdates = updates.filter(item => item.val !== undefined);
  
  const updatePromises = filteredUpdates.map(item => {
    const colIdx = colIndices[item.header];
    const colLetter = getColumnLetter(colIdx);
    const cellRange = `${rangeName}!${colLetter}${matchedRowIdx}`;
    
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
    return axios.put(updateUrl, {
      range: cellRange,
      majorDimension: 'ROWS',
      values: [[item.val]]
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  });
  
  await Promise.all(updatePromises);
}
