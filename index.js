const express = require("express");
const { scrapeLogic } = require("./scrapeLogic");

const app = express();
const PORT = process.env.PORT || 4000;

app.get("/scrape", (req, res) => {
  // Lấy videoId từ query parameter, ví dụ: /scrape?videoId=7487182927478967571
  const videoId = req.query.videoId;
  if (!videoId) {
    return res.status(400).json({ error: "Thiếu videoId trong request" });
  }
  scrapeLogic(res, videoId);
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
