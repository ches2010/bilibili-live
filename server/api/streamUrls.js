const axios = require('axios');
const { COMMON_HEADERS } = require('../utils/config');

// 解析多线路、多画质流地址
async function getStreamUrls(roomId) {
  try {
    const res = await axios.get('https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo', {
      params: {
        room_id: roomId,
        protocol: '0,1',
        format: '0,1',
        codec: '0',
        qn: '10000',
        platform: 'web',
        ptype: '8'
      },
      headers: COMMON_HEADERS,
      timeout: 10000
    });

    if (res.data.code !== 0) {
      return { code: -1, message: res.data.message || '获取流地址失败', urls: [] };
    }

    const streams = [];
    const playInfo = res.data.data.playurl_info.playurl;
    
    // 解析FLV/HLS流地址（保留文件夹方案的核心逻辑）
    playInfo.stream.forEach(stream => {
      stream.format.forEach(fmt => {
        fmt.codec.forEach(codec => {
          codec.url_info.forEach(urlInfo => {
            const fullUrl = `${urlInfo.host}${codec.base_url}${urlInfo.extra}`;
            if (!fullUrl.startsWith('http')) {
              console.warn('无效的流地址:', fullUrl);
              continue; // 跳过无效地址
            }
            streams.push({
              url: fullUrl,
              format: fmt.format_name,
              quality: codec.quality,
              desc: fmt.format_name === 'flv' ? 'FLV格式' : 'HLS格式'
            });
          });
        });
      });
    });

    return { code: 0, message: 'success', urls: streams };
  } catch (err) {
    return { code: -1, message: err.message, urls: [] };
  }
}

// 接口处理函数
async function handleGetStreamUrls(req, res) {
  const { room_id } = req.query;
  if (!room_id || !/^\d+$/.test(room_id)) {
    return res.json({ code: -1, message: '无效的房间ID' });
  }
  const result = await getStreamUrls(room_id);
  res.json(result);
}

module.exports = { handleGetStreamUrls };
