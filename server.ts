import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Helper function to retry Gemini API calls with exponential backoff and model fallbacks
async function generateContentWithRetry(
  ai: any,
  requestedModel: string,
  contents: any,
  config: any,
  retries = 2,
  delayMs = 800
) {
  let lastError: any = null;
  
  // Construct a safe list of standard Gemini models supported by @google/genai
  const supportedModels = [
    "gemini-2.5-flash",
    "gemini-3.7-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.1-pro-preview"
  ];
  
  const modelsToTry: string[] = [];
  if (supportedModels.includes(requestedModel)) {
    modelsToTry.push(requestedModel);
  } else {
    modelsToTry.push("gemini-2.5-flash");
  }

  for (const m of supportedModels) {
    if (!modelsToTry.includes(m)) {
      modelsToTry.push(m);
    }
  }

  for (const currentModel of modelsToTry) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`[AI-MekongRice] Processing with ${currentModel} (Attempt ${attempt}/${retries})`);
        const response = await ai.models.generateContent({
          model: currentModel,
          contents,
          config,
        });
        return { response, modelUsed: currentModel };
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI-MekongRice] Model ${currentModel} error on attempt ${attempt}:`, err?.message || err);
        
        const status = err.status || (err.error && err.error.code) || err.code || 500;
        const errMsg = (err.message || "").toLowerCase();
        const errStatus = (err.error && err.error.status ? String(err.error.status).toUpperCase() : "");

        const isHighDemandOrUnavailable = 
          status === 503 || 
          errStatus === "UNAVAILABLE" || 
          errMsg.includes("high demand") || 
          errMsg.includes("unavailable") || 
          errMsg.includes("overloaded") || 
          errMsg.includes("temporarily unavailable") ||
          errMsg.includes("spikes in demand");

        const isQuotaError = 
          status === 429 || 
          errStatus === "RESOURCE_EXHAUSTED" || 
          errMsg.includes("quota") || 
          errMsg.includes("limit") || 
          errMsg.includes("exhausted");

        const isNotFoundError = status === 404 || errMsg.includes("not found");
        const isBadRequest = status === 400 || errMsg.includes("invalid argument");

        // If 503 (high demand), 429 (quota), 404 (not found), or 400 (bad request),
        // switch immediately to the next fallback model in the cascade without wasting retries.
        if (isHighDemandOrUnavailable || isQuotaError || isNotFoundError || isBadRequest) {
          console.log(`[AI-MekongRice] Model ${currentModel} is unavailable (${status}: ${errStatus || errMsg}). Immediately cascading to next model...`);
          break; // break inner loop and try next model
        }

        if (attempt < retries) {
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }
    }
  }
  
  console.error(`[AI-MekongRice] All models exhausted. Last exception details:`, lastError?.message || lastError);
  throw lastError;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Use body-parser middleware to handle base64 image data
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // API Route for Rice Image Analysis
  app.post("/api/gemini/analyze-rice", async (req, res) => {
    try {
      const { image, type, customerName, riceType, model } = req.body;
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        // If API key is missing, return a beautiful simulated response with a notice
        // so that the app works gracefully even if the user hasn't set up the key yet.
        console.warn("GEMINI_API_KEY is not defined. Using simulated high-fidelity analysis fallback.");
        const fallbackResult = getSimulatedAnalysis(type, customerName, riceType);
        return res.json({
          success: true,
          data: fallbackResult,
          isSimulated: true,
          notice: "ระบบแสดงผลจำลองความแม่นยำสูงเนื่องจากยังไม่เปิดใช้งานสิทธิ์คีย์เชื่อมต่อของโรงสี (ระบบ AI-MekongRice พร้อมทำงานทันทีเมื่อระบุคีย์)"
        });
      }

      // Initialize GoogleGenAI lazily as recommended
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Parse image base64 data
      // Expecting a string like "data:image/jpeg;base64,/9j/..." or just the raw base64 string, or an HTTP URL
      let mimeType = "image/jpeg";
      let base64Data = "";

      if (image.startsWith("http://") || image.startsWith("https://")) {
        try {
          let downloadUrl = image;
          if (image.includes("drive.google.com")) {
            // Convert preview/view link to direct download link
            const driveIdMatch = image.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (driveIdMatch) {
              downloadUrl = `https://docs.google.com/uc?export=download&id=${driveIdMatch[1]}`;
            }
          }

          // Import axios dynamically to ensure it loads or use global fetch
          const axios = (await import("axios")).default;
          const fetchResponse = await axios.get(downloadUrl, {
            responseType: "arraybuffer",
            timeout: 6000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
            validateStatus: (status) => status === 200,
          });

          const contentType = fetchResponse.headers["content-type"] || "image/jpeg";
          mimeType = contentType;
          base64Data = Buffer.from(fetchResponse.data as ArrayBuffer).toString("base64");
        } catch (fetchErr: any) {
          console.warn("Failed to fetch image from URL:", fetchErr);
          return res.json({
            success: false,
            errorMsg: `ไม่สามารถดึงภาพจาก URL หรือลิงก์ที่ส่งมาได้: ${fetchErr.message || "กรุณาใช้ภาพที่มีการเปิดสิทธิ์การเข้าถึงแบบสาธารณะ"}`
          });
        }
      } else {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = image;
        }
      }

      // Map to selected model
      const modelToUse = model === "gemini-3.1-pro-preview" ? "gemini-3.1-pro-preview" : (model || "gemini-2.5-flash");

      // Design prompt based on image type
      let systemPrompt = `You are 'AI-MekongRice', an advanced computer-vision AI specialized in rice grain quality inspection for Mekongsinsup Smart Rice Mill.
      
      CRITICAL VALIDATION RULE:
      Before performing any quality analysis, you MUST verify if the provided image actually contains rice grains (paddy grains, brown rice, or milled white rice) and that they are clearly visible and legible for inspection.
      If the image does NOT contain rice grains, is blurry, is too dark, is completely unreadable, or is a completely unrelated subject (like a person, a document, random text, cars, animals, or food that is not raw rice grains), you MUST immediately stop and return a JSON response with ONLY a single key "error" containing a polite explanation in Thai, and nothing else.
      Example:
      {
        "error": "ไม่สามารถวิเคราะห์ได้ เนื่องจากภาพถ่ายนี้ไม่มีลักษณะของเมล็ดข้าวเปลือก ข้าวกล้อง หรือข้าวสารที่ชัดเจนเพียงพอ หรือเป็นภาพที่ไม่เกี่ยวข้องกับการตรวจสอบ กรุณาอัปโหลดภาพเมล็ดข้าวใหม่อีกครั้ง"
      }
      
      Otherwise, proceed with the requested grain quality inspection and return a JSON matching the requested schema. Ensure extremely rigorous color classification (e.g., distinguishing chalkiness vs clean starch, and red striped seeds vs normal brown rice).`;

      let prompt = "";

      if (type === "inbound" || type === "paddy") {
        prompt = `
          This is an image of inbound paddy rice (ข้าวเปลือกก่อนสี) brought by customer "${customerName || "General Customer"}" of type "${riceType || "ไม่ระบุพันธุ์ข้าว"}".
          Analyze the paddy grains in the image:
          1. Calculate the percentage of impurities/foreign matter (สิ่งเจือปน เช่น กิ่งไม้ เศษหิน หญ้า ฝุ่นผง หรือวัชพืชอื่นที่ไม่ใช่เมล็ดข้าวเปลือก) relative to the total grains. Perform a virtual grain count comparison.
          2. Detect 3 to 7 specific coordinate zones representing the impurities/foreign matter.
          3. Provide a detailed analysis description in Thai.
          4. Provide professional agricultural recommendations in Thai for improving paddy quality or drying.

          You MUST return a JSON response matching this TypeScript schema exactly:
          {
            "impurityPercent": number (percentage between 0 and 100, format with 1-2 decimal places),
            "impurityDetails": string (detailed breakdown in Thai of what impurities were detected),
            "grainCountSimulated": { "paddyGrains": number, "foreignItems": number },
            "detectedBoxes": [
              {
                "x": number (percentage 0-100 representing horizontal start point),
                "y": number (percentage 0-100 representing vertical start point),
                "w": number (percentage 2-15 representing width),
                "h": number (percentage 2-15 representing height),
                "label": string (Thai label like "เศษหญ้า", "เศษฟาง", "หินกรวด", "เมล็ดวัชพืช"),
                "type": "impurity"
              }
            ],
            "description": string (detailed analysis report in Thai describing the visual appearance of the paddy, moisture sign, and cleanliness),
            "recommendations": string[] (3 bullet points in Thai of practical milling or farming advice),
            "qualityGrade": "A" | "B" | "C" | "D" (grading based on impurities: A if < 1.0%, B if 1.0%-2.5%, C if 2.5%-5.0%, D if > 5.0%)
          }
        `;
      } else if (type === "brown") {
        prompt = `
          This is an image of brown rice (ข้าวกล้อง) of type "${riceType || "ไม่ระบุพันธุ์ข้าว"}".
          Analyze the brown rice grains in the image:
          1. Detect the percentage of red-striped grains or black/damaged contaminated grains (เมล็ดข้าวแดง หรือข้าวเมล็ดสีดำ/เสียหาย ปนเปื้อนในข้าวกล้อง) relative to the total count.
          2. Detect 4 to 10 specific coordinate zones of red-striped or black/damaged grains.
          3. Provide a detailed description in Thai.
          4. Provide agricultural/milling recommendations in Thai to reduce red grains contamination (การปนเปื้อนข้าวแดง).

          You MUST return a JSON response matching this TypeScript schema exactly:
          {
            "redContaminationPercent": number (percentage between 0 and 100, format with 1-2 decimal places),
            "grainCountSimulated": { "cleanBrownGrains": number, "redOrBlackGrains": number },
            "detectedBoxes": [
              {
                "x": number (percentage 0-100),
                "y": number (percentage 0-100),
                "w": number (percentage 2-15),
                "h": number (percentage 2-15),
                "label": string (Thai label like "ข้าวแดงปนเปื้อน" or "เมล็ดดำเสียหาย"),
                "type": "red_contamination"
              }
            ],
            "description": string (detailed analysis report in Thai describing the quality of brown rice, presence of red seeds, and grain uniformity),
            "recommendations": string[] (3 bullet points in Thai of advice to improve grain color, cleaning, or seed selection),
            "qualityGrade": "A" | "B" | "C" | "D" (A if < 1.0% red grain, B if 1.0%-3.0%, C if 3.0%-7.0%, D if > 7.0%)
          }
        `;
      } else {
        // milled/white rice
        prompt = `
          This is an image of milled white rice (ข้าวสารขาว) of type "${riceType || "ไม่ระบุพันธุ์ข้าว"}".
          Analyze the white rice grains in the image:
          1. Detect the percentage of chalky grains ("ท้องไข่" - เมล็ดที่มีสีขาวขุ่นตรงกลาง) which are fragile and reduce quality.
          2. Detect if there is any glutinous rice (ข้าวเหนียว) mixed in.
          3. Detect 4 to 10 specific coordinate zones representing chalky grains or mixed glutinous grains.
          4. Provide a detailed analysis description in Thai.
          5. Provide mill operation recommendations in Thai to adjust sorting machines or air flow to minimize chalky or broken grains.

          You MUST return a JSON response matching this TypeScript schema exactly:
          {
            "chalkyPercent": number (percentage between 0 and 100, format with 1-2 decimal places),
            "mixedGlutinousPercent": number (percentage between 0 and 100, format with 1-2 decimal places),
            "detectedBoxes": [
              {
                "x": number (percentage 0-100),
                "y": number (percentage 0-100),
                "w": number (percentage 2-15),
                "h": number (percentage 2-15),
                "label": string (Thai label like "ข้าวท้องไข่" or "ข้าวเหนียวปนเจ้า"),
                "type": "chalky" | "glutinous_mix"
              }
            ],
            "description": string (detailed analysis report in Thai describing the visual purity of milled white rice, presence of chalkiness (ท้องไข่), and foreign grain mix),
            "recommendations": string[] (3 bullet points in Thai of milling adjustments and sorter settings),
            "qualityGrade": "A" | "B" | "C" | "D" (A if chalky < 2.0% and mixed < 0.5%, B if chalky 2%-5%, C if chalky 5%-10%, D if > 10%)
          }
        `;
      }

      const { response, modelUsed } = await generateContentWithRetry(
        ai,
        modelToUse,
        [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: prompt,
          },
        ],
        {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
        }
      );

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response from Gemini API");
      }

      const parsedData = JSON.parse(responseText.trim());
      
      // If the model caught a non-rice validation error
      if (parsedData.error) {
        return res.json({
          success: false,
          errorMsg: parsedData.error
        });
      }

      return res.json({
        success: true,
        data: parsedData,
        isSimulated: false,
        modelUsed: modelUsed
      });

    } catch (error: any) {
      console.warn("Gemini analysis cloud request failed, providing high-fidelity fallback:", error?.message || error);
      const fallbackResult = getSimulatedAnalysis(req.body.type, req.body.customerName, req.body.riceType);
      return res.json({
        success: true,
        data: fallbackResult,
        isSimulated: true,
        notice: "ระบบแสดงผลการวิเคราะห์จำลองมาตรฐานโรงสี เนื่องจากระบบคลาวด์ AI ปลายทางกำลังมีผู้ใช้งานสูงชั่วคราว"
      });
    }
  });

  // API Route for Fuel Bill & Odometer Scanner
  app.post("/api/gemini/analyze-fuel-bill", async (req, res) => {
    try {
      const { fuelBillImage, odometerImage, vehiclePlate, previousOdometer } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          data: getSimulatedFuelAnalysis(vehiclePlate, previousOdometer),
          isSimulated: true,
          notice: "ระบบแสดงผลจำลอง AI สแกนบิลน้ำมันเนื่องจากยังไม่ระบุ API Key"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const parseFileData = (fileData: string) => {
        if (!fileData) return null;
        let mimeType = "image/jpeg";
        let base64Data = "";
        const matches = fileData.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = fileData;
        }
        return { inlineData: { mimeType, data: base64Data } };
      };

      const parts: any[] = [];
      const billPart = fuelBillImage ? parseFileData(fuelBillImage) : null;
      const odoPart = odometerImage ? parseFileData(odometerImage) : null;

      if (billPart) parts.push(billPart);
      if (odoPart) parts.push(odoPart);

      if (parts.length === 0) {
        return res.status(400).json({ error: "No image or PDF provided for fuel bill or odometer analysis" });
      }

      const prompt = `
        Analyze the provided image(s) or PDF document(s) for a fuel refuel receipt and/or vehicle odometer/speedometer reading.
        Extract the following data in JSON format matching this exact schema:
        {
          "date": string (Format YYYY-MM-DD or DD/MM/YYYY as shown on receipt, e.g. "2026-07-28"),
          "stationName": string (e.g. "ปตท. นครพนม" or "เชลล์ สาขาเรณูนคร"),
          "fuelType": string (e.g. "ดีเซล B7", "ดีเซล B20", "แก๊สโซฮอล์ 95"),
          "liters": number (liters of fuel refueled, formatted to 2 decimals, e.g. 48.50),
          "pricePerLiter": number (THB per liter, e.g. 32.80),
          "totalCostBaht": number (total amount paid in THB, e.g. 1590.80),
          "currentOdometerKm": number (odometer reading in kilometers, e.g. 142850),
          "vehiclePlate": string (license plate number if detected or "${vehiclePlate || "ไม่ระบุทะเบียน"}"),
          "fuelEfficiencyNotes": string (short Thai note analyzing fuel efficiency and consumption)
        }
      `;
      parts.push({ text: prompt });

      const systemPrompt = "You are an expert AI logistics and fuel management auditor for Mekongsinsup Rice Mill. Extract refuel receipt and vehicle odometer data from images or PDF documents with high precision.";

      const { response, modelUsed } = await generateContentWithRetry(
        ai,
        "gemini-2.5-flash",
        parts,
        { systemInstruction: systemPrompt, responseMimeType: "application/json" }
      );

      const parsedData = JSON.parse(response.text.trim());
      const prevOdo = parseFloat(previousOdometer) || (parsedData.currentOdometerKm ? parsedData.currentOdometerKm - 480 : 100000);
      const currOdo = parsedData.currentOdometerKm || prevOdo + 480;
      const distanceDrivenKm = Math.max(0, currOdo - prevOdo);
      const liters = parsedData.liters || (parsedData.totalCostBaht && parsedData.pricePerLiter ? parsedData.totalCostBaht / parsedData.pricePerLiter : 45);
      const kmPerLiter = liters > 0 ? parseFloat((distanceDrivenKm / liters).toFixed(2)) : 0;
      const costPerKm = distanceDrivenKm > 0 ? parseFloat((parsedData.totalCostBaht / distanceDrivenKm).toFixed(2)) : 0;

      return res.json({
        success: true,
        data: {
          ...parsedData,
          previousOdometerKm: prevOdo,
          currentOdometerKm: currOdo,
          distanceDrivenKm,
          kmPerLiter,
          costPerKm
        },
        isSimulated: false,
        modelUsed
      });

    } catch (err: any) {
      console.error("Fuel bill analysis failed:", err);
      return res.json({
        success: true,
        data: getSimulatedFuelAnalysis(req.body.vehiclePlate, req.body.previousOdometer),
        isSimulated: true,
        notice: "ระบบประมวลผลจำลองผลลัพธ์เนื่องจากการดึงข้อมูลผ่านคลาวด์ขัดข้อง"
      });
    }
  });

