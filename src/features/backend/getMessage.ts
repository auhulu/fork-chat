import { GoogleGenAI } from "@google/genai";
import { Message } from "../../types/Message";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const getMessage = async (messages: Message[]): Promise<Message> => {
	const system =
		messages[0].role === "system" ? messages[0].content : undefined;
	const history = messages
		.filter((message) => message.role !== "system")
		.map((message) => ({
			role: message.role === "user" ? "user" : "model",
			parts: [{ text: message.content }],
		}));
	const chat = await ai.chats.create({
		model: "gemini-2.0-flash",
		config: { systemInstruction: system },
		history: history.slice(0, -1),
	});
	const response = await chat.sendMessage({
		message: history[history.length - 1].parts[0].text,
	});
	return { role: "assistant", content: response.text as string };
};
