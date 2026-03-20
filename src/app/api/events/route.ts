import { subscribe, getLogHistory } from "@/lib/agent";

/* GET /api/events — SSE stream of agent log entries */
export async function GET() {
  const encoder = new TextEncoder();

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
      const unsubscribe = subscribe((entry) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(entry)}\n\n`)
          );
        } catch {
          unsubscribe();
        }
      });

      // Send keepalive every 15s
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
          unsubscribe();
        }
      }, 15000);
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
