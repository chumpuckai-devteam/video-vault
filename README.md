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

   # Paste the full JSON from the service account key OR provide a path.
   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   # GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/path/to/service-account.json
   ```

5. Run dev server:
   ```bash
   npm run dev
   ```

## Google Drive Service Account Setup

1. Go to Google Cloud Console → APIs & Services.
2. Create a new **Service Account**.
3. Enable **Google Drive API** for the project.
4. Download the JSON key for the service account.
5. Share the Drive folder (or files) with the service account **client_email**.
6. Add the JSON content to Vercel (or local `.env`) as `GOOGLE_SERVICE_ACCOUNT_JSON`.

## Admin Dashboard (User A)
- Visit: `http://localhost:3000/admin`
- Service account status shows **Connected** when configured
- Browse folders shared with the service account and pick a video (or paste a Drive link manually)
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

## Notes / Drive Access
- The service account only sees files/folders explicitly shared with it.
- Streaming uses Drive API with range support.

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
