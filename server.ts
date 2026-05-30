import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { STOIC_QUOTES } from "./src/data/quotes.ts"; // Standard Node resolution requires JS or no-ts/tsx direct bundler suffix

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Guarded, lazy-loaded Gemini SDK initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
      throw new Error(
        "GEMINI_API_KEY is not configured yet. Please configure it in Settings > Secrets to unlock AI translations and mood advice."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ----------------------------------------------------
// API routes
// ----------------------------------------------------

// Paths for scraped quotes
const SCRAPED_FILE_PATH = path.join(process.cwd(), "src", "data", "scraped_quotes.json");

// Helper to read scraped quotes safely
function readScrapedQuotes(): any[] {
  try {
    if (fs.existsSync(SCRAPED_FILE_PATH)) {
      const data = fs.readFileSync(SCRAPED_FILE_PATH, "utf8");
      return JSON.parse(data || "[]");
    }
  } catch (err) {
    console.error("Error reading scraped quotes file:", err);
  }
  return [];
}

// 1. Get Curated Offline Quote Dataset (Static + Dynamically Scraped)
app.get("/api/quotes", (req: Request, res: Response) => {
  const scraped = readScrapedQuotes();
  res.json({ quotes: [...STOIC_QUOTES, ...scraped] });
});

// Helper to write scraped quotes safely
function writeScrapedQuotes(quotes: any[]): boolean {
  try {
    fs.writeFileSync(SCRAPED_FILE_PATH, JSON.stringify(quotes, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing scraped quotes file:", err);
    return false;
  }
}

// Get dynamically scraped quotes
app.get("/api/scraped-quotes", (req: Request, res: Response) => {
  const scraped = readScrapedQuotes();
  res.json({ quotes: scraped });
});

// Clear dynamically scraped quotes
app.post("/api/reset-scraped-quotes", (req: Request, res: Response) => {
  const success = writeScrapedQuotes([]);
  res.json({ success, message: "scraped database has been reset and cleared." });
});

// API to scrape ANY URL using Gemini's high-token extraction capabilities
app.post("/api/scrape-url", async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      res.status(400).json({ error: "অনুগ্রহ করে একটি সঠিক ওয়েব ইউআরএল প্রদান করুন (Please provide a valid http/https URL)." });
      return;
    }

    console.log(`Starting scrape of url: ${url}`);
    
    // Fetch the URL HTML structure with a default user agent
    const fetchResponse = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });

    if (!fetchResponse.ok) {
      throw new Error(`ওয়েবসাইটটি সাড়া দিচ্ছে না (Could not fetch page. Server returned HTTP ${fetchResponse.status})`);
    }

    const htmlText = await fetchResponse.text();
    // Sanitize high-size html to fit nicely to prevent network strain
    const sanitizedHtml = htmlText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .substring(0, 160000); // Take first 160k chars to keep it within safe token size

    const ai = getAiClient();
    const existingScraped = readScrapedQuotes();
    const existingCombinedKeys = new Set([
      ...STOIC_QUOTES.map(q => q.english.toLowerCase().replace(/[^a-z0-9]/g, "")),
      ...existingScraped.map((q: any) => q.english.toLowerCase().replace(/[^a-z0-9]/g, ""))
    ]);

    const prompt = `Below is the raw HTML content scraped from the URL: "${url}".
Please analyze this HTML, extract up to 15 authentic historical Stoic or philosophical wisdom quotes present on this page.
For each extracted quote:
1. Extract the raw English quote.
2. Formulate a smooth, poetic, comforting, and highly precise Bangla translation.
3. Formulate a comforting, warm, and highly conversational Bangla explanation of the quote's core meaning (answering what is the daily practical impact).
4. Unpack any complex metaphor or term in simple Bangla.
5. Create a micro-meditation action step that a modern reader feeling sad, lonely, or empty can practice immediately.
6. Identify the author (Marcus Aurelius, Seneca, Epictetus, Zeno, etc.), the source text work if possible, and select the best matching category from: virtue, control, emotion, death, discipline, resilience, anger, fate, leadership, suffering.

Return them as a JSON array of objects. Do not invent any quotes that do not appear on the webpage or are not aligned with historical stoicism. Here is the HTML:

${sanitizedHtml}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an advanced data extraction agent and Stoic philosopher. Analyze HTML inputs, pull list of real wisdom quotes, translate them, and return a clean JSON array matching the specified schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING, description: "Original quote extracted from HTML in English" },
              banglaTranslation: { type: Type.STRING, description: "simplified and comforting translation in Bangla" },
              banglaExplanation: { type: Type.STRING, description: "Supportive conversational Bangla explanation" },
              keyMetaphor: { type: Type.STRING, description: "Unpack of metaphor or terms in simple Bangla" },
              actionableAdvice: { type: Type.STRING, description: "Actionable daily mental or physical practice in Bangla" },
              author: { type: Type.STRING, description: "Historical author" },
              sourceText: { type: Type.STRING, description: "Historical source work if traceable" },
              category: { type: Type.STRING, description: "virtue, control, emotion, death, discipline, resilience, anger, fate, leadership, or suffering" }
            },
            required: ["english", "banglaTranslation", "banglaExplanation", "keyMetaphor", "actionableAdvice", "author", "category"]
          }
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("এআই ডাটা নিষ্কাশন করতে ব্যর্থ হয়েছে (AI extraction failed).");
    }

    const newExtractedQuotes = JSON.parse(outputText.trim());
    const savedList = [...existingScraped];
    const duplicatesSkipped: string[] = [];
    const addedQuotes: any[] = [];

    for (const q of newExtractedQuotes) {
      const canonicalKey = q.english.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (existingCombinedKeys.has(canonicalKey)) {
        duplicatesSkipped.push(q.english);
        continue;
      }
      
      const formatQuote = {
        id: `scraped-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        english: q.english,
        banglaTranslation: q.banglaTranslation,
        banglaExplanation: q.banglaExplanation,
        keyMetaphor: q.keyMetaphor,
        actionableAdvice: q.actionableAdvice,
        author: q.author || "Unknown Stoic",
        sourceText: q.sourceText || "Fragments / Oral Tradition",
        category: q.category || "resilience",
        context: `Scraped from ${url}`
      };

      savedList.push(formatQuote);
      addedQuotes.push(formatQuote);
      existingCombinedKeys.add(canonicalKey);
    }

    writeScrapedQuotes(savedList);

    res.json({
      success: true,
      addedCount: addedQuotes.length,
      skippedCount: duplicatesSkipped.length,
      scrapedQuotes: addedQuotes,
      totalScrapedStored: savedList.length
    });

  } catch (error: any) {
    console.error("Scrape URL error:", error);
    res.status(500).json({ error: error.message || "ওয়েবসাইট স্ক্র্যাপ করার প্রক্রিয়াটি সম্পন্ন করা যায়নি।" });
  }
});

