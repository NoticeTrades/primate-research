# Deployment Guide for Primate Research Website

## Authentication Setup

This website uses a file-based authentication system for development. For production deployment, you'll need to set up a proper database.

### Current Setup (Development)

- Users are stored in `/data/users.json`
- Passwords are hashed using bcrypt
- Sessions are stored in HTTP-only cookies

### Production Deployment Options

#### Option 1: Use a Database (Recommended)

**For PostgreSQL (Vercel, Railway, etc.):**

1. Install database adapter:
```bash
npm install @auth/pg-adapter pg
```

2. Update `app/api/auth/signup/route.ts` and `app/api/auth/login/route.ts` to use your database instead of the file system.

3. Create a users table:
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**For MongoDB (MongoDB Atlas):**

1. Install MongoDB adapter:
```bash
npm install mongodb
```

2. Update auth routes to use MongoDB instead of file system.

#### Option 2: Use Authentication Service (Easiest)

**Clerk (Recommended for ease of use):**
1. Sign up at https://clerk.com
2. Install: `npm install @clerk/nextjs`
3. Follow their setup guide

**Supabase Auth:**
1. Sign up at https://supabase.com
2. Install: `npm install @supabase/supabase-js`
3. Use Supabase's built-in auth

**NextAuth.js with Database:**
1. Install: `npm install next-auth @auth/prisma-adapter prisma`
2. Set up Prisma with your database
3. Configure NextAuth.js properly

### Environment Variables

Create a `.env.local` file:

```env
# For production, add your database connection string
DATABASE_URL=your_database_connection_string

# For session security
NEXTAUTH_SECRET=your_random_secret_key_here
NEXTAUTH_URL=https://yourdomain.com
```

Generate a secret:
```bash
openssl rand -base64 32
```

### Deployment Steps

1. **Vercel (Recommended):**
   - Push your code to GitHub
   - Connect to Vercel
   - Add environment variables
   - Deploy

2. **Other Platforms:**
   - Set up your database
   - Update auth routes to use database
   - Set environment variables
   - Deploy

### Security Notes

- Always use HTTPS in production
- Set `secure: true` for cookies in production (already done)
- Use environment variables for secrets
- Regularly update dependencies
- Consider rate limiting for auth endpoints

### Current File Structure

```
app/
  api/
    auth/
      check/route.ts      # Check if user is authenticated
      login/route.ts      # Login endpoint
      signup/route.ts    # Signup endpoint
      logout/route.ts    # Logout endpoint
  login/
    page.tsx             # Login page
  signup/
    page.tsx             # Signup page
  research/
    page.tsx             # Protected research page
  videos/
    page.tsx             # Protected videos page
```

### Testing Authentication

1. Visit `/signup` to create an account
2. Visit `/login` to sign in
3. Try accessing `/research` or `/videos` - should redirect to login if not authenticated
4. After login, you should be able to access protected pages

### Next Steps for Production

1. Choose a database solution
2. Update auth routes to use database
3. Set up environment variables
4. Test authentication flow
5. Deploy to your hosting platform
