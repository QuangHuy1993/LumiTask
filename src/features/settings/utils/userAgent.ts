/**
 * Simple User-Agent parser to extract OS and Browser information
 */
export interface UserAgentInfo {
  os: string;
  browser: string;
  isMobile: boolean;
  deviceType: "desktop" | "mobile" | "tablet";
}

export function parseUserAgent(ua: string | null): UserAgentInfo {
  if (!ua) {
    return {
      os: "Unknown",
      browser: "Unknown",
      isMobile: false,
      deviceType: "desktop",
    };
  }

  let os = "Unknown";
  let browser = "Unknown";
  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";

  // Match OS
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) {
    os = "Android";
    deviceType = "mobile";
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    os = "iOS";
    deviceType = /ipad/i.test(ua) ? "tablet" : "mobile";
  } else if (/linux/i.test(ua)) os = "Linux";

  // Match Browser
  if (/edg/i.test(ua)) browser = "Edge";
  else if (/chrome|crios/i.test(ua) && !/opr|opios/i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome|crios|edg/i.test(ua)) browser = "Safari";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/opr|opios/i.test(ua)) browser = "Opera";

  const isMobile = deviceType !== "desktop";

  return { os, browser, isMobile, deviceType };
}
