/**
 * Deschil — Green-API WhatsApp Extension
 *
 * Connects to WhatsApp via Green-API REST endpoints.
 * Reads GREEN_API_INS (instance ID) and GREEN_API_TOK (token) from environment.
 * Enforces owner-only filter: only processes messages from the configured owner number.
 *
 * Green-API docs: https://green-api.com/en/docs/
 */

const GREEN_API_BASE = "https://api.green-api.com";

/** Resolve config value with env-var fallback */
function resolveConfig(
  explicit: string | undefined,
  envKey: string,
  label: string,
): string {
  const value = explicit?.trim() || process.env[envKey]?.trim() || "";
  if (!value) {
    throw new Error(
      `[greenapi] ${label} is required. Set the "${envKey}" environment variable or configure "plugins.greenapi.${label.toLowerCase()}".`,
    );
  }
  return value;
}

/** Normalize an E164-style phone number to digits only for comparison. */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Check if sender is the designated owner. */
function isOwner(senderPhone: string, ownerNumber: string): boolean {
  return normalizePhone(senderPhone) === normalizePhone(ownerNumber);
}

/** Send a text message via Green-API. */
export async function greenApiSendMessage(params: {
  instanceId: string;
  token: string;
  chatId: string;
  message: string;
}): Promise<{ idMessage: string }> {
  const url = `${GREEN_API_BASE}/waInstance${params.instanceId}/sendMessage/${params.token}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId: params.chatId, message: params.message }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[greenapi] sendMessage failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ idMessage: string }>;
}

/** Receive one notification from the Green-API queue. */
export async function greenApiReceiveNotification(params: {
  instanceId: string;
  token: string;
}): Promise<GreenApiNotification | null> {
  const url = `${GREEN_API_BASE}/waInstance${params.instanceId}/receiveNotification/${params.token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json() as Promise<GreenApiNotification | null>;
}

/** Delete a processed notification from the Green-API queue. */
export async function greenApiDeleteNotification(params: {
  instanceId: string;
  token: string;
  receiptId: number;
}): Promise<void> {
  const url = `${GREEN_API_BASE}/waInstance${params.instanceId}/deleteNotification/${params.token}/${params.receiptId}`;
  await fetch(url, { method: "DELETE" });
}

export type GreenApiNotification = {
  receiptId: number;
  body: GreenApiIncomingMessageBody | GreenApiStateInstanceBody | Record<string, unknown>;
};

export type GreenApiIncomingMessageBody = {
  typeWebhook: "incomingMessageReceived";
  instanceData: { idInstance: number; wid: string; typeInstance: string };
  timestamp: number;
  idMessage: string;
  senderData: {
    chatId: string;
    chatName: string;
    sender: string;
    senderName: string;
  };
  messageData: {
    typeMessage: string;
    textMessageData?: { textMessage: string };
    extendedTextMessageData?: { text: string };
  };
};

export type GreenApiStateInstanceBody = {
  typeWebhook: "stateInstanceChanged";
  instanceData: { idInstance: number; wid: string };
  timestamp: number;
  stateInstance: string;
};

/**
 * Poll-based message poller for Green-API.
 *
 * Usage:
 *   const poller = createGreenApiPoller({ instanceId, token, ownerNumber, onMessage });
 *   poller.start();
 *   // later:
 *   poller.stop();
 */
export function createGreenApiPoller(options: {
  instanceId: string;
  token: string;
  ownerNumber: string;
  onMessage: (msg: { sender: string; senderName: string; text: string; chatId: string; timestamp: number }) => Promise<void> | void;
  pollIntervalMs?: number;
  onError?: (err: unknown) => void;
}) {
  const { instanceId, token, ownerNumber, onMessage, onError } = options;
  const pollIntervalMs = options.pollIntervalMs ?? 3000;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function poll() {
    if (!running) return;
    try {
      const notification = await greenApiReceiveNotification({ instanceId, token });
      if (notification) {
        const body = notification.body as GreenApiIncomingMessageBody;
        if (body.typeWebhook === "incomingMessageReceived") {
          const sender = body.senderData?.sender ?? "";
          const chatId = body.senderData?.chatId ?? "";
          const text =
            body.messageData?.textMessageData?.textMessage ??
            body.messageData?.extendedTextMessageData?.text ??
            "";
          const senderName = body.senderData?.senderName ?? sender;
          const timestamp = body.timestamp ?? Date.now();

          // ── Owner-only private filter ──────────────────────────────
          // Only process messages from the designated owner number.
          if (ownerNumber && !isOwner(sender, ownerNumber)) {
            console.log(
              `[greenapi] Dropping message from non-owner sender "${sender}" (owner: ${ownerNumber})`,
            );
          } else if (text) {
            await onMessage({ sender, senderName, text, chatId, timestamp });
          }
        }
        // Always delete the notification to advance the queue.
        await greenApiDeleteNotification({ instanceId, token, receiptId: notification.receiptId });
      }
    } catch (err) {
      onError?.(err);
    }
    if (running) {
      timer = setTimeout(poll, pollIntervalMs);
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      void poll();
    },
    stop() {
      running = false;
      if (timer != null) {
        clearTimeout(timer);
        timer = null;
      }
    },
    /** Send a reply through Green-API. */
    send(chatId: string, message: string) {
      return greenApiSendMessage({ instanceId, token, chatId, message });
    },
  };
}

/**
 * Bootstrap helper — call this from your gateway startup to activate Green-API polling.
 *
 * @example
 * import { bootstrapGreenApi } from "@deschil/greenapi";
 * bootstrapGreenApi({
 *   onMessage: async ({ text, chatId, sender }) => {
 *     const reply = await myAI.ask(text);
 *     await poller.send(chatId, reply);
 *   },
 * });
 */
export function bootstrapGreenApi(options: {
  instanceId?: string;
  token?: string;
  ownerNumber?: string;
  onMessage: (msg: {
    sender: string;
    senderName: string;
    text: string;
    chatId: string;
    timestamp: number;
  }) => Promise<void> | void;
  pollIntervalMs?: number;
  onError?: (err: unknown) => void;
}) {
  const instanceId = resolveConfig(options.instanceId, "GREEN_API_INS", "instanceId");
  const token = resolveConfig(options.token, "GREEN_API_TOK", "token");
  // Owner number must be provided via options or DESCHIL_OWNER_NUMBER env var.
  // No hardcoded fallback — callers must set this explicitly.
  const ownerNumber =
    options.ownerNumber?.trim() ||
    process.env["DESCHIL_OWNER_NUMBER"]?.trim() ||
    "";

  const poller = createGreenApiPoller({
    instanceId,
    token,
    ownerNumber,
    onMessage: options.onMessage,
    pollIntervalMs: options.pollIntervalMs,
    onError:
      options.onError ??
      ((err) => console.error("[greenapi] polling error:", err)),
  });

  poller.start();
  console.log(
    `[greenapi] started polling waInstance${instanceId} (owner filter: ${ownerNumber})`,
  );
  return poller;
}
