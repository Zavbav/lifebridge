# LifeBridge

LifeBridge is a friendly, colorful everyday-help website with learning tools, a budget helper, a to-do list, unit conversions, daily challenges, XP, and LifeBuddy AI.

## Run the site with the AI chat

GitHub Pages can host the static front end, but it cannot run the `/api/chat` serverless function. To enable real AI responses, deploy this repository to Vercel (or another compatible serverless host).

### Vercel setup

1. Sign in to [Vercel](https://vercel.com/) and import the GitHub repository `Zavbav/lifebridge`.
2. In the Vercel project, open **Settings → Environment Variables**.
3. Add `OPENAI_API_KEY` and paste your own OpenAI API key as its value. Keep it private; never add the key to `index.html`, GitHub, or any public file.
4. Optionally add `OPENAI_MODEL` with a model available to your API project. If omitted, the endpoint defaults to `gpt-5.5`.
5. Add `SUPABASE_URL` (your Supabase Project URL) and `SUPABASE_ANON_KEY` (the publishable key, or legacy anon/public key). These two values are designed for browser use; never use a Supabase secret/service-role key here.
6. Redeploy the project after saving the environment variables.
7. Open the Vercel deployment URL and test LifeBuddy and account sign-in. The chat API runs at `/api/chat`; public Supabase configuration is served by `/api/config` on that deployment.

**Important:** The existing GitHub Pages address will not execute the serverless API. For live AI chat, use the Vercel-hosted site (you can later connect a custom domain). OpenAI API usage may incur charges and requires API access/billing. Keep an eye on usage limits.

## Security notes

- The API key is read only on the server from `OPENAI_API_KEY`.
- The endpoint accepts POST requests only and limits each message to 1,200 characters.
- Avoid entering passwords, payment information, or other sensitive personal information into the chatbot.


## Enable real sign-up and sign-in

LifeBridge uses [Supabase Auth](https://supabase.com/auth) so passwords are handled by a dedicated authentication service rather than stored by the website.

1. Create a free project at [Supabase](https://supabase.com/dashboard).
2. In the Supabase dashboard, open **Project Settings → API** (or **Data API / API Keys**, depending on the dashboard version). Copy the **Project URL** and the **publishable key** (or legacy **anon/public** key). Never use a secret or service-role key in the website.
3. In Vercel, add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under **Settings → Environment Variables**. Use the Supabase Project URL and publishable key (or legacy anon/public key). Do not use a secret/service-role key.
4. In Supabase, open **Authentication → URL Configuration**. Set the Site URL to your deployed LifeBridge URL and add that URL to the allowed redirect URLs.
5. In **Authentication → Providers → Email**, enable email/password sign-in. For safer new-account verification, leave email confirmation enabled.
6. Redeploy the Vercel project after adding the variables.
7. Test **Sign up** with an email you can access, click the confirmation link if requested, and then test **Sign in**.

The account page disables submission until the secure configuration route returns valid Supabase settings. Supabase handles passwords; the site does not store them itself. The account feature provides email/password registration, sign-in, session persistence, sign-out, profile creation, and account-level progress backup/sync through the existing `user_progress` table.


## Latest LifeBridge upgrades

- Custom purple-and-mint bridge logo, used as the site mark and SVG favicon.
- Search/social preview metadata for clearer sharing.
- **Focus & Goals** section with a 25-minute focus timer, pause/reset controls, a daily habit checklist, progress bar, and editable goal board.
- Local browser persistence for goals, habit checks, and completed focus sessions. Habits reset on a new local date; the timer itself is not intended to run in the background.
- Responsive cards and mobile layouts, accessible status messages, and reduced-motion-aware styling.
- A closing brand description explaining the site's purpose, local-data behavior, and general-guidance limitations.

### Important current limitations

- Supabase authentication and cloud progress sync require `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel, plus the correct allowed redirect URLs in Supabase. Never put a Supabase secret/service-role key in front-end code.
- Browser keys beginning with `lifebridge` are backed up to the signed-in user's `user_progress.stats` record. This provides account-level backup and basic new-device restoration, not conflict resolution for simultaneous edits on multiple devices.
- LifeBuddy requires a separate server-side `OPENAI_API_KEY` in Vercel. OpenAI API use may incur charges.


### Calendar & date planner

- Month-view calendar with previous/next month navigation and a Today shortcut.
- Select any date to see scheduled items, then add an event, school task, birthday, deadline, or reminder with optional time and notes.
- Preloaded major U.S. federal holidays for 2025–2030, including observed dates for holidays that fall on weekends.
- Events are stored in this browser's local storage and can be deleted. They are not currently synced to a signed-in account or across devices.


- Also includes major Catholic liturgical dates and feast days, such as Ash Wednesday, Palm Sunday, Holy Thursday, Good Friday, Easter, Pentecost, All Saints’ Day, All Souls’ Day, the Assumption, the Immaculate Conception, and Our Lady of Guadalupe. Movable dates are calculated from Easter. Local observance can vary by country and diocese; verify obligations and Mass schedules with your parish.



## Futuristic LifeBridge command center

The home page now uses a futuristic dark interface with neon mint/purple accents, glass-like panels, a subtle grid, and responsive layouts. The new **Personal Command Center** includes:

- A daily mission list with add, complete, and delete actions.
- Live counts for open missions, completed missions, and progress percentage.
- Quick links to the calendar, organizer, focus timer, and Skill Quest.
- Browser-local persistence for missions. Tasks are not synced across browsers or devices.
- Reduced-motion support remains enabled for users who prefer less animation.

The existing LifeBuddy, calendar, learning tools, goals, habits, focus timer, budget helper, and Skill Quest remain part of the site. Supabase account syncing is activated when the Vercel environment variables described above are configured.


## Cloud accounts and cross-device progress

LifeBridge now loads its public Supabase connection settings from the server route `/api/config`, rather than keeping project settings as placeholders in the HTML. Configure these Vercel environment variables:

- `SUPABASE_URL`: Supabase Project URL.
- `SUPABASE_ANON_KEY`: Supabase publishable key (or legacy anon/public key).

Never put a Supabase secret/service-role key in browser code or these public settings. The existing row-level security policies restrict profiles and progress to the signed-in user. After sign-in, LifeBridge creates/updates the user's profile and syncs browser-local keys beginning with `lifebridge` into that user's `user_progress.stats` record. On a new device, cloud-saved values are restored when no local value exists. If both local and cloud values exist, local values are preserved and then synced. This is a simple account-level backup/sync foundation; it is not a conflict-resolution system for simultaneous edits on multiple devices.
