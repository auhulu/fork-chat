export type Message = {
	role: "user" | "assistant" | "system";
	content: string;
};

export type ChatMessage = Message & { id: string; parentId: string | null };
export type ChatTree = ChatMessage[];
