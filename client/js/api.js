// 获取直播信息（ches2010方案）
export async function getLiveInfo(roomId) {
  const res = await fetch('/api/bilibili-live-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room_id: roomId })
  });
  return res.json();
}

// 获取流地址（文件夹方案接口）
export async function getStreamUrls(roomId) {
  const res = await fetch(`/api/stream-urls?room_id=${roomId}`);
  return res.json();
}
