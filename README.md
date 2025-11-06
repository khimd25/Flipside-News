# FLIPSIDE - News with Perspective

FLIPSIDE is a personalized news feed application that helps users explore diverse perspectives by analyzing and presenting news with different sentiment scores.

## Features

- Personalized news feed with category filtering
- User authentication with NextAuth
- Article saving and categorization
- Sentiment analysis using Google Natural Language API
- "Flip" button to view articles with opposing sentiment
- Article feedback and rating system
- Responsive design with modern UI

## Tech Stack

- **Frontend**: Next.js 13+ (App Router), React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with JWT
- **APIs**: Google News API, Google Cloud Natural Language API
- **Deployment**: Vercel (Frontend) and Railway/Neon (Database)

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/flipside"

   # NextAuth
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000

   # Google OAuth (optional for local dev)
   GOOGLE_CLIENT_ID=
   GOOGLE_CLIENT_SECRET=

   # Google Cloud
   GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

   # News API
   NEWS_API_KEY=your-news-api-key
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
├── app/                    # App router pages
│   ├── api/               # API routes
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── feed/              # News feed
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
├── lib/                   # Utility functions
├── prisma/                # Database schema and migrations
├── public/                # Static assets
└── styles/                # Global styles
```

## Database Schema

Key entities:
- User
- Article
- Category
- SavedArticle
- UserRating
- UserPreference

## API Endpoints

- `GET /api/feed` - Get personalized news feed
- `POST /api/feed/flip` - Get articles with opposite sentiment
- `POST /api/articles/save` - Save article to user's collection
- `POST /api/ratings` - Submit article rating
- `GET /api/categories` - Get user's categories

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## License

MIT
