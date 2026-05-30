export interface Quote {
  id: string;
  english: string;
  banglaTranslation: string;
  banglaExplanation: string;
  author: string;
  sourceText: string;
  category: "virtue" | "control" | "emotion" | "death" | "discipline" | "resilience" | "anger" | "fate" | "leadership" | "suffering";
  context?: string;
}

export type StoicCategory =
  | "virtue"
  | "control"
  | "emotion"
  | "death"
  | "discipline"
  | "resilience"
  | "anger"
  | "fate"
  | "leadership"
  | "suffering";

export interface AIResult {
  english?: string; // Optional if translating a user quote
  banglaTranslation: string;
  banglaExplanation: string;
  keyMetaphor: string;
  actionableAdvice: string;
  author: string;
  sourceText: string;
  category: string;
}

export type ActiveTab = "daily" | "explore" | "mood-advice" | "about";

export interface UserMood {
  key: string;
  labelBangla: string;
  labelEnglish: string;
  emoji: string;
  colorClass: string;
}
