import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

export interface ExtractedContent {
  title: string;
  content: string;
  author: string;
  publishDate: string;
  excerpt: string;
  tocStructure: { level: number; title: string; id: string }[];
  images: { src: string; originalSrc: string; id: string }[];
}

export class SingleFileProcessor {
  /**
   * 从SingleFile输出的HTML中提取主要内容
   */
  static extractMainContent(htmlContent: string): ExtractedContent {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // 使用DOMPurify清理HTML
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOMPurify = createDOMPurify(dom.window as any);
    
    // 提取标题
    const title = this.extractTitle(document);
    
    // 提取主要内容
    const mainContent = this.extractMainContentArea(document);
    
    // 清理内容
    const cleanContent = DOMPurify.sanitize(mainContent, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'nav', 'header', 'footer'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style'],
      ALLOW_DATA_ATTR: false
    });

    // 重新解析清理后的内容以提取结构
    const contentDom = new JSDOM(cleanContent);
    const contentDocument = contentDom.window.document;

    // 提取目录结构
    const tocStructure = this.extractTOCStructure(contentDocument);
    
    // 处理图片
    const images = this.processImages(contentDocument);
    
    // 提取元信息
    const author = this.extractAuthor(document);
    const publishDate = this.extractPublishDate(document);
    const excerpt = this.extractExcerpt(contentDocument);

