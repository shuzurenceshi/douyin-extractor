const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Douyin link parsing endpoint
app.post('/api/parse', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: '请提供有效的链接' });
  }

  // Validate it's a Douyin link
  if (!url.includes('douyin.com') && !url.includes('iesdouyin.com')) {
    return res.status(400).json({ success: false, error: '请输入有效的抖音链接' });
  }

  try {
    const result = await parseDouyinUrl(url);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('解析错误:', err.message);
    res.status(500).json({ success: false, error: '解析失败，请稍后重试' });
  }
});

async function parseDouyinUrl(url) {
  const https = require('https');
  const http = require('http');
  const { URL } = require('url');

  return new Promise((resolve, reject) => {
    const finalUrl = url.trim();
    const urlObj = new URL(finalUrl);
    const client = finalUrl.startsWith('https') ? https : http;

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.douyin.com/',
      },
      timeout: 15000,
    };

    client.get(finalUrl, options, (response) => {
      // Follow redirects
      if (response.headers.location) {
        parseDouyinUrl(response.headers.location).then(resolve).catch(reject);
        return;
      }

      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try {
          const awemeId = extractAwemeId(body, finalUrl);
          if (!awemeId) {
            reject(new Error('无法提取视频ID'));
            return;
          }
          fetchAwemeDetail(awemeId).then(resolve).catch(reject);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('请求超时')));
  });
}

function extractAwemeId(html, originalUrl) {
  // Try to find aweme_id in page source
  const patterns = [
    /"aweme_id"\s*:\s*"(\d+)"/,
    /"awemeId"\s*:\s*"(\d+)"/,
    /aweme\/(\d+)/,
    /video\/(\d+)/,
    /www\.douyin\.com\/video\/(\d+)/,
    /v\d+\.douyin\.com\/(\w+)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }

  // Try to extract from URL
  const urlPatterns = [
    /\/video\/(\d+)/,
    /aweme_id=(\d+)/,
    /\/(\d{19,})/,
  ];

  for (const pattern of urlPatterns) {
    const match = originalUrl.match(pattern);
    if (match) return match[1];
  }

  return null;
}

async function fetchAwemeDetail(awemeId) {
  const https = require('https');

  const apiUrl = `https://www.iesdouyin.com/share/item/${awemeId}?region=CN&mid=${awemeId}&u_code=0&did=MS4wLjABAAAA&iid=MS4wLjABAAAA&with_sec_dance=1&is_story_h5=0&source=h5_m&refer=app&awtrance=1&recsys=item_${awemeId}&content蜜&log_pb=Imdf&Emk77=0&ch=ff&attributename=discovercover_source_tag_for_native&needsImageView=1&exParams=region%3DCN%26自救指南%26version_code%3D170400%26version_name%3D17.4.0%26cookie_enable%3D1%26root_enter_type%3D110%26filter_warn%3D0%26search_source%3Dnormal_search%26query%3D%25E6%2595%2591%25E5%258C%2596%25E6%2596%2587%25E7%259C%25AF%26search_id%3D0%26challenge%3D%26type%3Dvideo%26need_document_spm%3D2`;

  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Referer': 'https://www.douyin.com/',
      },
      timeout: 15000,
    };

    https.get(apiUrl, options, (response) => {
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => {
        try {
          // Try to extract JSON from the response
          const jsonMatch = body.match(/window\._ROUTER_DATA\s*=\s*(\{.*?\})\s*;/s) ||
                           body.match(/<script id="__NEXT_DATA__" type="application\/json">(\{.*?\})/s);

          let data;
          if (jsonMatch) {
            data = JSON.parse(jsonMatch[1]);
          } else {
            // Try direct JSON parse
            data = JSON.parse(body);
          }

          const item = data?.item_list?.[0] || data?.aweme_detail;
          if (!item) {
            throw new Error('未找到视频数据');
          }

          const videoData = item.video || {};
          const playAddr = videoData.play_addr?.url_list?.[0] ||
                          videoData.download_addr?.url_list?.[0] || '';

          // Try to get no-watermark URL
          const noWatermarkUrl = playAddr?.replace('/api/v2/play/', '/api/v1/play/') || playAddr;

          resolve({
            title: item.desc || '无标题',
            author: item.author?.nickname || item.author?.unique_id || '未知作者',
            videoUrl: noWatermarkUrl,
            coverUrl: videoData.cover?.url_list?.[0] || videoData.thumb?.url_list?.[0] || '',
            awemeId: item.aweme_id,
            duration: videoData.duration ? Math.round(videoData.duration / 1000) : 0,
          });
        } catch (e) {
          // Fallback: try alternative approach - parse from HTML
          try {
            const result = parseFallbackHtml(body, awemeId);
            resolve(result);
          } catch (e2) {
            reject(new Error('无法解析视频数据'));
          }
        }
      });
    }).on('error', reject).on('timeout', () => reject(new Error('请求超时')));
  });
}

function parseFallbackHtml(html, awemeId) {
  // Try to extract video URL
  const videoPatterns = [
    /"play_addr"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/,
    /"download_addr"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/,
    /playAddr\s*:\s*"([^"]+)"/,
    /"uri"\s*:\s*"([^"]*mp4[^"]*)"/,
  ];

  let videoUrl = '';
  for (const pattern of videoPatterns) {
    const match = html.match(pattern);
    if (match) {
      videoUrl = match[1];
      break;
    }
  }

  // Try to extract description
  const descMatch = html.match(/"desc"\s*:\s*"([^"]+)"/);
  const authorMatch = html.match(/"nickname"\s*:\s*"([^"]+)"/);
  const coverMatch = html.match(/"cover"\s*:\s*\{"url_list"\s*:\s*\["([^"]+)"/);

  if (!videoUrl) {
    throw new Error('无法提取视频');
  }

  return {
    title: descMatch ? descMatch[1] : '无标题',
    author: authorMatch ? authorMatch[1] : '未知作者',
    videoUrl: videoUrl.replace(/\\u002F/g, '/'),
    coverUrl: coverMatch ? coverMatch[1] : '',
    awemeId: awemeId,
    duration: 0,
  };
}

app.listen(PORT, () => {
  console.log(`Douyin Extractor running at http://localhost:${PORT}`);
});
