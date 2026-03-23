import React from "react";

export default function JobsListLoading() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      <div className="h-10 w-64 rounded-2xl bg-moss-100 animate-pulse" />
      <div className="h-12 w-full rounded-2xl bg-moss-50 animate-pulse" />
      <div className="h-[320px] w-full rounded-3xl bg-white border border-moss-100 shadow-sm animate-pulse" />
    </div>
  );
}

