const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
    headless: false
  });
  try {
    const page = await browser.newPage();

    // Listen for all network requests and log the URLs (optional)
    page.on('request', request => {
      console.log('Request URL:', request.url());
    });
    
    page.on('response', async (response) => {
      console.log('Response URL:', response.url());
    });

    await page.goto("https://x.com/KalleXIV/status/1835352967920128355", { waitUntil: 'networkidle2', timeout: 260000 }); // Increase timeout to 60 seconds
  
    // Extract video sources from the page
    const videoSources = await page.evaluate(() => {
      const sources = document.querySelectorAll('video source');
      return Array.from(sources).map(source => source.src);
    });
  
    await browser.close();
    res.send(videoSources);
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };