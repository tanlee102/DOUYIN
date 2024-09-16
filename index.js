const http = require('http');
const puppeteer = require('puppeteer');

// Define a function that runs Puppeteer to get video sources
async function getVideoSources(url) {
  const browser = await puppeteer.launch({
    headless: true, // Run without opening the browser
  });

  const page = await browser.newPage();

  // Listen for all network requests and log the URLs (optional)
  page.on('request', request => {
    console.log('Request URL:', request.url());
  });

  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Increase timeout to 60 seconds

  // Extract video sources from the page
  const videoSources = await page.evaluate(() => {
    const sources = document.querySelectorAll('video source');
    return Array.from(sources).map(source => source.src);
  });

  await browser.close();
  return videoSources;
}

// Create an HTTP server
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url.startsWith('/get-video-sources')) {
    // Extract URL query parameter
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const videoUrl = urlParams.get('url');

    if (!videoUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Video URL is required' }));
      return;
    }

    try {
      // Get the video sources by calling Puppeteer function
      const videoSources = await getVideoSources(videoUrl);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ videoSources }));
    } catch (error) {
        console.log(error)
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to retrieve video sources' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});