"use client";

import React, { useMemo, useState } from "react";
import { Edit, PlusCircle, Search, Trash2 } from "lucide-react";

import { ExpensesSubNav } from "@/features/expenses/ui/ExpensesSubNav";

type TagItem = {
  id: string;
  name: string;
  colorHex: string;
  usageCount: number;
};

const MOCK_TAGS: TagItem[] = [
  { id: "t1", name: "Ăn uống & Cafe", colorHex: "#1DB954", usageCount: 142 },
  { id: "t2", name: "Di chuyển (Grab/Bus)", colorHex: "#7A5900", usageCount: 86 },
  { id: "t3", name: "Tiền nhà & Tiền điện", colorHex: "#AE2F34", usageCount: 12 },
  { id: "t4", name: "Sức khỏe & Gym", colorHex: "#3B82F6", usageCount: 34 },
  { id: "t5", name: "Giải trí & Netflix", colorHex: "#A855F7", usageCount: 58 },
];

function normalizeHex(input: string) {
  const v = input.trim();
  if (!v) return "#1DB954";
  return v.startsWith("#") ? v : `#${v}`;
}

function isValidHexColor(hex: string) {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

function TagModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: TagItem;
  onClose: () => void;
  onSave: (next: { name: string; colorHex: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? "#1DB954");

  const normalized = normalizeHex(colorHex);
  const hexOk = isValidHexColor(normalized);
  const canSave = name.trim().length > 0 && hexOk;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-5 border-b border-outline-variant/10">
          <h3 className="text-lg font-black tracking-tight text-on-surface">
            {mode === "add" ? "Thêm thẻ mới" : "Chỉnh sửa thẻ"}
          </h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Dùng thẻ để gắn nhãn nhiều giao dịch cùng lúc (khác với danh mục).
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Tên thẻ
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: Ăn uống"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Màu (HEX)
            </label>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl ring-4"
                style={{
                  backgroundColor: hexOk ? normalized : "#E0E3DE",
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.06) inset",
                }}
              />
              <input
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value)}
                placeholder="#1DB954"
                className="flex-1 bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {!hexOk && (
              <p className="mt-2 text-xs font-semibold text-error">
                Mã màu không hợp lệ. Định dạng: #RRGGBB
              </p>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              onSave({ name: name.trim(), colorHex: normalized });
              onClose();
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === "add" ? "Thêm thẻ" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteTagModal({
  tag,
  onClose,
  onConfirm,
}: {
  tag: TagItem;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center text-error mb-4">
          <Trash2 className="size-6" />
        </div>
        <h3 className="text-lg font-black text-on-surface mb-2">Xóa thẻ?</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          Thẻ <span className="font-bold">“{tag.name}”</span> đang được dùng{" "}
          <span className="font-bold">{tag.usageCount}</span> lần. Xóa thẻ sẽ gỡ
          liên kết khỏi các giao dịch (không xóa giao dịch).
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface-container-low rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 bg-error text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all"
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinanceTagsClient() {
  const [tags, setTags] = useState<TagItem[]>(MOCK_TAGS);
  const [search, setSearch] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [editTag, setEditTag] = useState<TagItem | null>(null);
  const [deleteTag, setDeleteTag] = useState<TagItem | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(term));
  }, [tags, search]);

  const totalTags = tags.length;
  const mostUsed = [...tags].sort((a, b) => b.usageCount - a.usageCount)[0] ?? null;
  const leastUsed = [...tags].sort((a, b) => a.usageCount - b.usageCount)[0] ?? null;
  const totalUsage = tags.reduce((s, t) => s + t.usageCount, 0) || 1;
  const topSharePct = mostUsed ? Math.round((mostUsed.usageCount / totalUsage) * 100) : 0;

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 max-w-7xl">
      {showAdd && (
        <TagModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSave={(next) => {
            setTags((prev) => [
              { id: `t_${Date.now()}`, name: next.name, colorHex: next.colorHex, usageCount: 0 },
              ...prev,
            ]);
          }}
        />
      )}
      {editTag && (
        <TagModal
          mode="edit"
          initial={editTag}
          onClose={() => setEditTag(null)}
          onSave={(next) => {
            setTags((prev) =>
              prev.map((t) => (t.id === editTag.id ? { ...t, ...next } : t))
            );
          }}
        />
      )}
      {deleteTag && (
        <DeleteTagModal
          tag={deleteTag}
          onClose={() => setDeleteTag(null)}
          onConfirm={() => {
            setTags((prev) => prev.filter((t) => t.id !== deleteTag.id));
          }}
        />
      )}

      <ExpensesSubNav />

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">
            Cấu trúc dữ liệu
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight leading-none">
            Quản lý Thẻ (Tag)
          </h1>
          <p className="text-on-surface-variant text-sm max-w-md">
            Gắn nhãn màu cho giao dịch để lọc & báo cáo linh hoạt theo ngữ cảnh.
          </p>
        </div>

        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
        >
          <PlusCircle className="size-5" />
          Thêm thẻ mới
        </button>
      </div>

      <div className="bg-surface-container-low rounded-3xl p-2 shadow-sm">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant/50" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm thẻ..."
            className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-on-surface-variant/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-9 bg-white rounded-[1.75rem] shadow-card border border-outline-variant/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-on-surface-variant/70 border-b border-outline-variant/10">
                    Tên thẻ
                  </th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-on-surface-variant/70 border-b border-outline-variant/10 text-center">
                    Mã màu
                  </th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-on-surface-variant/70 border-b border-outline-variant/10">
                    Lượt sử dụng
                  </th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-black text-on-surface-variant/70 border-b border-outline-variant/10 text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-surface-container-low/30 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full ring-4"
                          style={{
                            backgroundColor: t.colorHex,
                            boxShadow: `0 0 0 8px ${t.colorHex}1a`,
                          }}
                        />
                        <span className="font-bold text-on-surface">{t.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex justify-center">
                        <div className="w-28 h-8 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center justify-center gap-2">
                          <span
                            className="size-3 rounded-full"
                            style={{ backgroundColor: t.colorHex }}
                          />
                          <code className="text-[10px] text-on-surface-variant font-mono font-bold">
                            {t.colorHex.toUpperCase()}
                          </code>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-on-surface">
                          {t.usageCount}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/60 font-medium">
                          Giao dịch
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditTag(t)}
                          className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-high rounded-xl transition-all"
                          aria-label="Sửa thẻ"
                        >
                          <Edit className="size-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTag(t)}
                          className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-all"
                          aria-label="Xóa thẻ"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center">
                      <p className="text-sm font-bold text-on-surface-variant/60">
                        Không tìm thấy thẻ phù hợp
                      </p>
                      <p className="text-xs text-on-surface-variant/50 mt-1">
                        Thử từ khóa khác hoặc tạo thẻ mới
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-surface-container-low/20 flex items-center justify-between">
            <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest">
              Hiển thị {Math.min(filtered.length, 12)} / {filtered.length} thẻ nhãn (mock)
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-on-surface-variant/50">
                Data thật sẽ nối sau
              </span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-3 space-y-6">
          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/15">
            <h2 className="text-[10px] font-black text-on-surface uppercase tracking-widest mb-6">
              Thống kê nhanh
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">Tổng số thẻ</span>
                <span className="text-sm font-black text-primary">{totalTags}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">Thẻ hay dùng nhất</span>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-black">
                  {mostUsed?.name ?? "—"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-on-surface-variant">Thẻ ít dùng nhất</span>
                <span className="text-[10px] bg-surface-container-high text-on-surface px-2 py-0.5 rounded-full font-black">
                  {leastUsed?.name ?? "—"}
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-outline-variant/20">
              <p className="text-[10px] font-black text-on-surface mb-2 uppercase tracking-tighter">
                Phân bổ sử dụng
              </p>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${topSharePct}%` }} />
              </div>
              <p className="mt-2 text-[9px] text-on-surface-variant/60 italic leading-snug">
                {mostUsed
                  ? `${mostUsed.name} chiếm ~${topSharePct}% tổng lượt gán nhãn (mock).`
                  : "Chưa có dữ liệu."}
              </p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-mint-500 p-6 text-white shadow-xl">
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">
                Mẹo quản lý thẻ
              </p>
              <h3 className="font-black text-sm mb-2 leading-tight">
                Tag ≠ Danh mục
              </h3>
              <p className="text-xs opacity-90 leading-relaxed">
                Danh mục là “một trong”, còn Tag là “nhiều cái cùng lúc” để lọc
                và báo cáo linh hoạt (ví dụ: #công_việc, #gia_đình, #khẩn_cấp).
              </p>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-15">
              <PlusCircle className="size-24" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

