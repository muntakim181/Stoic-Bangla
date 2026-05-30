import React from "react";
import { Sparkles, Compass, Languages, Heart, Info, BookOpen, Database } from "lucide-react";
import { ActiveTab } from "../types.ts";

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export default function Header({ activeTab, setActiveTab }: HeaderProps) {
  const navItems: { id: ActiveTab; icon: React.ReactNode; labelBangla: string; labelEnglish: string }[] = [
    {
      id: "daily",
      icon: <Sparkles className="w-4 h-4" />,
      labelBangla: "আজকের বাণী",
      labelEnglish: "Daily Quote",
    },
    {
      id: "explore",
      icon: <Compass className="w-4 h-4" />,
      labelBangla: "জ্ঞানের ভান্ডার",
      labelEnglish: "Explore Dataset",
    },
    {
      id: "mood-advice",
      icon: <Heart className="w-4 h-4" />,
      labelBangla: "মন শান্ত করুন",
      labelEnglish: "Mood Healing",
    },
    {
      id: "about",
      icon: <Info className="w-4 h-4" />,
      labelBangla: "স্টোইসিজম কী?",
      labelEnglish: "About Stoicism",
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#262626] bg-[#0D0D0D]/90 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-4 gap-4">
          {/* Logo Brand */}
          <div className="flex items-center space-x-3 cursor-pointer animate-fade-in" onClick={() => setActiveTab("daily")}>
            <div className="p-2.5 rounded-xl bg-[#141414] border border-[#C5A267]/30 text-[#C5A267] shadow-sm">
              <BookOpen className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#E5E5E5] font-bengali-serif flex items-center gap-1.5">
                স্টোইক বাংলা <span className="text-xs font-serif text-[#C5A267] font-normal px-2 py-0.5 rounded bg-[#1D1D1D] uppercase tracking-widest hidden sm:inline-block border border-[#C5A267]/20">STOIC BANGLA</span>
              </h1>
              <p className="text-xs text-[#888888] font-sans font-medium">
                বিষাদ ও অস্থিরতায় শান্ত মনের আশ্রয়
              </p>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex items-center space-x-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  id={`nav-tab-${item.id}`}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-sm font-sans font-medium transition-all duration-350 whitespace-nowrap outline-none ${
                    isActive
                      ? "bg-[#C5A267] text-black shadow-lg font-bold"
                      : "text-[#888888] hover:text-white hover:bg-[#1A1A1A]"
                  }`}
                >
                  {item.icon}
                  <span className="flex flex-col items-start leading-[1.1]">
                    <span className="text-[12px] sm:text-xs">{item.labelBangla}</span>
                    <span className="text-[9px] opacity-85 scale-95 origin-left font-serif">{item.labelEnglish}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
