import React from "react";
import { notFound } from "next/navigation";
import { CreditCard, FileText, Info, QrCode, Edit3 } from "lucide-react";

import { getJobDetailAction } from "@/features/jobs/actions/jobActions";
import { JobPaymentHistory } from "@/features/jobs/ui/JobPaymentHistory";
import { JobDetailClient } from "@/features/jobs/ui/JobDetailClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = Number.parseInt(rawId, 10);
  if (!id || Number.isNaN(id)) notFound();

  const res = await getJobDetailAction(id);
  if (!res.success || !res.data) notFound();
  const job = res.data;

  return (
    <JobDetailClient
      job={job}
      jobId={id}
      headerIcon={<Info className="size-4" />}
      paymentIcon={<CreditCard className="size-4" />}
      infoIcon={<FileText className="size-4" />}
      qrIcon={<QrCode className="size-4" />}
      editIcon={<Edit3 className="size-4" />}
      paymentHistory={<JobPaymentHistory jobId={id} />}
    />
  );
}

