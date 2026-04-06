import { NextResponse } from "next/server";

import { receiptImportBatchService } from "@/features/expenses/services/receiptImportBatchService";
import { sessionService } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const form = await request.formData();
  const fileInput = form.get("file");
  if (!(fileInput instanceof File)) {
    return NextResponse.json({ success: false, error: "FILE_REQUIRED" }, { status: 400 });
  }

  const validated = receiptImportBatchService.validateUpload(fileInput);
  if (!validated.ok) {
    return NextResponse.json(
      { success: false, error: "INVALID_FILE", message: validated.message },
      { status: 400 }
    );
  }

  const created = await receiptImportBatchService.createAndProcessBatch(user.id, fileInput);
  await receiptImportBatchService.processBatch(created.batchId, user.id, created.filePath, created.mimeType);
  return NextResponse.json({ success: true, data: { batchId: created.batchId } }, { status: 201 });
}