// API for intelligent auto-generation of fresh historic Stoic translations (Bulk-Build 1000+)
app.post("/api/bulk-generate-quotes", async (req: Request, res: Response): Promise<void> => {
  try {
    const { quantity } = req.body;
    const batchSize = Math.min(Math.max(quantity || 25, 5), 45); // Safe batch bounds (5 - 45) to ensure API limits are not crossed
    
    console.log(`Instructing bulk generation of ${batchSize} quality translated Stoic quotes`);

    const ai = getAiClient();
    const existingScraped = readScrapedQuotes();
    const totalPrevious = STOIC_QUOTES.length + existingScraped.length;

    // Send a sample of existing english quote snippets to avoid repeats
    const combinedSample = [
      ...STOIC_QUOTES.map(q => q.english),
      ...existingScraped.map((q: any) => q.english)
    ].slice(-50); // Send last 50 to avoid repeating recent ones

    const prompt = `You are a world-renowned classics scholar on Stoic Philosophy.
Generate exactly ${batchSize} historically authentic, original quotes by Marcus Aurelius, Seneca, Epictetus, Zeno, Cleanthes, Musonius Rufus, or Hierocles that are NOT in this list of already included quotes (do not repeat these or close paraphrases):
${JSON.stringify(combinedSample)}

For each of the ${batchSize} quotes:
1. original english text (real historical quote).
2. beautiful, poetic, comforting and highly relatable Bangla translation.
3. deep, modern, plain conversational Bangla explanation (what it means for everyday anxiety, sadness, coldness, or exhaustion).
4. breaking down any metaphor or vocabulary in Bangla.
5. an actionable micro-meditation practice in Bangla.
6. the real author's name, their source text book (e.g. Meditations, Letters from a Stoic, Discourses, Fragment), and a category from: virtue, control, emotion, death, discipline, resilience, anger, fate, leadership, suffering.

Return a solid JSON array. Do not invent fake quotes; use authentic classical teachings.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You generate authentic classic Stoic quotes, translate them, and write deeply comforting Bangla explanations matching our exact JSON schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              english: { type: Type.STRING, description: "Authentic historical quote in English" },
              banglaTranslation: { type: Type.STRING, description: "Comforting Bangla translation" },
              banglaExplanation: { type: Type.STRING, description: "Warm everyday explanation in Bangla" },
              keyMetaphor: { type: Type.STRING, description: "Unpacking is metaphor/virtue concept in Bangla" },
              actionableAdvice: { type: Type.STRING, description: "Daily micro-meditation task in Bangla" },
              author: { type: Type.STRING, description: "Marcus Aurelius, Seneca, Epictetus, etc." },
              sourceText: { type: Type.STRING, description: "Meditations, Discourses, On Anger, etc." },
              category: { type: Type.STRING, description: "virtue, control, emotion, death, discipline, resilience, anger, fate, leadership, or suffering" }
            },
            required: ["english", "banglaTranslation", "banglaExplanation", "keyMetaphor", "actionableAdvice", "author", "sourceText", "category"]
          }
        }
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("এআই বাল্ক কোট তৈরি করতে ব্যর্থ হয়েছে।");
    }

    const generatedArr = JSON.parse(outputText.trim());
    const savedList = [...existingScraped];
    const existingCombinedKeys = new Set([
      ...STOIC_QUOTES.map(q => q.english.toLowerCase().replace(/[^a-z0-9]/g, "")),
      ...existingScraped.map((q: any) => q.english.toLowerCase().replace(/[^a-z0-9]/g, ""))
    ]);

    const addedList: any[] = [];
    for (const q of generatedArr) {
      const canonicalKey = q.english.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (existingCombinedKeys.has(canonicalKey)) {
        continue;
      }

      const formatQuote = {
        id: `bulk-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        english: q.english,
        banglaTranslation: q.banglaTranslation,
        banglaExplanation: q.banglaExplanation,
        keyMetaphor: q.keyMetaphor,
        actionableAdvice: q.actionableAdvice,
        author: q.author,
        sourceText: q.sourceText,
        category: q.category || "discipline",
        context: "Batch Generated by AI Developer Hub"
      };

      savedList.push(formatQuote);
      addedList.push(formatQuote);
      existingCombinedKeys.add(canonicalKey);
    }

    writeScrapedQuotes(savedList);

    res.json({
      success: true,
      requestedCount: batchSize,
      addedCount: addedList.length,
      totalStoredNow: savedList.length,
      quotes: addedList
    });

  } catch (error: any) {
    console.error("Bulk generate error:", error);
    res.status(500).json({ error: error.message || "বাল্ক জেনারেশন প্রক্রিয়ায় কোনো অভ্যন্তরীণ ত্রুটি ঘটেছে।" });
  }
});

