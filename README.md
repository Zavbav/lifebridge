# LifeBridge

LifeBridge is a friendly, colorful everyday-help website with learning tools, a budget helper, a to-do list, unit conversions, daily challenges, XP, and LifeBuddy AI.

## Run the site with the AI chat

GitHub Pages can host the static front end, but it cannot run the `/api/chat` serverless function. To enable real AI responses, deploy this repository to Vercel (or another compatible serverless host).

### Vercel setup

1. Sign in to [Vercel](https://vercel.com/) and import the GitHub repository `Zavbav/lifebridge`.
2. In the Vercel project, open **Settings → Environment Variables**.
3. Add `OPENAI_API_KEY` and paste your own OpenAI API key as its value. Keep it private; never add the key to `index.html`, GitHub, or any public file.
4. Optionally add `OPENAI_MODEL` with a model available to your API project. If omitted, the endpoint defaults to `gpt-5.5`.
5. Redeploy the project after saving the environment variable.
6. Open the Vercel deployment URL and test LifeBuddy. The chat API runs at `/api/chat` on that deployment.

**Important:** The existing GitHub Pages address will not execute the serverless API. For live AI chat, use the Vercel-hosted site (you can later connect a custom domain). OpenAI API usage may incur charges and requires API access/billing. Keep an eye on usage limits.

## Security notes

- The API key is read only on the server from `OPENAI_API_KEY`.
- The endpoint accepts POST requests only and limits each message to 1,200 characters.
- Avoid entering passwords, payment information, or other sensitive personal information into the chatbot.


## Enable real sign-up and sign-in

LifeBridge uses [Supabase Auth](https://supabase.com/auth) so passwords are handled by a dedicated authentication service rather than stored by the website.

1. Create a free project at [Supabase](https://supabase.com/dashboard).
2. In the Supabase dashboard, open **Project Settings → API** (or **Data API / API Keys**, depending on the dashboard version). Copy the **Project URL** and the **publishable key** (or legacy **anon/public** key). Never use a secret or service-role key in the website.
3. Open `index.html` in this GitHub repository and find:
   ```js
   const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
   ```
   Replace those two placeholder values with the Project URL and publishable/anon key from your own Supabase project. These are intended for browser use; keep secret/service-role keys private.
4. In Supabase, open **Authentication → URL Configuration**. Set the Site URL to `https://lifebridge-alpha.vercel.app` and add that same URL to the allowed redirect URLs.
5. In **Authentication → Providers → Email**, enable email/password sign-in. For safer new-account verification, leave email confirmation enabled.
6. Commit the change to GitHub. Vercel should redeploy the site automatically if it is connected to this repository's `main` branch.
7. Test **Sign up** with an email you can access, click the confirmation link if requested, and then test **Sign in**.

The page disables the account submit button until the Supabase settings are supplied. Supabase handles passwords; the site does not store them itself. The current account feature provides email/password registration, sign-in, session persistence, and sign-out. It does not yet create a user profile database or sync learning progress across devices.


## Latest LifeBridge upgrades

- Custom purple-and-mint bridge logo, used as the site mark and SVG favicon.
- Search/social preview metadata for clearer sharing.
- **Focus & Goals** section with a 25-minute focus timer, pause/reset controls, a daily habit checklist, progress bar, and editable goal board.
- Local browser persistence for goals, habit checks, and completed focus sessions. Habits reset on a new local date; the timer itself is not intended to run in the background.
- Responsive cards and mobile layouts, accessible status messages, and reduced-motion-aware styling.
- A closing brand description explaining the site's purpose, local-data behavior, and general-guidance limitations.

### Important current limitations

- Supabase authentication will only work after you add your own Supabase Project URL and publishable/anon key to `index.html`, and configure allowed redirect URLs in Supabase. Never put a Supabase secret/service-role key in front-end code.
- Goals, habits, focus sessions, the to-do list, and other browser-only features are not currently synced across devices or attached to user accounts.
- This is a static website plus the existing Vercel AI endpoint; the new tools do not require a new database.


### Calendar & date planner

- Month-view calendar with previous/next month navigation and a Today shortcut.
- Select any date to see scheduled items, then add an event, school task, birthday, deadline, or reminder with optional time and notes.
- Preloaded major U.S. federal holidays for 2025–2030, including observed dates for holidays that fall on weekends.
- Events are stored in this browser's local storage and can be deleted. They are not currently synced to a signed-in account or across devices.
