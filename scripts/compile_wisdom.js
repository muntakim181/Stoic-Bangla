import { GoogleGenAI, Type } from "@google/genai";
import fs from "fs";
import path from "path";

// Initialize Gemini Client
// This uses your local process.env.GEMINI_API_KEY
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("\x1b[31mError: GEMINI_API_KEY is not set in your terminal environment variables.\x1b[0m");
  console.log("Please run standard export or set key in terminal:");
  console.log("  In bash/zsh (Mac/Linux): export GEMINI_API_KEY=\"your-key-here\"");
  console.log("  In PowerShell (Windows): $env:GEMINI_API_KEY=\"your-key-here\"\n");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const DB_PATH = path.resolve("./src/data/stoic_quotes.json");
const RAW_INPUT_PATH = path.resolve("./scripts/raw_quotes.txt");

// Ensure directories and files exist
if (!fs.existsSync(path.dirname(RAW_INPUT_PATH))) {
  fs.mkdirSync(path.dirname(RAW_INPUT_PATH), { recursive: true });
}

if (!fs.existsSync(RAW_INPUT_PATH)) {
  fs.writeFileSync(
    RAW_INPUT_PATH,
    `The soul becomes dyed with the color of its thoughts. - Marcus Aurelius\nNo man is free who is not master of himself. - Epictetus\nWe suffer more often in imagination than in reality. - Seneca\nSeek not that the things which happen should happen as you wish; but wish the things which happen to be as they are, and you will have a tranquil flow of life. - Epictetus\n`,
    "utf-8"
  );
  console.log(`\x1b[33mInitialized sample raw quotes file at: ${RAW_INPUT_PATH}\x1b[0m`);
}

// Read database
function readDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read database, starting fresh array", err);
    return [];
  }
}

// Write database
function writeDatabase(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    console.log(`\x1b[32mSuccessfully updated local database with ${data.length} total quotes.\x1b[0m`);
  } catch (err) {
    console.error("Failed to write to local database file", err);
  }
}

// Format English text helper to check duplicates
function cleanComparisonText(text) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function processQuote(rawText) {
  const cleanInput = rawText.trim();
  if (!cleanInput) return null;

  console.log(`\n\x1b[36m⚡ Translating and processing:\x1b[0m "${cleanInput}"`);

  const prompt = `
    You are an expert, classical Stoic scholar and elegant Bengali translator.
    Analyze the following quote, verify who said it, which work of Stoicism it belongs to (e.g., Meditations, Letters from a Stoic, Discourses, Enchiridion) and categorize it under one of these specific keys:
    "virtue", "control", "emotion", "death", "discipline", "resilience", "anger", "fate", "leadership", "suffering".

    Translate the quote to an incredibly elegant, comforting, and soul-healing Bengali translation.
    Then write an easy, warm Bengali explanation of its meaning.
    Identify any ancient analogies or metaphors (e.g. inner citadel, the flame, the pilot, wild waves) and explain it poetically in Bengali.
    Provide a simple, practical micro-meditation or mindfulness action plan in Bengali.

    Quote with context: "${cleanInput}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            english: {
              type: Type.STRING,
              description: "The refined, cleaned, exact English quote text without the author's name attached."
            },
            banglaTranslation: {
              type: Type.STRING,
              description: "The poetic, emotional, deep Bengali translation that is comforting to read."
            },
            banglaExplanation: {
              type: Type.STRING,
              description: "A friendly, warm explanation in Bengali explaining the deep meaning of the quote."
            },
            keyMetaphor: {
              type: Type.STRING,
              description: "Explanation of the metaphorical elements in Bengali (e.g. 'নৌকার পাল', 'বর্ম', 'ঝড়')."
            },
            actionableAdvice: {
              type: Type.STRING,
              description: "A short, actionable mindfulness exercise in Bengali to practice this quote right now."
            },
            author: {
              type: Type.STRING,
              description: "Verified author (e.g., Marcus Aurelius, Seneca, Epictetus, Musonius Rufus, Zeno)."
            },
            sourceText: {
              type: Type.STRING,
              description: "Source book name (e.g., 'Meditations', 'Letters from a Stoic', 'Discourses', 'Enchiridion')."
            },
            category: {
              type: Type.STRING,
              description: "Category matching exactly one of: 'virtue', 'control', 'emotion', 'death', 'discipline', 'resilience', 'anger', 'fate', 'leadership', 'suffering'."
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
            "category"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    console.error(`\x1b[31mx Error compiling quote:\x1b[0m`, error.message);
    return null;
  }
}

async function startCompilation() {
  console.log("\x1b[1m\x1b[35m=== STOIC WISDOM LOCAL DATA COMPILER ENGINE ===\x1b[0m");
  console.log(`Loading raw source: ${RAW_INPUT_PATH}`);

  if (!fs.existsSync(RAW_INPUT_PATH)) {
    console.log("No raw quotes found. Fill raw_quotes.txt and re-run.");
    return;
  }

  const rawContent = fs.readFileSync(RAW_INPUT_PATH, "utf-8");
  // Split by line or double lines safely
  const rawLines = rawContent
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 5);

  if (rawLines.length === 0) {
    console.log("raw_quotes.txt is empty. Add standard English phrases to translate.");
    return;
  }

  console.log(`Found ${rawLines.length} candidate quotes inside raw_quotes.txt.`);

  const database = readDatabase();
  console.log(`Currently loaded database has ${database.length} quotes.`);

  let addedCount = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    
    // Check duplicates in existing database
    const isDuplicate = database.some(
      (existing) =>
        cleanComparisonText(existing.english).includes(cleanComparisonText(rawLine)) ||
        cleanComparisonText(rawLine).includes(cleanComparisonText(existing.english))
    );

    if (isDuplicate) {
      console.log(`\x1b[30m[Skip ${i + 1}/${rawLines.length}] Duplicate detected: "${rawLine.slice(0, 30)}..."\x1b[0m`);
      continue;
    }

    const processed = await processQuote(rawLine);
    if (processed) {
      // Craft a clean, incremental ID
      const newId = `scraped_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const completedQuote = {
        id: newId,
        ...processed,
      };

      database.push(completedQuote);
      writeDatabase(database);
      addedCount++;

      // Wait 1 second to manage rate limits cleanly
      await new Promise((res) => setTimeout(res, 1000));
    }
  }

  console.log(`\n\x1b[35m=== COMPILATION COMPLETE ===\x1b[0m`);
  console.log(`Added: ${addedCount} new translated quotes. Total database pool size: ${database.length}`);
  console.log("You can now build and publish your serverless app for free!");
}

startCompilation();
