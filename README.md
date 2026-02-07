# Video Vault

Controlled Google Drive video sharing with session-locked secure links.

## Requirements
- Node.js 22+
- Firebase project with Firestore enabled

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy env file:
   ```bash
   cp .env.example .env
   ```

3. Configure Firebase:
   - Create or select a Firebase project.
   - Enable **Firestore** in Native mode.
   - Create a **Service Account** in Google Cloud Console → IAM & Admin → Service Accounts.
   - Download the JSON key.
   - Add the JSON content to `.env` as `FIREBASE_SERVICE_ACCOUNT_JSON` (or set `FIREBASE_SERVICE_ACCOUNT_JSON_PATH`).

4. Add environment values in `.env`:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   # FIREBASE_SERVICE_ACCOUNT_JSON_PATH=/path/to/firebase-service-account.json
   APP_URL=http://localhost:3000
   ADMIN_PASSWORD=your-secure-password

   # Paste the full JSON from the service account key OR provide a path.
   GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
   # GOOGLE_SERVICE_ACCOUNT_JSON_PATH=/path/to/service-account.json
   ```

5. In Vercel, add `ADMIN_PASSWORD` in Project Settings → Environment Variables for Production/Preview/Development.

6. Run dev server:
   ```bash
   npm run dev
   ```

## Firestore Collections

- `videos`
  - `title` (string | null)
  - `drive_file_id` (string)
  - `drive_url` (string)
  - `created_at` (timestamp)

- `video_tokens`
  - `token` (string, doc id)
  - `video_id` (string)
  - `session_id` (string | null)
  - `created_at` (timestamp)

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
