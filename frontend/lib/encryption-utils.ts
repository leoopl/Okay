/**
 * Utility functions for client-side encryption and secure data handling
 * Note: Client-side encryption provides an additional layer of security but is not a replacement
 * for server-side encryption. Sensitive health data should always be encrypted at rest on the server.
 */

/**
 * Encrypt data before sending to the server using the Web Crypto API
 * This adds an extra layer of protection during transit
 * @param data Data to encrypt
 * @param publicKey Server's public key
 */
export async function encryptData(data: any, publicKey: string): Promise<string> {
  // This is a simplified implementation - in production, you'd use proper asymmetric encryption
  // Convert the string key to a proper CryptoKey
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));

  // Import the public key
  const cryptoKey = await window.crypto.subtle.importKey(
    'spki',
    _base64ToArrayBuffer(publicKey),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    false,
    ['encrypt'],
  );

  // Encrypt the data
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP',
    },
    cryptoKey,
    encodedData,
  );

  // Convert encrypted data to base64 string
  return _arrayBufferToBase64(encryptedData);
}

/**
 * Generate a temporary encryption key for the current session
 * Can be used for sensitive form data before submission
 */
export async function generateSessionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt'],
  );
}

/**
 * Encrypt sensitive form data with a session key
 * @param data Data to encrypt
 * @param sessionKey Session encryption key
 */
export async function encryptFormData(
  data: any,
  sessionKey: CryptoKey,
): Promise<{
  encryptedData: string;
  iv: string;
}> {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(JSON.stringify(data));

  // Generate a random initialization vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encrypt the data
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    sessionKey,
    encodedData,
  );

  return {
    encryptedData: _arrayBufferToBase64(encryptedData),
    iv: _arrayBufferToBase64(iv),
  };
}

/**
 * Helper function to convert an ArrayBuffer to a Base64 string
 */
function _arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Helper function to convert a Base64 string to an ArrayBuffer
 */
function _base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Securely clean sensitive data from memory
 * Use for form data after submission
 * @param data Object containing sensitive data
 */
export function secureClearData(data: any): void {
  // Overwrite object properties
  Object.keys(data).forEach((key) => {
    if (typeof data[key] === 'string') {
      // Overwrite strings with random data before setting to empty
      const length = data[key].length;
      let random = '';
      for (let i = 0; i < length; i++) {
        random += String.fromCharCode(Math.floor(Math.random() * 94) + 32);
      }
      data[key] = random;
      data[key] = '';
    } else if (typeof data[key] === 'object' && data[key] !== null) {
      secureClearData(data[key]);
    }
  });
}
