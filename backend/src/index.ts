import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import Groq from "groq-sdk";
import rateLimit from "express-rate-limit";

interface AdditionalField {
  label: string;
  value: string;
}

interface ResumeRequestBody {
  name: string;
  targetRole: string;
  experience: string;
  skills: string;
  education?: string;
  projects?: string;
  achievements?: string;
  additionalFields?: AdditionalField[];
}

interface PortfolioRequestBody extends ResumeRequestBody {
  improvedResume?: string;
}

const app = express();
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a few minutes and try again.",
  },
});
app.use("/api", apiLimiter);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function normalizeText(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function normalizeAdditionalFields(input: unknown): AdditionalField[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((field) => {
      const maybeField = field as Partial<AdditionalField>;
      return {
        label: normalizeText(maybeField.label),
        value: normalizeText(maybeField.value),
      };
    })
    .filter((field) => field.label && field.value);
}

function buildAdditionalFieldsText(
  additionalFields: AdditionalField[],
): string {
  if (!additionalFields.length) return "None provided";
  return additionalFields
    .map((field) => `${field.label}: ${field.value}`)
    .join("\n");
}

function buildResumePrompt(payload: ResumeRequestBody): string {
  const additionalFieldsText = buildAdditionalFieldsText(
    payload.additionalFields || [],
  );

  return `You are an expert career coach. Rewrite this resume content to be extremely professional, achievement-focused, and ATS-friendly for a ${payload.targetRole} role.

Name: ${payload.name}
Target Role: ${payload.targetRole}
Experience: ${payload.experience}
Skills: ${payload.skills}
Education: ${payload.education || "Not provided"}
Projects: ${payload.projects || "Not provided"}
Achievements: ${payload.achievements || "Not provided"}
Additional Information:
${additionalFieldsText}

Requirements:
- Use markdown headings for sections.
- Include a concise summary.
- Include quantified bullet points where possible.
- Keep output clean and recruiter-friendly.

Return ONLY the improved resume in markdown format.`;
}

function normalizeResumePayload(input: ResumeRequestBody): ResumeRequestBody {
  return {
    name: normalizeText(input.name),
    targetRole: normalizeText(input.targetRole),
    experience: normalizeText(input.experience),
    skills: normalizeText(input.skills),
    education: normalizeText(input.education),
    projects: normalizeText(input.projects),
    achievements: normalizeText(input.achievements),
    additionalFields: normalizeAdditionalFields(input.additionalFields),
  };
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) || ""
  );
}

function splitList(text: string): string[] {
  return text
    .split(/\n|,|\||•|\*/)
    .map((item) => item.replace(/^[-\d.)\s]+/, "").trim())
    .filter(Boolean);
}

function fallbackPortfolio(payload: PortfolioRequestBody) {
  const name = normalizeText(payload.name) || "Your Name";
  const role = normalizeText(payload.targetRole) || "Professional";
  const improvedResume = normalizeText(payload.improvedResume);
  const summary =
    firstNonEmptyLine(improvedResume) ||
    firstNonEmptyLine(payload.experience) ||
    "Experienced professional delivering high-impact digital products.";

  const projects = splitList(payload.projects || payload.achievements || "")
    .slice(0, 3)
    .map((item, index) => ({
      title: `Project ${index + 1}`,
      description: item,
      highlights: [],
    }));

  const skills = splitList(payload.skills).slice(0, 12);
  const achievements = splitList(payload.achievements || improvedResume).slice(
    0,
    6,
  );
  const education = splitList(payload.education || "");
  const additionalInfo = (payload.additionalFields || []).map((field) => ({
    title: field.label,
    content: field.value,
  }));

  const emailLocal =
    name
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .trim()
      .replace(/\s+/g, ".") || "your.name";

  return {
    hero: {
      name,
      role,
      summary,
    },
    projects,
    skills,
    achievements,
    education,
    contact: {
      email: `${emailLocal}@portfolio.dev`,
      phone: "+1 (555) 010-2026",
      location: "Remote",
      links: [],
    },
    additionalInfo,
  };
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

app.post(
  "/api/resume",
  async (req: Request<{}, {}, ResumeRequestBody>, res: Response) => {
    const payload = normalizeResumePayload(req.body);
    const mode = String(req.query.mode || "json").toLowerCase();
    const streamMode = mode === "stream";

    try {
      if (streamMode) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("X-Accel-Buffering", "no");

        const stream = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: buildResumePrompt(payload),
            },
          ],
          temperature: 0.7,
          max_tokens: 900,
          stream: true,
        });

        for await (const chunk of stream) {
          const token = chunk.choices?.[0]?.delta?.content || "";
          if (token) {
            res.write(token);
          }
        }

        res.end();
        return;
      }

      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: buildResumePrompt(payload),
          },
        ],
        temperature: 0.7,
        max_tokens: 900,
      });

      res.json({ improvedResume: completion.choices[0].message.content || "" });
    } catch {
      if (!res.headersSent) {
        res.status(500).json({ error: "Something went wrong" });
      } else {
        res.end();
      }
    }
  },
);

app.post(
  "/api/portfolio",
  async (req: Request<{}, {}, PortfolioRequestBody>, res: Response) => {
    const payload = normalizeResumePayload(req.body);
    const improvedResume = normalizeText(req.body.improvedResume);

    const portfolioPrompt = `You are an expert portfolio strategist. Create JSON ONLY for a developer portfolio preview.

Input:
Name: ${payload.name}
Target Role: ${payload.targetRole}
Experience: ${payload.experience}
Skills: ${payload.skills}
Education: ${payload.education || "Not provided"}
Projects: ${payload.projects || "Not provided"}
Achievements: ${payload.achievements || "Not provided"}
Additional Information:
${buildAdditionalFieldsText(payload.additionalFields || [])}
Improved Resume Markdown:
${improvedResume || "Not provided"}

Return valid JSON with this exact top-level shape:
{
  "hero": { "name": string, "role": string, "summary": string },
  "projects": [{ "title": string, "description": string, "highlights": string[] }],
  "skills": string[],
  "achievements": string[],
  "education": string[],
  "contact": {
    "email": string,
    "phone": string,
    "location": string,
    "links": [{ "label": string, "url": string }]
  },
  "additionalInfo": [{ "title": string, "content": string }]
}

Rules:
- No markdown, no explanation, JSON only.
- Keep projects to 3-6 items.
- Keep skills to max 12.
- If data is missing, infer sensible defaults.`;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: portfolioPrompt }],
        temperature: 0.4,
        max_tokens: 1200,
      });

      const raw = completion.choices[0]?.message?.content || "";
      const parsed = tryParseJson(raw);

      if (parsed && typeof parsed === "object") {
        res.json(parsed);
        return;
      }

      res.json(fallbackPortfolio({ ...payload, improvedResume }));
    } catch {
      res.json(fallbackPortfolio({ ...payload, improvedResume }));
    }
  },
);

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`),
);
