/**
 * Cloudflare Worker - Douyin Extractor API
 * Handles Douyin link parsing and serves the frontend
 */

const HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Douyin Extractor - 抖音链接文案提取</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d0d0d;
      --surface: #1a1a2e;
      --surface2: #16162a;
      --primary: #ff2d78;
      --primary-dim: rgba(255, 45, 120, 0.15);
      --accent: #00f5d4;
      --accent-dim: rgba(0, 245, 212, 0.12);
      --text: #e0e0e0;
      --text-muted: #666;
      --border: rgba(255, 255, 255, 0.08);
      --radius: 14px;
      --radius-sm: 8px;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Space Grotesk', -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
      background-image: radial-gradient(ellipse at 20% 0%, rgba(255, 45, 120, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(0, 245, 212, 0.05) 0%, transparent 50%);
    }
    .container { width: 100%; max-width: 600px; }
    header { text-align: center; margin-bottom: 48px; }
    .logo { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, var(--primary), #ff6b35); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; box-shadow: 0 4px 24px rgba(255, 45, 120, 0.3); }
    h1 { font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #fff, #ccc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .subtitle { color: var(--text-muted); font-size: 14px; margin-top: 6px; letter-spacing: 0.5px; }
    .input-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin-bottom: 24px; }
    .input-wrapper { display: flex; gap: 12px; }
    .input-box { flex: 1; position: relative; }
    .input-box input { width: 100%; padding: 14px 16px; background: var(--surface2); border: 1.5px solid var(--border); border-radius: var(--radius-sm); color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 13px; outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
    .input-box input::placeholder { color: var(--text-muted); }
    .input-box input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-dim); }
    .input-box.shake { animation: shake 0.4s ease; }
    @keyframes shake { 0%, 100% { transform: translateX(0); } 20%, 60% { transform: translateX(-6px); } 40%, 80% { transform: translateX(6px); } }
    .input-box.error input { border-color: #ff4757; box-shadow: 0 0 0 3px rgba(255, 71, 87, 0.15); }
    .btn { padding: 14px 28px; border: none; border-radius: var(--radius-sm); font-family: 'Space Grotesk', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; justify-content: center; }
    .btn-primary { background: linear-gradient(135deg, var(--primary), #ff6b35); color: white; box-shadow: 0 4px 16px rgba(255, 45, 120, 0.3); }
    .btn-primary:hover { transform: scale(1.02); box-shadow: 0 6px 24px rgba(255, 45, 120, 0.4); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
    .btn-secondary:hover { background: var(--surface); border-color: var(--accent); color: var(--accent); }
    .btn-accent { background: linear-gradient(135deg, var(--accent), #00c9a7); color: #0d0d0d; font-weight: 700; }
    .btn-accent:hover { transform: scale(1.02); box-shadow: 0 4px 16px rgba(0, 245, 212, 0.3); }
    .btn-accent.copied { background: #2ed573; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .result-section { display: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 24px; opacity: 0; transform: translateY(20px); transition: opacity 0.3s ease, transform 0.3s ease; }
    .result-section.visible { display: block; opacity: 1; transform: translateY(0); }
    .result-header { padding: 16px 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 10px; }
    .result-header .badge { background: var(--accent-dim); color: var(--accent); font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 20px; letter-spacing: 0.5px; }
    .result-header .aweme-id { color: var(--text-muted); font-size: 12px; font-family: 'JetBrains Mono', monospace; }
    .result-cover { width: 100%; aspect-ratio: 16/9; background: var(--surface2); overflow: hidden; position: relative; }
    .result-cover img { width: 100%; height: 100%; object-fit: cover; }
    .result-cover .video-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); opacity: 0; transition: opacity 0.2s; }
    .result-cover:hover .video-overlay { opacity: 1; }
    .result-body { padding: 24px; }
    .result-title { font-size: 16px; font-weight: 600; line-height: 1.6; margin-bottom: 8px; color: #fff; }
    .result-author { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }
    .result-actions { display: flex; gap: 12px; flex-wrap: wrap; }
    .result-actions .btn { flex: 1; justify-content: center; min-width: 140px; }
    .video-link-box { margin-top: 16px; padding: 14px; background: var(--surface2); border-radius: var(--radius-sm); border: 1px solid var(--border); }
    .video-link-box label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .video-link-box input { width: 100%; padding: 10px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; color: var(--text); font-family: 'JetBrains Mono', monospace; font-size: 12px; outline: none; }
    .video-link-box input:focus { border-color: var(--accent); }
    .error-toast { display: none; background: rgba(255, 71, 87, 0.15); border: 1px solid rgba(255, 71, 87, 0.3); border-radius: var(--radius-sm); padding: 14px 18px; margin-bottom: 20px; color: #ff4757; font-size: 14px; align-items: center; gap: 10px; }
    .error-toast.visible { display: flex; }
    .toast { position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%) translateY(100px); background: var(--surface); border: 1px solid var(--accent); color: var(--accent); padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 500; box-shadow: 0 4px 24px rgba(0, 245, 212, 0.2); transition: transform 0.3s ease; z-index: 1000; }
    .toast.visible { transform: translateX(-50%) translateY(0); }
    .help-section { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; }
    .help-section h3 { font-size: 14px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .faq-item { margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
    .faq-item:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
    .faq-item h4 { font-size: 14px; color: var(--text); margin-bottom: 6px; }
    .faq-item p { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
    footer { text-align: center; margin-top: 40px; color: var(--text-muted); font-size: 12px; }
    @media (max-width: 500px) {
      body { padding: 24px 16px; }
      .input-wrapper { flex-direction: column; }
      .btn-primary { width: 100%; }
      .result-actions { flex-direction: column; }
      .result-actions .btn { min-width: unset; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="logo">
        <div class="logo-icon">🔗</div>
        <h1>Douyin Extractor</h1>
      </div>
      <p class="subtitle">抖音链接 · 视频提取 · 文案复制 · 全程免费</p>
    </header>

    <div class="input-section">
      <div class="input-wrapper">
        <div class="input-box" id="inputBox">
          <input type="text" id="urlInput" placeholder="粘贴抖音链接，如 https://v.douyin.com/xxx" autocomplete="off" />
        </div>
        <button class="btn btn-primary" id="extractBtn" onclick="handleExtract()">
          <span id="btnText">提取</span>
        </button>
      </div>
    </div>

    <div class="error-toast" id="errorToast">
      <span>⚠️</span>
      <span id="errorText"></span>
    </div>

    <div class="result-section" id="resultSection">
      <div class="result-header">
        <span class="badge">解析成功</span>
        <span class="aweme-id" id="awemeId"></span>
      </div>
      <div class="result-cover" id="resultCover">
        <img id="coverImg" src="" alt="封面" />
        <div class="video-overlay">
          <button class="btn btn-accent" onclick="openVideo()">▶ 播放视频</button>
        </div>
      </div>
      <div class="result-body">
        <div class="result-title" id="resultTitle"></div>
        <div class="result-author" id="resultAuthor"></div>
        <div class="result-actions">
          <button class="btn btn-secondary" id="copyBtn" onclick="handleCopy()">📋 复制文案</button>
          <button class="btn btn-primary" id="downloadBtn" onclick="handleDownload()">⬇️ 下载视频</button>
        </div>
        <div class="video-link-box">
          <label>视频直链</label>
          <input type="text" id="videoLink" readonly />
        </div>
      </div>
    </div>

    <div class="help-section">
      <h3>📖 使用说明</h3>
      <div class="faq-item"><h4>支持哪些链接格式？</h4><p>支持抖音分享链接（v.douyin.com/xxx）和完整视频链接</p></div>
      <div class="faq-item"><h4>如何获取视频链接？</h4><p>在抖音 App 中，点击分享 → 复制链接，粘贴即可</p></div>
      <div class="faq-item"><h4>视频直链如何使用？</h4><p>复制直链后，在浏览器打开即可下载，或粘贴到下载工具</p></div>
      <div class="faq-item"><h4>下载失败怎么办？</h4><p>链接有时效性，如果下载失败可尝试重新解析</p></div>
    </div>

    <footer>全程免费 · 无广告 · 无需登录</footer>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    let currentResult = null;

    async function handleExtract() {
      const input = document.getElementById('urlInput');
      const btn = document.getElementById('extractBtn');
      const btnText = document.getElementById('btnText');
      const inputBox = document.getElementById('inputBox');
      const errorToast = document.getElementById('errorToast');
      const resultSection = document.getElementById('resultSection');

      const url = input.value.trim();
      errorToast.classList.remove('visible');
      inputBox.classList.remove('error');
      resultSection.classList.remove('visible');

      if (!url) {
        inputBox.classList.add('shake', 'error');
        setTimeout(() => inputBox.classList.remove('shake'), 400);
        return;
      }

      if (!url.includes('douyin.com') && !url.includes('iesdouyin.com')) {
        showError('请输入有效的抖音链接');
        inputBox.classList.add('shake', 'error');
        setTimeout(() => inputBox.classList.remove('shake', 'error'), 400);
        return;
      }

      btn.disabled = true;
      btnText.innerHTML = '<div class="spinner"></div> 解析中...';

      try {
        const response = await fetch('/api/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await response.json();
        if (!data.success) {
          showError(data.error || '解析失败，请稍后重试');
          return;
        }
        currentResult = data.data;
        showResult(data.data);
      } catch (err) {
        showError('网络错误，请检查链接后重试');
      } finally {
        btn.disabled = false;
        btnText.innerHTML = '提取';
      }
    }

    function showResult(data) {
      const resultSection = document.getElementById('resultSection');
      document.getElementById('awemeId').textContent = 'ID: ' + data.awemeId;
      document.getElementById('resultTitle').textContent = data.title;
      document.getElementById('resultAuthor').textContent = '👤 @' + data.author;
      document.getElementById('videoLink').value = data.videoUrl || '';
      const coverImg = document.getElementById('coverImg');
      if (data.coverUrl) {
        coverImg.src = data.coverUrl;
        coverImg.style.display = 'block';
      } else {
        coverImg.style.display = 'none';
      }
      resultSection.classList.add('visible');
      const copyBtn = document.getElementById('copyBtn');
      copyBtn.classList.remove('copied');
      copyBtn.innerHTML = '📋 复制文案';
    }

    async function handleCopy() {
      if (!currentResult) return;
      const copyBtn = document.getElementById('copyBtn');
      try {
        await navigator.clipboard.writeText(currentResult.title);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = currentResult.title;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      copyBtn.classList.add('copied');
      copyBtn.innerHTML = '✅ 已复制!';
      showToast('文案已复制到剪贴板');
      setTimeout(() => { copyBtn.classList.remove('copied'); copyBtn.innerHTML = '📋 复制文案'; }, 2000);
    }

    function handleDownload() {
      if (!currentResult || !currentResult.videoUrl) { showError('暂无可用视频链接'); return; }
      const a = document.createElement('a');
      a.href = currentResult.videoUrl;
      a.download = 'douyin_' + currentResult.awemeId + '.mp4';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    function openVideo() {
      if (!currentResult || !currentResult.videoUrl) return;
      window.open(currentResult.videoUrl, '_blank');
    }

    function showError(msg) {
      const errorToast = document.getElementById('errorToast');
      document.getElementById('errorText').textContent = msg;
      errorToast.classList.add('visible');
      setTimeout(() => errorToast.classList.remove('visible'), 5000);
    }

    function showToast(msg) {
      const toast = document.getElementById('toast');
      toast.textContent = msg;
      toast.classList.add('visible');
      setTimeout(() => toast.classList.remove('visible'), 2000);
    }

    document.getElementById('urlInput').addEventListener('keydown', e => { if (e.key === 'Enter') handleExtract(); });
    document.getElementById('urlInput').addEventListener('input', () => {
      document.getElementById('inputBox').classList.remove('error');
      document.getElementById('errorToast').classList.remove('visible');
    });
  </script>
</body>
</html>
`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // API endpoint
    if (url.pathname === '/api/parse' && request.method === 'POST') {
      try {
        const { url: douyinUrl } = await request.json();

        if (!douyinUrl || typeof douyinUrl !== 'string') {
          return jsonResponse({ success: false, error: '请提供有效的链接' }, 400);
        }

        if (!douyinUrl.includes('douyin.com') && !douyinUrl.includes('iesdouyin.com')) {
          return jsonResponse({ success: false, error: '请输入有效的抖音链接' }, 400);
        }

        const result = await parseDouyinUrl(douyinUrl);
        return jsonResponse({ success: true, data: result });
      } catch (err) {
        console.error('解析错误:', err.message);
        return jsonResponse({ success: false, error: '解析失败，请稍后重试' }, 500);
      }
    }

    // Serve HTML for root
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return new Response(HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

async function parseDouyinUrl(douyinUrl) {
  const cleanUrl = douyinUrl.trim();

  // Step 1: Resolve short URL (v.douyin.com/xxx)
  const resolvedUrl = await resolveShortUrl(cleanUrl);
  const finalUrl = resolvedUrl || cleanUrl;

  // Step 2: Extract aweme_id
  const awemeId = extractAwemeId(finalUrl);
  if (!awemeId) {
    throw new Error('无法提取视频ID');
  }

  // Step 3: Fetch video data from Douyin API
  const videoData = await fetchAwemeData(awemeId);
  return videoData;
}

async function resolveShortUrl(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'manual',
    });

    const location = response.headers.get('location');
    if (location) return location;
  } catch (e) {}
  return null;
}

function extractAwemeId(url) {
  const patterns = [
    /\/video\/(\d+)/,
    /aweme_id=(\d+)/,
    /\/(\d{19,})/,
    /aweme\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // If URL is already a share URL, we need to resolve it first
  // Try to extract from common patterns
  const directMatch = url.match(/(\d{19,})/);
  if (directMatch) return directMatch[1];

  return null;
}

async function fetchAwemeData(awemeId) {
  // Try the web API endpoint
  const apiUrl = `https://www.iesdouyin.com/share/item/${awemeId}?region=CN&mid=${awemeId}&u_code=0&did=MS4wLjABAAAA&iid=MS4wLjABAAAA&with_sec_dance=1&is_story_h5=0&source=h5_m&refer=app&awtrance=1&recsys=item_${awemeId}&content蜜&log_pb=Imdf&Emk77=0&ch=ff&attributename=discoverdiscover_source_tag_for_native&needsImageView=1`;

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'Accept': 'text/html,application/json, */*',
      'Accept-Language': 'zh-CN,zh;q=0.9',
      'Referer': 'https://www.douyin.com/',
    },
  });

  const html = await response.text();

  // Try multiple patterns to extract data
  let data = tryParseJson(html);

  if (!data) {
    // Try to extract from script tags
    data = extractFromScript(html);
  }

  if (!data) {
    throw new Error('无法解析视频数据');
  }

  // Find the aweme item
  const item = data.item_list?.[0] || data.aweme_detail;
  if (!item) {
    throw new Error('未找到视频数据');
  }

  const video = item.video || {};
  const playAddr = video.play_addr?.url_list?.[0] || video.download_addr?.url_list?.[0] || '';
  const coverUrl = video.cover?.url_list?.[0] || video.thumb?.url_list?.[0] || '';

  return {
    title: item.desc || '无标题',
    author: item.author?.nickname || item.author?.unique_id || '未知作者',
    videoUrl: cleanVideoUrl(playAddr),
    coverUrl: coverUrl,
    awemeId: item.aweme_id || awemeId,
    duration: video.duration ? Math.round(video.duration / 1000) : 0,
  };
}

function tryParseJson(html) {
  // Try to find JSON data in the page
  const patterns = [
    /window\.__INIT_PROPS__\s*=\s*(\{.*?\})\s*;/s,
    /window\.__PRELOADED_STATE__\s*=\s*(\{.*?\})\s*;/s,
    /<script id="__NEXT_DATA__"[^>]*>(\{.*?\})<\/script>/s,
  ];

  for (const pattern of patterns) {
    try {
      const match = html.match(pattern);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch (e) {}
  }

  return null;
}

function extractFromScript(html) {
  // Try to extract video URL directly from HTML
  const videoPatterns = [
    /"play_addr"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/,
    /"download_addr"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/,
    /playAddr\s*[=:]\s*"([^"]+)"/,
    /"uri"\s*:\s*"([^"]*\.mp4[^"]*)"/,
  ];

  const descPatterns = [/"desc"\s*:\s*"([^"]+)"/, /"description"\s*:\s*"([^"]+)"/];
  const authorPatterns = [/"nickname"\s*:\s*"([^"]+)"/];
  const coverPatterns = [/"cover"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/, /"thumb"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/];

  let videoUrl = '', desc = '', author = '', coverUrl = '';

  for (const p of videoPatterns) { const m = html.match(p); if (m) { videoUrl = m[1]; break; } }
  for (const p of descPatterns) { const m = html.match(p); if (m) { desc = m[1]; break; } }
  for (const p of authorPatterns) { const m = html.match(p); if (m) { author = m[1]; break; } }
  for (const p of coverPatterns) { const m = html.match(p); if (m) { coverUrl = m[1]; break; } }

  if (videoUrl || desc) {
    return {
      item_list: [{
        aweme_id: '',
        desc: desc,
        author: { nickname: author },
        video: {
          play_addr: { url_list: [videoUrl] },
          cover: { url_list: [coverUrl] },
        },
      }],
    };
  }

  return null;
}

function cleanVideoUrl(url) {
  if (!url) return '';
  return url
    .replace(/\\u002F/g, '/')
    .replace(/\\"/g, '"')
    .replace(/<[^>]+>/g, '');
}
