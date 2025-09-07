import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    
    console.log('Environment check:');
    console.log('API Key exists:', apiKey ? 'Yes' : 'No');
    console.log('API Key length:', apiKey?.length || 0);
    console.log('API Key format:', apiKey ? apiKey.substring(0, 8) + '...' : 'None');
    console.log('From email:', fromEmail);

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'API key not found in environment variables',
        config: {
          hasApiKey: false,
          hasFromEmail: !!fromEmail
        }
      }, { status: 500 });
    }

    // Test API key format
    if (!apiKey.startsWith('re_')) {
      return NextResponse.json({ 
        error: 'Invalid API key format. Should start with "re_"',
        config: {
          hasApiKey: true,
          apiKeyFormat: apiKey.substring(0, 8),
          hasFromEmail: !!fromEmail
        }
      }, { status: 500 });
    }

    // Try to create Resend instance
    const resend = new Resend(apiKey.trim());
    
    return NextResponse.json({ 
      message: 'Configuration looks good',
      config: {
        hasApiKey: true,
        apiKeyLength: apiKey.length,
        hasFromEmail: !!fromEmail,
        fromEmail: fromEmail
      }
    });

  } catch (error) {
    console.error('Configuration check error:', error);
    return NextResponse.json({ 
      error: 'Configuration check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}