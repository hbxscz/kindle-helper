import { SingleFileProcessor } from './single-file-processor';

export interface ExtractionResult {
  title: string;
  content: string;
  author: string;
  publishDate: string;
  url: string;
  extractedAt: string;
  extractionMethod: string;
  contentLength: number;
  excerpt: string;
  tocStructure: { level: number; title: string; id: string }[];
  images: { src: string; originalSrc: string; id: string }[];
}

export class SmartExtractor {
  /**
   * 智能选择最佳提取方法
   */
  static async extractContent(url: string, htmlContent?: string): Promise<ExtractionResult> {
    // 对于已知的复杂网站（如Hugo），优先使用SingleFile
    if (this.shouldUseSingleFile(url)) {
      console.log('Using SingleFile for complex website:', url);
      return this.extractWithSingleFile(url);
    }

    // 如果已有HTML内容，尝试传统方法
    if (htmlContent) {
      console.log('Using traditional extraction for:', url);
      return this.extractTraditional(htmlContent, url);
    }

    // 默认使用SingleFile（更可靠）
    console.log('Defaulting to SingleFile for:', url);
    return this.extractWithSingleFile(url);
  }

  /**
   * 判断是否应该使用SingleFile
   */
  private static shouldUseSingleFile(url: string): boolean {
    const complexSitePatterns = [
      /github\.io/, // Hugo、Jekyll等静态网站
      /medium\.com/, // Medium
      /substack\.com/, // Substack
      /dev\.to/, // Dev.to
      /hashnode\.com/, // Hashnode
      /blog\.google/, // Google Blog
      /developers\.google\.com/, // Google Developers
      /stackoverflow\.com/, // Stack Overflow
      /reddit\.com/, // Reddit
      /wikipedia\.org/, // Wikipedia
      /news\.ycombinator\.com/, // Hacker News
    ];

    return complexSitePatterns.some(pattern => pattern.test(url));
  }

  /**
   * 使用SingleFile提取内容
   */
  private static async extractWithSingleFile(url: string): Promise<ExtractionResult> {
    try {
      const response = await fetch('http://localhost:8000/api/singlefile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`SingleFile API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return result as ExtractionResult;
    } catch (error) {
      console.error('SingleFile extraction failed:', error);
      throw new Error(`SingleFile extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 使用传统方法提取内容
   */
  private static extractTraditional(htmlContent: string, url: string): ExtractionResult {
    // 这里可以集成现有的Readability逻辑
    // 暂时返回一个基本结构，实际使用时可以调用现有的scrape API
    return {
      title: 'Traditional Extraction',
      content: htmlContent,
      author: '',
      publishDate: '',
      url,
      extractedAt: new Date().toISOString(),
      extractionMethod: 'traditional',
      contentLength: htmlContent.length,
      excerpt: htmlContent.substring(0, 200) + '...',
      tocStructure: [],
      images: []
    };
  }

  /**
   * 回退到传统方法
   */
  static async fallbackToTraditional(url: string): Promise<ExtractionResult> {
    console.log('Falling back to traditional extraction for:', url);
    
    try {
      // 调用现有的scrape API
      const response = await fetch('http://localhost:8000/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Traditional API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      return {
        title: result.title,
        content: result.content,
        author: result.author || '',
        publishDate: result.publishDate || '',
        url,
        extractedAt: result.extractedAt,
        extractionMethod: 'traditional-fallback',
        contentLength: result.contentLength || result.content.length,
        excerpt: result.excerpt || '',
        tocStructure: result.tocStructure || [],
        images: result.images || []
      };
    } catch (error) {
      console.error('Traditional extraction failed:', error);
      throw new Error(`Both SingleFile and traditional extraction failed`);
    }
  }
}