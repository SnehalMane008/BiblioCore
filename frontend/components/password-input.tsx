"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export function PasswordInput({
  value,
  onChange,
  autoComplete,
  id,
  minLength,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  id: string;
  minLength?: number;
  maxLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return <span className="relative mt-1.5 block">
    <input
      required
      id={id}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      minLength={minLength}
      maxLength={maxLength}
      value={value}
      onChange={event => onChange(event.target.value)}
      className="min-h-12 w-full rounded-xl border border-line bg-white px-4 py-3 pr-12"
    />
    <button
      type="button"
      aria-label={visible ? "Hide password" : "Show password"}
      aria-pressed={visible}
      title={visible ? "Hide password" : "Show password"}
      onClick={() => setVisible(current => !current)}
      className="absolute inset-y-0 right-2 grid w-10 place-items-center rounded-lg text-muted transition hover:bg-slate-100 hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue"
    >
      {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  </span>;
}
