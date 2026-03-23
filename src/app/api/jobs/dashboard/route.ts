import { NextResponse } from "next/server";

import { jobsDashboardService } from "@/features/reports-dashboard/services/jobsDashboardService";
import type { JobsDashboardFilters } from "@/features/reports-dashboard/model/jobsDashboardTypes";

export async function POST(request: Request) {
  const body = (await request.json()) as JobsDashboardFilters;

  const data = await jobsDashboardService.getDashboardData(body);

  return NextResponse.json(data);
}

