import { z } from "zod";

/**
 * Zod schema for a required image input on Photon nodes.
 * The error message matches the one historically produced by
 * `executePhotonOperation`, which tests assert on.
 */
export function imageInputSchema(
  message = "Input image is missing or invalid."
) {
  return z.object(
    {
      data: z.instanceof(Uint8Array, { error: message }),
      mimeType: z.string({ error: message }),
      filename: z.string().optional(),
    },
    { error: message }
  );
}