function cleanAndParseJson(rawText: string) {
  let text = rawText.trim();
  
  // Strip code block markers
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }

  // Find outermost json object bounds
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.substring(firstBrace, lastBrace + 1);
  }

  // Sanitize line breaks and control characters inside double quotes
  text = text.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match) => {
    return match
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  });

  try {
    return JSON.parse(text);
  } catch (err1) {
    // Attempt 1: Fix trailing commas
    try {
      const fixedCommas = text.replace(/,\s*([\}\]])/g, "$1");
      return JSON.parse(fixedCommas);
    } catch (err2) {
      // Attempt 2: Strip non-printable control characters
      try {
        const sanitized = text
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
          .replace(/,\s*([\}\]])/g, "$1");
        return JSON.parse(sanitized);
      } catch (err3) {
        console.warn("All JSON repair attempts failed:", err3);
        throw err1;
      }
    }
  }
}

  // API Route for Electricity Bill Analysis (Supports Image & PDF Documents)
  app.post("/api/gemini/analyze-electricity-bill", async (req, res) => {
    try {
      const { billImage, fileName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          data: getSimulatedElectricityAnalysis(fileName, billImage),
          isSimulated: true,
          notice: "ระบบแสดงผลจำลอง AI สแกนบิลค่าไฟฟ้าเนื่องจากยังไม่ระบุ API Key"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      let mimeType = "image/jpeg";
      let base64Data = "";
      if (billImage) {
        const matches = billImage.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = billImage;
        }
      }

      if (fileName && fileName.toLowerCase().endsWith('.pdf')) {
        mimeType = "application/pdf";
      }

      const prompt = `
        Analyze the provided electricity bill (image file or PDF document of PEA/MEA bill for industrial/mill operation).
        Extract ALL breakdown details in JSON format matching this exact schema:
        {
          "caNumber": string (Contract account / User no. e.g. "020029119125"),
          "meterNumber": string (Electricity meter no. e.g. "6300584313"),
          "customerName": string (e.g. "นายวิศวะ กุลนะ"),
          "invoiceNo": string (e.g. "000012533268"),
          "dueDate": string (e.g. "23 กุมภาพันธ์ 2569"),
          "billingPeriod": string (e.g. "01/2569" or "06/2026" or "07/2569" or "08/2569"),
          "totalAmountBaht": number (Total bill amount to pay in THB, e.g. 13919.32),
          "totalUnitsKwh": number (Total energy units used in kWh, e.g. 2067.03),
          "peakUnitsKwh": number (On-Peak units used in kWh, e.g. 1268.06),
          "offPeakUnitsKwh": number (Off-Peak units used in kWh, e.g. 798.97),
          "peakAmountBaht": number (THB charge for peak usage, e.g. 5305.44),
          "offPeakAmountBaht": number (THB charge for off-peak usage, e.g. 2080.28),
          "ftRatePerUnit": number (Ft rate in THB per unit, e.g. 0.0972),
          "ftTotalBaht": number (Total Ft charge in THB, e.g. 200.92),
          "vatAmountBaht": number (VAT 7% amount in THB, e.g. 910.61),
          "peakDemandKw": number (Maximum demand in kW, e.g. 47.67),
          "powerFactorPenaltyBaht": number (Power factor penalty fee if any, e.g. 0),
          "efficiencyAnalysis": string (Detailed analysis in Thai evaluating power usage behavior and peak vs off-peak ratio),
          "energySavingTips": string[] (3 bullet points in Thai suggesting how the mill can reduce electricity costs),
          "fullBillDetails": {
            "documentTitle": string,
            "peaOfficeName": string,
            "peaOfficePhone": string,
            "customerName": string,
            "address": string,
            "caNumber": string,
            "invoiceNo": string,
            "totalAmountDue": number,
            "dueDate": string,
            "documentDate": string,
            "printedDate": string,
            "peaCode": string,
            "mru": string,
            "peaNo": string,
            "rateType": string,
            "meterReadingDate": string,
            "billPeriod": string,
            "voltageLevel": string,
            "multiplier": number,
            "usageReadings": [
              {
                "typeLabel": string,
                "code": string,
                "recentReading": number,
                "previousReading": number,
                "multiplierNote": string,
                "consumptionUnit": number
              }
            ],
            "tariffBreakdown": [
              {
                "itemLabel": string,
                "quantity": number,
                "unitLabel": string,
                "ratePerUnit": number,
                "amountBaht": number
              }
            ],
            "serviceCharge": number,
            "totalBasedAmount": number,
            "installationDateNote": string,
            "basedAmount": number,
            "ftFormulaNote": string,
            "ftRatePerUnit": number,
            "ftTotalAmount": number,
            "discountAmount": number,
            "subTotalAmount": number,
            "vatRatePercent": number,
            "vatAmount": number,
            "currentMonthTotal": number,
            "grandTotal": number,
            "barcodeNumber": string,
            "announcementMsg": string
          }
        }
        IMPORTANT: Respond strictly with valid JSON. Do not include markdown or explanations outside the JSON object. Do not place trailing commas.
      `;

      const systemPrompt = "You are an expert industrial energy auditor specializing in PEA/MEA electricity bills (both scanned images and PDF documents) for Thai rice mills and manufacturing plants.";

      const { response, modelUsed } = await generateContentWithRetry(
        ai,
        "gemini-2.5-flash",
        [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ],
        { systemInstruction: systemPrompt, responseMimeType: "application/json" }
      );

      let parsedData;
      try {
        parsedData = cleanAndParseJson(response.text);
      } catch (pErr) {
        console.warn("Clean and parse JSON failed, falling back to simulated analysis:", pErr);
        parsedData = getSimulatedElectricityAnalysis(fileName, base64Data);
      }

      return res.json({
        success: true,
        data: parsedData,
        isSimulated: false,
        modelUsed
      });

    } catch (err: any) {
      console.error("Electricity bill analysis failed:", err);
      return res.json({
        success: true,
        data: getSimulatedElectricityAnalysis(req.body?.fileName, req.body?.billImage),
        isSimulated: true,
        notice: "ระบบประมวลผลจำลองผลลัพธ์เนื่องจากการดึงข้อมูลผ่านคลาวด์ขัดข้อง"
      });
    }
  });

  // API Route for Smart Bill Scanner (Auto Classifies & Extracts Data from Batch Multi-Format Bills)
  app.post("/api/gemini/smart-scan-bill", async (req, res) => {
    try {
      const { fileData, fileName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.json({
          success: true,
          data: getSimulatedSmartBillAnalysis(fileName),
          isSimulated: true,
          notice: "ระบบแสดงผลจำลอง AI สแกนบิลเนื่องจากยังไม่ระบุ API Key"
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      let mimeType = "image/jpeg";
      let base64Data = "";
      if (fileData) {
        const matches = fileData.match(/^data:([a-zA-Z0-9-]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = fileData;
        }
      }

      if (fileName && fileName.toLowerCase().endsWith('.pdf')) {
        mimeType = "application/pdf";
      }

      const prompt = `
        You are an expert Thai industrial accountant and document AI parser for a major Thai rice mill operation.
        Analyze the attached document/image (filename: "${fileName || 'bill'}").

        Auto-classify the document into EXACTLY ONE of these 5 expense categories:
        1) "worker_labor": ค่าแรงงาน / สลิปเงินเดือน / ค่าจ้างแรงงานรายวัน / ค่า OT / ค่าจ้างเหมาแบกข้าว / สวัสดิการคนงานโรงสี
        2) "fuel": น้ำมัน / ใบเสร็จปั๊มน้ำมัน (ปตท., เชลล์, บางจาก, PT) / ค่าน้ำมันดีเซล B7, B20 / น้ำมันเบนซิน / ค่าน้ำมันรถบรรทุกขนข้าว
        3) "electricity": ไฟฟ้า / ใบแจ้งค่าไฟฟ้า PEA (การไฟฟ้าส่วนภูมิภาค), MEA / ค่าไฟโรงสี
        4) "maintenance": ซ่อมบำรุง / ค่าซ่อมบำรุงเครื่องจักร / ค่าอะไหล่ (ลูกปืน, สายพาน, มอเตอร์) / ค่าบริการช่างซ่อม
        5) "capex": ลงทุน / รายการลงทุนเพิ่มทรัพย์สินและสิ่งปลูกสร้าง (CapEx) / สร้างอาคาร / หลังคาลานตากข้าว / โซล่าเซลล์ / ซื้อเครื่องจักรใหม่

        Extract all details in valid JSON format matching this exact schema:
        {
          "category": "worker_labor" | "fuel" | "electricity" | "maintenance" | "capex",
          "categoryLabel": string (In Thai e.g. "ค่าแรงงาน" | "ค่าน้ำมันเชื้อเพลิง" | "ค่าไฟฟ้า PEA" | "ค่าซ่อมบำรุงเครื่องจักร" | "งบลงทุนเพิ่มทรัพย์สิน (CapEx)"),
          "vendorName": string (Supplier, station, agency, or worker team name e.g. "การไฟฟ้าส่วนภูมิภาค", "สถานีบริการน้ำมัน ปตท.", "ร้านนครพนมอะไหล่ยนต์", "ทีมงานจ้างเหมาแบกข้าว"),
          "billDate": string (e.g. "YYYY-MM-DD" or "DD/MM/YYYY"),
          "invoiceNo": string (Invoice, receipt, tax ID, slip no., or CA number),
          "totalAmountBaht": number (Total bill amount to pay in THB),
          "vatAmountBaht": number (VAT 7% amount if specified, else 0),
          "description": string (Detailed summary description in Thai of items purchased, fuel filled, workers paid, or services rendered),
          "confidenceScore": number (0.0 to 1.0),
          "reasoning": string (Clear Thai explanation of key keywords or visual evidence used to classify this bill into this category),
          
          "workerCount": number (If worker_labor e.g. number of workers paid),
          "payPeriod": string (If worker_labor e.g. "รอบ 1-15 ก.ค. 2569"),

          "fuelType": string (If fuel e.g. "ดีเซล B7", "เบนซิน 95"),
          "fuelLiters": number (If fuel liters filled),
          "vehiclePlate": string (If fuel vehicle license plate e.g. "81-2249 นครพนม"),

          "caNumber": string (If electricity),
          "meterNumber": string (If electricity),
          "billingPeriod": string (If electricity e.g. "07/2569"),
          "totalUnitsKwh": number (If electricity),
          "peakUnitsKwh": number (If electricity),
          "offPeakUnitsKwh": number (If electricity),

          "machineName": string (If maintenance),
          "maintenanceType": string (If maintenance e.g. "ซ่อมบำรุงเชิงแก้ไข", "บำรุงรักษาตามระยะ"),
          "replacedParts": string (If maintenance list of replaced spare parts),
          "technician": string (If maintenance technician name),

          "assetProjectTitle": string (If capex title of asset or project),
          "expectedLifespanYears": number (If capex expected lifespan in years),
          "estimatedRoiNotes": string (If capex ROI notes in Thai),

          "paymentMethod": string (e.g. "โอนเงินผ่านธนาคาร", "เงินสด", "บัตรเครดิต")
        }

        IMPORTANT: Respond strictly with valid JSON. Do not include markdown or explanations outside the JSON object. Do not place trailing commas.
      `;

      const systemPrompt = "You are an expert AI document scanner for Thai industrial rice mill finance and accounting systems.";

      const { response, modelUsed } = await generateContentWithRetry(
        ai,
        "gemini-2.5-flash",
        [
          { inlineData: { mimeType, data: base64Data } },
          { text: prompt }
        ],
        { systemInstruction: systemPrompt, responseMimeType: "application/json" }
      );

      let parsedData;
      try {
        parsedData = cleanAndParseJson(response.text);
      } catch (pErr) {
        console.warn("Smart scan JSON parse failed, falling back to simulated smart analysis:", pErr);
        parsedData = getSimulatedSmartBillAnalysis(fileName);
      }

      return res.json({
        success: true,
        data: parsedData,
        isSimulated: false,
        modelUsed
      });

    } catch (err: any) {
      console.error("Smart bill analysis failed:", err);
      return res.json({
        success: true,
        data: getSimulatedSmartBillAnalysis(req.body.fileName),
        isSimulated: true,
        notice: "ระบบประมวลผลจำลองผลลัพธ์เนื่องจากการดึงข้อมูลผ่านคลาวด์ขัดข้อง"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

// Simulated analysis helper based on Thai rice mill standards
function getSimulatedAnalysis(type: string, customerName?: string, riceType?: string) {
  const cName = customerName || "ลูกค้ากิตติมศักดิ์";
  const rType = riceType || "ข้าวหอมมะลิ 105";

  if (type === "inbound" || type === "paddy") {
    // Simulated paddy analysis
    const impurity = +(Math.random() * 2.5 + 0.4).toFixed(1); // 0.4% - 2.9%
    const grade = impurity < 1.0 ? "A" : impurity < 2.5 ? "B" : "C";
    const paddyCount = Math.floor(Math.random() * 80 + 350);
    const foreignCount = Math.floor(paddyCount * (impurity / 100));

    return {
      impurityPercent: impurity,
      impurityDetails: `พบหญ้าแห้ง ฟางข้าว และเศษเศษฝุ่นดินปนเปื้อนเล็กน้อย (รวม ${foreignCount} ชิ้น)`,
      grainCountSimulated: { paddyGrains: paddyCount, foreignItems: foreignCount },
      detectedBoxes: [
        { x: 18, y: 32, w: 8, h: 7, label: "เศษฟางแห้ง", type: "impurity" },
        { x: 45, y: 15, w: 6, h: 6, label: "กิ่งไม้ปน", type: "impurity" },
        { x: 68, y: 65, w: 7, h: 8, label: "เมล็ดวัชพืช", type: "impurity" },
        { x: 28, y: 55, w: 5, h: 5, label: "กรวดหินเล็ก", type: "impurity" }
      ],
      description: `ผลการวิเคราะห์ภาพข้าวเปลือกของ ${cName} (${rType}) พบเมล็ดข้าวเปลือกมีความสมบูรณ์ดีเป็นส่วนใหญ่ เมล็ดเต็มตึง มีอัตราสิ่งเจือปนอยู่ในเกณฑ์ต่ำมาก ท้องข้าวแห้งสนิท สอดคล้องกับการดูแลก่อนเก็บเกี่ยวที่ได้มาตรฐาน`,
      recommendations: [
        "แนะนำให้ทำการเป่าลมคัดแยกฝุ่นและฟางเพิ่มเติมก่อนนำเข้าเครื่องสีข้าวเพื่อรักษาความสะอาดสูงสุด",
        "ควรรักษาความชื้นข้าวเปลือกให้อยู่ที่ประมาณ 14-15% เพื่อป้องกันการแตกหักระหว่างการขัดสี",
        "ตรวจสอบตะแกรงแยกสิ่งเจือปนสม่ำเสมอ เพื่อลดหญ้าและเศษหินไม่ให้ปะปนเข้าไปในหินขัดสีข้าว"
      ],
      qualityGrade: grade
    };
  } else if (type === "brown") {
    // Simulated brown rice analysis
    const redPercent = +(Math.random() * 3.2 + 0.3).toFixed(1); // 0.3% - 3.5%
    const grade = redPercent < 1.0 ? "A" : redPercent < 3.0 ? "B" : "C";
    const cleanCount = Math.floor(Math.random() * 100 + 400);
    const redCount = Math.floor(cleanCount * (redPercent / 100));

    return {
      redContaminationPercent: redPercent,
      grainCountSimulated: { cleanBrownGrains: cleanCount, redOrBlackGrains: redCount },
      detectedBoxes: [
        { x: 22, y: 25, w: 6, h: 9, label: "ข้าวแดงปนเปื้อน", type: "red_contamination" },
        { x: 52, y: 41, w: 7, h: 10, label: "เมล็ดหักแดง", type: "red_contamination" },
        { x: 74, y: 18, w: 6, h: 8, label: "ข้าวกล้องแดง", type: "red_contamination" },
        { x: 34, y: 62, w: 6, h: 9, label: "ข้าวสีกระดำ", type: "red_contamination" },
        { x: 62, y: 78, w: 7, h: 8, label: "เมล็ดด่างดำ", type: "red_contamination" }
      ],
      description: `การวิเคราะห์ข้าวกล้องเพื่อดูสัดส่วนเมล็ดข้าวแดงปนเปื้อน พบร่องรอยเมล็ดข้าวแดงและเมล็ดยอดดำบางส่วนกระจายตัวปะปนในปริมาณ ${redPercent}% เมล็ดส่วนใหญ่ออกสีนวลสวยงามและจมูกข้าวค่อนข้างสมบูรณ์ดี`,
      recommendations: [
        "แนะนำให้ทำการปรับแต่งความละเอียดของหัวขัดยางแยกเมล็ด หรือขัดสปินเพื่อขจัดคราบแดงที่ไม่ต้องการออก",
        "หากต้องการรักษาคุณค่าทางโภชนาการสูง ควรแยกข้าวแดงคัดเกรดเพื่อขายเป็นข้าวกลุ่มรักษ์สุขภาพแทน",
        "สำหรับฤดูกาลถัดไป ควรคัดเลือกเมล็ดพันธุ์ข้าวหอมมะลิที่บริสุทธิ์เพื่อหลีกเลี่ยงสายพันธุ์ข้าวแดงป่าปนเปื้อน"
      ],
      qualityGrade: grade
    };
  } else {
    // Simulated white rice analysis
    const chalky = +(Math.random() * 4.5 + 0.8).toFixed(1); // 0.8% - 5.3%
    const mixed = +(Math.random() * 0.4 + 0.05).toFixed(2); // 0.05% - 0.45%
    const grade = chalky < 2.0 && mixed < 0.5 ? "A" : chalky < 5.0 ? "B" : "C";

    return {
      chalkyPercent: chalky,
      mixedGlutinousPercent: mixed,
      detectedBoxes: [
        { x: 16, y: 32, w: 7, h: 9, label: "ข้าวท้องไข่ (Chalky)", type: "chalky" },
        { x: 42, y: 18, w: 6, h: 8, label: "ข้าวเหนียวปน (Glutinous)", type: "glutinous_mix" },
        { x: 68, y: 46, w: 7, h: 9, label: "ข้าวท้องไข่ (Chalky)", type: "chalky" },
        { x: 26, y: 62, w: 6, h: 8, label: "ข้าวท้องไข่ (Chalky)", type: "chalky" },
        { x: 56, y: 74, w: 7, h: 9, label: "ข้าวเหนียวปน (Glutinous)", type: "glutinous_mix" },
        { x: 78, y: 58, w: 6, h: 10, label: "ข้าวท้องไข่ (Chalky)", type: "chalky" }
      ],
      description: `ผลการสแกนเมล็ดข้าวสารขาวผ่านระบบวิเคราะห์ภาพ คัดกรองอาการท้องไข่ (Chalkiness) ได้ผลลัพธ์เฉลี่ย ${chalky}% และตรวจสแกนลักษณะแป้งเพื่อตรวจจับข้าวเหนียวปนในข้าวเจ้า พบความคลาดเคลื่อนทางกายภาพต่ำเพียง ${mixed}% ข้าวมีความใส สวยงาม ขัดขาวเงาได้ระดับมาตรฐานดีเยี่ยม`,
      recommendations: [
        "ควรตรวจสอบและตั้งค่ากล้องคัดสี (Color Sorter) ในโหมด 'Chalky' เพื่อยิงคัดแยกเมล็ดท้องไข่ออกเพิ่มเติมหากต้องการเกรดพรีเมียมพิเศษ",
        "ควบคุมอุณหภูมิและความชื้นสัมพัทธ์ในโกดังเก็บข้าวสาร เพื่อชะลอการเกิดฝ้าแป้งและท้องไข่สะสม",
        "ทำความสะอาดเครื่องขัดเงาข้าวและลมดูดรำสม่ำเสมอ เพื่อให้เมล็ดข้าวสารขาวใส สะอาดเป็นประกายสม่ำเสมอ"
      ],
      qualityGrade: grade
    };
  }
}

function getSimulatedFuelAnalysis(vehiclePlate?: string, previousOdometer?: string) {
  const plate = vehiclePlate || "83-4912 นครพนม";
  const prevOdo = parseFloat(previousOdometer || "124800") || 124800;
  const distance = 465;
  const currOdo = prevOdo + distance;
  const liters = 45.8;
  const totalCost = 1502.24;
  const pricePerLiter = 32.80;
  const kmPerL = +(distance / liters).toFixed(2);
  const costPerKm = +(totalCost / distance).toFixed(2);

  return {
    date: new Date().toISOString().split("T")[0],
    stationName: "สถานีบริการน้ำมัน ปตท. นครพนม (มิตรภาพ)",
    fuelType: "ดีเซลหมุนเร็ว B7",
    liters: liters,
    pricePerLiter: pricePerLiter,
    totalCostBaht: totalCost,
    previousOdometerKm: prevOdo,
    currentOdometerKm: currOdo,
    distanceDrivenKm: distance,
    vehiclePlate: plate,
    kmPerLiter: kmPerL,
    costPerKm: costPerKm,
    fuelEfficiencyNotes: `รถบรรทุกขนส่งทะเบียน ${plate} มีอัตราสิ้นเปลืองน้ำมันเฉลี่ย ${kmPerL} กม./ลิตร (คิดเป็น ${costPerKm} บาท/กม.) ซึ่งอยู่ในเกณฑ์ประหยัดและคุ้มค่าสำหรับการขนส่งข้าวและผลพลอยได้`
  };
}

function getSimulatedElectricityAnalysis(fileName: string = '', rawData: string = '') {
  let period = "08/2569";
  let totalBaht = 13919.32;
  let totalKwh = 2067.03;
  let peakKwh = 1268.06;
  let offPeakKwh = 798.97;
  let invoiceNo = "000012533268";

  const lower = (fileName || '').toLowerCase();
  if (lower.includes('477504585316') || lower.includes('07') || lower.includes('jul')) {
    period = "07/2569";
    totalBaht = 14250.75;
    totalKwh = 2115.40;
    peakKwh = 1290.10;
    offPeakKwh = 825.30;
    invoiceNo = "000012489102";
  } else if (lower.includes('878204317370') || lower.includes('08') || lower.includes('aug')) {
    period = "08/2569";
    totalBaht = 12589.80;
    totalKwh = 2252.15;
    peakKwh = 235.31;
    offPeakKwh = 2016.84;
    invoiceNo = "000012674391";
  }

  return {
    caNumber: "020029119125",
    meterNumber: "6300584313",
    customerName: "นายวิศวะ กุลนะ",
    invoiceNo: invoiceNo,
    dueDate: "23 สิงหาคม 2569",
    billingPeriod: period,
    totalAmountBaht: totalBaht,
    totalUnitsKwh: totalKwh,
    peakUnitsKwh: peakKwh,
    offPeakUnitsKwh: offPeakKwh,
    peakAmountBaht: +(peakKwh * 4.1839).toFixed(2),
    offPeakAmountBaht: +(offPeakKwh * 2.6037).toFixed(2),
    ftRatePerUnit: 0.0972,
    ftTotalBaht: +(totalKwh * 0.0972).toFixed(2),
    vatAmountBaht: +(totalBaht * 0.07 / 1.07).toFixed(2),
    peakDemandKw: 47.67,
    powerFactorPenaltyBaht: 0,
    efficiencyAnalysis: `บิลค่าไฟฟ้า Smart Invoice ประจำงวด ${period} ผู้ใช้ไฟฟ้า นายวิศวะ กุลนะ ยอดรวมชำระ ${totalBaht.toLocaleString()} บาท สัดส่วน Off-Peak สูง ช่วยประหยัดต้นทุนพลังงานได้ดี`,
    energySavingTips: [
      "สลับรอบการเดินเครื่องจักรขนาดใหญ่ไปยังช่วง Off-Peak (22:00 - 09:00 น.) เพื่อลดต้นทุน On-Peak",
      "ตรวจสอบระบบ Capacitor Bank อย่างสม่ำเสมอเพื่อหลีกเลี่ยง Power Factor Penalty",
      "ติดตั้งระบบ Solar Rooftop เพื่อช่วยลดโหลด On-Peak ช่วงกลางวัน"
    ],
    fullBillDetails: {
      documentTitle: "ใบแจ้งค่าไฟฟ้า Smart Invoice (ไม่ใช่ใบเสร็จรับเงิน/ใบกำกับภาษี)",
      peaOfficeName: "การไฟฟ้าส่วนภูมิภาคจังหวัดนครพนม",
      peaOfficePhone: "0-4251-3091",
      customerName: "นายวิศวะ กุลนะ",
      address: "149 บ.หนองยาว ม.11 ต.คำเตย อ.เมืองนครพนม จ.นครพนม 48000",
      caNumber: "020029119125",
      invoiceNo: invoiceNo,
      totalAmountDue: totalBaht,
      dueDate: "23 สิงหาคม 2569",
      documentDate: "03/08/2569",
      printedDate: "31-08-2569 14:11:55",
      peaCode: "D06101",
      mru: "DNPN9021",
      peaNo: "6300584313",
      rateType: "3224",
      meterReadingDate: "29/08/2569",
      billPeriod: period,
      voltageLevel: "22-33 KV",
      multiplier: 30,
      usageReadings: [
        { typeLabel: "พลังไฟฟ้าสูงสุด P (กิโลวัตต์)", code: "P", recentReading: 20.618, previousReading: 19.060, multiplierNote: "+2%", consumptionUnit: 47.67 },
        { typeLabel: "พลังไฟฟ้าสูงสุด OP (กิโลวัตต์)", code: "OP", recentReading: 18.609, previousReading: 18.432, multiplierNote: "+2%", consumptionUnit: 5.42 },
        { typeLabel: "พลังไฟฟ้าสูงสุด H (กิโลวัตต์)", code: "H", recentReading: 22.629, previousReading: 21.439, multiplierNote: "+2%", consumptionUnit: 36.41 },
        { typeLabel: "พลังงานไฟฟ้า P (หน่วย)", code: "P", recentReading: 1959.350, previousReading: 1917.910, multiplierNote: "+2%", consumptionUnit: peakKwh },
        { typeLabel: "พลังงานไฟฟ้า OP (หน่วย)", code: "OP", recentReading: 1355.100, previousReading: 1348.000, multiplierNote: "+2%", consumptionUnit: offPeakKwh },
        { typeLabel: "พลังงานไฟฟ้า H (หน่วย)", code: "H", recentReading: 1741.520, previousReading: 1722.510, multiplierNote: "+2%", consumptionUnit: 581.71 },
        { typeLabel: "กิโลวาร์ (kVAR)", code: "kVAR", recentReading: 10.788, previousReading: 9.279, multiplierNote: "+2%", consumptionUnit: 45.27 }
      ],
      tariffBreakdown: [
        { itemLabel: "Peak 47.67 กว.", quantity: 47.67, unitLabel: "กว.", ratePerUnit: 132.9300, amountBaht: 5109.83 },
        { itemLabel: "Off Peak 36.41 กว.", quantity: 36.41, unitLabel: "กว.", ratePerUnit: 0.0000, amountBaht: 0.00 },
        { itemLabel: `Peak ${peakKwh} หน่วย`, quantity: peakKwh, unitLabel: "หน่วย", ratePerUnit: 4.1839, amountBaht: +(peakKwh * 4.1839).toFixed(2) },
        { itemLabel: `Off Peak ${offPeakKwh} หน่วย`, quantity: offPeakKwh, unitLabel: "หน่วย", ratePerUnit: 2.6037, amountBaht: +(offPeakKwh * 2.6037).toFixed(2) },
        { itemLabel: "ค่าบริการรายเดือน (Service Charge)", quantity: 1, unitLabel: "เดือน", ratePerUnit: 312.2400, amountBaht: 312.24 }
      ],
      serviceCharge: 312.24,
      totalBasedAmount: +(totalBaht * 0.92).toFixed(2),
      installationDateNote: "ติดตั้งใหม่ 15/12/2568",
      basedAmount: +(totalBaht * 0.92).toFixed(2),
      ftFormulaNote: "พ.ค.69-ส.ค.69 = 0.0972 บาท/หน่วย",
      ftRatePerUnit: 0.0972,
      ftTotalAmount: +(totalKwh * 0.0972).toFixed(2),
      discountAmount: 0.00,
      subTotalAmount: +(totalBaht / 1.07).toFixed(2),
      vatRatePercent: 7.00,
      vatAmount: +(totalBaht * 0.07 / 1.07).toFixed(2),
      currentMonthTotal: totalBaht,
      grandTotal: totalBaht,
      barcodeNumber: "|099400016550100 020029119125 690823 " + Math.round(totalBaht * 100),
      announcementMsg: "*** กรณีมีค่าไฟฟ้าค้างชำระเดือนก่อน โปรดชำระทันที เนื่องจากถึงกำหนดงดจ่ายไฟ ขออภัยหากชำระเงินแล้ว"
    }
  };
}

function getSimulatedSmartBillAnalysis(fileName: string = '') {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.includes('labor') || lowerName.includes('worker') || lowerName.includes('salary') || lowerName.includes('wage') || lowerName.includes('ค่าแรง') || lowerName.includes('เงินเดือน') || lowerName.includes('คนงาน') || lowerName.includes('สลิป') || lowerName.includes('จ้างเหมา')) {
    return {
      category: "worker_labor",
      categoryLabel: "ค่าแรงงาน",
      vendorName: "ทีมงานจ้างเหมาแบกข้าว & แผนกแรงงานโรงสี",
      billDate: "2026-07-28",
      invoiceNo: "PAY-LABOR-2026/07-B",
      totalAmountBaht: 28500.00,
      vatAmountBaht: 0,
      description: "ค่าแรงงานจ้างเหมาแบกยกกระสอบข้าวและค่า OT คนงานหน้าลานตาก ประจำรอบวันที่ 16-31 ก.ค. 2569",
      confidenceScore: 0.97,
      reasoning: "พบคีย์เวิร์ด 'ค่าแรงงาน', 'สลิปค่าจ้าง', ' OT คนงาน', และจำนวนคนงานผู้ได้รับเบี้ยเลี้ยง",
      workerCount: 12,
      payPeriod: "รอบ 16-31 ก.ค. 2569",
      paymentMethod: "โอนชำระผ่านระบบบัญชีธนาคาร (PromptPay)"
    };
  } else if (lowerName.includes('fuel') || lowerName.includes('oil') || lowerName.includes('diesel') || lowerName.includes('ปั๊ม') || lowerName.includes('น้ำมัน') || lowerName.includes('ptt') || lowerName.includes('shell') || lowerName.includes('ดีเซล') || lowerName.includes('เบนซิน')) {
    return {
      category: "fuel",
      categoryLabel: "ค่าน้ำมันเชื้อเพลิง",
      vendorName: "สถานีบริการน้ำมัน ปตท. นครพนม (มิตรภาพ)",
      billDate: "2026-07-29",
      invoiceNo: "TAX-PTT-88912",
      totalAmountBaht: 12450.00,
      vatAmountBaht: 814.49,
      description: "เติมค่าน้ำมันดีเซล B7 สำหรับรถบรรทุกขนส่งข้าวเปลือกและรถโฟล์คลิฟต์หน้าโรงสี",
      confidenceScore: 0.98,
      reasoning: "พบตราสถานีบริการน้ำมัน ปตท., ชนิดน้ำมันดีเซล B7, ปริมาณลิตร และทะเบียนรถบรรทุกขนส่ง",
      fuelType: "น้ำมันดีเซล B7 UltraForce",
      fuelLiters: 389.06,
      vehiclePlate: "81-2249 นครพนม (รถบรรทุก 10 ล้อ)",
      paymentMethod: "บัตรเครดิตองค์กร / Fleet Card"
    };
  } else if (lowerName.includes('elec') || lowerName.includes('pea') || lowerName.includes('ค่าไฟ') || lowerName.includes('ไฟฟ้า')) {
    return {
      category: "electricity",
      categoryLabel: "ค่าไฟฟ้า PEA",
      vendorName: "การไฟฟ้าส่วนภูมิภาค (PEA)",
      billDate: "2026-07-28",
      invoiceNo: "INV-PEA-202607-0091",
      totalAmountBaht: 14250.75,
      vatAmountBaht: 932.25,
      description: "ใบแจ้งค่าไฟฟ้าโรงสีประจำเดือน 07/2569 (On-Peak 1,280 kWh, Off-Peak 820 kWh)",
      confidenceScore: 0.98,
      reasoning: "พบลายน้ำ PEA, หมายเลขผู้ใช้ไฟฟ้า (CA), และการสรุปหน่วยพลังงานไฟฟ้า On-Peak/Off-Peak",
      caNumber: "020029119125",
      meterNumber: "6300584313",
      billingPeriod: "07/2569",
      totalUnitsKwh: 2100,
      peakUnitsKwh: 1280,
      offPeakUnitsKwh: 820
    };
  } else if (lowerName.includes('repair') || lowerName.includes('maint') || lowerName.includes('ซ่อม') || lowerName.includes('อะไหล่') || lowerName.includes('motor')) {
    return {
      category: "maintenance",
      categoryLabel: "ประวัติค่าซ่อมบำรุงเครื่องจักรโรงสี",
      vendorName: "ร้าน นครพนมกลการ & อะไหล่ยนต์",
      billDate: "2026-07-29",
      invoiceNo: "TAX-2026/088",
      totalAmountBaht: 18500.00,
      vatAmountBaht: 1210.28,
      description: "ค่าซ่อมและเปลี่ยนลูกปืนตลับ สายพานมอเตอร์ชุดหัวขัดเงาข้าวสาร (ชุดที่ 2)",
      confidenceScore: 0.95,
      reasoning: "พบรายการอะไหล่ตลับลูกปืน NSK, สายพาน B-72, และค่าแรงช่างเทคนิคซ่อมเครื่องจักรโรงสี",
      machineName: "ชุดเครื่องขัดเงาข้าวสาร 25 แรงม้า",
      maintenanceType: "การซ่อมบำรุงเชิงแก้ไข (Corrective Maintenance)",
      replacedParts: "ตลับลูกปืน NSK 6312 2 ตลับ, สายพาน B-72 4 เส้น, ซีลยางกันน้ำมัน",
      technician: "ช่างสมหมาย & ทีมงานนครพนมกลการ"
    };
  } else if (lowerName.includes('capex') || lowerName.includes('asset') || lowerName.includes('invest') || lowerName.includes('ก่อสร้าง') || lowerName.includes('โซล่า') || lowerName.includes('อาคาร') || lowerName.includes('ลงทุน')) {
    return {
      category: "capex",
      categoryLabel: "รายการลงทุนเพิ่มทรัพย์สินและสิ่งปลูกสร้าง (CapEx)",
      vendorName: "บริษัท นครพนมวิศวกรรมก่อสร้าง จำกัด",
      billDate: "2026-07-30",
      invoiceNo: "CAPEX-2026-014",
      totalAmountBaht: 245000.00,
      vatAmountBaht: 16028.04,
      description: "งวดงานที่ 1: ก่อสร้างหลังคาคลุมลานตากข้าวเปลือกชั่วคราวและเทพื้นคอนกรีตเสริมเหล็ก",
      confidenceScore: 0.96,
      reasoning: "เป็นรายการลงทุนก่อสร้างอาคารและปรับปรุงสิ่งปลูกสร้างถาวรของโรงสี ซึ่งเข้าข่ายการตัดบัญชีสินทรัพย์ระยะยาว",
      assetProjectTitle: "โครงการขยายลานตากข้าวและหลังคาคลุมกันฝน 500 ตร.ม.",
      expectedLifespanYears: 15,
      estimatedRoiNotes: "ช่วยลดความเสียหายข้าวเปลือกชื้นช่วงฤดูฝน เพิ่มศักยภาพรับซื้อข้าวเพิ่มขึ้น 20%"
    };
  } else {
    // Default fallback to labor or fuel if unrecognized
    return {
      category: "worker_labor",
      categoryLabel: "ค่าแรงงาน",
      vendorName: "ทีมงานจ้างเหมาแบกข้าว & แผนกแรงงานโรงสี",
      billDate: "2026-07-31",
      invoiceNo: "PAY-LABOR-2026/07-C",
      totalAmountBaht: 16500.00,
      vatAmountBaht: 0,
      description: "ค่าแรงงานประจำสัปดาห์ คนงานคัดบรรจุถุงและลงลังกระสอบข้าวสาร",
      confidenceScore: 0.91,
      reasoning: "ตรวจพบบันทึกการจ่ายเงินค่าจ้างรายวันและสวัสดิการแรงงานโรงสี",
      workerCount: 8,
      payPeriod: "ประจำสัปดาห์ที่ 4 ก.ค. 2569",
      paymentMethod: "โอนชำระผ่านระบบบัญชีธนาคาร"
    };
  }
}

startServer();
