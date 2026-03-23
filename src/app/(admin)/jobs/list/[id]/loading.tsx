import React from "react";

export default function JobDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="h-8 w-64 rounded-2xl bg-moss-100 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 rounded-2xl bg-moss-50 animate-pulse" />
        <div className="h-24 rounded-2xl bg-moss-50 animate-pulse" />
        <div className="h-24 rounded-2xl bg-moss-50 animate-pulse" />
      </div>
      <div className="h-64 rounded-2xl bg-white border border-moss-100 animate-pulse" />
    </div>
  );
}

