import STOIC_QUOTES_JSON from "./stoic_quotes.json";

export interface Quote {
  id: string;
  english: string;
  banglaTranslation: string;
  banglaExplanation: string;
  author: string;
  sourceText: string; // "Meditations", "Letters from a Stoic", "Discourses", "Enchiridion"
  category: "virtue" | "control" | "emotion" | "death" | "discipline" | "resilience" | "anger" | "fate" | "leadership" | "suffering" | string;
  context?: string;
  keyMetaphor?: string;
  actionableAdvice?: string;
}

export const STOIC_QUOTES: Quote[] = STOIC_QUOTES_JSON as Quote[];
