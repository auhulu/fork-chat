import { Message } from "../../../types/message";

export type ChatMessage = Message & { id: string; parentId: string | null };
export type ChatTree = ChatMessage[];
