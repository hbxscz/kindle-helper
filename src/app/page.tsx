"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaperPlaneIcon, Link2Icon, ReloadIcon, EnvelopeClosedIcon } from "@radix-ui/react-icons";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingToKindle, setSendingToKindle] = useState(false);
  const [status, setStatus] = useState("");

  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState<string>("");
  const [epubBlob, setEpubBlob] = useState<Blob | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStatus("正在提取文章内容...");
    setDownloadUrl(null);

    try {
      // 1. 使用智能提取文章内容
      setStatus("正在智能提取文章内容...");
      const extractResponse = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!extractResponse.ok) {
        throw new Error("提取文章失败");
      }

      const articleData = await extractResponse.json();
      setArticleTitle(articleData.title);
      setStatus(`正在生成电子书... (使用${articleData.extractionMethod}提取，${articleData.contentLength}字符)`);

      // 2. 生成EPUB
      const epubResponse = await fetch("/api/generate-epub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!epubResponse.ok) {
        throw new Error("生成电子书失败");
      }

      const epubData = await epubResponse.blob();
      
      // 保存EPUB数据用于发送邮件
      setEpubBlob(epubData);
      
      // 创建下载链接
      const downloadObjectUrl = URL.createObjectURL(epubData);
      setDownloadUrl(downloadObjectUrl);
      setStatus("生成成功！点击下载按钮保存EPUB文件或发送到Kindle");

    } catch (error) {
      console.error("Error:", error);
      setStatus("处理失败，请检查URL或稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl && articleTitle) {
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${articleTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleSendToKindle = async () => {
    if (!epubBlob || !articleTitle) {
      setStatus("没有可发送的EPUB文件");
      return;
    }

    setSendingToKindle(true);
    setStatus("正在发送到Kindle邮箱...");

    try {
      // 将Blob转换为Base64
      const base64Content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // 移除data:application/epub+zip;base64,前缀
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(epubBlob);
      });

      // 发送到Kindle邮箱
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: "", // 让后端使用环境变量中的默认收件人
          subject: articleTitle,
          text: `文章 "${articleTitle}" 已转换为Kindle格式`,
          attachments: [{
            filename: `${articleTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.epub`,
            content: base64Content,
            encoding: 'base64'
          }]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "发送失败");
      }

      setStatus("✅ 已成功发送到您的Kindle邮箱！");

    } catch (error) {
      console.error("Error sending to Kindle:", error);
      setStatus(`发送失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setSendingToKindle(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
              Kindle Helper
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              将网络文章转换为Kindle电子书格式，并发送到您的邮箱
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2Icon className="h-5 w-5" />
                输入文章链接
              </CardTitle>
              <CardDescription>
                输入您想要阅读的文章URL，系统将自动转换为Kindle格式的EPUB文件
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input 
                  placeholder="https://example.com/article" 
                  className="flex-1"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading || sendingToKindle}
                />
                <Button type="submit" className="px-6" disabled={loading || sendingToKindle}>
                  {loading ? (
                    <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PaperPlaneIcon className="h-4 w-4 mr-2" />
                  )}
                  生成EPUB
                </Button>
              </form>
              
              {status && (
                <div className="text-sm text-center space-y-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    status.includes("成功") 
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                      : status.includes("失败")
                      ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  }`}>
                    {status}
                  </span>
                  
                  {downloadUrl && (
                    <div className="flex gap-2 mt-2">
                      <Button 
                        onClick={handleDownload}
                        variant="outline"
                        className="flex-1"
                      >
                        下载EPUB文件
                      </Button>
                      <Button 
                        onClick={handleSendToKindle}
                        disabled={sendingToKindle}
                        className="flex-1"
                      >
                        {sendingToKindle ? (
                          <ReloadIcon className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <EnvelopeClosedIcon className="h-4 w-4 mr-2" />
                        )}
                        发送到Kindle
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              <div className="text-sm text-slate-500 dark:text-slate-400">
                生成的EPUB文件可直接下载到本地，或一键发送到您的Kindle邮箱
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 text-center">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              支持的格式: EPUB
            </div>
            <div className="text-xs text-slate-400 mt-2">
              提示：请确保文章URL是公开可访问的。生成的EPUB文件可直接导入Kindle设备或使用Kindle应用阅读。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
