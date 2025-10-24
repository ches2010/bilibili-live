const axios = require('axios');
const { LIVE_INFO_API, LIVE_STREAM_API, COMMON_HEADERS } = require('../utils/config');
const { validateRoomId } = require('../utils/validators');

/**
 * 解析直播流地址（内部工具函数）
 */
async function getLiveStream(roomId) {
  try {
    const res = await axios.get(LIVE_STREAM_API, {
      params: {
        room_id: roomId,
        protocol: '0,1',
        format: '0,1',
        codec: '0',
        qn: '10000',
        platform: 'web',
        ptype: '8'
      },
      headers: { ...COMMON_HEADERS, Origin: 'https://live.bilibili.com' },
      timeout: 10000
    });

    if (res.data.code !== 0) {
      return { stream_url: '', stream_urls: [], qn_desc: {}, message: res.data.message || '获取流失败' };
    }

    // 解析流地址
    const streamUrls = [];
    const streams = res.data.data.playurl_info.playurl.stream || [];
    streams.forEach(stream => {
      stream.format?.forEach(fmt => {
        fmt.codec?.forEach(codec => {
          const baseUrl = codec.base_url || '';
          codec.url_info?.forEach(info => {
            const fullUrl = `${info.host || ''}${baseUrl}${info.extra || ''}`;
            if (fullUrl.startsWith(('http://', 'https://')) && !streamUrls.includes(fullUrl)) {
              streamUrls.push(fullUrl);
            }
          });
        });
      });
    });

    // 解析画质描述
    const qnDesc = {};
    res.data.data.quality_description?.forEach(qn => {
      qnDesc[qn.qn] = qn.desc || '';
    });

    return {
      stream_url: streamUrls[0] || '',
      stream_urls: streamUrls,
      qn_desc: qnDesc,
      message: streamUrls.length ? 'success' : '无有效流'
    };
  } catch (err) {
    return { stream_url: '', stream_urls: [], qn_desc: {}, message: err.message };
  }
}

/**
 * 对外暴露的直播信息API处理函数
 */
async function getLiveInfo(req, res) {
  try {
    const { room_id } = req.body;
    if (!validateRoomId(room_id)) {
      return res.json({ code: -1, message: '房间ID必须是数字', data: {} });
    }

    // 请求直播间基础信息
    const infoRes = await axios.get(LIVE_INFO_API, {
      params: { room_id, platform: 'web' },
      headers: COMMON_HEADERS,
      timeout: 10000
    });

    if (infoRes.data.code !== 0) {
      return res.json({ code: infoRes.data.code, message: infoRes.data.message, data: {} });
    }

    // 关联流信息并返回
    const liveInfo = infoRes.data.data;
    const streamInfo = await getLiveStream(room_id);
    res.json({
      code: 0,
      message: 'success',
      data: {
        user_cover: liveInfo.cover || liveInfo.user_cover || '',
        keyframe: liveInfo.keyframe || '',
        title: liveInfo.title || '',
        uname: liveInfo.uname || '',
        room_id: liveInfo.room_id || room_id,
        live_status: liveInfo.live_status || 0,
        live_time: liveInfo.live_time || '',
        stream_url: streamInfo.stream_url,
        stream_urls: streamInfo.stream_urls,
        qn_desc: streamInfo.qn_desc
      }
    });
  } catch (err) {
    res.json({ code: -1, message: err.message, data: {} });
  }
}

module.exports = { getLiveInfo };
