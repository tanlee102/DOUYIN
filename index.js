const http = require("http");
const url = require("url");
const puppeteer = require("puppeteer");

// Hàm thực hiện việc scrape với Puppeteer dựa trên videoId nhận được
const scrapeDouyin = async (videoId) => {
  let bitRateData = null;
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
  });

  try {
    const page = await browser.newPage();

    // Tạo Promise để resolve ngay khi tìm thấy response mong muốn
    const responsePromise = new Promise((resolve, reject) => {
      page.on("response", async (response) => {
        const responseUrl = response.url();
        if (responseUrl.includes("https://www.douyin.com/aweme/v1/web/aweme/detail/")) {
          console.log("Tìm thấy response:", responseUrl);
          try {
            const data = await response.json();
            bitRateData =
              data.aweme_detail &&
              data.aweme_detail.video &&
              data.aweme_detail.video.bit_rate
                ? data.aweme_detail.video.bit_rate
                : null;
            resolve(bitRateData);
          } catch (error) {
            console.error("Lỗi khi xử lý JSON:", error);
            reject(error);
          }
        }
      });
    });

    // Xây dựng URL Douyin dựa trên videoId
    const targetUrl = `https://www.douyin.com/video/${videoId}`;
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Đợi cho đến khi Promise resolve (nghĩa là đã tìm thấy response)
    bitRateData = await responsePromise;
  } finally {
    await browser.close();
  }
  return bitRateData;
};

// Tạo HTTP server sử dụng module http của Node.js
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // Route chính: GET /scrape?videoId=<videoId>
  if (req.method === "GET" && parsedUrl.pathname === "/scrape") {
    const videoId = parsedUrl.query.videoId;
    if (!videoId) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Thiếu videoId trong request" }));
      return;
    }

    try {
      const bitRateData = await scrapeDouyin(videoId);
      if (bitRateData) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ videoId, bit_rate: bitRateData }));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Không tìm thấy dữ liệu bit_rate trong response" }));
      }
    } catch (error) {
      console.error("Lỗi khi scrape:", error);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.toString() }));
    }
  }
  // Route mặc định: GET /
  else if (req.method === "GET" && parsedUrl.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Puppeteer server is up and running!");
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
