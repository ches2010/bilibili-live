# bilibili-live

一个基于B站直播API的直播播放器工具，支持直播信息查询、多格式直播流播放（FLV/HLS）、封面与截图下载等功能。整合了高效的流地址解析方案和稳定的播放控制逻辑，提供简洁易用的界面。


## 功能特点

- **直播信息获取**：查询直播间标题、主播信息、直播状态、开播时间等
- **多格式播放支持**：兼容FLV和HLS两种主流直播流格式
- **多线路选择**：提供多条直播线路切换，适配不同网络环境
- **媒体资源管理**：支持直播封面和实时截图查看与下载
- **跨域代理**：内置图片和视频流代理服务，解决B站资源防盗链问题


## 技术栈

- **前端**：HTML5 + CSS3 + JavaScript（原生ES6+）
- **后端**：Node.js + Express
- **播放引擎**：flv.js（FLV格式）、hls.js（HLS格式）
- **API交互**：Axios（后端）、Fetch API（前端）


## 目录结构

```
bilibili-live/
├─ server/                  # 后端服务
│  ├─ api/                  # API处理逻辑
│  │  ├─ liveInfo.js        # 直播基础信息接口
│  │  ├─ streamUrls.js      # 直播流地址解析接口（多线路支持）
│  │  ├─ proxy.js           # 图片/视频流代理服务
│  │  └─ download.js        # 媒体下载接口
│  ├─ utils/                # 工具模块
│  │  ├─ config.js          # 常量配置（请求头、API地址等）
│  │  └─ validators.js      # 参数验证工具
│  └─ index.js              # 服务入口（路由配置）
└─ client/                  # 前端页面
   ├─ css/
   │  └─ styles.css         # 样式文件
   ├─ js/
   │  ├─ main.js            # 主逻辑（事件绑定、流程控制）
   │  ├─ api.js             # API请求封装
   │  ├─ utils.js           # 前端工具函数
   │  └─ player/            # 播放器模块
   │     ├─ playerManager.js # 播放器实例管理
   │     ├─ flvPlayer.js    # FLV格式播放逻辑
   │     └─ hlsPlayer.js    # HLS格式播放逻辑
   └─ index.html            # 页面入口
```


## 快速开始

### 环境要求

- Node.js 14+
- npm 6+


### 安装与启动

1. 克隆仓库并进入目录
   ```bash
   git clone https://github.com/ches2010/bilibili-live.git
   cd bilibili-live
   ```

2. 安装后端依赖
   ```bash
   cd server
   npm install express axios
   ```

3. 启动服务
   ```bash
   node index.js
   ```

4. 访问应用
   打开浏览器，访问 `http://localhost:3000`


## 使用说明

1. **查询直播**：在输入框中填写B站直播间ID（如`231054`），点击"获取直播信息"
2. **查看信息**：系统会显示直播间标题、主播名称、直播状态等基础信息
3. **播放直播**：自动加载直播流，支持播放/暂停/重新加载操作
4. **切换线路**：通过"选择线路"下拉框切换不同格式/线路的直播流
5. **下载资源**：点击"下载封面"或"下载截图"可保存对应的媒体资源


## 接口说明

### 后端API

| 接口地址 | 方法 | 说明 | 参数 |
|----------|------|------|------|
| `/api/bilibili-live-info` | POST | 获取直播基础信息 | `{ room_id: 直播间ID }` |
| `/api/stream-urls` | GET | 获取多线路直播流地址 | `?room_id=直播间ID` |
| `/api/image-proxy` | GET | 图片代理（解决防盗链） | `?url=原始图片URL` |
| `/api/stream-proxy` | GET | 视频流代理 | `?url=原始流地址` |
| `/api/download-cover` | GET | 下载封面 | `?url=封面URL&roomId=直播间ID` |
| `/api/download-screenshot` | GET | 下载截图 | `?url=截图URL&roomId=直播间ID` |


## 注意事项

- 本项目仅用于学习交流，请勿用于商业用途
- 直播内容版权归B站及主播所有，使用时请遵守相关法律法规
- 部分直播间可能因版权限制无法播放，具体以实际情况为准
- 开发环境下关闭了SSL证书验证，生产环境需根据需求调整


## 许可证

[Apache License 2.0](LICENSE)
