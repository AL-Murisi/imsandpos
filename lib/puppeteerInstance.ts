const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");

let _browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

export async function getBrowser() {
  if (_browser) return _browser;

  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    // Add font support
    await chromium.font(
      "https://raw.githack.com/googlei18n/noto-emoji/master/fonts/NotoColorEmoji.ttf",
    );

    _browser = await puppeteerCore.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--font-render-hinting=none",
      ],
      executablePath: await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar",
      ),
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
