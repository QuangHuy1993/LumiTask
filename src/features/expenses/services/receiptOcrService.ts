import sharp from "sharp";
import { createWorker, type Worker } from "tesseract.js";

const OCR_LANG = "eng+vie";

function sanitizeOcrText(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ReceiptOcrResult = {
  text: string;
  meanConfidence: number;
};

type WorkerState = {
  worker: Worker;
  lang: string;
};

declare global {
  var __receiptOcrWorkerPromise: Promise<WorkerState> | undefined;
  var __receiptOcrWorkerState: WorkerState | undefined;
}

async function getOrInitWorker(): Promise<WorkerState> {
  if (globalThis.__receiptOcrWorkerState) return globalThis.__receiptOcrWorkerState;
  if (!globalThis.__receiptOcrWorkerPromise) {
    globalThis.__receiptOcrWorkerPromise = (async () => {
      // In tesseract.js v7, workers come pre-loaded; language init is done via `reinitialize`.
      const worker = await createWorker(OCR_LANG);
      await worker.reinitialize(OCR_LANG);
      await worker.setParameters({
        preserve_interword_spaces: "1",
      });
      const state: WorkerState = { worker, lang: OCR_LANG };
      globalThis.__receiptOcrWorkerState = state;
      return state;
    })();
  }
  return globalThis.__receiptOcrWorkerPromise;
}

async function resetWorker(): Promise<void> {
  const state = globalThis.__receiptOcrWorkerState;
  globalThis.__receiptOcrWorkerState = undefined;
  globalThis.__receiptOcrWorkerPromise = undefined;
  if (state) {
    try {
      await state.worker.terminate();
    } catch {
      // ignore
    }
  }
}

async function preprocessForOcr(input: Buffer): Promise<Buffer> {
  try {
    const img = sharp(input, { failOn: "none" });
    const meta = await img.metadata();
    const width = meta.width ?? 0;
    const targetWidth = width > 0 ? Math.min(Math.max(width * 2, 1200), 2400) : 1800;
    return await img
      .resize({ width: targetWidth, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();
  } catch {
    return input;
  }
}

export const receiptOcrService = {
  async recognizeImage(imageBuffer: Buffer): Promise<ReceiptOcrResult> {
    try {
      const { worker } = await getOrInitWorker();
      const pre = await preprocessForOcr(imageBuffer);
      const recognized = await worker.recognize(pre);
      return {
        text: sanitizeOcrText(recognized.data.text ?? ""),
        meanConfidence: recognized.data.confidence ?? 0,
      };
    } catch (err) {
      // If the worker got into a bad state, reset it so the next request can recover.
      await resetWorker();
      throw err;
    }
  },
};
