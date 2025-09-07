# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kindle Helper is a Next.js web application that converts online articles into Kindle-compatible EPUB format. It features intelligent content extraction with multiple strategies, particularly optimized for complex websites like Hugo static sites. The application includes both local download and email-to-Kindle functionality.

## Development Commands

### Essential Commands
```bash
# Install dependencies
npm install

# Start development server (uses Turbopack)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

### Development Environment
- **Port**: 8000 (dev), production varies
- **Package Manager**: npm
- **Build Tool**: Next.js 15 with Turbopack
- **Framework**: Next.js App Router with TypeScript

## Architecture Overview

### Core Extraction System
The application uses a multi-strategy content extraction approach:

1. **SmartExtractor** (`src/lib/smart-extractor.ts`): Intelligently selects extraction method based on website patterns
   - Prioritizes SingleFile CLI for complex sites (Hugo, GitHub Pages, etc.)
   - Falls back to traditional Readability.js for simpler sites
   - Implements error handling and method cascading

2. **SingleFileProcessor** (`src/lib/single-file-processor.ts`): Processes complete webpage HTML
   - Extracts main content using DOM analysis
   - Generates table of contents structure
   - Processes and optimizes images
   - Cleans HTML with DOMPurify

3. **Traditional Extraction** (`src/app/api/scrape/route.ts`): Fallback method using Readability.js
   - Handles basic content extraction
   - Includes Hugo-specific extraction logic

### API Structure
```
src/app/api/
├── extract/route.ts          # Smart extraction entry point
├── singlefile/route.ts       # SingleFile CLI processing
├── scrape/route.ts           # Traditional extraction
├── generate-epub/route.ts    # EPUB generation with image processing
└── send-email/route.ts       # Email delivery via Resend
```

### Frontend Architecture
- **Framework**: Next.js 15 with App Router
- **UI Components**: shadcn/ui with Radix UI primitives
- **Styling**: Tailwind CSS with dark mode support
- **State Management**: React hooks (useState for local state)

### Email Integration
- **Service**: Resend API for email delivery
- **Configuration**: Environment variables for API keys and email addresses
- **Attachments**: Base64-encoded EPUB files
- **Rate Limits**: Resend free tier (100 emails/month)

## Key Technical Details

### Content Extraction Strategy
The SmartExtractor uses pattern matching to determine the best extraction method:
```typescript
// Complex site patterns that benefit from SingleFile
const complexSitePatterns = [
  /github\.io/,
  /hugo/,
  /docs\.*/,
  /blog\.*/,
  /medium\.com/,
  /substack\.com/
];
```

### EPUB Generation Process
1. **Content Processing**: Clean HTML and structure content
2. **Image Handling**: Download and optimize images using Sharp
3. **Metadata Extraction**: Title, author, publication date
4. **TOC Generation**: Multi-level table of contents
5. **File Assembly**: JSZip for EPUB packaging

### Email Configuration
Environment variables in `.env.local`:
```bash
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=your_sender_email
FROM_NAME=Kindle Helper
KINDLE_EMAIL=your_kindle_email
```

## Important Dependencies

### Core Libraries
- **SingleFile CLI**: Complete webpage preservation (`single-file-cli`)
- **Content Extraction**: Readability.js (`@mozilla/readability`)
- **HTML Processing**: JSDOM + DOMPurify
- **EPUB Generation**: epub-gen + JSZip
- **Image Processing**: Sharp
- **Email Delivery**: Resend SDK

### UI Libraries
- **Components**: shadcn/ui
- **Icons**: Radix UI Icons
- **Styling**: Tailwind CSS v4

## Development Notes

### Environment Variables
Copy `.env.example` to `.env.local` and configure:
- Resend API key for email functionality
- Sender and recipient email addresses
- Kindle email address for delivery

### Testing the Application
1. **Content Extraction**: Test with various website types (Hugo, Medium, blogs)
2. **EPUB Generation**: Verify file structure and content completeness
3. **Email Delivery**: Test Resend integration and Kindle delivery
4. **UI Responsiveness**: Test across different screen sizes

### Performance Considerations
- SingleFile CLI provides superior content preservation (133KB+ vs 6KB)
- Image processing uses Sharp for optimization
- Caching strategies for repeated article processing
- Efficient state management for loading indicators

### Common Issues
- **Hydration Errors**: Usually caused by browser extensions during development
- **SingleFile CLI**: Requires global installation (`npm install -g single-file-cli`)
- **Resend API**: Domain verification required for production email sending
- **Environment Variables**: Requires server restart after changes