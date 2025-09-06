import { NextRequest, NextResponse } from 'next/server';
import { SmartExtractor } from '@/lib/smart-extractor';

export async function POST(request: NextRequest) {
  try {
    const { url, forceMethod } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // 验证URL格式
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    console.log(`Starting smart extraction for: ${url}`);

    let result;
    
    try {
      // 使用智能提取器
      result = await SmartExtractor.extractContent(url);
      console.log(`Smart extraction successful, method: ${result.extractionMethod}, content length: ${result.contentLength}`);
    } catch (error) {
      console.warn('Smart extraction failed, trying fallback:', error);
      
      // 如果强制指定了方法，直接报错
      if (forceMethod) {
        return NextResponse.json({ 
          error: `Forced method ${forceMethod} failed`,
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
      
      // 否则尝试回退到传统方法
      try {
        result = await SmartExtractor.fallbackToTraditional(url);
        console.log(`Fallback extraction successful, content length: ${result.contentLength}`);
      } catch (fallbackError) {
        console.error('All extraction methods failed:', fallbackError);
        return NextResponse.json({ 
          error: 'All extraction methods failed',
          details: 'Neither SingleFile nor traditional extraction could process the URL'
        }, { status: 500 });
      }
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Smart extraction API error:', error);
    return NextResponse.json(
      { error: 'Failed to extract article content' },
      { status: 500 }
    );
  }
}