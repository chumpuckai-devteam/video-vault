# Video Vault

Controlled Google Drive video sharing with session-locked secure links.

## Requirements
- Node.js 22+
- Supabase or local PostgreSQL (Supabase recommended)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy env file:
   ```bash
   cp .env.example .env
   ```

3. Create database schema:
   - In Supabase SQL editor (or local Postgres), run `supabase/schema.sql`.

4. Add environment values in `.env`:
   ```bash
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   APP_URL=http://localhost:3000

   GOOGLE_CLIENT_ID=your_google_oauth_client_id
   GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/google/auth/callback
   ```

5. Run dev server:
   ```bash
   npm run dev
   ```

## Admin Dashboard (User A)
- Visit: `http://localhost:3000/admin`
- Click **Connect Google Drive** once (OAuth)
- Browse folders and pick a video (or paste a Drive link manually)
- (Optional) Add a title
- Use **Create Link** to generate a session-locked viewer link (copied to clipboard)

## Viewer (User B)
- Open the secure link in a browser.
- First opener becomes the locked session.
- Video streams through `/api/stream/[token]` proxy (no Drive URL exposed).
- Right click disabled + controlsList `nodownload`.

## Session Locking
- When the secure link is opened, a `vv_session` cookie is set.
- The token is locked to that session on first access.
- Any other browser/session will receive a 403.

## Google Drive OAuth Setup

1. Go to Google Cloud Console → APIs & Services → Credentials.
2. Create OAuth Client ID (Web application).
3. Add Authorized redirect URI:
   - `http://localhost:3000/api/google/auth/callback`
   - `https://your-domain.com/api/google/auth/callback`
4. Enable APIs:
   - Google Drive API

Add the client ID/secret to `.env` (see setup above).

## Notes / Drive Access
- OAuth lets you stream **private** Drive videos without making them public.
- The first time you connect, Google returns a refresh token (stored in Supabase).
- Streaming now uses Drive API with range support.

## Testing Checklist for समीर

**Admin:**
1. Open `/admin`
2. Paste a public Drive link, click **Add Video**
3. Click **Create Link** and paste the copied URL into a new browser profile

**Viewer:**
1. Open the secure link in Browser A → video should play
2. Open the same link in Browser B (incognito) → should show "Access blocked"
3. Verify right-click on video is disabled, download button not present

## Known Limitations
- Google Drive download endpoints sometimes require a confirmation page for large files.
  If you hit this, the proxy may need to follow the confirm token flow or use the Drive API.
