# AI Newsletter Generator SaaS

A production-ready SaaS application for automatically generating professional newsletters from RSS feeds using AI. Built with Next.js 16, TypeScript, MongoDB, Clerk billing & authentication, Prisma and OpenAI, featuring intelligent caching, article deduplication, and real-time streaming generation.

## Overview

This application transforms the time-consuming process of newsletter creation into an automated, AI-powered workflow. Users subscribe to RSS feeds, and the system automatically curates content and generates complete newsletters with titles, subject lines, and formatted content ready for distribution.

### Key Value Proposition

- **Time Savings**: Generate complete newsletters in seconds instead of hours
- **Consistency**: Never miss a publication deadline with automated content curation
- **Quality**: AI-powered content that matches your brand voice and audience
- **Scalability**: Intelligent caching and deduplication reduce costs and improve performance

## Features

### Core Functionality

#### RSS Feed Management
- Subscribe to multiple RSS feeds from any source
- Automatic feed validation and metadata extraction
- Feed refresh scheduling with intelligent caching
- Support for RSS 2.0 and Atom feed formats
- Feed metadata display (title, description, language, images)

#### AI-Powered Newsletter Generation
- **Multiple Title Options**: Get 5 compelling newsletter title suggestions
- **Subject Line Variations**: 5 email subject lines optimized for open rates
- **Complete Newsletter Body**: Professionally formatted content with proper structure
- **Top Announcements**: AI-curated list of the 5 most important news items
- **Additional Insights**: Contextual recommendations and notes

#### Customization & Personalization
- **Newsletter Branding**: Custom name, description, and company information
- **Target Audience**: Specify audience demographics and interests
- **Tone Control**: Set default tone (professional, casual, technical, etc.)
- **Brand Voice**: Define your unique writing style and voice
- **Custom Disclaimers**: Add legal text, footers, and sender information
- **Industry Context**: Specify your industry for better content relevance

#### Time Range Flexibility
- Generate newsletters for any date range
- Pre-configured options: Last 7 days, Last 30 days
- Custom date range picker for specific periods
- Automatic article filtering by publication date

#### Newsletter History (Pro Feature)
- Save all generated newsletters to your account
- Access and review past newsletters anytime
- Track content performance and successful formats
- Reuse and reference previous newsletters

#### Real-Time Generation
- Watch newsletters being created live with streaming
- Progressive content updates as AI generates
- Immediate feedback on generation progress
- Error handling with clear user notifications

### Technical Features

#### Intelligent Cross-User Caching
The system implements a sophisticated caching strategy that benefits all users:

- **3-Hour Cache Window**: RSS feeds are cached for 3 hours across all users
- **Global Cache Sharing**: When one user fetches a feed, all users benefit
- **Automatic Refresh**: Stale feeds refresh automatically when needed
- **Performance Optimization**: Reduces external API calls and improves response times
- **Cost Efficiency**: Lower bandwidth and processing costs at scale

**Example Flow:**
1. User A generates a newsletter using TechCrunch feed at 10:00 AM
2. System fetches and caches TechCrunch articles
3. User B generates a newsletter at 10:30 AM using the same feed
4. System uses cached data (no new fetch required)
5. Both users benefit from faster generation

#### Article Deduplication
Articles are stored once in the database, even when they appear in multiple feeds:

- **GUID-Based Uniqueness**: Each article identified by its RSS GUID
- **Multi-Feed Tracking**: Articles track all feeds that reference them
- **Storage Optimization**: ~40-50% reduction in database storage
- **Trending Detection**: Articles in multiple feeds indicate high importance
- **Efficient Lookups**: O(1) lookup time via unique index

**How It Works:**
- When an article is fetched, the system checks if it exists by GUID
- If it exists, the feed ID is added to `sourceFeedIds` array
- If it doesn't exist, a new article record is created
- This prevents duplicate storage while maintaining feed relationships

#### Real-Time Streaming with Vercel AI SDK
Newsletter generation streams in real-time using the Vercel AI SDK:

