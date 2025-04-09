/**
 * Security utilities for handling sensitive health data
 * in compliance with HIPAA and other healthcare regulations
 */

// Constants for security features
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds

/**
 * Securely encrypt sensitive data using the Web Crypto API
 * @param data Data to encrypt
 * @param key Encryption key
 */
export async function encryptData(
  data: any,
  key: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  // Convert data to string if needed
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);

  // Generate a random IV for AES-GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // Encode data to ArrayBuffer
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(dataString);

  // Encrypt the data
  const ciphertext = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encodedData,
  );

  // Convert to base64 strings for storage/transmission
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt data that was encrypted with encryptData
 * @param ciphertext Encrypted data as base64 string
 * @param iv Initialization vector as base64 string
 * @param key Decryption key
 */
export async function decryptData(ciphertext: string, iv: string, key: CryptoKey): Promise<any> {
  // Convert base64 strings back to ArrayBuffers
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);
  const ivBuffer = base64ToArrayBuffer(iv);

  // Decrypt the data
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer,
    },
    key,
    ciphertextBuffer,
  );

  // Decode decrypted data
  const decoder = new TextDecoder();
  const decodedData = decoder.decode(decrypted);

  // Parse JSON if the original data was an object
  try {
    return JSON.parse(decodedData);
  } catch (e) {
    // If not valid JSON, return as string
    return decodedData;
  }
}

/**
 * Generate a new encryption key for secure client-side storage
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true, // extractable
    ['encrypt', 'decrypt'],
  );
}

/**
 * Set up automatic session timeout for security
 * @param onTimeout Callback function to execute when timeout occurs
 * @param timeoutMs Timeout in milliseconds (defaults to 15 minutes)
 */
export function setupSessionTimeout(
  onTimeout: () => void,
  timeoutMs = INACTIVITY_TIMEOUT,
): () => void {
  let timeoutId: number | null = null;

  // Function to reset the timeout
  const resetTimeout = () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    timeoutId = window.setTimeout(onTimeout, timeoutMs);
  };

  // Set up event listeners to reset timeout on user activity
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  events.forEach((event) => {
    document.addEventListener(event, resetTimeout, false);
  });

  // Start the initial timeout
  resetTimeout();

  // Return cleanup function
  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    events.forEach((event) => {
      document.removeEventListener(event, resetTimeout);
    });
  };
}

/**
 * Set up automatic token refresh to prevent session expiration
 * @param refreshToken Function that refreshes the auth token
 * @param intervalMs Interval in milliseconds (defaults to 14 minutes)
 */
export function setupTokenRefresh(
  refreshToken: () => Promise<void>,
  intervalMs = TOKEN_REFRESH_INTERVAL,
): () => void {
  const intervalId = window.setInterval(refreshToken, intervalMs);

  // Return cleanup function
  return () => {
    window.clearInterval(intervalId);
  };
}

// Helper functions for base64 conversion
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
