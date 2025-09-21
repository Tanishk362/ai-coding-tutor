import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper: AI Teacher personality
function sys(lang: "en" | "hi") {
  if (lang === "hi") {
    return `आपका नाम Tarik है – आप Tarik Academy, Hisar के  Tarik Professor हो।  
आपका काम Rishabh (एक beginner student) को websites और apps बनाना सिखाना है **बिना coding knowledge के**।  

🎯 Goal:  
Rishabh को step-by-step सबसे आसान तरीके से सिखाओ, जैसे एक दोस्ताना teacher।  

🧠 Instructions:  
1. हमेशा Rishabh को friendly तरीके से greet करो और motivate करो।  
2. उससे पूछो कि वो किस type का project बनाना चाहता है (जैसे portfolio, blog, shop, chatbot, booking site, आदि)।  
3. उसके answer पर 2–3 simple no-code tools suggest करो (जैसे Webflow, Glide, Bubble, Framer, Hostinger Horizons)।  
4. फिर उसे guide करो step by step:  
   - Template चुनना  
   - Design customize करना  
   - Content (text, images, links) add करना  
   - Features connect करना (form, payment, chatbot, आदि)  
   - Website publish करना  
5. Technical words मत use करो (जैसे HTML, API, Database) जब तक Rishabh खुद ना पूछे। हमेशा plain language में समझाओ।  
6. एक friendly, patient teacher बनो जो चाहता है Rishabh सफल हो। Mistake होने पर भी encourage करो।  

📦 Project Output:  
अंत में Rishabh को उसकी खुद की website create करने में guide करो (dummy preview link दो), और बताओ कैसे improve करना है।  

✨ Tone:  
- Friendly, simple, easy Hinglish  
- Emojis और examples use करो  
- हमेशा motivate और support करो।  

🎓 Reminder:  
Rishabh, Tarik Academy का student है और उसका goal है बिना coding के अपनी dream project बनाना। तुम उसे creator feel कराओ।`;
  }
  return `Your name is Tarik – an Tarik Professor from Tarik Academy in Hisar.  
Your job is to help a complete beginner named Rishabh learn how to build websites and apps *without any coding knowledge*.  

🎯 Goal:  
Teach Rishabh step-by-step in the easiest possible way — like a friendly teacher. Make him feel confident even if he knows nothing about coding.  

🧠 Instructions:  
1. Greet Rishabh warmly and motivate him.  
2. Ask what type of project he wants to build (e.g., personal portfolio, blog, shop, AI chatbot, booking site, etc.).  
3. Based on his answer, suggest 2–3 examples of no-code tools he can use (like Webflow, Glide, Bubble, Framer, or Hostinger Horizons).  
4. Guide him through each step clearly:  
   - Choosing a template  
   - Customizing design  
   - Adding content (text, images, links)  
   - Connecting features (form, payment, chatbot, etc.)  
   - Publishing the website  
5. Do *not* use technical terms like “HTML”, “API”, or “database” unless Rishabh asks — always explain in plain English.  
6. Speak like a patient, friendly teacher who wants Rishabh to succeed.  

📦 Project Output:  
At the end, guide him to create his *own separate website* under his student profile. Give a preview link (dummy for now), and explain how to keep improving it.  

✨ Tone:  
- Friendly, kind, simple  
- Use emojis and examples to make learning fun  
- Always encourage Rishabh even if he makes a mistake  

🎓 Reminder:  
Rishabh is a student of Tarik Academy and his goal is to build his dream project without code. Help him feel like a creator!`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { mode = "chat", lang = "en" } = body as {
      mode: string;
      lang: "en" | "hi";
    };

    // ---------- Normal chat ----------
    if (mode === "chat") {
      const { messages } = body as {
        messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
      };
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: sys(lang) }, ...messages],
      });
      const reply = completion.choices[0]?.message?.content || "";
      return NextResponse.json({ reply });
    }

    // ---------- Explain ----------
    if (mode === "explain") {
      const { idea } = body as { idea: string };
      const userPrompt =
        lang === "hi"
          ? `इस आइडिया को आसान Hinglish roadmap में समझाओ:\n${idea}`
          : `Explain this idea as a roadmap in very simple Hinglish:\n${idea}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys(lang) },
          { role: "user", content: userPrompt },
        ],
      });
      const reply = completion.choices[0]?.message?.content || "";
      return NextResponse.json({ reply });
    }

    // ---------- Quiz start ----------
    if (mode === "quiz_start") {
      const { topic = "basics", level = "easy" } = body as {
        topic?: string;
        level?: string;
      };
      const system = `${sys(lang)} Only JSON in your reply.`;
      const user =
        lang === "hi"
          ? `एक छोटा practice task दो "${topic}" पर (level: ${level}). 
JSON लौटाओ: { "question": string, "hints": string[] }`
          : `Give one small practice task on "${topic}" (level: ${level}). 
Return JSON: { "question": string, "hints": string[] }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      let obj: any = {};
      try {
        obj = JSON.parse(completion.choices[0]?.message?.content || "{}");
      } catch {
        obj = { question: "Error generating task.", hints: [] };
      }
      return NextResponse.json({ question: obj.question, hints: obj.hints || [] });
    }

    // ---------- Quiz check ----------
    if (mode === "quiz_check") {
      const { question, userAnswer } = body as { question: string; userAnswer: string };
      const system = `${sys(lang)} Only JSON in your reply.`;
      const user =
        lang === "hi"
          ? `Question: ${question}\nAnswer: ${userAnswer}\nJSON लौटाओ: { "correct": boolean, "feedback": string }`
          : `Question: ${question}\nAnswer: ${userAnswer}\nReturn JSON: { "correct": boolean, "feedback": string }`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });

      let obj: any = {};
      try {
        obj = JSON.parse(completion.choices[0]?.message?.content || "{}");
      } catch {
        obj = { correct: false, feedback: "Could not evaluate." };
      }
      return NextResponse.json({ correct: !!obj.correct, feedback: obj.feedback || "" });
    }

    // ---------- Daily roadmap ----------
    if (mode === "daily") {
      const { progress = 1 } = body as { progress: number };
      const userPrompt =
        lang === "hi"
          ? `छात्र अभी Day ${progress} पर है। अगला roadmap दो Hinglish में।`
          : `The student is on Day ${progress}. Give the next roadmap in Hinglish.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys(lang) },
          { role: "user", content: userPrompt },
        ],
      });
      const reply = completion.choices[0]?.message?.content || "";
      return NextResponse.json({ reply });
    }

    // ---------- NEW: Website roadmap ----------
    if (mode === "roadmap") {
      const { project } = body as { project: string }; // e.g. "ChatGPT website"
      const userPrompt =
        lang === "hi"
          ? `छात्र बोलता है: "${project}". अब इस website को banane ka step-by-step roadmap do (Day 1, Day 2 ...). Hinglish language mein, छोटे tasks batao.`
          : `Student says: "${project}". Create a daily roadmap (Day 1, Day 2, ...) to build this website. Use very simple Hinglish and small tasks.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: sys(lang) },
          { role: "user", content: userPrompt },
        ],
      });
      const reply = completion.choices[0]?.message?.content || "";
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Unknown mode." }, { status: 400 });
  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ reply: "Server error." }, { status: 500 });
  }
}
