import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import axios from 'axios';
import sharp from 'sharp';

interface ArticleData {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  url?: string;
  extractedAt?: string;
  tocStructure?: { level: number; title: string; id: string }[];
  images?: { src: string; originalSrc: string; id: string }[];
  excerpt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const article: ArticleData = await request.json();

    if (!article.title || !article.content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // 图片处理函数
    const processImages = async (images: ArticleData['images']) => {
      if (!images || images.length === 0) return [];
      
      const processedImages = [];
      
      for (const imageInfo of images) {
        try {
          // 下载图片
          const response = await axios.get(imageInfo.src, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          // 处理图片
          const imageBuffer = Buffer.from(response.data);
          const processedImage = await sharp(imageBuffer)
            .resize(1200, null, { 
              withoutEnlargement: true,
              fit: 'inside'
            })
            .jpeg({ quality: 85 })
            .toBuffer();
          
          processedImages.push({
            id: imageInfo.id,
            data: processedImage,
            filename: `${imageInfo.id}.jpg`
          });
          
        } catch (error) {
          console.error(`Error processing image ${imageInfo.src}:`, error);
        }
      }
      
      return processedImages;
    };

    // 处理图片
    const processedImages = await processImages(article.images);

    // 改进的HTML内容创建
    const createHtmlContent = () => {
      // 清理HTML内容，移除不必要的属性和标签
      const cleanContent = article.content
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/style="[^"]*"/g, '')
        .replace(/class="[^"]*"/g, '')
        .replace(/id="[^"]*"/g, '')
        .replace(/<div[^>]*>/gi, '<div>')
        .replace(/<span[^>]*>/gi, '<span>')
        .replace(/<\/?div>/g, '')
        .replace(/<\/?span>/g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <title>${article.title}</title>
  <style>
    @namespace epub "http://www.idpf.org/2007/ops";
    
    /* 基础排版 */
    html { 
      -webkit-text-size-adjust: 100%; 
    }
    
    body { 
      margin: 0; 
      padding: 0;
      font-family: "Baskerville", "Georgia", "Times New Roman", serif;
      line-height: 1.55; 
      font-size: 1.0em;
      text-align: justify;
      color: #1a1a1a;
      background: #ffffff;
    }
    
    article { 
      padding: 0 1.2em; 
      max-width: 100%;
    }
    
    /* 标题样式 */
    h1 { 
      font-weight: 700; 
      font-size: 1.8em;
      margin: 1.2em 0 0.6em 0;
      color: #1a1a1a;
      border-bottom: 2px solid #333;
      padding-bottom: 0.4em;
      text-align: left;
      page-break-before: always;
    }
    
    h2 { 
      font-weight: 600; 
      font-size: 1.4em;
      margin: 1.5em 0 0.5em 0;
      color: #2d2d2d;
      border-bottom: 1px solid #666;
      padding-bottom: 0.3em;
    }
    
    h3 { 
      font-weight: 600; 
      font-size: 1.2em;
      margin: 1.2em 0 0.4em 0;
      color: #404040;
    }
    
    h4, h5, h6 { 
      font-weight: 600; 
      font-size: 1.1em;
      margin: 1.0em 0 0.3em 0;
      color: #535353;
    }
    
    /* 段落和文本 */
    p { 
      margin: 0 0 0.8em 0;
      text-align: justify;
      line-height: 1.6;
      orphans: 2;
      widows: 2;
    }
    
    /* 首段落不缩进 */
    p:first-child { 
      text-indent: 0; 
    }
    
    /* 其他段落缩进 */
    p + p { 
      text-indent: 1.2em; 
    }
    
    /* 元数据样式 */
    .meta { 
      color: #666666; 
      font-size: 0.9em; 
      margin-bottom: 2em; 
      padding: 1em; 
      background-color: #f8f8f8; 
      border-left: 4px solid #ddd;
      border-radius: 4px;
    }
    
    .meta p { 
      margin: 0.3em 0;
      text-indent: 0;
    }
    
    .meta strong { 
      color: #333;
    }
    
    /* 内容区域 */
    .content { 
      margin-top: 1em; 
    }
    
    /* 引用块 */
    blockquote { 
      margin: 1.2em 0; 
      padding: 1em 1.5em; 
      border-left: 4px solid #ccc; 
      font-style: italic; 
      background-color: #f9f9f9;
      border-radius: 0 4px 4px 0;
    }
    
    blockquote p { 
      margin: 0.5em 0;
      text-indent: 0;
    }
    
    /* 代码块 */
    pre { 
      background-color: #f5f5f5; 
      color: #333;
      padding: 1em; 
      margin: 1.2em 0; 
      white-space: pre-wrap; 
      word-break: break-word; 
      overflow: hidden;
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: 0.9em;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    
    code { 
      background-color: #f5f5f5; 
      color: #d14;
      padding: 0.2em 0.4em; 
      font-family: "Consolas", "Monaco", "Courier New", monospace;
      font-size: 0.9em;
      border-radius: 3px;
    }
    
    pre code { 
      background: none; 
      padding: 0;
      color: inherit;
    }
    
    /* 列表 */
    ul, ol { 
      margin: 1em 0; 
      padding-left: 2.5em;
    }
    
    li { 
      margin-bottom: 0.6em; 
      line-height: 1.5;
    }
    
    li p { 
      margin: 0.3em 0;
      text-indent: 0;
    }
    
    /* 表格 */
    table { 
      border-collapse: collapse; 
      margin: 1.2em 0; 
      width: 100%;
      font-size: 0.9em;
    }
    
    th, td { 
      border: 1px solid #ddd; 
      padding: 0.8em; 
      text-align: left; 
      vertical-align: top;
    }
    
    th { 
      background-color: #f2f2f2; 
      font-weight: 600;
    }
    
    /* 图片 */
    img { 
      max-width: 100%; 
      height: auto; 
      display: block; 
      margin: 1.2em 0;
      page-break-inside: avoid;
      border-radius: 4px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    figure { 
      margin: 1.2em 0; 
      text-align: center;
      page-break-inside: avoid;
    }
    
    figcaption { 
      font-size: 0.85em; 
      color: #666; 
      margin-top: 0.5em;
      font-style: italic;
    }
    
    /* 链接 */
    a { 
      color: inherit; 
      text-decoration: underline; 
      color: #0066cc;
    }
    
    /* 分割线 */
    hr { 
      border: none; 
      border-top: 1px solid #ddd; 
      margin: 2em 0; 
      height: 1px;
    }
    
    /* 避免页面内断行 */
    h1, h2, h3, h4, h5, h6, 
    figure, table, blockquote, pre,
    img {
      page-break-inside: avoid;
    }
    
    /* 标题分页 */
    h1, h2 {
      page-break-before: always;
    }
    
    h1:first-child, h2:first-child {
      page-break-before: avoid;
    }
    
    /* 避免孤立行 */
    p {
      orphans: 2;
      widows: 2;
    }
    
    /* 打印优化 */
    @media print {
      body {
        font-size: 0.95em;
      }
      
      h1 {
        font-size: 1.6em;
      }
      
      h2 {
        font-size: 1.3em;
      }
    }
  </style>
</head>
<body>
  <h1>${article.title}</h1>
  <div class="meta">
    ${article.author ? `<p><strong>作者:</strong> ${article.author}</p>` : ''}
    ${article.publishDate ? `<p><strong>发布时间:</strong> ${new Date(article.publishDate).toLocaleDateString('zh-CN')}</p>` : ''}
    ${article.extractedAt ? `<p><strong>提取时间:</strong> ${new Date(article.extractedAt).toLocaleDateString('zh-CN')}</p>` : ''}
    ${article.url ? `<p><strong>原文链接:</strong> <a href="${article.url}">${article.url}</a></p>` : ''}
  </div>
  <div class="content">
    ${cleanContent}
  </div>
</body>
</html>`;
    };

    const htmlContent = createHtmlContent();

    // 创建EPUB文件
    const zip = new JSZip();
    
    // 创建mimetype文件
    zip.file("mimetype", "application/epub+zip");
    
    // 创建META-INF目录
    const metaInf = zip.folder("META-INF");
    if (metaInf) {
      metaInf.file("container.xml", `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);
    }
    
    // 创建OEBPS目录
    const oebps = zip.folder("OEBPS");
    if (oebps) {
      // 创建images目录并添加图片
      if (processedImages.length > 0) {
        const imagesFolder = oebps.folder("images");
        if (imagesFolder) {
          processedImages.forEach(image => {
            imagesFolder.file(image.filename, image.data);
          });
        }
      }
      // 创建content.opf
      const createContentOpf = () => {
        let manifestItems = `    <item id="content" href="content.html" media-type="application/xhtml+xml"/>
    <item id="toc" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="style" href="style.css" media-type="text/css"/>`;
        
        // 添加图片到manifest
        processedImages.forEach(image => {
          manifestItems += `
    <item id="${image.id}" href="images/${image.filename}" media-type="image/jpeg"/>`;
        });
        
        let spineItems = `    <itemref idref="content"/>`;
        
        // 如果有目录结构，添加toc.html到manifest和spine
        if (article.tocStructure && article.tocStructure.length > 0) {
          manifestItems += `
    <item id="toc-html" href="toc.html" media-type="application/xhtml+xml"/>`;
          spineItems = `    <itemref idref="toc-html"/>
${spineItems}`;
        }
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="bookid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:title>${article.title}</dc:title>
    <dc:creator>${article.author || 'Unknown Author'}</dc:creator>
    <dc:language>zh-CN</dc:language>
    <dc:publisher>Kindle Helper</dc:publisher>
    <dc:description>文章从${article.url}提取</dc:description>
    <dc:date>${new Date().toISOString().split('T')[0]}</dc:date>
    <dc:identifier id="bookid">${Date.now()}</dc:identifier>
  </metadata>
  <manifest>
${manifestItems}
  </manifest>
  <spine toc="toc">
${spineItems}
  </spine>
</package>`;
      };
      
      const contentOpf = createContentOpf();
      
      oebps.file("content.opf", contentOpf);
      
      // 创建toc.ncx - 支持章节目录
      const createTocNcx = () => {
        let navPoints = '';
        let playOrder = 1;
        
        // 添加主标题
        navPoints += `    <navPoint id="navpoint-1" playOrder="${playOrder++}">
      <navLabel>
        <text>${article.title}</text>
      </navLabel>
      <content src="content.html"/>
    </navPoint>`;
        
        // 如果有目录结构，添加章节
        if (article.tocStructure && article.tocStructure.length > 0) {
          article.tocStructure.forEach((item) => {
            navPoints += `    <navPoint id="navpoint-${playOrder}" playOrder="${playOrder++}">
      <navLabel>
        <text>${item.title}</text>
      </navLabel>
      <content src="content.html#${item.id}"/>
    </navPoint>`;
          });
        }
        
        return `<?xml version="1.0" encoding="UTF-8"?>
<ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/">
  <head>
    <meta name="dtb:uid" content="${Date.now()}"/>
    <meta name="dtb:depth" content="${article.tocStructure && article.tocStructure.length > 0 ? '2' : '1'}"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${article.title}</text>
  </docTitle>
  <navMap>
${navPoints}
  </navMap>
</ncx>`;
      };
      
      const tocNcx = createTocNcx();
      
      oebps.file("toc.ncx", tocNcx);
      
      // 创建style.css
      oebps.file("style.css", `body { font-family: "Times New Roman", serif; line-height: 1.8; margin: 1.5em; text-align: justify; }
h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 0.5em; margin-top: 1em; }
h2 { color: #444; border-bottom: 1px solid #666; padding-bottom: 0.3em; margin-top: 1.5em; }
h3 { color: #555; margin-top: 1.2em; }
h4, h5, h6 { color: #666; margin-top: 1em; }
.meta { color: #666; font-size: 0.9em; margin-bottom: 2em; padding: 0.5em; background-color: #f5f5f5; border-left: 3px solid #ddd; }
.content { margin-top: 1em; }
p { margin-bottom: 1em; text-indent: 2em; line-height: 1.6; }
blockquote { margin: 1em 2em; padding: 0.5em 1em; border-left: 3px solid #ccc; font-style: italic; background-color: #f9f9f9; }
pre { background-color: #f5f5f5; padding: 1em; margin: 1em 0; overflow-x: auto; font-family: monospace; }
code { background-color: #f5f5f5; padding: 0.2em 0.4em; font-family: monospace; }
ul, ol { margin: 1em 0; padding-left: 2em; }
li { margin-bottom: 0.5em; }
table { border-collapse: collapse; margin: 1em 0; }
th, td { border: 1px solid #ddd; padding: 0.5em; text-align: left; }
img { max-width: 100%; height: auto; margin: 1em 0; }
a { color: #0066cc; text-decoration: underline; }`);

      // 创建导航目录 (toc.html)
      if (article.tocStructure && article.tocStructure.length > 0) {
        const tocHtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <title>目录 - ${article.title}</title>
  <style>
    body { font-family: "Times New Roman", serif; line-height: 1.6; margin: 2em; }
    h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 0.5em; }
    .toc-list { list-style: none; padding-left: 0; }
    .toc-item { margin: 0.5em 0; }
    .toc-link { text-decoration: none; color: #0066cc; }
    .toc-link:hover { text-decoration: underline; }
    .level-1 { margin-left: 0; }
    .level-2 { margin-left: 1.5em; }
    .level-3 { margin-left: 3em; }
    .level-4 { margin-left: 4.5em; }
    .level-5 { margin-left: 6em; }
    .level-6 { margin-left: 7.5em; }
  </style>
</head>
<body>
  <h1>目录</h1>
  <div class="toc-list">
    <div class="toc-item level-1">
      <a href="content.html" class="toc-link">${article.title}</a>
    </div>
    ${article.tocStructure.map(item => `
      <div class="toc-item level-${item.level}">
        <a href="content.html#${item.id}" class="toc-link">${item.title}</a>
      </div>
    `).join('')}
  </div>
</body>
</html>`;
        
        oebps.file("toc.html", tocHtml);
      }
      
      // 创建content.html
      oebps.file("content.html", htmlContent);
    }
    
    // 生成EPUB文件
    const epubBuffer = await zip.generateAsync({ type: "uint8array" });
    
    // 返回EPUB文件
    const sanitizedTitle = article.title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${sanitizedTitle}.epub`;
    
    return new NextResponse(epubBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/epub+zip',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error generating EPUB:', error);
    return NextResponse.json(
      { error: 'Failed to generate EPUB file' },
      { status: 500 }
    );
  }
}