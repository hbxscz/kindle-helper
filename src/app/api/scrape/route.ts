import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import createDOMPurify from 'dompurify';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // 获取网页内容
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000,
      responseType: 'text'
    });

    // 使用JSDOM解析HTML
    const dom = new JSDOM(response.data, { 
      url,
      contentType: 'text/html',
      includeNodeLocations: false
    });

    // 使用Readability提取文章内容
    const reader = new Readability(dom.window.document);
    let article = reader.parse();

    // Hugo网站特殊处理：如果Readability提取的内容不足，尝试直接提取完整article内容
    if (!article || !article.content || article.content.length < 50000) {
      console.log('Readability extracted limited content, trying Hugo-specific extraction...');
      
      // 尝试Hugo网站的内容提取 - 优先提取完整article
      const articleElement = dom.window.document.querySelector('article');
      const postContent = dom.window.document.querySelector('.post-content');
      const articleContent = dom.window.document.querySelector('.article-content');
      
      let hugoContent = null;
      let hugoTitle = '';
      
      // Hugo网站的内容主要在article标签中
      console.log('Looking for article element...');
      if (articleElement) {
        console.log('Found article element');
        
        // 尝试从原始HTML中提取完整的article内容
        const articleHTML = response.data.match(/<article[^>]*>([\s\S]*?)<\/article>/);
        if (articleHTML && articleHTML[1]) {
          hugoContent = articleHTML[1];
          console.log('Extracted article from raw HTML, length:', hugoContent.length);
        } else {
          // 回退到DOM查询
          hugoContent = articleElement.innerHTML;
          console.log('Using DOM article content, length:', hugoContent.length);
        }
      } else {
        console.log('Article not found, trying fallback methods...');
        // 尝试其他方法
        if (postContent) {
          hugoContent = postContent.innerHTML;
          console.log('Found .post-content div, content length:', hugoContent.length);
        } else if (articleContent) {
          hugoContent = articleContent.innerHTML;
          console.log('Found .article-content div, content length:', hugoContent.length);
        } else {
          // 最后尝试通用content div
          const contentDiv = dom.window.document.querySelector('.content');
          if (contentDiv) {
            hugoContent = contentDiv.innerHTML;
            console.log('Found .content div, content length:', hugoContent.length);
          }
        }
      }
      
      // 如果找到了Hugo内容，创建一个article对象
      if (hugoContent) {
        // 尝试提取标题
        const titleElement = dom.window.document.querySelector('h1') || 
                          dom.window.document.querySelector('.post-title') ||
                          dom.window.document.querySelector('.entry-title');
        hugoTitle = titleElement ? titleElement.textContent?.trim() : '';
        
        article = {
          title: hugoTitle || dom.window.document.title.replace(/\s*\|.*$/, ''),
          content: hugoContent,
          textContent: hugoContent.replace(/<[^>]*>/g, ''),
          length: hugoContent.length,
          byline: '',
          publishedTime: '',
          excerpt: '',
          dir: 'ltr',
          siteName: '',
          lang: 'zh-CN'
        };
        console.log('Hugo-specific extraction completed, content length:', hugoContent.length);
      } else if (!article || !article.content) {
        return NextResponse.json({ error: 'Could not extract article content using Readability or Hugo-specific methods' }, { status: 400 });
      }
    }

    // 使用DOMPurify清理HTML内容
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DOMPurify = createDOMPurify(dom.window as any);
    const cleanContent = DOMPurify.sanitize(article.content || '', {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
      FORBID_ATTR: ['onclick', 'onload', 'onerror', 'style'],
      ALLOW_DATA_ATTR: false
    });

    // 提取标题结构
    const tocStructure: { level: number; title: string; id: string }[] = [];
    const contentDom = new JSDOM(cleanContent);
    const contentDocument = contentDom.window.document;

    // 提取h1-h6标题
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach((tagName) => {
      const headers = contentDocument.querySelectorAll(tagName);
      headers.forEach((header, headerIndex) => {
        const title = header.textContent?.trim();
        if (title) {
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

    // 处理图片，提取图片信息供后续处理
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

    // 获取清理后的HTML内容
    const content = contentDocument.body.innerHTML;

    if (!content || content.length < 100) {
      return NextResponse.json({ error: 'Could not extract article content' }, { status: 400 });
    }

    // 提取作者信息
    let author = article.byline || '';
    
    // 备用作者提取
    if (!author) {
      const authorMeta = contentDocument.querySelector('meta[name="author"]');
      if (authorMeta) {
        author = authorMeta.getAttribute('content') || '';
      }
    }
    
    if (!author) {
      const authorRel = contentDocument.querySelector('[rel="author"]');
      if (authorRel) {
        author = authorRel.textContent?.trim() || '';
      }
    }

    // 提取发布时间
    let publishDate = article.publishedTime || '';
    
    if (!publishDate) {
      const timeMeta = contentDocument.querySelector('meta[property="article:published_time"]');
      if (timeMeta) {
        publishDate = timeMeta.getAttribute('content') || '';
      }
    }
    
    if (!publishDate) {
      const timeElement = contentDocument.querySelector('time');
      if (timeElement) {
        publishDate = timeElement.getAttribute('datetime') || '';
      }
    }

    return NextResponse.json({
      title: article.title || 'Untitled Article',
      content,
      author,
      publishDate,
      url,
      extractedAt: new Date().toISOString(),
      tocStructure,
      images: imageInfo,
      excerpt: article.excerpt || ''
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Failed to fetch article content' },
      { status: 500 }
    );
  }
}