- **Progressive Updates**: Content appears as it's generated
- **Type-Safe Streaming**: Full TypeScript support with Zod schema validation
- **Clean Architecture**: No custom streaming code required
- **Error Handling**: Built-in error detection and user feedback
- **Simple Integration**: Uses standard `streamObject` and `useObject` hooks

## Technology Stack

### Frontend
- **Next.js 16**: App Router with React Server Components
- **React 19**: Latest React features and optimizations
- **TypeScript**: Full type safety throughout the application
- **Tailwind CSS v4**: Modern utility-first styling
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **React Markdown**: Markdown rendering for newsletter content

### Backend
- **Next.js API Routes**: Server-side API endpoints
- **Server Actions**: Type-safe server-side functions
- **Vercel AI SDK**: Streaming AI responses with `streamObject`
- **OpenAI GPT-4o-mini**: AI model for newsletter generation (configurable)

### Database & ORM
- **MongoDB**: NoSQL database for flexible schema
- **Prisma**: Type-safe database client and migrations
- **MongoDB Atlas**: Cloud-hosted database (optional)

### Authentication & Billing
- **Clerk**: Authentication, user management, and subscription billing
- **Plan-Based Features**: Starter and Pro tier differentiation

### Development Tools
- **Biome**: Fast code formatter and linter
- **TypeScript**: Strict type checking
- **Date-fns**: Date manipulation utilities
- **Zod**: Runtime schema validation

## Getting Started (Developer Setup)

This section provides a complete step-by-step guide for developers to set up and run this project locally.

### Prerequisites

Before you begin, ensure you have:

- **Node.js**: Version 18 or higher installed
- **Package Manager**: pnpm (recommended), npm, yarn, or bun
- **Git**: For cloning the repository
- **Accounts**: You'll need accounts for Clerk, MongoDB Atlas, and OpenAI (all have free tiers)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd ai-newsletter-saas
```

### Step 2: Install Dependencies

Install all project dependencies using your preferred package manager:

```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install

# Or using yarn
yarn install
```

This will install all required packages including Next.js, React, Prisma, Clerk, and other dependencies.

### Step 3: Set Up Clerk (Authentication)

Clerk handles user authentication, user management, and subscription billing. Follow these steps:

1. **Create a Clerk Account**
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Sign up for a free account (no credit card required for development)

2. **Create a New Application**
   - Click "Create Application"
   - Enter an application name (e.g., "AI Newsletter SaaS")
   - Select your preferred authentication methods:
     - **Email & Password** (recommended for simplicity)
     - **Google OAuth** (optional, for user convenience)
     - **GitHub OAuth** (optional, great for developer audiences)

3. **Get Your API Keys**
   - Navigate to **API Keys** in the left sidebar
   - You'll see two keys:
     - **Publishable Key** (starts with `pk_test_` or `pk_live_`)
     - **Secret Key** (starts with `sk_test_` or `sk_live_`)
   - Copy both keys (you'll need them for `.env.local`)

4. **Configure Allowed Origins**
   - Go to **Settings** → **Domains** in Clerk Dashboard
   - Add `http://localhost:3000` to allowed origins
   - This allows Clerk to work with your local development server

5. **Set Up Pricing Plans (Optional for Development)**
   - Navigate to **Billing** → **Pricing Plans**
   - Create a **Starter** plan (can be free)
   - Create a **Pro** plan (set your desired price)
   - These plans control feature access (RSS feed limits, newsletter history, etc.)

### Step 4: Set Up MongoDB Atlas (Database)

MongoDB stores all application data including users, RSS feeds, articles, and newsletters.

1. **Create a MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for a free account (M0 cluster is free forever)

2. **Create a New Cluster**
   - Click "Build a Database"
   - Choose **FREE** (M0) tier
   - Select a cloud provider (AWS, Google Cloud, or Azure)
   - Choose a region closest to you
   - Click "Create" (takes 1-3 minutes)

3. **Create a Database User**
   - Go to **Database Access** in the left sidebar
   - Click "Add New Database User"
   - Choose "Password" authentication
   - Enter a username (e.g., `newsletter-admin`)
   - Generate a secure password (or create your own)
   - **IMPORTANT**: Save this password! You'll need it for the connection string
   - Set user privileges to "Atlas admin" (for development) or "Read and write to any database"
   - Click "Add User"

