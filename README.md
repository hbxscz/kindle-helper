# Kindle Helper

一个简洁的网络文章转Kindle电子书工具，支持将在线文章转换为EPUB格式并提供下载。

## 功能特点

- 🌐 **文章抓取**: 自动提取网页文章内容
- 📚 **EPUB生成**: 将文章转换为Kindle兼容的EPUB格式
- 💾 **本地下载**: 生成的EPUB文件可直接下载到本地
- 🎨 **现代界面**: 使用shadcn/ui构建的响应式界面
- 🚀 **快速处理**: 高效的内容提取和文件生成

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 [http://localhost:8000](http://localhost:8000) 运行。

## 使用方法

1. **输入文章URL**: 在输入框中粘贴要阅读的文章链接
2. **生成EPUB**: 点击"生成EPUB"按钮
3. **下载文件**: 生成完成后点击"下载EPUB文件"按钮
4. **传输到Kindle**: 将下载的EPUB文件传输到Kindle设备或应用

## 技术栈

- **框架**: Next.js 15 with App Router
- **UI组件**: shadcn/ui + Tailwind CSS
- **图标**: Radix UI Icons
- **文章抓取**: Axios + Cheerio
- **EPUB生成**: JSZip
- **类型检查**: TypeScript

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── scrape/route.ts      # 文章抓取API
│   │   ├── generate-epub/route.ts # EPUB生成API
│   │   └── send-email/route.ts   # 邮件发送API（暂时禁用）
│   ├── page.tsx                 # 主页面
│   └── layout.tsx               # 布局组件
├── components/ui/               # shadcn/ui组件
└── lib/utils.ts               # 工具函数
```

## 开发说明

### 添加新功能

项目使用Next.js的App Router，所有API路由都在`app/api`目录下。

### 样式定制

项目使用Tailwind CSS和shadcn/ui组件，可以通过修改`app/globals.css`和组件变量来自定义样式。

## 许可证

MIT License
