export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for chat requests." });
  }

  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const allowedModes = ["tutor", "socratic", "explain", "quiz", "study"];
  const tutorMode = allowedModes.includes(req.body?.mode) ? req.body.mode : "tutor";

  if (!message) return res.status(400).json({ error: "Please enter a message." });
  if (message.length > 1200) return res.status(413).json({ error: "Messages must be 1,200 characters or less." });
  if (history.length > 30) return res.status(413).json({ error: "Please start a fresh chat. Too much conversation history was sent." });

  const safeHistory = history
    .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
    .slice(-8)
    .map(item => ({ role: item.role, content: item.content.trim().slice(0, 1000) }))
    .filter(item => item.content.length > 0);

  const totalContextLength = message.length + safeHistory.reduce((total, item) => total + item.content.length, 0);
  if (totalContextLength > 8500) {
    return res.status(413).json({ error: "This conversation is too long to send. Start a fresh chat and try again." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI_NOT_CONFIGURED",
      message: "The secure AI backend needs its OPENAI_API_KEY environment secret."
    });
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        max_output_tokens: 900,
        instructions: [
          "You are LifeBuddy, the friendly learning coach inside LifeBridge. Help the learner understand and make progress, not just collect answers.",
          "Use clear, natural language and short paragraphs. Adapt to the learner's apparent age and knowledge without talking down to them. Explain unfamiliar words. Use numbered steps only when a sequence helps.",
          "For homework, first identify what skill the question is testing. Teach the method, then guide the learner through the next step. Do not automatically write a complete assignment for them. If they explicitly ask for a worked example, provide one and explain why it works.",
          "For math, show the operations clearly, keep units, and check the result when useful. For science and history, explain cause and effect and separate evidence from opinion. For writing, help brainstorm, outline, and revise while keeping the learner's own voice.",
          "After a substantial explanation, ask one brief check-for-understanding question. If the learner is stuck or makes a mistake, respond kindly, explain the likely misunderstanding, and offer a smaller example.",
          "Selected mode: " + tutorMode + ". " + ({
            tutor: "Teach step by step. Give a useful first hint, then invite the learner to try the next step before revealing the full solution.",
            socratic: "Use a guiding conversation. Ask exactly one focused question at a time. Do not reveal the final answer unless the learner asks or has made a genuine attempt.",
            explain: "Give a complete, organized explanation with a worked example, then mention one common mistake.",
            quiz: "Run an interactive quiz one question at a time. Wait for the learner's answer before evaluating it. Explain the result and adjust the next question.",
            study: "Build a realistic study plan with short sessions, active recall, breaks, and spaced review. Ask for missing constraints only when needed."
          })[tutorMode],
          "Stay in the selected mode until the learner changes it. Also help with everyday planning and general questions. Be encouraging without excessive praise. Never invent sources, quotations, facts, or curriculum standards.",
          "Do not claim to be human or a licensed professional. For medical, legal, or financial decisions, provide general information and encourage consulting a qualified professional. Do not ask for passwords, payment details, or unnecessary sensitive information. If the learner appears to be in immediate danger, encourage contacting local emergency services or a trusted person."
        ].join(" "),
        input: [...safeHistory, { role: "user", content: message }]
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const upstreamCode = typeof data?.error?.code === "string" ? data.error.code : "unknown";
      console.error("OpenAI Responses API error:", upstream.status, upstreamCode);
      if (upstream.status === 401 || upstreamCode === "invalid_api_key") {
        return res.status(503).json({
          error: "OPENAI_INVALID_API_KEY",
          message: "LifeBuddy's OpenAI API key is being rejected. Update OPENAI_API_KEY in Vercel, then redeploy."
        });
      }
      if (upstream.status === 429 && (upstreamCode === "insufficient_quota" || upstreamCode === "billing_hard_limit_reached")) {
        return res.status(503).json({
          error: "OPENAI_BILLING_LIMIT",
          message: "The OpenAI API project has reached its usage or billing limit. Check API billing and usage."
        });
      }
      if (upstreamCode === "model_not_found" || upstreamCode === "unsupported_model") {
        return res.status(503).json({
          error: "OPENAI_MODEL_UNAVAILABLE",
          message: "The configured OpenAI model is unavailable to this API project. Check OPENAI_MODEL in Vercel."
        });
      }
      if (upstream.status === 429) {
        return res.status(503).json({
          error: "OPENAI_RATE_LIMIT",
          message: "LifeBuddy is receiving too many requests. Wait a moment and try again."
        });
      }
      return res.status(502).json({
        error: "OPENAI_UPSTREAM_ERROR",
        message: "LifeBuddy reached OpenAI, but the service returned an error. Check the Vercel runtime logs."
      });
    }
    const reply = typeof data.output_text === "string"
      ? data.output_text.trim()
      : (Array.isArray(data.output)
        ? data.output.flatMap(item => Array.isArray(item.content) ? item.content : [])
            .filter(item => item?.type === "output_text" && typeof item.text === "string")
            .map(item => item.text)
            .join("\\n")
            .trim()
        : "");
    if (!reply) return res.status(502).json({ error: "LifeBuddy received an empty reply. Please try again." });
    return res.status(200).json({ reply });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    console.error("LifeBuddy backend request failed:", timedOut ? "OpenAI request timed out" : (error?.message || "unknown error"));
    return res.status(timedOut ? 504 : 500).json({
      error: timedOut ? "OPENAI_TIMEOUT" : "LIFEBUDDY_SERVER_ERROR",
      message: timedOut
        ? "LifeBuddy's AI request timed out. Please try again."
        : "LifeBuddy hit a server error. Check the Vercel runtime logs."
    });
  }
}