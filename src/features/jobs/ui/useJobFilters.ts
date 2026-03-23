"use client";

import { useMemo, useState } from "react";

import type { JobListQuery } from "@/features/jobs/model/jobTypes";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  // simple manual debounce to avoid extra dependencies
  if (debounced !== value) {
    setTimeout(() => setDebounced(value), delay);
  }

  return debounced;
}

export function useJobFilters(initial: Partial<JobListQuery> = {}) {
  const [search, setSearch] = useState(initial.search ?? "");
  const [clientId, setClientId] = useState<number | undefined>(initial.clientId);
  const [subjectId, setSubjectId] = useState<number | undefined>(initial.subjectId);
  const [batchId, setBatchId] = useState<number | undefined>(initial.batchId);
  const [status, setStatus] = useState<JobListQuery["status"]>(initial.status ?? "ALL");
  const [paymentStatus, setPaymentStatus] = useState<JobListQuery["paymentStatus"]>(initial.paymentStatus ?? "ALL");

  const debouncedSearch = useDebouncedValue(search, 300);

  const query: Partial<JobListQuery> = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      clientId,
      subjectId,
      batchId,
      status,
      paymentStatus,
    }),
    [debouncedSearch, clientId, subjectId, batchId, status, paymentStatus],
  );

  return {
    search,
    setSearch,
    clientId,
    setClientId,
    subjectId,
    setSubjectId,
    batchId,
    setBatchId,
    status,
    setStatus,
    paymentStatus,
    setPaymentStatus,
    query,
  };
}

