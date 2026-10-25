export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST for chat requests." });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "AI_NOT_CONFIGURED",
      message: "The secure AI backend needs its OPENAI_API_KEY environment secret."
    });
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (!message) return res.status(400).json({ error: "Please enter a message." });
  if (message.length > 1200) return res.status(413).json({ error: "Messages must be 1,200 characters or less." });

  const safeHistory = history
    .filter(item => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string")
    .slice(-10)
    .map(item => ({ role: item.role, content: item.content.slice(0, 1200) }));

  try {
    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.5",
        instructions: "You are LifeBuddy, the friendly, upbeat helper inside the LifeBridge website. Help people of different ages with learning, study plans, writing, budgeting basics, organization, brainstorming, and everyday questions. Be clear, kind, practical, and encouraging. Break overwhelming tasks into small steps. Do not claim to be a human or a licensed professional. For medical, legal, or financial decisions, give general information and encourage consulting a qualified professional. Do not ask for passwords, payment details, or unnecessary sensitive personal information. If a user seems in immediate danger, encourage contacting local emergency services or a trusted person. Keep most answers concise and easy to follow.",
        input: [...safeHistory, { role: "user", content: message }]
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error("OpenAI Responses API error:", upstream.status, data?.error?.code || "unknown");
      return res.status(502).json({ error: "LifeBuddy couldn't get an answer right now. Please try again." });
    }
    const reply = typeof data.output_text === "string" ? data.output_text.trim() : "";
    if (!reply) return res.status(502).json({ error: "LifeBuddy received an empty reply. Please try again." });
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("LifeBuddy backend request failed:", error?.message || "unknown error");
    return res.status(500).json({ error: "LifeBuddy is temporarily unavailable. Please try again." });
  }
}