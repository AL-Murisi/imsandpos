// lib/puppeteerInstance.ts
const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");

const remoteChromiumURL =
  "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

let _browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
let _browserPromise: Promise<any> | null = null;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

async function launchBrowserInstance() {
  const isProduction = process.env.NODE_ENV === "production";

  console.log(
    `🚀 Launching browser (${isProduction ? "production" : "development"})...`,
  );

  try {
    let browser;

    if (isProduction) {
      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          "--disable-dev-shm-usage", // Prevents memory issues
          "--disable-gpu",
          "--single-process", // Important for serverless
        ],
        executablePath: await chromium.executablePath(remoteChromiumURL),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
        defaultViewport: chromium.defaultViewport,
      });
    } else {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
    }

    console.log("✅ Browser launched successfully");

    // Handle browser disconnection
    browser.on("disconnected", () => {
      console.warn("⚠️ Browser disconnected, clearing instance");
      _browser = null;
      _browserPromise = null;
    });

    return browser;
  } catch (error) {
    console.error("❌ Failed to launch browser:", error);
    throw error;
  }
}

async function checkBrowserHealth(browser: any): Promise<boolean> {
  try {
    // Check if browser is connected
    if (!browser.isConnected()) {
      console.warn("⚠️ Browser not connected");
      return false;
    }

    // Try to get browser version as a health check
    await browser.version();
    return true;
  } catch (error) {
    console.warn("⚠️ Browser health check failed:", error);
    return false;
  }
}

export async function getBrowser() {
  const now = Date.now();

  // If browser exists, check if it needs a health check
  if (_browser && now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    const isHealthy = await checkBrowserHealth(_browser);

    if (isHealthy) {
      lastHealthCheck = now;
      return _browser;
    } else {
      // Browser is unhealthy, clean up
      console.log("🔄 Browser unhealthy, recreating...");
      try {
        await _browser.close();
      } catch (e) {
        console.warn("Error closing unhealthy browser:", e);
      }
      _browser = null;
      _browserPromise = null;
    }
  }

  // If browser exists and was recently checked, return it
  if (_browser) {
    return _browser;
  }

  // If browser is being launched, wait for it
  if (_browserPromise) {
    console.log("⏳ Waiting for existing browser launch...");
    try {
      _browser = await _browserPromise;
      lastHealthCheck = now;
      return _browser;
    } catch (error) {
      console.error("Error waiting for browser launch:", error);
      _browserPromise = null;
      // Fall through to launch new browser
    }
  }

  // Launch new browser
  _browserPromise = launchBrowserInstance();

  try {
    _browser = await _browserPromise;
    lastHealthCheck = now;
    return _browser;
  } catch (error) {
    _browserPromise = null;
    throw error;
  }
}

export async function closeBrowser() {
  if (_browser) {
    console.log("🔒 Closing browser...");
    try {
      await _browser.close();
      console.log("✅ Browser closed successfully");
    } catch (error) {
      console.error("❌ Error closing browser:", error);
    } finally {
      _browser = null;
      _browserPromise = null;
    }
  }
}

// Force browser recreation (useful for debugging)
export async function recreateBrowser() {
  console.log("🔄 Force recreating browser...");
  await closeBrowser();
  return await getBrowser();
}

// Graceful shutdown handlers
if (typeof process !== "undefined") {
  const cleanup = async () => {
    console.log("🛑 Cleaning up browser on process exit...");
    await closeBrowser();
  };

  process.on("beforeExit", cleanup);
  process.on("SIGINT", async () => {
    await cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await cleanup();
    process.exit(0);
  });
}
