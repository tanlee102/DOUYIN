const puppeteer = require("puppeteer");
require("dotenv").config();

const scrapeLogic = async (res, videoId) => {
  const browser = await puppeteer.launch({
    headless: true,
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
  });

  let targetFound = false;

  try {
    const page = await browser.newPage();

    // Lắng nghe sự kiện 'response' của trang
    page.on("response", async (response) => {
      const url = response.url();
      // Kiểm tra nếu URL chứa chuỗi chỉ định và chưa có response nào được xử lý
      if (!targetFound && url.includes("https://www.douyin.com/aweme/v1/web/aweme/detail/")) {
        targetFound = true;
        console.log("Tìm thấy response:", url);
        try {
          // Lấy nội dung của response (giả sử định dạng JSON)
          let data = await response.json();
          // Lấy trường bit_rate từ dữ liệu trả về
          const bitRateData =
            data.aweme_detail && data.aweme_detail.video
              ? data.aweme_detail.video.bit_rate
              : null;
          
          if (bitRateData) {
            // Gửi dữ liệu JSON về client
            res.json({ videoId, bit_rate: bitRateData });
          } else {
            res.status(500).json({ error: "Không tìm thấy dữ liệu bit_rate trong response" });
          }
        } catch (error) {
          console.error("Lỗi khi xử lý response:", error);
          res.status(500).json({ error: error.toString() });
        }
      }
    });

    // Xây dựng URL dựa trên videoId
    const targetUrl = `https://www.douyin.com/video/${videoId}`;
    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 260000,
    });

    // Chờ thêm nếu response chưa được bắt kịp
    await page.waitForTimeout(5000);

    // Nếu không tìm thấy target response, gửi thông báo lỗi
    if (!targetFound) {
      res.status(404).json({ error: "Không tìm thấy response chứa dữ liệu mong muốn" });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: `Có lỗi xảy ra khi chạy Puppeteer: ${e}` });
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
