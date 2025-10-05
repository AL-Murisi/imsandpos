// lib/puppeteerInstance.ts
const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");

const remoteChromiumURL =
  "https://github.com/Sparticuz/chromium/releases/download/v121.0.0/chromium-v121.0.0-pack.tar";

let _browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

export async function getBrowser() {
  if (_browser) return _browser;

  const isProduction =
    process.env.NODE_ENV === "production" ||
    process.env.NEXT_PUBLIC_VERCEL_ENVIRONMENT === "production";

  if (isProduction) {
    _browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(remoteChromiumURL),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
      defaultViewport: chromium.defaultViewport,
    });
  } else {
    _browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  return _browser;
}

export async function closeBrowser() {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
