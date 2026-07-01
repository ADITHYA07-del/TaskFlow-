# TaskFlow

TaskFlow is a Node.js + Express project that serves static front-end pages and connects to Supabase for user and task management.

## Run locally

1. Copy `.env.example` to `.env`
2. Set `SUPABASE_URL` and `SUPABASE_KEY`
3. Install dependencies: `npm install`
4. Start the server: `npm start`

## Railway deployment

- Railway uses `Procfile` to start the app via `npm start`
- Ensure `PORT` is provided automatically by Railway
- Set `SUPABASE_URL` and `SUPABASE_KEY` as Railway environment variables

## Notes

- `public/` contains static HTML, CSS, and client-side JS
- `server.js` serves static files and provides API endpoints
- `db.js` initializes Supabase client from env vars
