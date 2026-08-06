# What is Generative and Agentic AI ?

Generative AI means: you give a model some input (text, an image, whatever), and it generates new content in response — a paragraph, an answer, a summary. That's exactly what Gemini did in ask.js: you gave it a question and some context, it generated an answer. One request in, one response out. It never "decided" anything about what to do — the code always ran the same fixed sequence (embed → search → generate), regardless of what the question was.
Agentic AI is a step beyond that: instead of just generating content, the model is given a set of tools (actions it's allowed to take) and some goal, and it decides for itself — at runtime, based on what it's seeing — which tools to use, in what order, possibly looping back and trying something else based on what it learns along the way. The "agent" part refers to the model acting with a degree of autonomy over its own next steps, rather than following a script you wrote in advance.

Every agentic system is built on top of a generative model — agentic is a pattern of use, not a different kind of model.

# What is LLM ?
LLM (Large Language Model) is the general category of model — one trained on huge amounts of text to predict and generate language. It's not a specific product; it's the type of thing. Claude (Anthropic's model) and Gemini (Google's model) are both specific LLMs — two different companies' implementations of the same general category,

# Guardrails

They're about limiting the blast radius of any single mistake, and preserving your ability to inspect and override it.