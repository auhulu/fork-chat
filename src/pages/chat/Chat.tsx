import {
	Stack,
	Textarea,
	Button,
	Paper,
	ScrollArea,
	Group,
	ActionIcon,
	Text,
	Box,
} from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { Message } from "../../types/Message";
import { v4 as uuidv4 } from "uuid";
import { IconMessageReply, IconPencil } from "@tabler/icons-react";
import { ChatSidebar } from "../../components/ChatSidebar"; // Import the sidebar

// ChatMessage type is used by both Chat and ChatSidebar.
// Consider moving to a shared types file in a larger project.
export type ChatMessage = Message & { id: string; parentId: string | null };
export type ChatTree = ChatMessage[];

export const Chat = () => {
	const [chatTree, setChatTree] = useState<ChatTree>([]);
	const [input, setInput] = useState<string>("");
	// currentParentId determines which branch of the tree is displayed in the main chat view.
	// null means the root (top-level messages).
	const [currentParentId, setCurrentParentId] = useState<string | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [previousParentIdBeforeEdit, setPreviousParentIdBeforeEdit] = useState<string | null>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (scrollAreaRef.current) {
			scrollAreaRef.current.scrollTo({
				top: scrollAreaRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [chatTree, currentParentId]); // Also scroll when currentParentId changes, to show the top of the new branch

	const handleSendMessage = async () => {
		if (!input.trim()) return;

		const newContent = input;
		let newParentIdForUserMessage = currentParentId;
		let role: "user" | "assistant" | "system" = "user";

		if (editingMessage) {
			newParentIdForUserMessage = editingMessage.parentId;
			role = "user";
		}

		const userMessageId = uuidv4();
		const newUserMessage: ChatMessage = {
			id: userMessageId,
			parentId: newParentIdForUserMessage,
			role: role,
			content: newContent,
		};

		setChatTree((prev) => [...prev, newUserMessage]);
		setInput("");
		setEditingMessage(null);

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ message: newUserMessage.content }),
			});

			if (!response.ok) {
				const errorResponse = await response.json().catch(() => ({ error: "Unknown API error" }));
				const assistantErrorMessageId = uuidv4();
				const assistantErrorMessage: ChatMessage = {
					id: assistantErrorMessageId,
					parentId: userMessageId,
					role: "assistant",
					content: `Error: ${errorResponse.error || response.statusText}`,
				};
				setChatTree((prev) => [...prev, assistantErrorMessage]);
				setCurrentParentId(assistantErrorMessageId); // Focus on this error message branch
				return;
			}

			const data = await response.json();
			const assistantMessageId = uuidv4();
			const assistantMessage: ChatMessage = {
				id: assistantMessageId,
				parentId: userMessageId,
				role: "assistant",
				content: data.message,
			};
			setChatTree((prev) => [...prev, assistantMessage]);
			// After sending, the main chat view should show the branch containing this new assistant message.
			// So, currentParentId should be the parent of the user message, to show that conversation.
			// OR, it should be the assistant message itself if we want to auto-reply to it.
			// The rule "default reply is to the latest message" implies setting it to assistantMessageId.
			setCurrentParentId(assistantMessageId);
		} catch (error) {
			console.error("Failed to send message:", error);
			const assistantErrorMessageId = uuidv4();
			const assistantErrorMessage: ChatMessage = {
				id: assistantErrorMessageId,
				parentId: userMessageId,
				role: "assistant",
				content: "Error: Could not connect to the server.",
			};
			setChatTree((prev) => [...prev, assistantErrorMessage]);
			setCurrentParentId(assistantErrorMessageId);
		}
	};

	const handleReplyClick = (messageId: string) => {
		setCurrentParentId(messageId); // Set view to children of this message, and next input replies to it
		setEditingMessage(null);
		setInput("");
	};

	const handleEditClick = (messageToEdit: ChatMessage) => {
		setPreviousParentIdBeforeEdit(currentParentId);
		setInput(messageToEdit.content);
		// When editing, the new message will branch from the *original parent* of the message being edited.
		// The main chat view should show the context of where this new branch will appear.
		setCurrentParentId(messageToEdit.parentId);
		setEditingMessage(messageToEdit);
	};

	const cancelEdit = () => {
		setInput("");
		setEditingMessage(null);
		setCurrentParentId(previousParentIdBeforeEdit);
	};

	// This function is for the main chat display area
	const renderChatMessages = (parentIdToDisplay: string | null, level = 0) => {
		return chatTree
			.filter((msg) => msg.parentId === parentIdToDisplay)
			.map((message) => (
				<Box key={message.id} style={{ marginLeft: `${level * 20}px` }}>
					<Paper shadow="xs" p="md" mb="sm" withBorder>
						<Group justify="space-between">
							<Text c={message.role === "user" ? "blue" : "green"} fw={500}>
								{message.role === "user" ? "You" : "Assistant"}
							</Text>
							<Group gap="xs">
								{message.role === "user" && message.id !== editingMessage?.id && (
									<ActionIcon variant="subtle" onClick={() => handleEditClick(message)} title="Edit & Branch">
										<IconPencil size={18} />
									</ActionIcon>
								)}
								{message.role === "assistant" && (
									<ActionIcon variant="subtle" onClick={() => handleReplyClick(message.id)} title="Reply to this">
										<IconMessageReply size={18} />
									</ActionIcon>
								)}
							</Group>
						</Group>
						<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
					</Paper>
					{/* Recursively render children in the main chat view */}
					{renderChatMessages(message.id, level + 1)}
				</Box>
			));
	};

	const handleSidebarNodeSelect = (nodeId: string | null) => {
		setCurrentParentId(nodeId); // This will make renderChatMessages display children of nodeId
		setEditingMessage(null); // Clear any editing state
		setInput(""); // Clear input
	};

	return (
		<Group wrap="nowrap" align="flex-start" style={{ height: "100vh" }}>
			<ChatSidebar
				chatTree={chatTree}
				onSelectNode={handleSidebarNodeSelect}
				currentNodeId={currentParentId} // The sidebar needs to know which node's children are being displayed
			/>
			<Stack style={{ flexGrow: 1, height: "100vh", padding: "1rem" }}>
				<ScrollArea viewportRef={scrollAreaRef} style={{ flexGrow: 1, marginBottom: "1rem" }}>
					{/* The main chat view now renders children of currentParentId, selected via sidebar or interaction */}
					{renderChatMessages(currentParentId, 0)}

					{/* "Start New Thread" button is now primarily in the sidebar.
              We might want a visual cue in the main area if no thread is selected.
              For now, if currentParentId is null, renderChatMessages will show top-level messages.
          */}
					{/* Example: if currentParentId is null, show all top-level threads */}
					{/* {currentParentId === null && chatTree.filter(m => m.parentId === null).length === 0 && (
            <Text c="dimmed">No messages yet. Start a new conversation!</Text>
          )} */}
				</ScrollArea>
				<Group>
					<Textarea
						value={input}
						onChange={(event) => setInput(event.currentTarget.value)}
						placeholder={
							editingMessage
								? `Editing (will branch from original parent): ${editingMessage.content.substring(0, 20)}...`
								: currentParentId
									? "Reply to selected thread..." // Placeholder reflects currentParentId from sidebar/reply
									: "Start a new thread..."
						}
						style={{ flexGrow: 1 }}
						onKeyDown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								handleSendMessage();
							}
						}}
					/>
					<Button onClick={handleSendMessage}>
						{editingMessage ? "Save Edit & Branch" : "Send"}
					</Button>
				</Group>
				{editingMessage && (
					<Button variant="outline" size="xs" onClick={cancelEdit} style={{ marginTop: "5px" }}>
						Cancel Edit
					</Button>
				)}
			</Stack>
		</Group>
	);
};
