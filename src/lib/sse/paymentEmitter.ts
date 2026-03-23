type SSEClient = ReadableStreamDefaultController;

const getGlobalClients = () => {
  const g = global as unknown as { paymentSSEClients?: Set<SSEClient> };
  if (!g.paymentSSEClients) {
    g.paymentSSEClients = new Set<SSEClient>();
  }
  return g.paymentSSEClients;
};

export const paymentClients = getGlobalClients();

export function emitPaymentEvent(data: Record<string, unknown>) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(message);
  for (const client of paymentClients) {
    try {
      client.enqueue(encoded);
    } catch {
      paymentClients.delete(client);
    }
  }
}
