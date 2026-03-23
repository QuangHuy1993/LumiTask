import { NextRequest } from "next/server";
import { paymentClients } from "@/lib/sse/paymentEmitter";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  let controllerRef: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      paymentClients.add(controller);

      // Gửi tín hiệu giữ kết nối
      controller.enqueue(new TextEncoder().encode(": connected\n\n"));
    },
    cancel() {
      if (controllerRef) {
        paymentClients.delete(controllerRef);
      }
    },
  });

  req.signal.addEventListener("abort", () => {
    if (controllerRef) {
      paymentClients.delete(controllerRef);
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
