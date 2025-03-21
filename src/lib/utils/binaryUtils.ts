/**
 * Utility functions for handling binary data in workflow nodes
 */

/**
 * Converts a Uint8Array to a base64 string
 * Used for displaying binary data like images in the UI
 *
 * @param buffer - The Uint8Array buffer to convert
 * @returns A base64 encoded string representation of the buffer
 */
export const arrayBufferToBase64 = (
  buffer: Uint8Array | number[] | any
): string => {
  try {
    // Check if buffer is valid
    if (!buffer || buffer.length === 0) {
      throw new Error("Invalid or empty buffer");
    }

    // Log detailed buffer information for debugging
    console.log(`Converting buffer to base64. Type: ${buffer.constructor.name}, Length: ${buffer.length}`);
    
    // Handle case where buffer might be serialized as an array of numbers
    // This happens when Uint8Array is sent from server to client
    const bytes =
      buffer instanceof Uint8Array
        ? buffer
        : new Uint8Array(
            Array.isArray(buffer) ? buffer : Object.values(buffer)
          );

    // For debugging, log the first few bytes
    const previewBytes = Array.from(bytes.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');
    console.log(`First 16 bytes: ${previewBytes}`);
    
    // Convert Uint8Array to a string of binary data
    let binary = "";
    const len = bytes.byteLength;

    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    // Convert binary string to base64
    const base64 = window.btoa(binary);
    console.log(`Base64 string length: ${base64.length}, preview: ${base64.substring(0, 20)}...`);
    return base64;
  } catch (error) {
    console.error("Error converting array buffer to base64:", error);
    throw error;
  }
};

/**
 * Creates a data URL from binary data and a MIME type
 *
 * @param buffer - The binary data as a Uint8Array or array-like object
 * @param mimeType - The MIME type of the data (e.g., 'image/png')
 * @returns A data URL that can be used in img src attributes
 */
export const createDataUrl = (
  buffer: Uint8Array | number[] | any,
  mimeType: string
): string => {
  try {
    // For audio data specifically, add extra validation
    if (mimeType.startsWith('audio/')) {
      console.log(`Creating audio data URL for ${mimeType} content, buffer length: ${buffer.length}`);
      
      // Check if this looks like valid audio data (MP3 files typically start with ID3 or binary sync markers)
      if (Array.isArray(buffer) && buffer.length > 4) {
        // Check for MP3 sync frame header (0xFF 0xFB) or ID3 tag ("ID3")
        const hasMP3Header = (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0);
        const hasID3Header = (buffer[0] === 73 && buffer[1] === 68 && buffer[2] === 51); // "ID3"
        
        if (!hasMP3Header && !hasID3Header) {
          console.warn("Audio data doesn't appear to have a valid MP3 header", {
            firstBytes: buffer.slice(0, 10)
          });
        }
      }
    }
    
    const base64 = arrayBufferToBase64(buffer);
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    // For debugging, log a preview of the data URL
    console.log(`Created data URL with MIME type ${mimeType}, length: ${dataUrl.length}`);
    
    return dataUrl;
  } catch (error) {
    console.error("Error creating data URL:", error, {
      bufferType: buffer?.constructor?.name,
      bufferLength: buffer?.length,
      mimeType
    });
    throw error;
  }
};
