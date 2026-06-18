# Endiless🚫Kemmyoonity

Private, mobile-first World Cup score prediction game.

## Run locally

```bash
npm install
npm run start
```

The current build is a polished interactive product prototype. Production data and access control are designed for Supabase; never ship personalized player codes in browser source or environment variables prefixed with `VITE_`.

## Core rules

- Exact 90-minute score: 1 point.
- One submission plus up to three edits.
- Predictions lock 15 minutes before kickoff and remain private until kickoff.
- Missed matches count toward shame/streak statistics.
- Weekly periods run Sunday 3:00 PM IST to Sunday 2:59:59 PM IST.
- Only active players appear in public statistics.
