# CareerCraft AI — Resume Copilot

A static HTML/CSS/JavaScript resume analyzer backed by a Vercel serverless function and Google's Gemini API.

## Local setup

1. Install Node.js (18+ recommended).
2. In this folder, run `npm install -g vercel` if Vercel CLI is not already installed.
3. Create a local `.env` file and add `GEMINI_API_KEY=your_real_key` (never commit `.env`).
4. Run `vercel dev` and open the local URL it prints.
5. Paste a resume and a job description, then click Analyze Resume.

## Deploy

1. Push this folder to a GitHub repository. `.gitignore` excludes `.env`.
2. Import the repository into Vercel.
3. In Vercel Project Settings → Environment Variables, add `GEMINI_API_KEY` with your key.
4. Redeploy, then test the live URL.

**Security:** Do not place the Gemini key in `index.html` or commit it to GitHub. The `/api/analyze` serverless endpoint reads it from the server environment.

## Model

The API endpoint currently uses `gemini-3.8-flash`. If your API key/project does not have access, change the model name in `api/analyze.js` to a model enabled for your account.
