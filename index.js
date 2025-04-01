const http = require("http");
const url = require("url");
const puppeteer = require("puppeteer");

// Hàm thực hiện việc scrape với Puppeteer dựa trên videoId nhận được
const scrapeDouyin = async (videoId) => {
  let bitRateData = null;

  // Khởi tạo browser với cấu hình headless và args phù hợp
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

    // Xây dựng URL Douyin dựa trên videoId
    const targetUrl = `https://www.douyin.com/video/${videoId}`;
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 260000,
    });

    // Sử dụng waitForResponse để đợi response có URL chứa chuỗi chỉ định
    const response = await page.waitForResponse((response) =>
      response.url().includes("https://www.douyin.com/aweme/v1/web/aweme/detail/")
    );

    console.log("Tìm thấy response:", response.url());

    try {
      // Lấy dữ liệu JSON từ response
      const data = await response.json();
      // Trích xuất trường bit_rate nếu có
      bitRateData =
        data.aweme_detail &&
        data.aweme_detail.video &&
        data.aweme_detail.video.bit_rate
          ? data.aweme_detail.video.bit_rate
          : null;
    } catch (error) {
      console.error("Lỗi khi xử lý JSON:", error);
    }

    // Thêm thời gian chờ nếu cần thiết
    await page.waitForTimeout(5000);
  } catch (error) {
    console.error("Lỗi khi scrape:", error);
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
