import React from "react";
import { notFound } from "next/navigation";

import { getWorkBatchDetailAction } from "@/features/work-batches";
import { WorkBatchDetailView } from "@/features/work-batches/ui/WorkBatchDetailView";

export const metadata = {
  title: "Chi tiết đợt làm | LumiTask",
};

export default async function WorkBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isFinite(batchId)) notFound();

  const res = await getWorkBatchDetailAction(batchId);
  if (!res.success || !res.data) notFound();

  return <WorkBatchDetailView initial={res.data} />;
}

