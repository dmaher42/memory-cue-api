export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://memory-cue.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "https://memory-cue.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Invalid text input" });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API key not configured" });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        store: false,
        input: [
          {
            role: "system",
            content:
              "You are a structured data parser. Return only valid JSON. Extract: type (footy_drill, netball_note, reflection, reminder, teaching_note, general_note), title (max 60 chars), tags (array of lowercase keywords), reminderDate (ISO string if mentioned, otherwise null). If unsure, use general_note."
          },
          {
            role: "user",
            content: text
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "memory_cue_parse",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                type: {
                  type: "string",
                  enum: [
                    "footy_drill",
                    "netball_note",
                    "reflection",
                    "reminder",
                    "teaching_note",
                    "general_note"
                  ]
                },
                title: { type: "string" },
                tags: {
                  type: "array",
                  items: { type: "string" }
                },
                reminderDate: {
                  type: ["string", "null"]
                }
              },
              required: ["type", "title", "tags", "reminderDate"]
            }
          }
        }
      })
    });

    const data = await response.json();
    const parsed = data.output[0].content[0].json;

    return res.status(200).json(parsed);

  } catch (error) {
    console.error("OpenAI Parse Error:", error);
    return res.status(500).json({ error: "AI parsing failed" });
  }
}
