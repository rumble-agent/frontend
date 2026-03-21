import { subscribe, getLogHistory } from "@/lib/agent";

export const dynamic = "force-dynamic";

/* GET /api/events — SSE stream of agent log entries */
export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;

  function cleanup() {
    if (keepalive) { clearInterval(keepalive); keepalive = null; }
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  }

  const stream = new ReadableStream({
    start(controller) {
      // Send history first
      const history = getLogHistory();
      for (const entry of history) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(entry)}\n\n`)
        );
      }

      // Subscribe to new entries
      unsubscribe = subscribe((entry) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(entry)}\n\n`)
          );
        } catch {
          cleanup();
        }
      });

      // Send keepalive every 15s
      keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
