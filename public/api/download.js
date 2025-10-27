const axios = require('axios');
const { COMMON_HEADERS } = require('../utils/config');
const { validateUrl } = require('../utils/validators');

// 下载封面（修复变量名冲突）
async function downloadCover(req, res) {
  const { url, roomId } = req.query;
  if (!validateUrl(url)) {
    return res.status(400).send('无效的封面URL');
  }

  try {
    // 将 axios 响应对象命名为 imgRes（避免与 Express 的 res 冲突）
    const imgRes = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer'
    });
    // 使用正确的 Express 响应对象 res
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="cover_${roomId}.jpg"`
    });
    res.send(imgRes.data); // 发送 axios 获取的图片数据
  } catch (err) {
    res.status(500).send(`下载失败: ${err.message}`);
  }
}

// 下载截图（同样修复变量名冲突）
async function downloadScreenshot(req, res) {
  const { url, roomId } = req.query;
  if (!validateUrl(url)) {
    return res.status(400).send('无效的截图URL');
  }

  try {
    // 将 axios 响应对象命名为 imgRes
    const imgRes = await axios.get(url, {
      headers: COMMON_HEADERS,
      responseType: 'arraybuffer'
    });
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `attachment; filename="screenshot_${roomId}.jpg"`
    });
    res.send(imgRes.data);
  } catch (err) {
    res.status(500).send(`下载失败: ${err.message}`);
  }
}

module.exports = { downloadCover, downloadScreenshot };
