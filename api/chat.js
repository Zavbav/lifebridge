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

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: "AI_NOT_CONFIGURED",
      message: "LifeBuddy needs its free Gemini API key. Add GEMINI_API_KEY to the Vercel Production environment."
    });
  }

  const modeInstructions = {
    tutor: "Teach step by step. Give a useful first hint, then invite the learner to try the next step before revealing the full solution.",
    socratic: "Use a guiding conversation. Ask exactly one focused question at a time. Do not reveal the final answer unless the learner asks or has made a genuine attempt.",
    explain: "Give a complete, organized explanation with a worked example, then mention one common mistake.",
    quiz: "Run an interactive quiz one question at a time. Wait for the learner's answer before evaluating it. Explain the result and adjust the next question.",
    study: "Build a realistic study plan with short sessions, active recall, breaks, and spaced review. Ask for missing constraints only when needed."
  };

  const systemInstruction = [
    "You are LifeBuddy, the friendly learning coach inside LifeBridge. Help the learner understand and make progress, not just collect answers.",
    "Use clear, natural language and short paragraphs. Adapt to the learner's apparent age and knowledge without talking down to them. Explain unfamiliar words. Use numbered steps only when a sequence helps.",
    "For homework, first identify what skill the question is testing. Teach the method, then guide the learner through the next step. Do not automatically write a complete assignment for them. If they explicitly ask for a worked example, provide one and explain why it works.",
    "For math, show the operations clearly, keep units, and check the result when useful. For science and history, explain cause and effect and separate evidence from opinion. For writing, help brainstorm, outline, and revise while keeping the learner's own voice.",
    "After a substantial explanation, ask one brief check-for-understanding question. If the learner is stuck or makes a mistake, respond kindly, explain the likely misunderstanding, and offer a smaller example.",
    "Selected mode: " + tutorMode + ". " + modeInstructions[tutorMode],
    "Stay in the selected mode until the learner changes it. Also help with everyday planning and general questions. Be encouraging without excessive praise. Never invent sources, quotations, facts, or curriculum standards.",
    "Do not claim to be human or a licensed professional. For medical, legal, or financial decisions, provide general information and encourage consulting a qualified professional. Do not ask for passwords, payment details, or unnecessary sensitive information. If the learner appears to be in immediate danger, encourage contacting local emergency services or a trusted person."
  ].join(" ");

  try {
    const contents = [
      ...safeHistory.map(item => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.content }]
      })),
      { role: "user", parts: [{ text: message }] }
    ];

    const upstream = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json"
        },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { maxOutputTokens: 900, temperature: 0.7 }
        })
      }
    );

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const upstreamMessage = typeof data?.error?.message === "string" ? data.error.message : "unknown";
      const upstreamStatus = upstream.status;
      console.error("Gemini API error:", upstreamStatus, upstreamMessage.slice(0, 240));

      if (upstreamStatus === 400 || upstreamStatus === 403) {
        return res.status(503).json({
          error: "GEMINI_KEY_OR_ACCESS",
          message: "Gemini did not accept this key or model request. Check that the key is from Google AI Studio and Gemini API access is enabled."
        });
      }
      if (upstreamStatus === 429) {
        return res.status(503).json({
          error: "GEMINI_FREE_LIMIT",
          message: "LifeBuddy has reached the current free Gemini usage limit. Wait for the limit to reset and try again."
        });
      }
      return res.status(502).json({
        error: "GEMINI_UPSTREAM_ERROR",
        message: "LifeBuddy reached Gemini, but the service returned an error. Check the Vercel runtime logs."
      });
    }

    const reply = Array.isArray(data?.candidates?.[0]?.content?.parts)
      ? data.candidates[0].content.parts
          .filter(part => typeof part.text === "string")
          .map(part => part.text)
          .join("\n")
          .trim()
      : "";

    if (!reply) {
      return res.status(502).json({
        error: "EMPTY_GEMINI_REPLY",
        message: "LifeBuddy did not receive a text reply. Please try again."
      });
    }
    return res.status(200).json({ reply });
  } catch (error) {
    const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
    console.error("LifeBuddy Gemini request failed:", timedOut ? "request timed out" : (error?.message || "unknown error"));
    return res.status(timedOut ? 504 : 500).json({
      error: timedOut ? "GEMINI_TIMEOUT" : "LIFEBUDDY_SERVER_ERROR",
      message: timedOut
        ? "LifeBuddy's free AI request timed out. Please try again."
        : "LifeBuddy hit a server error. Check the Vercel runtime logs."
    });
  }
}
