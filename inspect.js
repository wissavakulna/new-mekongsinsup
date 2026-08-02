import axios from 'axios';

const SHEET_ID = '1t4Q_9Dc2Nr2qGN8E4RvVUD_XDLOkgyz4HsMYpGQPtpg';
const MILL_SHEET_NAME = 'ข้อมูลการรับบริการ';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(MILL_SHEET_NAME)}`;

axios.get(url)
  .then(response => {
    const csv = response.data;
    const lines = csv.split('\n');
    const headers = lines[0].split(',');
    
    // Find index of image columns in headers
    const findIndex = (name) => headers.findIndex(h => h.includes(name));
    const idx1 = findIndex('รูปกระสอบข้าว');
    const idx2 = findIndex('รูปข้าวขาเข้า');
    const idx3 = findIndex('รูปข้าวกล้อง');
    const idx4 = findIndex('รูปข้าวสาร');
    
    console.log("Column indexes found:", { idx1, idx2, idx3, idx4 });
    
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // simple csv split by comma (warning: might not handle quotes perfectly, but enough for inspection)
      const parts = line.split(',');
      const val1 = parts[idx1] || '';
      const val2 = parts[idx2] || '';
      const val3 = parts[idx3] || '';
      const val4 = parts[idx4] || '';
      
      if (val1.trim() || val2.trim() || val3.trim() || val4.trim()) {
        count++;
        console.log(`\nRow ${i}:`);
        console.log("Vals:", { val1, val2, val3, val4 });
        if (count >= 10) break;
      }
    }
    
    if (count === 0) {
      console.log("No non-empty values found in image columns.");
      // Let's print the first 3 full lines of data just to inspect them
      console.log("\nFirst 3 rows of data:");
      for (let i = 1; i < Math.min(5, lines.length); i++) {
        console.log(`Row ${i}:`, lines[i]);
      }
    }
  })
  .catch(err => {
    console.error("Error:", err.message);
  });
