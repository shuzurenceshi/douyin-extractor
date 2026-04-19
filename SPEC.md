# Douyin Extractor - 抖音链接文案提取工具

## Concept & Vision

一个极简、高效的抖音链接解析工具。用户粘贴抖音链接，一键提取视频和无水印文案，全程免费、无广告、无需登录。界面干净利落，解析速度快，给人"专业小工具"的感觉——实用但不土气。

## Design Language

- **Aesthetic**: 暗色工具风格，类似程序员工具箱。深色背景 + 霓虹点缀，科技感但不浮夸
- **Color Palette**:
  - Background: `#0d0d0d`
  - Surface: `#1a1a2e`
  - Primary: `#ff2d78` (抖音粉)
  - Accent: `#00f5d4` (霓虹青)
  - Text: `#e0e0e0`
  - Muted: `#666`
- **Typography**: `Space Grotesk` (标题) + `JetBrains Mono` (输入框/代码)
- **Motion**: 解析时 shimmer 加载动画，结果出现时 fade + slide-up (300ms ease-out)
- **Icons**: Lucide icons，线条风格

## Layout & Structure

```
┌─────────────────────────────────────┐
│  🔗 Douyin Extractor                │
│  抖音链接文案提取                    │
├─────────────────────────────────────┤
│  [输入框: 粘贴抖音链接...]  [提取]  │
├─────────────────────────────────────┤
│  ┌─ 解析结果 ─────────────────────┐  │
│  │  视频预览（封面图）            │  │
│  │  标题文案                      │  │
│  │  [复制文案] [下载视频]         │  │
│  └────────────────────────────────┘  │
├─────────────────────────────────────┤
│  使用说明 / 常见问题                │
└─────────────────────────────────────┘
```

## Features & Interactions

### 核心功能
1. **链接解析**: 粘贴任意抖音分享链接（v.douyin.com/xxx 或 长链接），点击提取
2. **文案提取**: 自动提取视频标题/描述文案，一键复制
3. **视频下载**: 提取无水印视频直链，支持浏览器直接下载
4. **封面图**: 显示视频封面，可复制或新窗口打开

### 交互细节
- 输入框: placeholder "粘贴抖音链接，如 https://v.douyin.com/xxx"，输入时边框变粉
- 提取按钮: hover 时 scale(1.02)，点击时 scale(0.98)
- 解析中: 按钮显示 loading spinner + "解析中..."
- 结果区域: 解析成功后 slide-up 出现，带 shimmer 加载骨架屏过渡
- 复制成功: 按钮短暂变绿 + "已复制!" toast
- 错误: 红色提示条 "链接无效或解析失败，请检查后重试"

### 边界情况
- 空输入提交 → 输入框抖动 + 红色边框
- 非抖音链接 → 提示"请输入有效的抖音链接"
- 解析失败 → 显示具体错误信息

## Technical Approach

- **Frontend**: 纯 HTML + CSS + Vanilla JS，单文件即可
- **Backend**: Node.js + Express，解析抖音链接
- **解析原理**:
  1. 客户端 POST 链接到 `/api/parse`
  2. 后端请求抖音分享页，通过正则提取 `itemId`
  3. 调用抖音移动端 API `https://www.iesdouyin.com/share/item/{itemId}` 或直接代理请求
  4. 从响应中提取 `playAddr`(无水印视频)、`author`(作者)、`desc`(文案)
- **CORS**: 允许前端直接调用 API
- **无第三方依赖** (纯 Node.js 原生 http/https 模块)

## API Design

```
POST /api/parse
Body: { url: "https://v.douyin.com/xxx" }

Response 200:
{
  "success": true,
  data: {
    "title": "视频标题文案",
    "author": "作者昵称",
    "videoUrl": "无水印视频直链",
    "coverUrl": "封面图链接",
    "awemeId": "视频ID"
  }
}

Response 400:
{ "success": false, "error": "无效的抖音链接" }

Response 500:
{ "success": false, "error": "解析失败，请稍后重试" }
```