4. **Configure Network Access**
   - Go to **Network Access** in the left sidebar
   - Click "Add IP Address"
   - For development, click "Allow Access from Anywhere" (adds `0.0.0.0/0`)
   - For production, add specific IP addresses only
   - Click "Confirm"

5. **Get Your Connection String**
   - Go back to **Database** → **Connect**
   - Click "Connect your application"
   - Select "Node.js" as the driver
   - Copy the connection string (looks like: `mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`)
   - Replace `<username>` with your database username
   - Replace `<password>` with your database password
   - Replace the `?` after `.net/` with your database name: `?retryWrites=true&w=majority` → `/newsletter-db?retryWrites=true&w=majority`
   - **Note**: If your password contains special characters, URL-encode them:
     - `@` → `%40`
     - `#` → `%23`
     - `$` → `%24`
     - etc.

### Step 5: Set Up OpenAI (AI Generation)

OpenAI powers the newsletter generation. You'll need an API key with billing enabled.

1. **Create an OpenAI Account**
   - Go to [OpenAI Platform](https://platform.openai.com)
   - Sign up for an account

2. **Add Billing Information**
   - Go to **Settings** → **Billing**
   - Add a payment method (credit card required)
   - **Important**: Set a usage limit to control costs
   - Recommended: $20-50/month for development
   - You can adjust this anytime

3. **Generate an API Key**
   - Navigate to **API Keys** in the left sidebar
   - Click "Create new secret key"
   - Give it a name (e.g., "Newsletter Generator Dev")
   - Click "Create secret key"
   - **IMPORTANT**: Copy the key immediately! You won't be able to see it again
   - The key starts with `sk-proj-` or `sk-`

4. **Verify Model Access**
   - The default model is `gpt-4o-mini` (cost-effective)
   - Check that your account has access to this model
   - If you want to use a different model, verify access in **Models** section

### Step 6: Create Environment Variables File

Create a `.env.local` file in the project root directory:

```bash
# In the project root
touch .env.local
```

Open `.env.local` and add the following variables with your actual values:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here

# MongoDB Database
DATABASE_URL=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/newsletter-db?retryWrites=true&w=majority

# OpenAI API
OPENAI_API_KEY=sk-proj-your_actual_openai_api_key_here   //keep them hidden/private

# Optional: Custom OpenAI Model (default is gpt-4o-mini)
# OPENAI_MODEL=gpt-4o-mini
```

**Important Notes:**
- Replace all placeholder values with your actual keys
- Never commit `.env.local` to version control (it's already in `.gitignore`)
- Use test keys for development (`pk_test_`, `sk_test_`)
- Use production keys only when deploying to production

### Step 7: Initialize the Database

Set up your database schema using Prisma:

```bash
# Generate Prisma Client (creates TypeScript types from schema)
pnpm prisma:generate

# Push schema to MongoDB (creates collections and indexes)
pnpm prisma:push
```

**What these commands do:**
- `prisma:generate`: Generates TypeScript types from your Prisma schema
- `prisma:push`: Syncs your schema with MongoDB, creating all collections and indexes

**Optional: Open Prisma Studio**
You can view your database in a visual interface:

```bash
pnpm prisma:studio
```

This opens a browser at `http://localhost:5555` where you can view and edit your database.

### Step 8: Start the Development Server

Start the Next.js development server:

```bash
pnpm dev
```

Or with npm:
```bash
npm run dev
```

You should see output like:
```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
- Ready in 2.3s
```

### Step 9: Verify the Setup

1. **Open the Application**
   - Navigate to [http://localhost:3000](http://localhost:3000) in your browser
   - You should see the landing page

2. **Test Authentication**
   - Click "Sign Up" or "Get Started"
   - Create a test account
   - You should be redirected to the dashboard after signup

3. **Check for Errors**
   - Open browser console (F12) and check for any errors
   - Check terminal for server errors
   - Common issues:
     - Missing environment variables → Check `.env.local` file
     - Database connection errors → Verify `DATABASE_URL` is correct
     - Clerk errors → Verify API keys are correct

### Step 10: First-Time Application Setup

Once the application is running:

1. **Sign Up for an Account**
   - The application automatically creates a user record in MongoDB
   - You'll be redirected to the dashboard

2. **Configure Settings**
   - Go to Settings in the dashboard
   - Fill in your newsletter preferences (optional but recommended)

3. **Add an RSS Feed**
   - Click "Add Feed" in the dashboard
   - Try adding: `https://techcrunch.com/feed/`
   - The system will validate and fetch articles

4. **Generate Your First Newsletter**
   - Select the feed you just added
   - Choose "Last 7 days" date range
   - Click "Generate Newsletter"
   - Watch it generate in real-time!

### Troubleshooting Setup Issues

**Problem: "Cannot find module" errors**
```bash
# Solution: Reinstall dependencies
rm -rf node_modules
pnpm install
```

**Problem: Prisma Client not found**
```bash
# Solution: Regenerate Prisma Client
pnpm prisma:generate
```

**Problem: Database connection fails**
- Verify `DATABASE_URL` is correct
- Check MongoDB Atlas cluster is running (not paused)
- Verify IP whitelist includes your IP or `0.0.0.0/0`
- Check password doesn't have unencoded special characters

**Problem: Clerk authentication doesn't work**
- Verify API keys are correct in `.env.local`
- Check allowed origins include `http://localhost:3000`
- Restart dev server after changing environment variables

**Problem: OpenAI API errors**
- Verify API key is correct and complete
- Check billing is set up in OpenAI Dashboard
- Verify account has access to the model you're using
- Check usage limits haven't been exceeded

### Next Steps

Once everything is set up and working:

- Explore the [Project Structure](#project-structure) to understand the codebase
- Check out the [Database Schema](#database-schema) to understand data models
- Review [Configuration](#configuration) for customization options

## Project Structure

```
/
├── actions/                    # Server actions (database operations)
│   ├── generate-newsletter.ts # AI newsletter generation logic
│   ├── newsletter.ts          # Newsletter CRUD operations
│   ├── rss-feed.ts            # RSS feed management
│   ├── rss-fetch.ts           # RSS feed fetching and parsing
│   ├── rss-article.ts         # Article deduplication logic
│   ├── user-settings.ts       # User preferences management
│   └── user.ts                # User operations
│
├── app/                       # Next.js App Router
│   ├── api/                   # API routes
│   │   └── newsletter/
│   │       ├── generate-stream/  # Streaming newsletter generation
│   │       └── prepare/         # Pre-generation metadata
│   ├── auth/                  # Authentication routes
│   ├── dashboard/             # Protected dashboard pages
│   │   ├── generate/          # Newsletter generation page
│   │   ├── history/           # Newsletter history (Pro)
│   │   ├── settings/          # User settings
│   │   ├── account/           # Account management
│   │   └── pricing/           # Pricing page
│   └── page.tsx               # Landing page
│
├── components/                # React components
│   ├── dashboard/             # Dashboard UI components
│   │   ├── newsletter-generator.tsx
│   │   ├── newsletter-display.tsx
│   │   ├── rss-feed-manager.tsx
│   │   ├── settings-form.tsx
│   │   └── ...
│   ├── landing/               # Landing page sections
│   └── ui/                    # Reusable UI components
│
├── lib/                       # Utilities and helpers
│   ├── auth/                  # Authentication helpers
│   ├── database/              # Database error handling
│   ├── newsletter/            # Newsletter generation logic
│   │   ├── prompt-builder.ts  # AI prompt construction
│   │   ├── schema.ts          # Zod schemas
│   │   └── types.ts           # TypeScript types
│   ├── rss/                   # RSS feed utilities
│   │   ├── parser.ts          # RSS feed parsing
│   │   ├── feed-refresh.ts    # Caching and refresh logic
│   │   └── types.ts           # RSS types
│   └── mongodb.ts             # MongoDB connection utilities
│
├── prisma/
│   └── schema.prisma          # Database schema definition
│
└── public/                    # Static assets
```

## Database Schema

The application uses MongoDB with Prisma ORM. The schema consists of five main models:

### User
Stores minimal user information (authentication handled by Clerk):
- `id`: Unique MongoDB ObjectId
- `clerkUserId`: Unique identifier linking to Clerk user
- `rssFeeds`: One-to-many relationship with RSS feeds
- `newsletters`: One-to-many relationship with saved newsletters
- `settings`: One-to-one relationship with user settings
- `createdAt`, `updatedAt`: Timestamps

### UserSettings
Stores user preferences for newsletter generation:
- `id`: Unique MongoDB ObjectId
- `userId`: Foreign key to User
- **Basic Settings**: `newsletterName`, `description`, `targetAudience`, `defaultTone`
- **Branding**: `brandVoice`, `companyName`, `industry`
- **Additional**: `disclaimerText`, `defaultTags`, `customFooter`, `senderName`, `senderEmail`
- `createdAt`, `updatedAt`: Timestamps

### RssFeed
Stores RSS feed subscriptions:
- `id`: Unique MongoDB ObjectId
- `userId`: Foreign key to User
- `url`: RSS feed URL (unique per user)
- `title`, `description`, `link`: Feed metadata
- `imageUrl`, `language`: Optional feed information
- `lastFetched`: Timestamp of last successful fetch (used for caching)
- `articles`: One-to-many relationship with articles
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**: `userId`, `userId + url` (unique)

### RssArticle
Stores individual articles with deduplication:
- `id`: Unique MongoDB ObjectId
- `feedId`: Foreign key to RssFeed
- `guid`: Unique RSS identifier (unique index for deduplication)
- `sourceFeedIds`: Array of all feed IDs that reference this article
- `title`, `link`: Article metadata
- `content`, `summary`: Article content
- `pubDate`: Publication date
- `author`, `categories`, `imageUrl`: Optional article information
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**: `feedId`, `pubDate`, `feedId + pubDate`, `sourceFeedIds`, `guid` (unique)

### Newsletter
Stores generated newsletters (Pro users only):
- `id`: Unique MongoDB ObjectId
- `userId`: Foreign key to User
- `suggestedTitles`: Array of 5 title options
- `suggestedSubjectLines`: Array of 5 subject line options
- `body`: Complete newsletter content (markdown formatted)
- `topAnnouncements`: Array of 5 top news items
- `additionalInfo`: Optional additional insights
- `startDate`, `endDate`: Newsletter date range
- `userInput`: Optional user-provided context
- `feedsUsed`: Array of RSS feed IDs used for generation
- `createdAt`, `updatedAt`: Timestamps
- **Indexes**: `userId`, `userId + createdAt`, `createdAt`

## How It Works

### Newsletter Generation Flow

1. **User Initiates Generation**
   - User selects RSS feeds and date range
   - Optionally provides custom instructions

2. **Feed Preparation**
   - System checks which feeds need refreshing (older than 3 hours)
   - Refreshes stale feeds by fetching from RSS sources
   - Uses cached data for fresh feeds (within 3-hour window)

3. **Article Retrieval**
   - Queries database for articles matching selected feeds and date range
   - Filters articles by publication date
   - Limits to 100 most recent articles (configurable)

4. **AI Prompt Construction**
   - Builds article summaries with titles, sources, dates, and content
   - Incorporates user settings (tone, branding, audience)
   - Adds date range context and user instructions
   - Formats prompt for optimal AI understanding

5. **Streaming Generation**
   - Sends prompt to OpenAI API using Vercel AI SDK
   - Streams response in real-time to client
   - Client updates UI progressively as content is generated
   - Validates output against Zod schema

6. **Newsletter Display**
   - Displays generated content with all sections
   - Provides copy-to-clipboard functionality
   - Allows download as text file
   - Pro users can save to history

### Caching Strategy

The caching system uses a **3-hour window** that applies globally across all users:

1. **Feed Fetch Check**: When generating a newsletter, the system checks when each feed URL was last fetched (by any user)
2. **Cache Validation**: If a feed was fetched within the last 3 hours, cached articles are used
3. **Automatic Refresh**: If a feed is older than 3 hours, it's automatically refreshed
4. **Global Benefit**: All users benefit from recent fetches by any user

**Benefits:**
- Reduced load on RSS feed servers
- Faster newsletter generation (no waiting for feed refreshes)
- Lower bandwidth and processing costs
- Better reliability (fewer rate limiting issues)

### Article Deduplication Process

When articles are fetched from RSS feeds:

1. **GUID Extraction**: Each article's unique GUID is extracted from the RSS feed
2. **Existence Check**: Database is queried for existing article with same GUID
3. **Update or Create**:
   - If exists: Add current feed ID to `sourceFeedIds` array (if not already present)
   - If new: Create article record with initial feed ID in `sourceFeedIds`
4. **Relationship Maintenance**: Article-to-feed relationships are maintained via `sourceFeedIds`

**Result**: The same article appearing in multiple feeds is stored once, with all referencing feeds tracked in the `sourceFeedIds` array.

## Configuration

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (safe for client) | Yes | `pk_test_...` |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only) | Yes | `sk_test_...` |
| `DATABASE_URL` | MongoDB connection string | Yes | `mongodb+srv://...` |
| `OPENAI_API_KEY` | OpenAI API key | Yes | `sk-proj-...` |
| `OPENAI_MODEL` | OpenAI model to use | No | `gpt-4o-mini` (default) |

### Customizable Constants

You can modify these values in `lib/rss/feed-refresh.ts`:

- **`CACHE_WINDOW`**: RSS feed cache duration (default: 3 hours)
- **`ARTICLE_LIMIT`**: Maximum articles per newsletter (default: 100)

### AI Model Selection

The default model is `gpt-4o-mini` for optimal cost/quality balance. You can change it by:

1. Setting `OPENAI_MODEL` environment variable, or
2. Modifying the model in `actions/generate-newsletter.ts` or `app/api/newsletter/generate-stream/route.ts`

**Available Models:**
- `gpt-4o-mini`: Best cost/quality ratio (recommended)
- `gpt-4o`: Highest quality, higher cost
- `gpt-4-turbo`: Previous generation, good balance
- `gpt-3.5-turbo`: Most cost-effective, lower quality

## Deployment

### Deploying to Vercel

1. **Prepare for production**
   - Update environment variables with production keys
   - Ensure `DATABASE_URL` points to production database
   - Use production Clerk keys (`pk_live_...`, `sk_live_...`)

2. **Deploy via Vercel CLI**
   ```bash
   npm i -g vercel
   vercel login
   vercel
   vercel --prod
   ```

3. **Deploy via GitHub Integration**
   - Push code to GitHub repository
   - Import project in Vercel Dashboard
   - Configure build settings (Next.js preset)
   - Add all environment variables
   - Deploy

4. **Post-deployment configuration**
   - Update Clerk allowed origins with production domain
   - Update MongoDB network access (or keep `0.0.0.0/0` for serverless)
   - Test authentication and newsletter generation
   - Set up custom domain (optional)

### Environment-Specific Considerations

- **Development**: Use test keys and development database
- **Preview**: Use preview environment variables in Vercel
- **Production**: Use production keys and production database

## Troubleshooting

### Common Issues

#### Database Connection Errors
**Problem**: "Can't reach database server"

**Solutions:**
- Verify MongoDB Atlas cluster is running (not paused)
- Check IP whitelist includes `0.0.0.0/0` or your IP address
- Test connection string in MongoDB Compass
- URL-encode special characters in password (`@` → `%40`, `#` → `%23`)

#### Authentication Issues
**Problem**: "Invalid publishable key" or redirect loops

**Solutions:**
- Verify correct environment (test vs. production keys)
- Check variable names match exactly (case-sensitive)
- Restart dev server after changing environment variables
- Clear browser cookies and cache
- Verify Clerk Dashboard settings match your routes

#### RSS Feed Errors
**Problem**: "Invalid RSS feed URL" or no articles found

**Solutions:**
- Validate RSS URL in a feed validator
- Check feed returns valid XML
- Verify feed has articles in the selected date range
- Some feeds may require specific User-Agent headers
- Check feed hasn't been blocked or moved

#### OpenAI API Errors
**Problem**: "OpenAI API key invalid" or rate limit errors

**Solutions:**
- Verify API key is complete (they're long strings)
- Check billing is set up in OpenAI Dashboard
- Verify account has access to selected model
- Check usage limits and quotas
- New accounts: 3 requests/min, 200 requests/day (upgrade for higher limits)

#### Newsletter Generation Fails
**Problem**: Generation fails or returns incomplete content

**Solutions:**
- Verify articles exist in selected date range
- Check OpenAI API key is valid and has quota
- Ensure model name is correct
- Check browser console for streaming errors
- Verify network connectivity

#### Prisma Schema Sync Issues
**Problem**: TypeScript errors or database schema out of sync

**Solutions:**
```bash
# Regenerate Prisma Client
pnpm prisma:generate

# Push schema to database
pnpm prisma:push

# Or reset database (⚠️ deletes all data)
npx prisma db push --force-reset
```

### Performance Optimization

- **Database Indexes**: Ensure all indexes are created (Prisma handles this automatically)
- **Feed Caching**: Adjust `CACHE_WINDOW` based on your needs
- **Article Limits**: Reduce `ARTICLE_LIMIT` for faster generation with fewer articles
- **Model Selection**: Use `gpt-4o-mini` for faster, cheaper generation

## Development

### Available Scripts

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm prisma:generate  # Generate Prisma Client types
pnpm prisma:push      # Sync schema with database
pnpm prisma:studio    # Open Prisma Studio (database browser)

# Code Quality
pnpm lint             # Check code with Biome
pnpm format           # Format code with Biome
```

### Code Structure Guidelines

- **Server Actions**: Place database operations in `/actions`
- **API Routes**: Use `/app/api` for REST endpoints
- **Components**: Organize by feature in `/components`
- **Utilities**: Shared logic goes in `/lib`
- **Types**: Define in `/lib` with corresponding feature

### Adding New Features

1. **Database Changes**: Update `prisma/schema.prisma`, then run `prisma:push`
2. **New Server Actions**: Create in `/actions` with `"use server"` directive
3. **New API Routes**: Create in `/app/api` following Next.js conventions
4. **New Components**: Add to `/components` with proper TypeScript types

## Cost Considerations

### OpenAI API Costs

**Model Pricing (as of 2024):**
- `gpt-4o-mini`: ~$0.15/$0.60 per 1M tokens (input/output)
- `gpt-4o`: ~$2.50/$10 per 1M tokens (input/output)

**Typical Newsletter Generation:**
- Input: ~5,000-15,000 tokens (articles + prompt)
- Output: ~2,000-5,000 tokens (newsletter content)
- Cost per newsletter: $0.001-0.005 (gpt-4o-mini) or $0.01-0.05 (gpt-4o)

**Monthly Estimates:**
- 100 newsletters: $0.10-0.50 (gpt-4o-mini) or $1-5 (gpt-4o)
- 1,000 newsletters: $1-5 (gpt-4o-mini) or $10-50 (gpt-4o)

**Recommendations:**
- Use `gpt-4o-mini` for cost-effective production use
- Set usage limits in OpenAI Dashboard
- Monitor usage regularly
- Consider caching strategies for similar newsletters

### Infrastructure Costs

- **MongoDB Atlas**: Free tier (512MB) sufficient for development
- **Vercel**: Free tier includes generous limits
- **Clerk**: Free tier for development, paid for production

## Security Considerations

- **Environment Variables**: Never commit `.env.local` to version control
- **API Keys**: Keep all secret keys server-side only
- **Authentication**: All routes protected by Clerk middleware
- **Database**: Use strong passwords and restrict IP access in production
- **CORS**: Configure allowed origins in Clerk Dashboard
- **Rate Limiting**: Consider implementing rate limits for API routes

## License

This project is licensed under the MIT License. See LICENSE file for details.

## Support

For issues, questions, or contributions, please open an issue in the repository.

---

Built with modern web technologies and best practices for scalability, maintainability, and developer experience.
