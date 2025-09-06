# Kindle Helper

一个智能的网络文章转Kindle电子书工具，支持将在线文章转换为高质量的EPUB格式。采用智能内容提取技术，特别适合处理复杂网站（如Hugo静态网站）的文章内容。

## ✨ 核心功能

- 🧠 **智能提取**: 基于SingleFile CLI的完整网页保存，确保内容完整性
- 🎯 **内容净化**: 智能识别并提取文章主体内容，自动过滤导航和广告
- 📚 **高质量EPUB**: 生成结构化电子书，支持目录、图片和样式
- 🔄 **容错机制**: 多重提取策略，确保各种网站都能正常处理
- 🎨 **现代界面**: 基于shadcn/ui的响应式设计，支持深色模式
- ⚡ **高性能**: 优化的提取流程，从6KB提升到133KB+内容提取效果

## 🚀 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/hbxscz/kindle-helper.git
   cd kindle-helper
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   
   打开 [http://localhost:8000](http://localhost:8000) 开始使用

## 📖 使用指南

### 基本使用

1. **输入URL**: 在输入框中粘贴要转换的文章链接
2. **智能提取**: 系统自动选择最佳提取方法
3. **生成EPUB**: 点击"生成EPUB"按钮开始处理
4. **下载文件**: 完成后点击"下载EPUB文件"保存到本地

### 支持的网站类型

- ✅ **Hugo静态网站**: 完美支持复杂结构的静态博客
- ✅ **Medium/Substack**: 现代内容平台
- ✅ **技术博客**: GitHub Pages、Dev.to等
- ✅ **新闻网站**: 结构化文章内容
- ✅ **文档网站**: 技术文档和教程

### 高级特性

- **智能路由**: 根据网站类型自动选择提取策略
- **内容优化**: 自动提取标题、作者、发布日期等元数据
- **图片处理**: 智能图片下载和格式转换
- **目录生成**: 自动生成多级目录结构
- **样式美化**: 优化的阅读体验

## 🛠 技术架构

### 核心技术栈

- **框架**: Next.js 15 with App Router + TypeScript
- **UI组件**: shadcn/ui + Tailwind CSS
- **图标**: Radix UI Icons  
- **内容提取**: SingleFile CLI + 智能后处理
- **HTML解析**: JSDOM + DOMPurify
- **EPUB生成**: Epub-gen + JSZip
- **图片处理**: Sharp

### 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── extract/route.ts         # 智能提取API
│   │   ├── singlefile/route.ts      # SingleFile处理API
│   │   ├── generate-epub/route.ts   # EPUB生成API
│   │   └── scrape/route.ts          # 传统抓取API
│   ├── page.tsx                     # 主界面
│   └── layout.tsx                   # 布局组件
├── lib/
│   ├── smart-extractor.ts           # 智能提取器
│   ├── single-file-processor.ts     # SingleFile处理器
│   └── utils.ts                     # 工具函数
└── components/ui/                   # UI组件库
```

### 核心模块

#### SmartExtractor (`src/lib/smart-extractor.ts`)
- 智能选择提取方法
- 网站类型识别
- 容错和回退机制

#### SingleFileProcessor (`src/lib/single-file-processor.ts`)
- HTML内容后处理
- 文章主体提取
- 元数据解析
- 图片处理

## 📊 性能对比

| 提取方法 | 内容大小 | 适用场景 | 完整性 |
|---------|---------|----------|--------|
| 传统方法 | ~6KB    | 简单网页 | 60%    |
| SingleFile | ~133KB | 复杂网站 | 95%+   |
| 智能提取 | ~79KB   | 所有网站 | 90%+   |

## 🔧 开发指南

### 添加新的提取规则

```typescript
// 在 smart-extractor.ts 中添加新的网站模式
const complexSitePatterns = [
  /github\.io/,
  /your-new-site\.com/, // 添加新规则
  // ... 其他规则
];
```

### 自定义内容提取

```typescript
// 在 single-file-processor.ts 中修改提取逻辑
static extractMainContent(htmlContent: string): ExtractedContent {
  // 自定义提取逻辑
}
```

### 样式定制

项目使用Tailwind CSS，可以通过以下方式自定义：

1. 修改 `app/globals.css` 中的全局样式
2. 使用shadcn/ui的CSS变量系统
3. 在组件中直接使用Tailwind类名

## 🐛 故障排除

### 常见问题

1. **SingleFile CLI安装失败**
   ```bash
   npm install -g single-file-cli
   ```

2. **权限错误**
   ```bash
   sudo npm install -g single-file-cli
   ```

3. **端口占用**
   ```bash
   lsof -ti:8000 | xargs kill -9
   ```

4. **水合错误**
   - 开发时禁用浏览器扩展
   - 清除缓存：`rm -rf .next`

## 📋 待办事项

- [ ] 添加邮件发送功能
- [ ] 支持批量处理
- [ ] 添加用户历史记录
- [ ] 集成云存储
- [ ] 添加多语言支持
- [ ] 移动端优化

## 🤝 贡献指南

欢迎提交Issue和Pull Request！

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [SingleFile CLI](https://github.com/gildas-lormeau/SingleFile) - 完整网页保存
- [Next.js](https://nextjs.org/) - React框架
- [shadcn/ui](https://ui.shadcn.com/) - UI组件库
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