// 2. Translate and explain any custom English quote in simple Bangla layout
app.post("/api/translate", async (req: Request, res: Response): Promise<void> => {
  try {
    const { quoteText, author } = req.body;
    if (!quoteText || typeof quoteText !== "string" || quoteText.trim() === "") {
      res.status(400).json({ error: "অনুগ্রহ করে একটি উক্তি প্রদান করুন (Please provide a quote string)." });
      return;
    }

    const ai = getAiClient();
    const prompt = `You are a wise and highly compassionate Stoic scholar who speaks fluent, simplified, and deeply empathetic Bangla.

Please take the following English Stoic quote:
"${quoteText}" ${author ? `attributed to ${author}` : ""}

Translate it, explain its complex metaphors or ancient Stoic terminology, and unpack it into soothing, clean, and conversational Bangla for a reader who is feeling sad, numb, or overwhelmed.
Identify the correct author (like Marcus Aurelius, Seneca, Epictetus) and the source work if possible.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You translate Stoic philosophy into conversational, deep, comforting, and clear Bangla. Always break down complex metaphors so they are instantly relatable to modern Bangla speakers experiencing emotional distress.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            banglaTranslation: {
              type: Type.STRING,
              description: "A simple, poetic, comforting, and highly accurate translation of the quote in Bangla.",
            },
            banglaExplanation: {
              type: Type.STRING,
              description: "A warm, supportive, and comforting explanation of the core meaning in simple conversational Bangla.",
            },
            keyMetaphor: {
              type: Type.STRING,
              description: "Unpacking the main metaphor or concept (e.g. 'Dichotomy of Control', 'Memento Mori', 'The Inner Citadel') in simplified Bangla.",
            },
            actionableAdvice: {
              type: Type.STRING,
              description: "One single, small practical thing they can do right now to practice this wisdom, explained in Bangla.",
            },
            author: {
              type: Type.STRING,
              description: "The historical author of the quote (e.g. Marcus Aurelius, Seneca, Epictetus). If unknown, infer based on Stoic literature.",
            },
            sourceText: {
              type: Type.STRING,
              description: "The title of the primary work (e.g. Meditations, Letters from a Stoic, Discourses, Enchiridion) if recognizable.",
            },
            category: {
              type: Type.STRING,
              description: "One of the key categories: virtue, control, emotion, death, discipline, resilience, anger, fate, leadership, suffering.",
            }
          },
          required: [
            "banglaTranslation",
            "banglaExplanation",
            "keyMetaphor",
            "actionableAdvice",
            "author",
            "sourceText",
            "category",
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No response or content generated from Gemini.");
    }

    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Translate error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during translation.",
      isKeyMissing: !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY",
    });
  }
});

// 3. Generate or retrieve a classic Stoic quote based on the user's specific emotional state
app.post("/api/mood-quote", async (req: Request, res: Response): Promise<void> => {
  try {
    const { mood } = req.body;
    if (!mood || typeof mood !== "string") {
      res.status(400).json({ error: "অনূগ্রহ করে আপনার অনুভূতি নির্বাচন করুন (Please provide a valid mood state)." });
      return;
    }

    const ai = getAiClient();
    const prompt = `Focus on a historical quote by Marcus Aurelius, Seneca, or Epictetus that directly addresses a person feeling deeply "${mood}" (this could be sad, numb, overwhelmed, angry, anxious, lonely, or lost).

Provide a highly relevant, authentic historical quote in English, translate it to beautiful simplified Bangla, explain it dynamically with absolute empathy, and lay out an actionable micro-exercise. Do not invent fake quotes; use real teachings from Meditations, On Anger, Letters from a Stoic, Discourses, or Enchiridion that speak to this distress.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Stoic therapist and classicist helping a modern reader through difficult emotional times. You select real, authentic quotes and translate/comment on them in deeply comforting, practical Bangla.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            english: {
              type: Type.STRING,
              description: "The original historical quote in English."
            },
            banglaTranslation: {
              type: Type.STRING,
              description: "An authentic, elegant, and simplified Bangla translation.",
            },
            banglaExplanation: {
              type: Type.STRING,
              description: "A deeply sympathetic explanation of why this teaching helps when feeling the specified mood, written in plain conversational Bangla.",
            },
            keyMetaphor: {
              type: Type.STRING,
              description: "Breaks down any complex metaphors or terms into clear common terms in Bangla.",
            },
            actionableAdvice: {
              type: Type.STRING,
              description: "An actionable mental and physical daily exercise to relieve this mood immediately.",
            },
            author: {
              type: Type.STRING,
              description: "The historical author (Marcus Aurelius, Seneca, or Epictetus).",
            },
            sourceText: {
              type: Type.STRING,
              description: "The historical title of the source text.",
            },
            category: {
              type: Type.STRING,
              description: "The thematic category: virtue, control, emotion, death, discipline, resilience, anger, fate, leadership, suffering.",
            }
          },
          required: [
            "english",
            "banglaTranslation",
            "banglaExplanation",
            "keyMetaphor",
            "actionableAdvice",
            "author",
            "sourceText",
            "category",
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("No advice generated from Gemini.");
    }

    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Mood-quote error:", error);
    res.status(500).json({
      error: error.message || "An unexpected error occurred during wisdom generation.",
      isKeyMissing: !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY",
    });
  }
});

// Serve health status
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "healthy", apiConfigured: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY" });
});

// ----------------------------------------------------
// Vite and Frontend Asset Serving Integration
// ----------------------------------------------------
async function main() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in Development Mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in Production Mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Stoic Bangla Server running at http://0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start Stoic Bangla Server:", err);
});
