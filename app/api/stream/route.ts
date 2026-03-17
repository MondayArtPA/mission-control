import { NextRequest } from "next/server";
import { addClient, removeClient, getConnectedClients } from "@/lib/stream-broadcast";

// P5: Real-Time UI Updates via SSE
// Clients connect to this endpoint and receive live updates

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the broadcast list
      addClient(controller);

      // Send initial connection message
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"ok","clients":${getConnectedClients()}}\n\n`));

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          removeClient(controller);
        }
      }, 30000);

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        removeClient(controller);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
