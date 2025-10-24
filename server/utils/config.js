module.exports = {
  // B站API地址
  LIVE_INFO_API: "https://api.live.bilibili.com/room/v1/Room/get_info",
  LIVE_STREAM_API: "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo",
  
  // 请求头配置
  COMMON_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
    'Referer': 'https://live.bilibili.com/',
    'Cookie': 'SESSDATA=bf30894e%2C1776504713%2C093c5%2Aa1CjCDJlHXAwea0my36SkB54MSg4ysPQoi7qOI7UP_3GQ9c9S9H_OvtylHqxab3oOzPUgSVjNwenl4ekMxSHBmbm9oNWhpaC1Hb1V3elFfd1dpbHYyMHpKSUk0bG9qMk1aLUhwTjE5RlI4QkhLMm1hOFZMaG5falNLdlRHNlFvX2dTTUtXd2lKUC1BIIEC; bili_jct=71ddcaabfed5b6a95b490fdc9e716042'
  }
};
