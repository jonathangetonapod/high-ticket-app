# High-Ticket Strategist Portal

AI-powered campaign validation and management platform for high-ticket email outreach strategists.

## Overview

This portal streamlines the campaign submission and validation process for high-ticket clients. It integrates with Bison and Instantly email platforms to provide comprehensive campaign analysis, sender account health monitoring, and AI-powered validation.

## Features

### Campaign Validation
- **AI-Powered Analysis**: Automated validation of email sequences using intelligent checks
- **Multi-Platform Support**: Integration with both Bison and Instantly platforms
- **Real-Time Feedback**: Instant validation results with detailed recommendations
- **Spintax Support**: Parse and validate email spintax variations
- **HTML to Plain Text Conversion**: Automatically extract text from HTML email bodies

### Sender Account Health
- **Warmup Monitoring**: Track email warmup progress and scores
- **Bounce Rate Analysis**: Monitor and alert on bounce rates (industry standard: <2% excellent, 2-5% acceptable, >5% critical)
- **Account Status**: Real-time health summaries with categorization (healthy, warning, critical)
- **Creation Date Tracking**: Monitor account age for warmup compliance (14+ days recommended)

### Campaign Management
- **Campaign Listing**: Browse all campaigns with status indicators
- **Sequence Details**: View complete email sequences with subject lines, bodies, and timing
- **Thread Reply Detection**: Identify follow-up emails in sequences
- **Variant Management**: Support for A/B testing with email variants

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**:
  - [Radix UI](https://www.radix-ui.com/) (accessible component primitives)
  - [Lucide React](https://lucide.dev/) (icons)
  - Custom component library with class-variance-authority

## Project Structure

```
high-ticket-app/
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   │   └── campaigns/        # Campaign API routes
│   │   └── submissions/
│   │       └── new/              # Campaign submission interface
│   ├── lib/
│   │   ├── bison.ts             # Bison API client
│   │   └── instantly.ts          # Instantly API client
│   └── components/ui/            # Reusable UI components
└── README.md
```

## API Integrations

### Bison API
- Campaign listing and details
- Sender email account management
- Warmup statistics and health tracking
- Sequence step retrieval

### Instantly API
- Campaign management
- Lead tracking
- Mailbox health monitoring

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jonathangetonapod/high-ticket-app.git
   cd high-ticket-app/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API credentials**
   - API keys are managed via Google Sheets integration
   - Update the sheet URL in `lib/bison.ts` with your credentials sheet

4. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm run start

# Lint code
npm run lint
```

## Campaign Validation Rules

The platform validates campaigns based on industry best practices:

### Warmup Requirements
- Minimum 14 days warmup (≥140 emails at ~10/day)
- Warmup score: 50+ (good), 30-49 (warning), <30 (critical)
- Bounce rate: <2% (excellent), 2-5% (acceptable), >5% (critical)

### Email Sequence Best Practices
- Thread reply detection for follow-ups
- Spintax variation parsing
- HTML content extraction and validation
- Subject line and body content analysis

## Contributing

This is a private repository for internal use. Contact the repository owner for access and contribution guidelines.

## License

Private - All rights reserved

## Support

For issues or questions, contact the development team or open an issue in the repository.
