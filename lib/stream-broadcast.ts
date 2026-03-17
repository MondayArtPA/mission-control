// P5: Real-Time broadcast utilities for SSE
// Store connected clients
const clients = new Set<ReadableStreamDefaultController>();

export function addClient(controller: ReadableStreamDefaultController) {
  clients.add(controller);
}

export function removeClient(controller: ReadableStreamDefaultController) {
  clients.delete(controller);
}

export function getClients() {
  return clients;
}

export function getConnectedClients() {
  return clients.size;
}

export function broadcastEvent(event: string, data: unknown) {
  const encoder = new TextEncoder();
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of clients) {
    try {
      client.enqueue(encoder.encode(message));
    } catch {
      clients.delete(client);
    }
  }
}

export function broadcastTaskUpdate(taskId: string, task: unknown) {
  broadcastEvent("task-update", { taskId, task, timestamp: new Date().toISOString() });
}

export function broadcastTaskCreated(task: unknown) {
  broadcastEvent("task-created", { task, timestamp: new Date().toISOString() });
}

export function broadcastTaskCompleted(taskId: string, task: unknown) {
  broadcastEvent("task-completed", { taskId, task, timestamp: new Date().toISOString() });
}
