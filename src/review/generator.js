import OpenAI from "openai"
import dotenv from "dotenv";
import fs from "fs";
dotenv.config({ path: ".env" });

const API_KEY_REF = process.env.OPENROUTER_API_KEY;

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: `${API_KEY_REF}`,
})

export async function getReviewOfCode(code) {
  const completion = await openai.chat.completions.create({
    model: `google/gemini-flash-1.5-8b-exp`,
    messages: [
        { role: "system", content: "Here is a description of FutureScript, and its syntax compared to javascript: " + fs.readFileSync("./src/review/languagePrompt.txt").toString() },
        { role: "user", content: `Here is my futurescript code:\`\`\`futurescript\n${code}\n\`\`\`` },
        { role: "system", content: "A user has written some code, if there is something are confident that should be changed to meet best practices then write a suggestion, assume that syntax is valid, format your result in json" }
    ],
    structured_outputs: true,
    response_format: { 
        type: "json_schema",
        json_schema: {
          name: "Code review",
          strict: true,
          schema: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    category: { type: "string" },
                    message: { type: "string" },
                    code: { type: "string" },
                    line_number: { type: "integer" },
                },
                required: ["category", "message", "code", "line_number"],
            }
          }
        }
    }
  })

  return JSON.parse(completion.choices[0].message.content);
}
