/**
 * Minimal SSE parser that consumes a `Response.body` stream and yields
 * `{ event, data }` records as the server pushes them.
 *
 * Spec subset: handles `event:` and `data:` fields; ignores comments and id.
 */
export interface SSEMessage {
  event: string;
  data: string;
}

export async function* parseSSE(response: Response): AsyncGenerator<SSEMessage> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      // Frames are separated by a blank line (\n\n)
      while (true) {
        const sep = buffer.indexOf("\n\n");
        if (sep === -1) break;
        const frame = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const msg = parseFrame(frame);
        if (msg) yield msg;
      }
    }
    if (buffer.trim().length > 0) {
      const msg = parseFrame(buffer);
      if (msg) yield msg;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(frame: string): SSEMessage | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const raw of frame.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line || line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value =
      colon === -1 ? "" : line[colon + 1] === " " ? line.slice(colon + 2) : line.slice(colon + 1);
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0 && event === "message") return null;
  return { event, data: dataLines.join("\n") };
}
