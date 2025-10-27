const axios = require('axios');
const { LIVE_INFO_API, COMMON_HEADERS } = require('../utils/config');
const { validateRoomId } = require('../utils/validators');

async function getLiveInfo(req, res) {
  try {
    const { room_id } = req.body;
    if (!validateRoomId(room_id)) {
      return res.json({ code: -1, message: '房间ID必须是数字', data: {} });
    }

    const infoRes = await axios.get(LIVE_INFO_API, {
      params: { room_id, platform: 'web' },
      headers: COMMON_HEADERS,
      timeout: 10000
    });

    if (infoRes.data.code !== 0) {
      return res.json({ code: infoRes.data.code, message: infoRes.data.message, data: {} });
    }

    const liveInfo = infoRes.data.data;
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
        live_time: liveInfo.live_time || ''
      }
    });
  } catch (err) {
    res.json({ code: -1, message: err.message, data: {} });
  }
}

module.exports = { getLiveInfo };
