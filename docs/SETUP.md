# Phase 2 Setup Guide

## 1. Gmail OAuth Credentials

### Step 1 — Create a Google Cloud project
1. Go to https://console.cloud.google.com
2. Click **New Project**, name it anything (e.g. "Apex AI")
3. Select the project

### Step 2 — Enable Gmail API
1. In the left menu go to **APIs & Services > Library**
2. Search for **Gmail API**
3. Click it and press **Enable**

### Step 3 — Create OAuth credentials
1. Go to **APIs & Services > Credentials**
2. Click **Create Credentials > OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - User type: External
   - App name: Apex
   - Add your Gmail address as a test user
   - Scopes: add `gmail.readonly` and `gmail.send`
4. Back in Credentials: Application type = **Web application**
5. Add `http://localhost:3000` as an Authorized redirect URI
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Step 4 — Get a refresh token
Run this one-time script locally (replace the values first):

```bash
node get-gmail-token.js
```

Create `get-gmail-token.js` in the project root:

```javascript
const { google } = require("googleapis");
const http = require("http");
const url  = require("url");

const CLIENT_ID     = "YOUR_CLIENT_ID";
const CLIENT_SECRET = "YOUR_CLIENT_SECRET";
const REDIRECT_URI  = "http://localhost:3000/oauth2callback";

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"],
    prompt: "consent"
});

console.log("Open this URL in your browser:\n", authUrl);

const server = http.createServer(async (req, res) => {
    const qs   = new url.URL(req.url, "http://localhost:3000").searchParams;
    const code = qs.get("code");
    if (!code) { res.end("No code"); return; }

    const { tokens } = await oauth2.getToken(code);
    console.log("\n=== REFRESH TOKEN ===\n", tokens.refresh_token, "\n====================");
    res.end("Got token — check your terminal.");
    server.close();
});

server.listen(3000, () => console.log("Waiting on http://localhost:3000 ..."));
```

1. Run `node get-gmail-token.js`
2. Open the URL in your browser
3. Sign in with your Gmail account and allow access
4. Copy the refresh token from the terminal

### Step 5 — Add to .env
```
GMAIL_CLIENT_ID=your-client-id-here
GMAIL_CLIENT_SECRET=your-client-secret-here
GMAIL_REFRESH_TOKEN=your-refresh-token-here
```

---

## 2. Add all env vars to Render

1. Go to your Render dashboard → your service → **Environment**
2. Add each of these as individual environment variables:

| Key | Value |
|-----|-------|
| `GMAIL_CLIENT_ID` | From Google Cloud Console |
| `GMAIL_CLIENT_SECRET` | From Google Cloud Console |
| `GMAIL_REFRESH_TOKEN` | From the one-time token script |
| `ELEVENLABS_API_KEY` | Already set from Phase 1 |

3. Click **Save Changes** — Render will redeploy automatically

---

## 3. Install new dependency

Run locally:
```bash
npm install
```

This installs `googleapis` which was added to `package.json`.

---

## 4. What starts automatically

When the server starts, it initialises:
- **Email Agent** — polls Gmail every 5 minutes (only if GMAIL_CLIENT_ID is set)
- **Routine Agent** — checks every minute for due routines, creates default Morning Briefing, Evening Review, and Weekly Finance Review on first start

---

## 5. New API endpoints

### Email
- `GET /api/emails` — list processed emails
- `POST /api/emails/check` — manually trigger email check
- `POST /api/emails/:id/approve` — send the suggested reply
- `POST /api/emails/:id/reject` — mark rejected, no reply

### Finance
- `POST /api/finance/transaction` — `{ description, amount, type, date }`
- `GET /api/finance/transactions` — last 30 transactions
- `GET /api/finance/summary` — this month's spend by category vs budget
- `POST /api/finance/budget` — `{ category, amount }` — set monthly budget
- `POST /api/finance/upload-csv` — `{ csv }` — bulk import bank statement

### Routines
- `GET /api/routines` — list all routines
- `POST /api/routines` — `{ name, description, schedule_cron }`
- `PATCH /api/routines/:id` — update (e.g. toggle `{ active: false }`)
- `DELETE /api/routines/:id` — delete

---

## 6. Voice commands (via chat)

These phrases now trigger tools:
- "log expense £25 for lunch" → `log_expense`
- "what's my finance summary" → `get_finance_summary`
- "set my food budget to £300" → `set_budget`
