import "dotenv/config";
import cors from "cors";
import express, { Request, Response } from "express";
import Groq from "groq-sdk";

interface ResumeRequestBody {
  name: string;
  targetRole: string;
  experience: string;
  skills: string;
}

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post(
  "/api/resume",
  async (req: Request<{}, {}, ResumeRequestBody>, res: Response) => {
    const { name, targetRole, experience, skills } = req.body;

    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "user",
            content: `You are an expert career coach. Rewrite this resume content to be extremely professional, achievement-focused, and ATS-friendly for a ${targetRole} role.

Name: ${name}
Experience: ${experience}
Skills: ${skills}

Return ONLY the improved summary + bullet points in clean markdown format.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      res.json({ improvedResume: completion.choices[0].message.content });
    } catch {
      res.status(500).json({ error: "Something went wrong" });
    }
  },
);

const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () =>
  console.log(`Backend running on http://localhost:${PORT}`),
);
