export function createEvent(event: {
  type:
    | "node-start"
    | "node-complete"
    | "node-error"
    | "execution-complete"
    | "execution-error"
    | "validation-error";
  nodeId?: string;
  error?: string;
  data?: any;
  timestamp: number;
}): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(
    `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`
  );
}
