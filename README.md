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
