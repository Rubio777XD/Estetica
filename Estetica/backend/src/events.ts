import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export type Audience = 'public' | 'auth';
export type AudienceTarget = Audience | 'all';

interface Client {
  id: string;
  audience: Audience;
  res: Response;
}

const clients = new Map<string, Client>();
const HEARTBEAT_INTERVAL_MS = 30_000;
let heartbeatTimer: NodeJS.Timeout | null = null;

const sendChunk = (client: Client, chunk: string) => {
  try {
    client.res.write(chunk);
  } catch (error) {
    clients.delete(client.id);
    try {
      client.res.end();
    } catch (endError) {
      // Ignore further errors when closing the stream
    }
  }
};

const startHeartbeat = () => {
  if (heartbeatTimer) {
    return;
  }
  heartbeatTimer = setInterval(() => {
    const payload = `event: ping\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`;
    for (const client of clients.values()) {
      sendChunk(client, payload);
    }
    if (clients.size === 0 && heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref?.();
};

export const registerSseClient = (req: Request, res: Response, audience: Audience) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const id = randomUUID();
  const client: Client = { id, audience, res };
  clients.set(id, client);
  startHeartbeat();

  const initialPayload = {
    connectedAt: new Date().toISOString(),
    audience,
  };
  sendChunk(client, `event: connected\ndata: ${JSON.stringify(initialPayload)}\n\n`);

  const cleanup = () => {
    clients.delete(id);
    try {
      res.end();
    } catch (error) {
      // ignore close errors
    }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
};

export const broadcastEvent = (event: string, payload: unknown = null, target: AudienceTarget = 'all') => {
  const data = JSON.stringify({ event, payload, at: new Date().toISOString() });
  const chunk = `event: ${event}\ndata: ${data}\n\n`;

  for (const client of clients.values()) {
    const shouldSend =
      target === 'all' ||
      (target === 'auth' && client.audience === 'auth') ||
      target === 'public';

    if (shouldSend) {
      sendChunk(client, chunk);
    }
  }
};
