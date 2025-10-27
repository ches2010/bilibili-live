// 配置常量集中管理
module.exports = {
    // B站API地址
    ROOM_INIT_API: "https://api.live.bilibili.com/room/v1/Room/room_init",
    PLAY_INFO_API: "https://api.live.bilibili.com/xlive/web-room/v2/index/getRoomPlayInfo",
    LIVE_INFO_API: "https://api.live.bilibili.com/room/v1/Room/get_info",
    
    // 请求头配置
    HEADERS: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Referer": "https://live.bilibili.com/"
    },
    
    // 清晰度映射表
    QN_MAP: {
        30000: "杜比",
        20000: "4K",
        15000: "2K",
        10000: "原画",
        400: "蓝光 (1080P)",
        250: "超清 (720P)",
        150: "高清 (480P)",
        80: "流畅 (360P)"
    },
    
    // 服务器端口
    PORT: process.env.PORT || 3000
};