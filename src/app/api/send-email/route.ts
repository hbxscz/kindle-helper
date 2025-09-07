import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY.trim()) : null;

export async function POST(request: NextRequest) {
  try {
    const { to, subject, text, html, attachments } = await request.json();

    // 如果没有指定收件人，使用环境变量中的Kindle邮箱
    const recipient = to || process.env.KINDLE_EMAIL || 'chenzhaoyy@gmail.com';

    if (!recipient || !subject || !text) {
      return NextResponse.json({ error: 'Recipient, subject, and text are required' }, { status: 400 });
    }

    // 验证Resend API配置
    if (!resend) {
      return NextResponse.json({ error: 'Resend API key not configured. Please add RESEND_API_KEY to your environment variables.' }, { status: 500 });
    }

    // 调试信息
    console.log('API Key configured:', process.env.RESEND_API_KEY ? 'Yes' : 'No');
    console.log('From email:', process.env.FROM_EMAIL);
    console.log('To email (original):', to);
    console.log('To email (final):', recipient);
    console.log('KINDLE_EMAIL from env:', process.env.KINDLE_EMAIL);

    // 发件人配置 - 从环境变量获取或使用默认值
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const fromName = process.env.FROM_NAME || 'Kindle Helper';

    // 邮件选项
    const mailOptions: {
      from: string;
      to: string[];
      subject: string;
      text: string;
      html: string;
      attachments?: Array<{
        filename: string;
        content: string;
        encoding: string;
      }>;
    } = {
      from: `${fromName} <${fromEmail}>`,
      to: [recipient],
      subject: subject,
      text: text,
      html: html || text,
    };

    // 如果有附件，添加到邮件中
    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((attachment: {
        filename: string;
        content: string;
        encoding?: string;
      }) => ({
        filename: attachment.filename,
        content: attachment.content,
        encoding: attachment.encoding || 'base64'
      }));
    }

    // 发送邮件
    const { data, error } = await resend.emails.send(mailOptions);

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: `Failed to send email: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Email sent successfully',
      messageId: data?.id
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}