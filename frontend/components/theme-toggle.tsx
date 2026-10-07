"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("bibliocore-theme");
    const initial: Theme = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  function toggleTheme() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("bibliocore-theme", next);
  }

  return <button type="button" onClick={toggleTheme}
    aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    title={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-slate-600 transition hover:border-blue hover:text-blue ${className}`}>
    {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
  </button>;
}
