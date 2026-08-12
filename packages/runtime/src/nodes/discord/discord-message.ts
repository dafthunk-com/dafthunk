import { imageFilename, type UploadableImage } from "../../utils/images";

/** Discord rejects attachments above 25 MB on unboosted servers. */
export const DISCORD_MAX_IMAGE_BYTES = 25 * 1024 * 1024;

/**
 * Body and headers for a message POST to `/channels/{id}/messages`.
 *
 * Discord takes an attachment only as multipart: the binary goes in
 * `files[n]`, the rest of the message in `payload_json`, and the two are
 * matched by an `attachments` entry carrying the same index. Without an
 * image the plain JSON body is kept, so callers pay nothing for the branch.
 */
export function discordMessageRequest(
  payload: Record<string, unknown>,
  image?: UploadableImage
): { body: BodyInit; headers: Record<string, string> } {
  if (!image) {
    return {
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    };
  }

  const filename = imageFilename(image);
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({ ...payload, attachments: [{ id: 0, filename }] })
  );
  form.append(
    "files[0]",
    new Blob([image.data], { type: image.mimeType }),
    filename
  );

  // No Content-Type header: fetch derives it from the FormData, including
  // the multipart boundary that Discord needs to parse the body.
  return { body: form, headers: {} };
}