    return {
      title,
      content: contentDocument.body.innerHTML,
      author,
      publishDate,
      excerpt,
      tocStructure,
      images
    };
  }

  /**
   * 提取标题
   */
  private static extractTitle(document: Document): string {
    // 优先级顺序：
    // 1. h1标题
    // 2. article标题
    // 3. og:title
    // 4. title标签
    
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent && h1.textContent.trim().length > 0) {
      return h1.textContent.trim();
    }

    const articleTitle = document.querySelector('article h1, .post-title, .entry-title, .post__title');
    if (articleTitle && articleTitle.textContent) {
      return articleTitle.textContent.trim();
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute('content');
      if (content) return content.trim();
    }

    const titleTag = document.querySelector('title');
    if (titleTag && titleTag.textContent) {
      // 清理标题中的网站名称等后缀
      let title = titleTag.textContent.trim();
      title = title.replace(/\s*[\|—-]\s*.+$/, ''); // 移除 | — - 后面的内容
      title = title.replace(/\s*_.*$/, ''); // 移除 _ 后面的内容
      return title;
    }

    return 'Untitled Article';
  }

  /**
   * 提取主要内容区域
   */
  private static extractMainContentArea(document: Document): string {
    // 按优先级尝试不同的内容选择器
    const contentSelectors = [
      'article',
      '.post-content',
      '.article-content',
      '.content',
      '.main-content',
      '.post-body',
      '.entry-content',
      '[role="main"]',
      'main',
      '#content',
      '#main'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerHTML && element.innerHTML.length > 500) {
        console.log(`Found content with selector: ${selector}, length: ${element.innerHTML.length}`);
        return element.innerHTML;
      }
    }

    // 如果没有找到合适的内容区域，尝试移除导航、侧边栏等元素
    const body = document.querySelector('body');
    if (body) {
      const clonedBody = body.cloneNode(true) as HTMLElement;
      
      // 移除不需要的元素
      const unwantedSelectors = [
        'nav', 'header', 'footer', '.nav', '.navigation', '.sidebar', 
        '.comments', '.comment-area', '.share-buttons', '.related-posts',
        '.breadcrumb', '.ads', '.advertisement', 'script', 'style'
      ];
      
      unwantedSelectors.forEach(selector => {
        const elements = clonedBody.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });

      const content = clonedBody.innerHTML;
      if (content.length > 1000) {
        console.log(`Used body content after cleanup, length: ${content.length}`);
        return content;
      }
    }

    // 最后回退到body内容
    console.log('Fallback to body content');
    return document.body?.innerHTML || '';
  }

  /**
   * 提取目录结构
   */
  private static extractTOCStructure(contentDocument: Document): { level: number; title: string; id: string }[] {
    const tocStructure: { level: number; title: string; id: string }[] = [];
    
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tagName, index) => {
      const headers = contentDocument.querySelectorAll(tagName);
      headers.forEach((header, headerIndex) => {
        const title = header.textContent?.trim();
        if (title && title.length > 0) {
          const id = `${tagName}-${headerIndex}`;
          header.setAttribute('id', id);
          tocStructure.push({
            level: parseInt(tagName.substring(1)),
            title,
            id
          });
        }
      });
    });

    return tocStructure;
  }

  /**
   * 处理图片
   */
  private static processImages(contentDocument: Document): { src: string; originalSrc: string; id: string }[] {
    const images = contentDocument.querySelectorAll('img');
    const imageInfo: { src: string; originalSrc: string; id: string }[] = [];
    
    images.forEach((img, index) => {
      const originalSrc = img.getAttribute('src') || '';
      const dataSrc = img.getAttribute('data-src') || '';
      const srcset = img.getAttribute('srcset') || '';
      
      // 确定最佳图片源
      let finalSrc = originalSrc;
      if (dataSrc && !originalSrc) {
        finalSrc = dataSrc;
      }
      
      // 处理srcset
      if (srcset && !finalSrc) {
        const srcsetItems = srcset.split(',').map(item => item.trim().split(' ')[0]);
        if (srcsetItems.length > 0) {
          finalSrc = srcsetItems[0];
        }
      }
      
      if (finalSrc) {
        const id = `img-${index}`;
        img.setAttribute('src', `images/${id}.jpg`);
        img.setAttribute('data-original-src', finalSrc);
        
        // 移除可能影响Kindle显示的属性
        img.removeAttribute('loading');
        img.removeAttribute('srcset');
        img.removeAttribute('data-src');
        img.removeAttribute('data-original-src');
        
        // 添加Kindle友好样式
        img.setAttribute('style', 'max-width: 100%; height: auto; display: block; margin: 1em 0;');
        
        imageInfo.push({
          src: finalSrc,
          originalSrc: finalSrc,
          id
        });
      }
    });

    return imageInfo;
  }

  /**
   * 提取作者信息
   */
  private static extractAuthor(document: Document): string {
    // 尝试多种方式提取作者
    const authorSelectors = [
      'meta[name="author"]',
      '[rel="author"]',
      '.author',
      '.byline',
      '.post-author',
      '.entry-author'
    ];

    for (const selector of authorSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || element.textContent;
        if (content && content.trim().length > 0) {
          return content.trim();
        }
      }
    }

    return '';
  }

  /**
   * 提取发布时间
   */
  private static extractPublishDate(document: Document): string {
    // 尝试多种方式提取发布时间
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time[datetime]',
      '.post-date',
      '.entry-date',
      '.publish-date',
      '.date'
    ];

    for (const selector of dateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const content = element.getAttribute('content') || 
                       element.getAttribute('datetime') || 
                       element.textContent;
        if (content && content.trim().length > 0) {
          return content.trim();
        }
      }
    }

    return '';
  }

  /**
   * 提取摘要
   */
  private static extractExcerpt(contentDocument: Document): string {
    // 尝试找到文章开头的一段文字作为摘要
    const firstParagraph = contentDocument.querySelector('p');
    if (firstParagraph && firstParagraph.textContent) {
      let text = firstParagraph.textContent.trim();
      if (text.length > 200) {
        text = text.substring(0, 200) + '...';
      }
      return text;
    }

    // 如果没有段落，尝试其他元素
    const textContent = contentDocument.body?.textContent || '';
    if (textContent.length > 200) {
      return textContent.substring(0, 200) + '...';
    }

    return textContent.substring(0, Math.min(200, textContent.length));
  }
}