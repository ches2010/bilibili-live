const axios = require('axios');
const { COMMON_HEADERS } = require('../utils/config');
const { validateUrl } = require('../utils/validators');

// 下载封面
async function downloadCover(req, res) {
  const { url, roomId } = req.query;
  if (!validateUrl(url)) {
    return res.status(400).send('无效的封面URL');
  }

  try {
    const res = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer'
    });
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="cover_${roomId}.jpg"`
    });
    res.send(res.data);
  } catch (err) {
    res.status(500).send(`下载失败: ${err.message}`);
  }
}

// 下载截图
async function downloadScreenshot(req, res) {
  const { url, roomId } = req.query;
  if (!validateUrl(url)) {
    return res.status(400).send('无效的截图URL');
  }

  try {
    const res = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer'
    });
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="screenshot_${roomId}.jpg"`
    });
    res.send(res.data);
  } catch (err) {
    res.status(500).send(`下载失败: ${err.message}`);
  }
}

module.exports = { downloadCover, downloadScreenshot };
