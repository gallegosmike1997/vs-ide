const LLM_ENDPOINT = "http://localhost:1234";
const MODEL_NAME = "your-model-name";

export async function callLLM(prompt: string): Promise<string> {
  try {
    const res = await fetch(LLM_ENDPOINT + "/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
      })
    });

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "No response.";
  } catch (err) {
    console.error(err);
    return "LLM error.";
  }
}
