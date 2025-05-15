import { ChatMessage, ChatTree } from "../types/chat";

export const getHistory = (
	allMessages: ChatTree,
	currentMsg: ChatMessage,
): ChatMessage[] => {
	const history: ChatMessage[] = [];
	let msg: ChatMessage | undefined = currentMsg;
	while (msg) {
		history.unshift(msg);
		msg = allMessages.find((m) => m.id === msg!.parentId);
	}
	return history;
};
