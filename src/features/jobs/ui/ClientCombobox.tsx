"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, User } from "lucide-react";
import { toast } from "sonner";

import { quickCreateClientAction } from "@/features/jobs/actions/jobPaymentActions";

type ClientOption = {
  id: number;
  name: string;
  phone?: string | null;
};

type Props = {
  value?: number | null;
  onChange: (id: number | null) => void;
  options: ClientOption[];
  onCreated?: (client: ClientOption) => void;
};

export function ClientCombobox({ value, onChange, options, onCreated }: Props) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return options.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.phone && c.phone.includes(search)),
    );
  }, [options, search]);

  const selected = options.find((c) => c.id === (value ?? null)) ?? null;

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
      toast.error("Tên khách hàng tối thiểu 2 ký tự");
      return;
    }
    setIsCreating(true);
    try {
      const res = await quickCreateClientAction({ name });
      if (!res.success || !res.data) {
        toast.error(res.error || "Không thể tạo khách hàng");
        return;
      }
      toast.success("Đã tạo khách hàng mới");
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
        <User className="size-4" />
        Khách hàng
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
              <div className="px-4 py-3 text-xs text-moss-400">Không tìm thấy khách hàng phù hợp.</div>
            ) : (
              filtered.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    onChange(c.id);
                    setSearch("");
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-xs text-left border-b border-moss-50 last:border-b-0 hover:bg-moss-50 ${
                    selected?.id === c.id ? "bg-primary/5 text-primary font-semibold" : "text-moss-700"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.phone && <span className="ml-2 text-[10px] text-moss-400 font-mono">{c.phone}</span>}
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

