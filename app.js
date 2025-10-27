const express = require('express');
const axios = require('axios');
const sharp = require('sharp');
const { Readable } = require('stream');
const app = express();

// 中间件配置
app.use(express.static('public'));
app.use(express.json());

// B站API地址
const ROOM_INIT_API = "https://api.live.bilibili.com/room/v1/Room/room_init";
const PLAY_INFO_API = "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo";
const LIVE_INFO_API = "https://api.live.bilibili.com/room/v1/Room/get_info";

// 请求头配置
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Referer": "https://live.bilibili.com/"
};

// 清晰度映射
const QN_MAP = {
  30000: "杜比",
  20000: "4K",
  15000: "2K",
  10000: "原画",
  400: "蓝光 (1080P)",
  250: "超清 (720P)",
  150: "高清 (480P)",
  80: "流畅 (360P)"
};

// 获取直播流地址
async function getAllStreamUrls(roomId) {
  try {
    const params = {
      "room_id": roomId,
      "protocol": "0,1",
      "format": "0,1,2",
      "codec": "0,1",
      "qn": 10000
    };

    const response = await axios.get(PLAY_INFO_API, { 
      params, 
      headers: HEADERS,
      timeout: 10000
    });
    
    if (response.data.code !== 0) {
      throw new Error(`API 错误: ${response.data.message}`);
    }

    const streams = response.data.data.playurl_info.playurl.stream;
    const results = { flv: null, fmp4: null, ts: null };

    for (const stream of streams) {
      for (const fmt of stream.format) {
        const fmtName = fmt.format_name;
        if (!results.hasOwnProperty(fmtName)) continue;
        
        for (const codec of fmt.codec) {
          if (codec.codec_name !== "avc") continue; // 优先 H.264
          
          const currentQn = codec.current_qn;
          const baseUrl = codec.base_url;
          const urlInfo = codec.url_info[0];
          const fullUrl = urlInfo.host + baseUrl + urlInfo.extra;
          const qnLabel = QN_MAP[currentQn] || `QN${currentQn}`;
          
          results[fmtName] = {
            qn: currentQn,
            label: qnLabel,
            url: fullUrl
          };
          break;
        }
      }
    }
    return results;
  } catch (error) {
    throw new Error(`获取流地址失败: ${error.message}`);
  }
}

// 获取直播信息（封面、截图等）
async function getLiveInfo(roomId) {
  try {
    const response = await axios.get(LIVE_INFO_API, {
      params: { room_id: roomId },
      headers: HEADERS,
      timeout: 10000
    });

    if (response.data.code !== 0) {
      return {
        code: response.data.code,
        message: response.data.message || '未知错误',
        data: {}
      };
    }

    const liveInfo = response.data.data;
    return {
      code: 0,
      message: 'success',
      data: {
        user_cover: liveInfo.cover || liveInfo.user_cover || '',
        keyframe: liveInfo.keyframe || '',
        title: liveInfo.title || '',
        uname: liveInfo.uname || '',
        room_id: liveInfo.room_id || roomId,
        live_status: liveInfo.live_status || 0,
        live_time: liveInfo.live_time || ''
      }
    };
  } catch (error) {
    return {
      code: -1,
      message: `请求错误: ${error.message}`,
      data: {}
    };
  }
}

// 路由配置
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// 获取直播流地址接口
app.post('/api/getStreamUrls', async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId || !/^\d+$/.test(roomId)) {
      return res.status(400).json({
        error: true,
        message: "请输入有效的直播间号码"
      });
    }

    // 验证房间号
    const initResponse = await axios.get(ROOM_INIT_API, {
      params: { id: roomId },
      headers: HEADERS,
      timeout: 10000
    });

    if (initResponse.data.code !== 0) {
      return res.status(400).json({
        error: true,
        message: `直播间错误: ${initResponse.data.msg}`
      });
    }

    const roomData = initResponse.data.data;
    const liveStatus = roomData.live_status;
    const statusText = { 0: "未开播", 1: "直播中", 2: "轮播中" }[liveStatus] || "未知";
    const isLive = liveStatus === 1;

    const roomInfo = {
      room_id: roomId,
      title: roomData.title || "未知标题",
      cover: roomData.cover || "",
      face: roomData.face || "",
      uname: roomData.uname || "未知主播",
      live_status: liveStatus,
      status_text: statusText,
      is_live: isLive
    };

    if (!isLive) {
      return res.json({
        error: false,
        room_info: roomInfo,
        streams: null
      });
    }

    // 获取流地址
    const streams = await getAllStreamUrls(roomId);
    const streamResult = {};
    for (const key of ["flv", "fmp4", "ts"]) {
      streamResult[key] = streams[key] 
        ? { label: streams[key].label, url: streams[key].url }
        : null;
    }

    return res.json({
      error: false,
      room_info: roomInfo,
      streams: streamResult
    });

  } catch (error) {
    return res.status(500).json({
      error: true,
      message: `获取失败: ${error.message}`
    });
  }
});

// 获取直播信息接口
app.post('/api/bilibili-live-info', async (req, res) => {
  try {
    const { room_id } = req.body;
    if (!room_id || !/^\d+$/.test(room_id)) {
      return res.status(400).json({
        code: -1,
        message: '房间ID必须是数字',
        data: {}
      });
    }

    const result = await getLiveInfo(room_id);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      code: -1,
      message: error.message,
      data: {}
    });
  }
});

// 图片代理接口
app.get('/api/image-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).send("URL参数缺失");
    }

    const response = await axios.get(url, {
      headers: HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    
    // 使用sharp处理图片（保持格式）
    const processed = await sharp(response.data).toBuffer();
    
    res.set('Content-Type', contentType);
    res.send(processed);
  } catch (error) {
    res.status(500).send(`图片代理错误: ${error.message}`);
  }
});

// 下载封面
app.get('/api/download-cover', async (req, res) => {
  try {
    const { url, roomId = 'unknown' } = req.query;
    if (!url) {
      return res.status(400).send("URL参数缺失");
    }

    const response = await axios.get(url, {
      headers: HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('gif')) ext = 'gif';

    const filename = `封面_${roomId}.${ext}`;
    
    // 设置下载响应头
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    });
    
    res.send(response.data);
  } catch (error) {
    res.status(500).send(`下载失败: ${error.message}`);
  }
});

// 下载截图
app.get('/api/download-screenshot', async (req, res) => {
  try {
    const { url, roomId = 'unknown' } = req.query;
    if (!url) {
      return res.status(400).send("URL参数缺失");
    }

    const response = await axios.get(url, {
      headers: HEADERS,
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('gif')) ext = 'gif';

    const filename = `截图_${roomId}.${ext}`;
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`
    });
    
    res.send(response.data);
  } catch (error) {
    res.status(500).send(`下载失败: ${error.message}`);
  }
});

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});