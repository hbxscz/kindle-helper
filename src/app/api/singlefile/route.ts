import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { SingleFileProcessor } from '@/lib/single-file-processor';

const execAsync = promisify(exec);

// 临时文件目录
const TEMP_DIR = path.join('/tmp', 'kindle-helper');

// 确保临时目录存在
async function ensureTempDir() {
  try {
    await fs.access(TEMP_DIR);
  } catch {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  }
}

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

    // 确保临时目录存在
    await ensureTempDir();

    // 生成唯一文件名
    const fileId = uuidv4();
    const outputPath = path.join(TEMP_DIR, `${fileId}.html`);

    console.log(`Processing URL with SingleFile: ${url}`);

    try {
      // 构建SingleFile命令
      const command = `npx single-file "${url}" "${outputPath}" --browser-headless true --block-scripts true --block-videos true --block-audios true --compress-content false`;
      
      console.log('Executing SingleFile command:', command);

      // 执行SingleFile命令
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 60秒超时
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr) {
        console.warn('SingleFile stderr:', stderr);
      }

      console.log('SingleFile stdout:', stdout);

      // 读取生成的HTML文件
      const htmlContent = await fs.readFile(outputPath, 'utf-8');

      // 清理临时文件
      try {
        await fs.unlink(outputPath);
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError);
      }

      if (!htmlContent || htmlContent.length < 1000) {
        return NextResponse.json({ 
          error: 'SingleFile failed to extract sufficient content',
          details: `Only ${htmlContent?.length || 0} characters extracted` 
        }, { status: 400 });
      }

      console.log(`Successfully extracted ${htmlContent.length} characters using SingleFile`);

      // 使用SingleFileProcessor处理HTML内容
      const processedContent = SingleFileProcessor.extractMainContent(htmlContent);

      return NextResponse.json({
        title: processedContent.title,
        content: processedContent.content,
        author: processedContent.author,
        publishDate: processedContent.publishDate,
        url,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'singlefile',
        contentLength: processedContent.content.length,
        excerpt: processedContent.excerpt,
        tocStructure: processedContent.tocStructure,
        images: processedContent.images
      });

    } catch (execError) {
      console.error('SingleFile execution error:', execError);
      
      // 清理临时文件（如果存在）
      try {
        await fs.unlink(outputPath);
      } catch {
        // 忽略清理错误
      }

      return NextResponse.json({ 
        error: 'Failed to execute SingleFile',
        details: execError instanceof Error ? execError.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('SingleFile API error:', error);
    return NextResponse.json(
      { error: 'Failed to process article with SingleFile' },
      { status: 500 }
    );
  }
}