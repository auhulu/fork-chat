import { ChatMessage, ChatTree } from "../types/chat";

export const getEndMessage = (chatTree: ChatTree, id: string): ChatMessage => {
	const message = chatTree.find((msg) => msg.id === id);
	const childMessage = chatTree.find((msg) => msg.parentId === id);
	// 子メッセージを持たない場合は、現在のメッセージが末端
	if (!childMessage) return message as ChatMessage;
	// 最後の子メッセージの末端を再帰的に取得
	return getEndMessage(chatTree, childMessage.id);
};
