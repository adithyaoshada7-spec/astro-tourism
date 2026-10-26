import { GoogleGenAI, Type } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("❌ Error: GEMINI_API_KEY is not defined in .env");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

async function runAutonomousAgent() {
  console.log("🤖 Autonomous Tourism Agent waking up...");

  const placesDir = path.join(process.cwd(), "src", "content", "places");
  if (!fs.existsSync(placesDir)) {
    fs.mkdirSync(placesDir, { recursive: true });
  }

  // දැනට ඇති destinations කියවා ගැනීම
  const existingFiles = fs.readdirSync(placesDir);
  const existingSlugs = existingFiles.map((file) => file.replace(/\.mdx?$/, ""));
  console.log(`📚 Existing coverage: ${existingSlugs.join(", ") || "None"}`);

  const promptRulesPath = path.join(process.cwd(), "AGENT_PROMPT.md");
  let promptRules = "";
  if (fs.existsSync(promptRulesPath)) {
    promptRules = fs.readFileSync(promptRulesPath, "utf-8");
  }

  const prompt = `
${promptRules}

Destinations already covered:
${JSON.stringify(existingSlugs)}

Pick ONE new iconic or hidden destination in Sri Lanka. Provide all frontmatter fields accurately along with the markdown article body.
`;

  console.log("🧠 Agent is deciding on a new destination and drafting content...");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            slug: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            location: { type: Type.STRING },
            district: { type: Type.STRING },
            bestTimeToVisit: { type: Type.STRING },
            category: { 
              type: Type.STRING, 
              enum: ["Beach", "Cultural", "Nature", "Adventure", "Historical"] 
            },
            heroImage: { type: Type.STRING },
            rating: { type: Type.NUMBER },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            keyHighlights: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            overview: { type: Type.STRING },
            thingsToDo: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            localTips: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
          },
          required: [
            "slug", "title", "description", "location", "district",
            "bestTimeToVisit", "category", "heroImage", "rating",
            "tags", "keyHighlights", "overview", "thingsToDo", "localTips"
          ],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");

    // Markdown file එක script එකෙන්ම පිළිවෙළට assemble කිරීම
    const mdContent = `---
title: "${data.title.replace(/"/g, '\\"')}"
description: "${data.description.replace(/"/g, '\\"')}"
location: "${data.location}"
district: "${data.district}"
bestTimeToVisit: "${data.bestTimeToVisit}"
category: "${data.category}"
heroImage: "${data.heroImage}"
rating: ${data.rating}
tags:
${data.tags.map((t: string) => `  - "${t}"`).join("\n")}
keyHighlights:
${data.keyHighlights.map((h: string) => `  - "${h.replace(/"/g, '\\"')}"`).join("\n")}
---

## Overview
${data.overview}

## Top Things to Do & See
${data.thingsToDo.map((item: string) => `- ${item}`).join("\n")}

## Insider Local Travel Tips
${data.localTips.map((tip: string) => `- ${tip}`).join("\n")}
`;

    const cleanSlug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    const targetFilePath = path.join(placesDir, `${cleanSlug}.md`);

    fs.writeFileSync(targetFilePath, mdContent, "utf-8");

    console.log(`✅ Success! Agent task completed.`);
    console.log(`📍 Created: src/content/places/${cleanSlug}.md`);
  } catch (error) {
    console.error("❌ Agent task failed:", error);
  }
}

runAutonomousAgent();
