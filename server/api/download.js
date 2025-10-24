const axios = require('axios');
const sharp = require('sharp');
const { COMMON_HEADERS } = require('../utils/config');
const { validateUrl } = require('../utils/validators');

/**
 * 封面下载API
 */
async function downloadCover(req, res) {
  try {
    const { url, roomId = 'unknown' } = req.query;
    if (!validateUrl(url)) {
      return res.status(400).send('无效的URL参数');
    }

    const res = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const metadata = await sharp(res.data).metadata();
    const format = metadata.format || 'jpg';
    const filename = `封面_${roomId}.${format}`;

    res.set({
      'Content-Type': `image/${format}`,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    });
    res.send(res.data);
  } catch (err) {
    res.status(500).send(`封面下载失败：${err.message}`);
  }
}

/**
 * 截图下载API
 */
async function downloadScreenshot(req, res) {
  try {
    const { url, roomId = 'unknown' } = req.query;
    if (!validateUrl(url)) {
      return res.status(400).send('无效的URL参数');
    }

    const res = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const metadata = await sharp(res.data).metadata();
    const format = metadata.format || 'jpg';
    const filename = `截图_${roomId}.${format}`;

    res.set({
      'Content-Type': `image/${format}`,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    });
    res.send(res.data);
  } catch (err) {
    res.status(500).send(`截图下载失败：${err.message}`);
  }
}

module.exports = { downloadCover, downloadScreenshot };
