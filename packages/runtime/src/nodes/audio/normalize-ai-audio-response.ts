/**
 * Normalizes the varied response formats from Cloudflare Workers AI
 * audio models into a single ArrayBuffer.
 *
 * Workers AI may return audio as:
 * - ReadableStream (streamed response)
 * - ArrayBuffer (raw binary)
 * - { audio: string } (base64-encoded)
 */
export async function normalizeAIAudioResponse(
  response: unknown
): Promise<ArrayBuffer> {
  if (response instanceof ReadableStream) {
    const blob = await new Response(response).blob();
    return blob.arrayBuffer();
  }

  if (response instanceof ArrayBuffer) {
    return response;
  }

  if (response && typeof response === "object" && "audio" in response) {
    const audioBase64 = (response as { audio: unknown }).audio;
    if (typeof audioBase64 === "string") {
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    throw new Error("Unexpected audio data format");
  }

  throw new Error("Unexpected response format from audio API");
}
