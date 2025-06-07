import { DeviceInfo } from '../interfaces/device-info.interface';

/**
 * Extracts and normalizes device information from request headers
 */
export function extractDeviceInfo(ip: string, userAgent: string): DeviceInfo {
  let os = 'unknown';
  let browser = 'unknown';
  let deviceType = 'unknown';

  // Extract OS information
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac OS')) {
    os = 'MacOS';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (
    userAgent.includes('iOS') ||
    userAgent.includes('iPhone') ||
    userAgent.includes('iPad')
  ) {
    os = 'iOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  }

  // Extract browser information
  if (userAgent.includes('Chrome') && !userAgent.includes('Chromium')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edge')) {
    browser = 'Edge';
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
    browser = 'Internet Explorer';
  }

  // Extract device type
  if (userAgent.includes('Mobile')) {
    deviceType = 'Mobile';
  } else if (userAgent.includes('Tablet')) {
    deviceType = 'Tablet';
  } else {
    deviceType = 'Desktop';
  }

  // Create a simplified fingerprint string
  const fingerprintSource = `${ip}|${browser}|${os}|${deviceType}`;

  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < fingerprintSource.length; i++) {
    hash = (hash << 5) - hash + fingerprintSource.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const fingerprint = hash.toString(16);

  return {
    ip,
    userAgent,
    os,
    browser,
    deviceType,
    fingerprint,
  };
}
