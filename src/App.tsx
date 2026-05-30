import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Compass,
  Languages,
  Heart,
  Info,
  Calendar,
  Search,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Quote as QuoteIcon,
  Smile,
  AlertCircle,
  BookMarked,
  ExternalLink,
  Database
} from "lucide-react";
import Header from "./components/Header.tsx";
import { STOIC_QUOTES, Quote } from "./data/quotes.ts";
import { ActiveTab, AIResult, UserMood } from "./types.ts";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("daily");

  // Combined Dataset States
  const [quotesPool, setQuotesPool] = useState<Quote[]>(STOIC_QUOTES);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState<boolean>(true);
  const [scrapingStats, setScrapingStats] = useState({ totalStatic: STOIC_QUOTES.length, totalScraped: 0 });

  // Daily quote indices
  const [dailyIndex, setDailyIndex] = useState<number>(0);
  const [expandDailyMeaning, setExpandDailyMeaning] = useState<boolean>(true);

  // Load merged list from local static pool directly (fully client-side & serverless!)
  const refreshDataset = async (selectRandom = false) => {
    try {
      if (STOIC_QUOTES && STOIC_QUOTES.length > 0) {
        setQuotesPool(STOIC_QUOTES);
        const compiledCount = STOIC_QUOTES.length;
        const baseCuratedCount = STOIC_QUOTES.filter(q => !q.id.startsWith("scraped")).length;
        setScrapingStats({
          totalStatic: baseCuratedCount,
          totalScraped: compiledCount - baseCuratedCount
        });

        if (selectRandom) {
          const rand = Math.floor(Math.random() * STOIC_QUOTES.length);
          setDailyIndex(rand);
        }
      }
    } catch (err) {
      console.error("Failed to load local quotes:", err);
    } finally {
      setIsLoadingQuotes(false);
    }
  };

  useEffect(() => {
    refreshDataset();
    // Choose a random quote on first load
    const timer = setTimeout(() => {
      refreshDataset(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Explore Tab State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [viewingQuoteDetails, setViewingQuoteDetails] = useState<Quote | null>(null);

  // Mood Healing Tab State
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodResult, setMoodResult] = useState<any | null>(null);
  const [isMoodLoading, setIsMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState<string | null>(null);

  // Preset suggestions for AI Translation
  const PRESET_QUOTES = [
    {
      english: "Difficulty is what wakes up the genius.",
      author: "Seneca",
    },
    {
      english: "Associate only with those who will make you a better person.",
      author: "Seneca",
    },
    {
      english: "If you are pained by any external thing, it is not this thing that disturbs you, but your own judgment about it.",
      author: "Marcus Aurelius",
    },
    {
      english: "First say to yourself what you would be; and then do what you have to do.",
      author: "Epictetus",
    }
  ];

  // System Mood List
  const MOODS: UserMood[] = [
    {
      key: "sad",
      labelBangla: "মন খারাপ ও বিষণ্ণতা",
      labelEnglish: "Sad / Numb",
      emoji: "😔",
      colorClass: "from-blue-950/40 to-slate-900/40 border-blue-900/30 text-blue-300"
    },
    {
      key: "overwhelmed",
      labelBangla: "অতিরিক্ত মানসিক চাপ",
      labelEnglish: "Overwhelmed",
      emoji: "🌀",
      colorClass: "from-indigo-950/40 to-slate-900/40 border-indigo-950 text-indigo-300"
    },
    {
      key: "angry",
      labelBangla: "ক্ষোভ ও তীব্র রাগ",
      labelEnglish: "Angry / Surly",
      emoji: "😡",
      colorClass: "from-red-950/30 to-slate-900/40 border-red-900/30 text-red-300"
    },
    {
      key: "anxious",
      labelBangla: "উৎকণ্ঠা ও কাল্পনিক ভয়",
      labelEnglish: "Anxious / Fearful",
      emoji: "😰",
      colorClass: "from-amber-950/30 to-slate-900/40 border-amber-900/30 text-amber-300"
    },
    {
      key: "lonely",
      labelBangla: "একাকীত্ব ও বিচ্ছিন্নতা",
      labelEnglish: "Lonely / Lost",
      emoji: "👤",
      colorClass: "from-purple-950/30 to-slate-900/40 border-purple-900/30 text-purple-300"
    },
    {
      key: "numb",
      labelBangla: "শূন্যতা ও অনুভূতিহীনতা",
      labelEnglish: "Numb / Empty",
      emoji: "🧊",
      colorClass: "from-emerald-950/30 to-slate-900/40 border-emerald-900/30 text-emerald-300"
    }
  ];

  // Handlers
  const handleNextQuote = () => {
    if (quotesPool.length === 0) return;
    setDailyIndex((prev) => (prev + 1) % quotesPool.length);
    setExpandDailyMeaning(true);
  };

  const handlePrevQuote = () => {
    if (quotesPool.length === 0) return;
    setDailyIndex((prev) => (prev - 1 + quotesPool.length) % quotesPool.length);
    setExpandDailyMeaning(true);
  };

  // Shuffle a random quote on demand for daily quote page
  const handleShuffleQuote = () => {
    if (quotesPool.length === 0) return;
    const rand = Math.floor(Math.random() * quotesPool.length);
    setDailyIndex(rand);
    setExpandDailyMeaning(true);
  };

  // Local Mood-To-Category Mapping for Serverless Healing Answers
  const MOOD_TO_CATEGORIES: Record<string, string[]> = {
    sad: ["suffering", "emotion", "resilience"],
    overwhelmed: ["control", "discipline", "resilience"],
    angry: ["anger", "control", "emotion"],
    anxious: ["control", "emotion", "fate"],
    lonely: ["suffering", "emotion"],
    numb: ["virtue", "discipline", "fate"]
  };

  const handleGetMoodAdvice = async (moodKey: string) => {
    setSelectedMood(moodKey);
    setIsMoodLoading(true);
    setMoodError(null);
    setMoodResult(null);

    // Simulate ancient Stoic advice selection with a slight, beautiful immersive delay
    setTimeout(() => {
      try {
        const targetCategories = MOOD_TO_CATEGORIES[moodKey] || [];
        const matchingQuotes = quotesPool.filter((q) =>
          targetCategories.includes(q.category)
        );

        // Fallback to random if no perfect category hit exists
        const candidates = matchingQuotes.length > 0 ? matchingQuotes : quotesPool;
        if (candidates.length === 0) {
          throw new Error("কোনো বাণী উপলব্ধ নেই। অনুগ্রহ করে প্রথমে ডেকোরেট স্ক্রিপ্টটি রান করান!");
        }

        const randomIndex = Math.floor(Math.random() * candidates.length);
        const selectedQuote = candidates[randomIndex];

        setMoodResult({
          english: selectedQuote.english,
          banglaTranslation: selectedQuote.banglaTranslation,
          banglaExplanation: selectedQuote.banglaExplanation,
          keyMetaphor: selectedQuote.keyMetaphor || "ইনার সিটাডেল বা ভেতরের অভেদ্য দুর্গ—যা বাইরের কোনো আক্রমণ দ্বারা ধ্বংস করা যায় না যতক্ষণ না আমরা ভেতরে প্রবেশ পথ খোলা রাখি।",
          actionableAdvice: selectedQuote.actionableAdvice || "চোখ বন্ধ করে শান্ত মনে ১ মিনিট থাকুন। নিজেকে বলুন: 'বাহ্যিক পরিস্থিতি আমার নিয়ন্ত্রণে নয়, কেবল আমার বিচারবুদ্ধিই আমার নিজের।'",
          author: selectedQuote.author,
          sourceText: selectedQuote.sourceText,
          category: selectedQuote.category,
        });
      } catch (err: any) {
        setMoodError(err.message || "পরামর্শ নির্ধারণে সাময়িক ত্রুটি ঘটেছে।");
      } finally {
        setIsMoodLoading(false);
      }
    }, 600);
  };

  // Filtered quotes in explore tab
  const filteredQuotes = quotesPool.filter((q) => {
    const matchesSearch =
      q.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.banglaTranslation.includes(searchQuery) ||
      q.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.banglaExplanation.includes(searchQuery) ||
      (q.context && q.context.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || q.category === selectedCategory;
    const matchesAuthor = selectedAuthor === "all" || q.author.toLowerCase() === selectedAuthor.toLowerCase();

    return matchesSearch && matchesCategory && matchesAuthor;
  });

  const categories = Array.from(new Set(quotesPool.map((q) => q.category)));
  const authors = Array.from(new Set(quotesPool.map((q) => q.author)));

  // Current Daily Quote Object
  const dailyQuote = quotesPool[dailyIndex] || STOIC_QUOTES[0];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#E0E0E0] flex flex-col relative selection:bg-[#C5A267] selection:text-black">
      {/* Golden accent linear highlight at the top */}
      <div className="h-1.5 w-full bg-gradient-to-r from-amber-950 via-[#C5A267] to-amber-950 sticky top-0 z-50"></div>

      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 sm:px-6 py-8 md:py-12 z-10 flex flex-col">
        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {/* 1. TAB: DAILY QUOTE */}
        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {activeTab === "daily" && (
          <div className="flex-1 flex flex-col justify-center items-center py-4 sm:py-8 max-w-3xl mx-auto w-full transition-opacity duration-300">
            {/* Header info bar */}
            <div className="flex justify-between items-center w-full border-b border-[#222222] pb-6 mb-8">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded bg-[#1A1A1A] text-[#C5A267] border border-[#C5A267]/20">
                  <Calendar className="w-4 h-4" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-[#888888]">
                  নিত্য স্তোইক আলোড়ন / Wisdom of the Day
                </span>
              </div>
              <span className="text-xs font-serif text-[#C5A267] border border-[#C5A267]/30 px-2.5 py-0.5 rounded-full bg-[#1A1A1A]">
                {dailyIndex + 1} / {quotesPool.length}
              </span>
            </div>

            {/* Immersive Quote Box */}
            <div className="space-y-10 w-full text-center">
              <div>
                <span className="text-8xl leading-none font-serif text-[#C5A267] opacity-15 select-none block h-8 -mt-4">“</span>
                <blockquote className="text-xl sm:text-2xl md:text-3xl font-light italic leading-relaxed text-[#F2F2F2] font-serif max-w-2xl mx-auto px-4 mt-2">
                  "{dailyQuote.english}"
                </blockquote>
              </div>

              {/* Bangla Translation with Deep Prominence */}
              <div className="pt-8 border-t border-[#1C1C1C] max-w-2xl mx-auto">
                <p className="text-2xl sm:text-3xl md:text-[32px] md:leading-snug text-[#E5E5E5] font-bengali-serif font-medium px-4">
                  {dailyQuote.banglaTranslation}
                </p>
              </div>

              {/* Gold divider and Author signature */}
              <div className="flex flex-col items-center gap-2 pt-4">
                <div className="h-[1.5px] w-14 bg-[#C5A267]"></div>
                <span className="text-lg tracking-widest uppercase font-serif font-bold text-[#E5E5E5] mt-1">
                  {dailyQuote.author}
                </span>
                <span className="text-xs italic text-[#888888] font-serif">
                  {dailyQuote.sourceText}
                </span>
              </div>

              {/* Interactive Metaphor Explanation and Actionable Advice */}
              <div className="mx-auto max-w-2xl w-full text-left bg-[#141414] border border-[#262626] rounded-xl p-5 md:p-7 shadow-2xl transition-all duration-300">
                <button
                  onClick={() => setExpandDailyMeaning(!expandDailyMeaning)}
                  className="flex items-center justify-between w-full text-[#C5A267] hover:text-[#D4B57E] transition-colors focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-5 h-5" />
                    <span className="font-bengali-serif text-base sm:text-lg font-semibold tracking-wide">
                      বাস্তব ব্যাখ্যা ও গভীর ভাবার্থ (Metaphor & Context)
                    </span>
                  </div>
                  {expandDailyMeaning ? (
                    <ChevronUp className="w-5 h-5 text-[#888888]" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-[#888888]" />
                  )}
                </button>

                {expandDailyMeaning && (
                  <div className="mt-4 pt-4 border-t border-[#262626] space-y-4 font-sans animate-fade-in">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[#888888] font-bold mb-1.5 flex items-center gap-1">
                        <span>•</span> সহজ বাংলায় তাৎপর্য:
                      </h4>
                      <p className="text-[#D1D1D1] text-base leading-relaxed font-sans font-normal pl-2 whitespace-pre-line">
                        {dailyQuote.banglaExplanation}
                      </p>
                    </div>

                    {dailyQuote.context && (
                      <div className="bg-[#0F0F0F] p-3.5 rounded-lg border border-[#222222]">
                        <h4 className="text-xs uppercase tracking-wider text-[#888888] font-serif font-bold mb-1 flex items-center gap-1">
                          <span className="text-[#C5A267]">CONTEXT & ANCIENT ORIGIN:</span>
                        </h4>
                        <p className="text-stone-400 text-xs sm:text-sm font-serif italic pl-1 leading-snug">
                          {dailyQuote.context}
                        </p>
                      </div>
                    )}

                    {/* Actionable Exercise Badge */}
                    <div className="bg-[#1C1710] border border-[#C5A267]/20 p-4 rounded-lg flex gap-3">
                      <div className="p-1 rounded bg-[#C5A267]/10 text-[#C5A267] h-fit mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-[#C5A267] font-bold mb-1">
                          TODAY'S STOIC ACTION / আজই চর্চা করুন:
                        </h4>
                        <p className="text-[#E0E0E0] text-[15px] font-sans leading-relaxed">
                          স্টোইক শিক্ষা কেবল পড়ার জন্য নয়। আজ কাজ করার সময় এই নীতিটি মনে রাখুন। যখনই কোনো অপ্রীতিকর পরিস্থিতির মুখোমুখি হবেন বা অনুভূতিহীন লাগবে, মনে মনে অন্তত ১০ সেকেন্ডের জন্য বলুন— "এটি আমার নিয়ন্ত্রণের বাইরে। আমার মনকে শান্ত রাখাই আমার একমাত্র দায়িত্ব।"
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pagination controls */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-center border-t border-[#222222] pt-8 mt-12 max-w-2xl gap-4">
              <button
                onClick={handlePrevQuote}
                id="btn-prev-quote"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-transparent border border-[#333333] hover:border-[#C5A267] hover:text-white text-xs sm:text-sm tracking-widest uppercase font-serif tracking-[0.1em] transition-all cursor-pointer font-medium rounded text-stone-400 group"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                <span>পূর্ববর্তী (Prev)</span>
              </button>

              <button
                onClick={handleShuffleQuote}
                id="btn-shuffle-quote"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border border-[#C5A267]/50 hover:border-[#C5A267] text-[#C5A267] hover:text-white text-xs sm:text-sm font-serif font-bold transition-all cursor-pointer rounded shadow-lg group"
              >
                <RefreshCw className="w-4 h-4 animate-spin-hover" />
                <span>দৈব চয়ন (Shuffle Quote)</span>
              </button>

              <button
                onClick={handleNextQuote}
                id="btn-next-quote"
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#C5A267] text-black hover:bg-[#D4B57E] text-xs sm:text-sm font-serif font-bold transition-all cursor-pointer rounded shadow-md group border border-[#C5A267]"
              >
                <span>পরবর্তী বাণী (Next)</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        )}

        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {/* 2. TAB: EXPLORE DATASET */}
        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {activeTab === "explore" && (
          <div className="w-full flex-1 flex flex-col space-y-8 animate-fade-in">
            {/* Title Block */}
            <div className="border-b border-[#222222] pb-6">
              <h2 className="text-2xl font-light font-bengali-serif text-[#C5A267] tracking-wider mb-2">
                সংগৃহীত স্তোইক জ্ঞানের অফলাইন ভান্ডার
              </h2>
              <p className="text-sm text-stone-400 font-sans">
                ইংরেজি সাহিত্য ও তার অন্তর্নিহিত কঠিন রূপকের বাংলা ব্যাখ্যাসহ {quotesPool.length}টি বিখ্যাত প্রাচীন বাণী।
              </p>
            </div>

            {/* Filter and Search controls */}
            <div className="bg-[#141414] border border-[#222222] rounded-xl p-5 md:p-6 space-y-5 shadow-lg">
              {/* Search Bar */}


              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Category Filters */}
                <div className="space-y-2">
                  <span className="text-xs text-[#888888] font-bold tracking-wider uppercase block">
                    বিষয়শ্রেণী অনুযায়ী ফিল্টার (Category)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedCategory("all")}
                      className={`px-3 py-1 rounded text-xs tracking-wider transition-all cursor-pointer uppercase ${
                        selectedCategory === "all"
                          ? "bg-[#C5A267] text-black font-semibold"
                          : "bg-[#1C1C1C] text-stone-400 hover:text-white"
                      }`}
                    >
                      সব (All)
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded text-xs tracking-wider transition-all cursor-pointer uppercase font-sans ${
                          selectedCategory === cat
                            ? "bg-[#C5A267] text-black font-semibold border border-transparent"
                            : "bg-[#1C1C1C] text-stone-400 hover:text-white border border-stone-800"
                        }`}
                      >
                        {cat === "virtue" ? "সৎ গুণ" : cat === "control" ? "নিয়ন্ত্রণ" : cat === "emotion" ? "আবেগ" : cat === "death" ? "মৃত্যু" : cat === "discipline" ? "শৃঙ্খলা" : cat === "resilience" ? "সহনশীলতা" : cat === "anger" ? "রাগ" : cat === "fate" ? "নিয়তি" : cat === "leadership" ? "নেতৃত্ব" : ""} ({cat})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Author Filters */}
                <div className="space-y-2 min-w-[200px]">
                  <span className="text-xs text-[#888888] font-bold tracking-wider uppercase block">
                    দার্শনিক লেখক (Author)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedAuthor("all")}
                      className={`px-3 py-1 rounded text-xs tracking-wider transition-all cursor-pointer ${
                        selectedAuthor === "all"
                          ? "bg-[#C5A267] text-black font-semibold"
                          : "bg-[#1C1C1C] text-stone-400 hover:text-white"
                      }`}
                    >
                      সবাই
                    </button>
                    {authors.map((auth) => (
                      <button
                        key={auth}
                        onClick={() => setSelectedAuthor(auth)}
                        className={`px-3 py-1 rounded text-xs tracking-wider transition-all cursor-pointer ${
                          selectedAuthor === auth
                            ? "bg-[#C5A267] text-black font-semibold"
                            : "bg-[#1C1C1C] text-stone-400 hover:text-white"
                        }`}
                      >
                        {auth}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Results Status Count */}
            <div className="flex justify-between items-center text-xs text-stone-500 font-sans px-1">
              <span>মোট পাওয়া গেছে: <strong className="text-amber-500">{filteredQuotes.length}</strong> টি বাণী</span>
              {(searchQuery || selectedCategory !== "all" || selectedAuthor !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedAuthor("all");
                  }}
                  className="text-[#C5A267] hover:underline"
                >
                  ফিল্টারস মুছে দিন (Reset Filters)
                </button>
              )}
            </div>

            {/* Bento Grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  onClick={() => setViewingQuoteDetails(quote)}
                  id={`quote-card-${quote.id}`}
                  className="bg-[#121212] border border-[#222222] hover:border-[#C5A267]/40 p-6 rounded-xl flex flex-col justify-between transition-all duration-300 shadow hover:shadow-lg hover:shadow-[#C5A267]/5 cursor-pointer group"
                >
                  <div className="space-y-4">
                    {/* Header line of card */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] uppercase font-serif tracking-widest text-[#C5A267] px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#C5A267]/15">
                        {quote.category}
                      </span>
                      <span className="text-xs text-stone-500 font-serif">
                        {quote.sourceText}
                      </span>
                    </div>

                    {/* Quotation lines */}
                    <p className="text-sm italic font-serif text-stone-450 leading-relaxed group-hover:text-[#F2F2F2] transition-colors">
                      "{quote.english}"
                    </p>

                    <p className="text-base font-bengali-serif text-[#E0E0E0] font-semibold leading-relaxed pt-2.5 border-t border-[#1C1C1C]">
                      {quote.banglaTranslation}
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-5 mt-4 border-t border-[#1A1A1A]">
                    <span className="text-xs font-serif font-bold text-[#E5E5E5]">
                      — {quote.author}
                    </span>
                    <span className="text-xs text-[#C5A267] select-none font-sans font-medium flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      ব্যাখ্যা ও প্রেক্ষাপট <span className="font-serif">→</span>
                    </span>
                  </div>
                </div>
              ))}

              {filteredQuotes.length === 0 && (
                <div className="col-span-full bg-[#141414] border border-[#222222] p-12 text-center rounded-xl">
                  <AlertCircle className="w-12 h-12 text-stone-600 mx-auto mb-4" />
                  <h3 className="text-lg font-bengali-serif text-[#C5A267] mb-1">
                    দুঃখিত, কোনো বাণী খুঁজে পাওয়া যায়নি!
                  </h3>
                  <p className="text-stone-500 text-sm">
                    অনুগ্রহ করে অন্য কোনো শব্দ টাইপ করে অথবা ভিন্ন ফিল্টার নির্বাচন করে চেষ্টা করুন।
                  </p>
                </div>
              )}
            </div>

            {/* Immersive Detail Modal */}
            {viewingQuoteDetails && (
              <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-[#121212] border border-[#C5A267]/35 max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl relative select-text">
                  {/* Close button */}
                  <button
                    onClick={() => setViewingQuoteDetails(null)}
                    className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white hover:bg-stone-850 rounded-lg focus:outline-none transition-transform hover:scale-105 cursor-pointer font-serif text-xl"
                  >
                    ✕
                  </button>

                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-serif tracking-widest text-black bg-[#C5A267] px-2.5 py-1 font-bold">
                      {viewingQuoteDetails.category} / {viewingQuoteDetails.sourceText}
                    </span>
                    <h3 className="text-lg italic font-serif text-[#E5E5E5] pt-2">
                       "{viewingQuoteDetails.english}"
                    </h3>
                    <p className="text-2xl font-bengali-serif font-bold text-[#C5A267] leading-normal pt-3 border-t border-[#262626]">
                      {viewingQuoteDetails.banglaTranslation}
                    </p>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#262626]">
                    <div>
                      <h4 className="text-xs uppercase tracking-wider text-[#888888] font-bold mb-1">
                        দার্শনিক দৃষ্টিভঙ্গি এবং অর্থ (Explanation)
                      </h4>
                      <p className="text-stone-300 font-sans text-base leading-relaxed pl-1">
                        {viewingQuoteDetails.banglaExplanation}
                      </p>
                    </div>

                    {viewingQuoteDetails.context && (
                      <div className="bg-[#0D0D0D] p-4 rounded border border-[#1C1C1C]">
                        <h4 className="text-xs uppercase font-serif tracking-widest text-[#888888] font-bold mb-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C5A267]"></span>
                          <span>ARCHAIC LITERAL CONTEXT:</span>
                        </h4>
                        <p className="text-stone-400 italic text-sm font-serif pl-3">
                          {viewingQuoteDetails.context}
                        </p>
                      </div>
                    )}

                    <div className="bg-[#1C160F] p-4 border border-[#C5A267]/15 rounded flex items-start gap-3">
                      <div className="p-1 rounded bg-[#C5A267]/10 text-[#C5A267] mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-[#C5A267] font-bold mb-1">
                          STOIC PRACTICE / মানসিক অবগাহন:
                        </h4>
                        <p className="text-stone-300 text-sm leading-relaxed">
                          এই মুহূর্তে গভীরভাবে একটা বড় নিশ্বাস নিয়ে ভাবুন, যে প্রাচীন রোমান সম্রাট বা নির্বাসিত গোলাম এই কথাগুলো ২ হাজার বছর আগে ডায়েরিতে লিখেছিলেন— তাঁরা জীবনকে অত্যন্ত কঠিন ও বাস্তববাদী দৃষ্টি দিয়ে মোকাবেলা করেছিলেন। আপনার আজকের বিষাদ তাঁদের চেয়ে অতি ভিন্ন নয়। এই বাণীটি মনের আয়নায় ধারণ করুন।
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-[#262626]">
                    <span className="text-sm font-serif font-bold text-[#E5E5E5]">
                      — {viewingQuoteDetails.author}
                    </span>
                    <button
                      onClick={() => setViewingQuoteDetails(null)}
                      className="px-5 py-2.5 bg-[#C5A267] hover:bg-[#D4B57E] text-black font-semibold text-xs sm:text-sm tracking-wider rounded uppercase cursor-pointer"
                    >
                      বন্ধ করুন (Close)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {/* 4. TAB: MOOD HEALING GENERATOR */}
        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {activeTab === "mood-advice" && (
          <div className="w-full flex-1 max-w-3xl mx-auto flex flex-col space-y-8 animate-fade-in">
            {/* Title Block */}
            <div className="border-b border-[#222222] pb-6">
              <h2 className="text-2xl font-light font-bengali-serif text-[#C5A267] tracking-wider mb-2">
                আবেগ নিয়ন্ত্রণ করুন: মানসিক হিলিং
              </h2>
              <p className="text-sm text-stone-400 font-sans">
                আপনি এই মুহূর্তে যে আবেগীয় যন্ত্রণার শিকার তা নির্বাচন করুন। স্টোইক ঋষিদের আসল ঐতিহাসিক কাজগুলো থেকে আপনার এই নির্দিষ্ট কষ্টের সরাসরি প্রতিষেধক বাণী গুগল জেমিনি এআই খুঁজে বের করে সান্ত্বনা দেবে।
              </p>
            </div>

            {/* Grid of Emotions for trigger */}
            <div className="space-y-4">
              <span className="text-xs text-[#888888] font-bold tracking-wider uppercase block">
                আপনার বর্তমান অনুভূতিটি নির্বাচন করুন:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {MOODS.map((m) => {
                  const isSelected = selectedMood === m.key;
                  return (
                    <button
                      key={m.key}
                      id={`mood-btn-${m.key}`}
                      onClick={() => handleGetMoodAdvice(m.key)}
                      className={`p-5 rounded-xl border text-left cursor-pointer transition-all duration-300 flex items-start gap-3 bg-[#121212] shadow hover:shadow-lg ${
                        isSelected
                          ? "border-[#C5A267] ring-1 ring-[#C5A267] bg-[#16120D]"
                          : "border-[#222222] hover:border-stone-700 hover:bg-[#151515]"
                      }`}
                    >
                      <span className="text-3xl select-none">{m.emoji}</span>
                      <div>
                        <h4 className="text-[15px] font-bengali-serif font-bold text-[#F2F2F2] flex items-center gap-1.5">
                          {m.labelBangla}
                        </h4>
                        <span className="text-[10px] uppercase font-serif tracking-[0.1em] text-[#888888]">
                          {m.labelEnglish}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error handling */}
            {moodError && (
              <div className="bg-red-950/20 border border-red-900/40 p-5 rounded-xl space-y-3 animate-fade-in">
                <div className="flex gap-2.5 text-red-300">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bengali-serif font-bold text-base">ঋষি জ্ঞান সংগ্রহে ব্যর্থ!</h4>
                    <p className="text-sm font-sans text-stone-300 mt-1">{moodError}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Mock/loading status while generating */}
            {isMoodLoading && (
              <div className="bg-[#141414] border border-[#222222] rounded-xl p-8 space-y-6 animate-pulse shadow-md text-center">
                <div className="p-3 bg-[#1C120B] rounded-full text-[#C5A267] w-fit mx-auto">
                  <Heart className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-[#C5A267] font-bengali-serif text-lg">আপনার মন শান্ত করার বাণী অন্বেষণ চলছে...</h4>
                  <p className="text-stone-500 text-xs sm:text-sm max-w-sm mx-auto">
                    "বাইরে চরম ঝড় উঠলেও নদীর শান্ত গভীরতা কখনো পাল্টায় না। নিজের অন্তরে সেই গভীরতা তৈরি করুন।" — মার্কাস অরেলিয়াস
                  </p>
                </div>
              </div>
            )}

            {moodResult && (
              <div className="bg-[#141414] border border-[#C5A267]/30 rounded-xl p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in relative">
                {/* Badge specifying targeted emotional support */}
                <div className="absolute top-4 right-4 flex items-center gap-1 text-[#C5A267] bg-[#1C1710] border border-[#C5A267]/35 px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-widest leading-none">
                  <Smile className="w-3.5 h-3.5" />
                  <span>EMpathy GRANTED</span>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] uppercase font-serif tracking-[0.25em] text-[#888888] font-bold">
                    Historical Stoic Quote
                  </span>
                  <blockquote className="text-base sm:text-lg italic font-serif text-[#E0E0E0] border-l-2 border-[#C5A267] pl-4 max-w-2xl leading-relaxed">
                    "{moodResult.english}"
                  </blockquote>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#222222]">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#C5A267] font-bold block">
                    Bangla Healing Translation / হৃদয়গ্রাহী বাংলা মন রূপান্তর
                  </span>
                  <p className="text-2xl sm:text-3xl font-bengali-serif font-semibold text-[#F2F2F2] leading-snug">
                    {moodResult.banglaTranslation}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-[#222222] font-sans">
                  <div>
                    <h4 className="text-xs uppercase tracking-wider text-[#888888] font-bold mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C5A267]"></span>
                      <span>স্তোইক সান্ত্বনা ও গভীর তাৎপর্য:</span>
                    </h4>
                    <p className="text-[#D1D1D1] text-base leading-relaxed pl-2 font-normal">
                      {moodResult.banglaExplanation}
                    </p>
                  </div>

                  {moodResult.keyMetaphor && (
                    <div className="bg-[#0D0D0D] p-4 rounded-lg border border-[#222222]">
                      <h4 className="text-xs uppercase tracking-wider text-[#C5A267] font-bold mb-1.5 font-serif flex items-center gap-1">
                        <span>METAPHOR EXPLAINED / প্রাচীন উপমার বিশ্লেষণ:</span>
                      </h4>
                      <p className="text-stone-400 text-sm italic pl-1 leading-snug font-serif">
                        {moodResult.keyMetaphor}
                      </p>
                    </div>
                  )}

                  {moodResult.actionableAdvice && (
                    <div className="bg-[#1C1710] border border-[#C5A267]/25 p-4 rounded-lg flex items-start gap-3">
                      <div className="p-1 rounded bg-[#C5A267]/10 text-[#C5A267] mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs uppercase tracking-widest text-[#C5A267] font-bold mb-1">
                          PRACTICAL SOOTHING MEDITATION / এখনই বাস্তবায়ন করুন:
                        </h4>
                        <p className="text-stone-300 text-[15px] leading-relaxed">
                          {moodResult.actionableAdvice}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-[#222222] flex justify-between items-center font-sans">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-500 font-bold tracking-wider uppercase">SOURCE REFERENCE WORK</span>
                    <span className="text-xs text-stone-400 font-serif">
                      {moodResult.author} — {moodResult.sourceText}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-serif tracking-widest text-[#C5A267] px-2 py-0.5 rounded bg-[#1C1C1C] border border-[#C5A267]/15">
                    {moodResult.category}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {/* 5. TAB: ABOUT STOICISM */}
        {/* ---------------------------------------------------------------------------------------------------------------- */}
        {activeTab === "about" && (
          <div className="w-full flex-1 max-w-3xl mx-auto flex flex-col space-y-12 animate-fade-in font-sans">
            {/* Title Block */}
            <div className="border-b border-[#222222] pb-6 text-center">
              <span className="text-[#C5A267] text-[10px] uppercase tracking-[0.4em] font-bold">INTRO TO PRACTICE</span>
              <h2 className="text-3xl font-light font-bengali-serif text-[#C5A267] tracking-wider mt-2 mb-3">
                স্টোইসিজম কী? বিষাদগ্রস্ত মানুষের শ্রেষ্ঠ আশ্রয়
              </h2>
              <p className="text-sm text-stone-400 max-w-xl mx-auto leading-relaxed">
                ২,০০০ বছরেরও বেশি সময় পূর্বে প্রাচীন গ্রিস ও রোমে জন্ম নেওয়া একটি আত্মরক্ষামূলক ব্যবহারিক জীবনদর্শন। এটি তাত্ত্বিক কোনো তত্ত্ব নয়, বরং প্রতিকূল পরিস্থিতিতে মনের সার্বভৌমত্ব বজায় রাখার অসাধারণ মানসিক অস্ত্র।
              </p>
            </div>

            {/* Theme illustration block / core pillars */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold font-bengali-serif text-[#F2F2F2] border-l-2 border-[#C5A267] pl-3">
                স্টোইক দর্শনের ৩টি মূল ভিত্তি (The Three Pillars)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#121212] border border-[#222222] p-6 rounded-xl space-y-3">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#C5A267] bg-[#1C1710] border border-[#C5A267]/15 px-2 py-0.5 rounded">
                    Dichotomy of Control
                  </span>
                  <h4 className="font-bengali-serif text-lg font-bold text-white pt-1">
                    নিয়ন্ত্রণবিভাজন নীতি
                  </h4>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    জগতের সবকিছুকে দুই ভাগে চেনা: যা আমাদের নিয়ন্ত্রণে আছে (আচরণ, রাগ, সিদ্ধান্ত, চিন্তা) আর যা নিয়ন্ত্রণে নেই (অতীত, ভবিষ্যৎ, অন্যের মন)। অনিয়ন্ত্রিত বিষয় নিয়ে দুঃখ করার থেকে নিজেকে বিরত রাখাই মূল শান্তি।
                  </p>
                </div>

                <div className="bg-[#121212] border border-[#222222] p-6 rounded-xl space-y-3">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#C5A267] bg-[#1C1710] border border-[#C5A267]/15 px-2 py-0.5 rounded">
                    Memento Mori
                  </span>
                  <h4 className="font-bengali-serif text-lg font-bold text-white pt-1">
                    মৃত্যু স্মরণ নীতি
                  </h4>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    "আমরা সবাই নশ্বর।" এই ধ্রুব সত্যকে ভয় পাওয়ার বদলে কাজে লাগানো। জীবনকে একটি উপহার হিসেবে ধরে নিয়ে প্রতিদিন সকালকে ধন্যবাদ দেওয়া এবং তুচ্ছ হিংসা, অহংকার বা পরশ্রীকাতরতা ত্যাগ করা।
                  </p>
                </div>

                <div className="bg-[#121212] border border-[#222222] p-6 rounded-xl space-y-3">
                  <span className="text-xs uppercase tracking-widest font-bold text-[#C5A267] bg-[#1C1710] border border-[#C5A267]/15 px-2 py-0.5 rounded">
                    Amor Fati
                  </span>
                  <h4 className="font-bengali-serif text-lg font-bold text-white pt-1">
                    নিয়তিকে ভালোবাসা
                  </h4>
                  <p className="text-stone-400 text-sm leading-relaxed">
                    ভাগ্যকে কেবল মেনে নেওয়াই নয়, বরং ঘটে যাওয়া প্রতিটি প্রতিকূলতাকে নিজের আত্মশক্তি বাড়ানোর একটি মোক্ষম সুযোগ বা ফুয়েল হিসেবে পরম আনন্দে বুক পেতে বরণ করার নামই হলো 'আমোর ফাতি'।
                  </p>
                </div>
              </div>
            </div>

            {/* Masters Profile */}
            <div className="space-y-6 pt-6 border-t border-[#1C1C1C]">
              <h3 className="text-xl font-bold font-bengali-serif text-[#F2F2F2] border-l-2 border-[#C5A267] pl-3 mb-4">
                স্টোইক দর্শনের প্রধান ৩ ঋষি (Stoic Sages)
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 p-5 bg-[#121212] border border-[#222222] rounded-xl hover:border-amber-950 transition-all">
                  <div className="text-4xl select-none sm:text-5xl border border-[#333333] p-3 rounded bg-stone-900 w-fit h-fit text-[#C5A267]">
                    🏛️
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-serif font-bold text-white leading-none">
                      Marcus Aurelius <span className="text-xs font-sans text-stone-550 font-normal pl-2">(মার্কাস অরেলিয়াস)</span>
                    </h4>
                    <span className="text-[10px] uppercase tracking-wide text-[#C5A267] font-bold">The Philosopher King / রোমান সম্রাট</span>
                    <p className="text-[#A5A5A5] text-sm leading-relaxed font-sans">
                      রোমান সাম্রাজ্যের সবচেয়ে পরাক্রমশালী সম্রাট। যুদ্ধক্ষেত্রের তাবু আর প্লেগের প্রকোপের মাঝে তিনি নিজের চরিত্রকে শান্ত রাখতে প্রতিদিন ডায়েরি লিখতেন, যা ২,০০০ বছর পর "Meditations (আত্মচিন্তা)" নামে মানবতার অক্ষয় গ্রন্থ হয়ে রয়েছে।
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 p-5 bg-[#121212] border border-[#222222] rounded-xl hover:border-amber-950 transition-all">
                  <div className="text-4xl select-none sm:text-5xl border border-[#333333] p-3 rounded bg-stone-900 w-fit h-fit text-[#C5A267]">
                    ✍️
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-serif font-bold text-white leading-none">
                      Lucius Annaeus Seneca <span className="text-xs font-sans text-stone-550 font-normal pl-2">(সেনেকা)</span>
                    </h4>
                    <span className="text-[10px] uppercase tracking-wide text-[#C5A267] font-bold">The Statesman & Dramatist / নাট্যকার ও রাষ্ট্রপ্রধান</span>
                    <p className="text-[#A5A5A5] text-sm leading-relaxed font-sans">
                      অত্যন্ত ধনী, সফল অথচ তীব্র প্রতিবন্ধকতা ও ষড়যন্ত্রের শিকার রোমান সুবক্তা। চরম প্রতিকূলতায় তাঁর বন্ধু লুসিলিয়াসকে লেখা চিঠিগুলোই "Letters from a Stoic (স্তোইক পত্র)" যেখানে তিনি বাস্তব জীবনের দুঃখের সমাধান এঁকেছেন।
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 p-5 bg-[#121212] border border-[#222222] rounded-xl hover:border-amber-950 transition-all">
                  <div className="text-4xl select-none sm:text-5xl border border-[#333333] p-3 rounded bg-stone-900 w-fit h-fit text-[#C5A267]">
                    ⛓️
                  </div>
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-serif font-bold text-white leading-none">
                      Epictetus <span className="text-xs font-sans text-stone-550 font-normal pl-2">(এপিকটেটাস)</span>
                    </h4>
                    <span className="text-[10px] uppercase tracking-wide text-[#C5A267] font-bold">The Slave Teacher / গোলাম ও শিক্ষক</span>
                    <p className="text-[#A5A5A5] text-sm leading-relaxed font-sans">
                      জন্মসূত্রে রোমের এক পঙ্গু কৃতদাস বা গোলাম। স্বাধীনতার পর তিনি বিশ্বের সবচেয়ে বিখ্যাত স্তোইক বিদ্যালয় খোলেন। তিনি বলতেন: "শেকল কেবল আমার পা-কে বাঁধতে পারে, আমার ইচ্ছাশক্তি বা মনকে নয়।" তাঁর বয়ান "Discourses" ও "Enchiridion" আজও অনুপ্রেরণার উৎস।
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Classy minimal layout footer */}
      <footer className="w-full border-t border-[#222222] py-8 bg-[#0B0B0B] text-xs text-[#888888] font-sans">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex flex-col text-center sm:text-left gap-1">
            <span className="uppercase tracking-widest text-[#C5A267] font-bold text-[10px]">স্টোইক বাংলা (Stoic Bangla)</span>
            <span>২,০০০ বছরের স্টোইক প্রজ্ঞা বাংলা ভাষাভাষীদের মন শান্ত করার জন্য উৎসর্গীকৃত।</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[#666666] font-mono select-none">No login • Pure Wisdom • Muntakim Ali Rashfi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
