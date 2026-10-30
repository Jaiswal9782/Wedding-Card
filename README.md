# Varun & Aarti – Wedding Invitation

Static website: `index.html` (Royal Palace version, main link) and `invitation.html` (Hindi invitation, at /invitation). `royal.html` only redirects old links.

## Run locally
    npm install
    npm start        # http://localhost:3000

## Deploy (Vercel)
The Vercel project `wedding-card` is connected to the GitHub repo `Jaiswal9782/Wedding-Card`.
Every push to `main` deploys to production automatically – nothing else to run.

    bash ~/Development/wedding-tools/push.sh "message"   # commit + push → deploys

`autopush.sh` (launchd, every minute) also pushes any pending change on its own.
Routing (clean URLs, `/royal` → `/`) lives in `vercel.json`.
