import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    // 暂时禁用邮件发送功能
    return NextResponse.json({ 
      error: 'Email sending is currently disabled. Please use the download feature instead.' 
    }, { status: 503 });

    const { to, subject, text, html, attachments } = await request.json();

    if (!to || !subject || !text) {
      return NextResponse.json({ error: 'To, subject, and text are required' }, { status: 400 });
    }

    // 验证邮件配置
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return NextResponse.json({ error: 'Email configuration not set' }, { status: 500 });
    }

    // 配置邮件发送服务
    // 注意：在实际生产环境中，这些配置应该来自环境变量
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // 邮件选项
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text,
      html: html || text,
      attachments: attachments || []
    };

    // 发送邮件
    const info = await transporter.sendMail(mailOptions);

    return NextResponse.json({
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}