"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { quickCreateSubjectAction } from "@/features/jobs/actions/jobPaymentActions";

type SubjectOption = {
  id: number;
  name: string;
};

type Props = {
  value?: number | null;
  onChange: (id: number | null) => void;
  options: SubjectOption[];
  onCreated?: (subject: SubjectOption) => void;
};

export function SubjectCombobox({ value, onChange, options, onCreated }: Props) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((s) => s.name.toLowerCase().includes(term));
  }, [options, search]);

  const selected = options.find((s) => s.id === (value ?? null)) ?? null;

  useEffect(() => {
    const term = search.trim();
    setIsOpen(term.length > 0);
  }, [search]);

  useEffect(() => {
    function handleDown(e: MouseEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, []);

  async function handleQuickCreate() {
    const name = search.trim();
    if (name.length < 2) {
      toast.error("Tên môn học tối thiểu 2 ký tự");
      return;
    }
    setIsCreating(true);
    try {
      const res = await quickCreateSubjectAction({ name });
      if (!res.success || !res.data) {
        toast.error(res.error || "Không thể tạo môn học");
        return;
      }
      toast.success("Đã tạo môn học mới");
      onChange(res.data.id);
      onCreated?.(res.data);
      setSearch("");
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-2" ref={rootRef}>
      <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em] flex items-center gap-2">
        <BookOpen className="size-4" />
        Môn học
      </label>
      <div className="relative">
        <div className="flex items-center gap-2 border border-moss-100 bg-moss-50/40 rounded-2xl px-3 py-2">
          <Search className="size-4 text-moss-300 shrink-0" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-moss-900 placeholder:text-moss-300"
            placeholder="Tìm hoặc gõ để tạo nhanh..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => {
              if (search.trim().length > 0) setIsOpen(true);
            }}
          />
          <button
            type="button"
            onClick={handleQuickCreate}
            disabled={isCreating || search.trim().length < 2}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCreating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
            Tạo mới
          </button>
        </div>

        {isOpen && (
          <div className="mt-1 max-h-52 overflow-y-auto rounded-2xl border border-moss-100 bg-white shadow-sm">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-xs text-moss-400">Không tìm thấy môn học phù hợp.</div>
            ) : (
              filtered.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => {
                    onChange(s.id);
                    setSearch("");
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left border-b border-moss-50 last:border-b-0 hover:bg-moss-50 ${
                    selected?.id === s.id ? "bg-primary/5 text-primary font-semibold" : "text-moss-700"
                  }`}
                >
                  <span className="truncate">{s.name}</span>
                </button>
              ))
            )}
          </div>
        )}

        {selected && (
          <p className="mt-1 text-[11px] text-moss-400">
            Đã chọn: <span className="font-semibold text-moss-700">{selected.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}

