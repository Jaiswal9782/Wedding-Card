# Varun & Aarti – Wedding Invitation

Static website: `index.html` (Royal Palace version, main link) and `invitation.html` (Hindi invitation, at /invitation). `royal.html` only redirects old links.

## Run locally
    npm install
    npm start        # http://localhost:3000

## Deploy on Railway
Option A – GitHub: push this folder to a GitHub repo → railway.com → New Project → Deploy from GitHub repo → pick the repo.
Then Settings → Networking → Generate Domain.

Option B – CLI:
    npm i -g @railway/cli
    railway login
    railway init       # create a new project
    railway up         # upload & deploy this folder
    railway domain     # get a public URL

Railway detects Node, runs `npm install` and `npm start`, and sets PORT automatically.
