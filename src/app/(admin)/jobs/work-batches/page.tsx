import React from "react";
import { CalendarRange } from "lucide-react";

import { getWorkBatchesAction } from "@/features/work-batches";
import type { WorkBatchListItemDTO, WorkBatchStatsDTO } from "@/features/work-batches/model/workBatchTypes";
import { WorkBatchListContainer } from "@/features/work-batches/ui/WorkBatchListContainer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý đợt làm | LumiTask",
  description: "Nhóm job theo đợt để chốt sổ và theo dõi thu tiền.",
};

export default async function WorkBatchesPage() {
  const res = await getWorkBatchesAction({ limit: 20 });

  if (!res.success) {
    return (
      <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-moss-900 uppercase tracking-tight flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-glow-mint">
                <CalendarRange size={32} />
              </div>
              Quản lý đợt làm
            </h1>
            <p className="text-moss-400 font-bold uppercase tracking-[0.2em] text-xs mt-3 ml-1">
              Nhóm job theo đợt để chốt sổ và theo dõi thu tiền
            </p>
          </div>
        </div>

        <WorkBatchListContainer
          initialItems={[]}
          initialStats={{ openCount: 0, batchesWithUnpaidCount: 0, totalUnpaidJobs: 0 }}
          initialNextCursorId={null}
          initialError={res.error}
        />
      </div>
    );
  }

  const successRes = res as {
    items: WorkBatchListItemDTO[];
    stats: WorkBatchStatsDTO;
    nextCursorId: number | null;
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-moss-900 uppercase tracking-tight flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-glow-mint">
              <CalendarRange size={32} />
            </div>
            Quản lý đợt làm
          </h1>
          <p className="text-moss-400 font-bold uppercase tracking-[0.2em] text-xs mt-3 ml-1">
            Nhóm job theo đợt để chốt sổ và theo dõi thu tiền
          </p>
        </div>
      </div>

      <WorkBatchListContainer
        initialItems={successRes.items}
        initialStats={successRes.stats}
        initialNextCursorId={successRes.nextCursorId}
      />
    </div>
  );
}

