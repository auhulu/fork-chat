import React from "react";
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
	Alert,
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
			// Construct message history
			const getMessageHistory = (
				allMessages: ChatTree,
				currentMessage: ChatMessage,
			): Message[] => {
				const history: Message[] = [];
				let msg: ChatMessage | undefined = currentMessage;
				while (msg) {
					history.unshift({ role: msg.role, content: msg.content });
					msg = allMessages.find((m) => m.id === msg!.parentId);
				}
				// Ensure the first message is 'user' if it's not system, or handle system message if present
				// For now, let's assume the API handles the roles correctly based on the order.
				// If a system message is needed, it should be explicitly added or handled by the API.
				return history;
			};

			const messagesForApi = getMessageHistory(chatTree, newUserMessage);


			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: messagesForApi }),
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
				content: data.message.content,
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

	// Helper to render the UI for a single message item
	const renderSingleMessageItem = (
		message: ChatMessage,
		currentEditingMessage: ChatMessage | null,
		onEditClick: (msg: ChatMessage) => void,
		onReplyClick: (id: string) => void,
	) => {
		if (message.role === "user") {
			return (
				<Group justify="flex-end" mb="sm">
					<Alert
						color="gray"
						style={{ maxWidth: "80%", whiteSpace: "pre-wrap" }}
					>
						<Text>{message.content}</Text>
						<Group justify="flex-end" gap="xs" mt="xs">
							{message.id !== currentEditingMessage?.id && (
								<ActionIcon variant="subtle" onClick={() => onEditClick(message)} title="Edit & Branch">
									<IconPencil size={16} />
								</ActionIcon>
							)}
							<ActionIcon variant="subtle" onClick={() => onReplyClick(message.id)} title="Reply to this">
								<IconMessageReply size={16} />
							</ActionIcon>
						</Group>
					</Alert>
				</Group>
			);
		}
		return (
			<Box p="md" mb="sm" style={{ maxWidth: "80%" }}>
				<Group justify="flex-end">
					<ActionIcon variant="subtle" onClick={() => onReplyClick(message.id)} title="Reply to this">
						<IconMessageReply size={18} />
					</ActionIcon>
				</Group>
				<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
			</Box>
		);
	};

	// Recursive function to render a message and its children (a full branch)
	const renderMessageBranch = (
		message: ChatMessage,
		allMessages: ChatTree,
		level: number,
		currentEditingMessage: ChatMessage | null,
		onEditClick: (msg: ChatMessage) => void,
		onReplyClick: (id: string) => void,
	): React.JSX.Element => {
		const children = allMessages.filter((child) => child.parentId === message.id);
		return (
			<Box key={message.id} style={{ marginLeft: `${level * 20}px` }}>
				{renderSingleMessageItem(message, currentEditingMessage, onEditClick, onReplyClick)}
				{children.map((childMsg) =>
					renderMessageBranch(
						childMsg,
						allMessages,
						level + 1,
						currentEditingMessage,
						onEditClick,
						onReplyClick,
					),
				)}
			</Box>
		);
	};

	// Main rendering logic for the chat area
	const DisplayedChatMessages = ({
		chatTree,
		currentParentId,
		editingMessage,
		handleEditClick,
		handleReplyClick,
	}: {
		chatTree: ChatTree;
		currentParentId: string | null;
		editingMessage: ChatMessage | null;
		handleEditClick: (msg: ChatMessage) => void;
		handleReplyClick: (id: string) => void;
	}) => {
		if (currentParentId === null) {
			// If no specific thread is selected, display all root threads
			return (
				<>
					{chatTree
						.filter((msg) => msg.parentId === null)
						.map((rootMessage) =>
							renderMessageBranch(
								rootMessage,
								chatTree,
								0,
								editingMessage,
								handleEditClick,
								handleReplyClick,
							),
						)}
					{chatTree.filter((m) => m.parentId === null).length === 0 && (
						<Text c="dimmed">No messages yet. Start a new conversation!</Text>
					)}
				</>
			);
		}

		// A specific thread (currentParentId) is selected.
		// Display the path from root to currentParentId, and for each message in the path,
		// display its other children branches.
		const ancestorPath: ChatMessage[] = [];
		let msg = chatTree.find((m) => m.id === currentParentId);
		while (msg) {
			ancestorPath.unshift(msg); // Adds to the beginning: [root, ..., parent, currentParentId]
			msg = chatTree.find((m) => m.id === msg!.parentId);
		}

		if (ancestorPath.length === 0 && currentParentId !== null) {
			return <Text c="dimmed">Selected message not found.</Text>;
		}

		return (
			<>
				{ancestorPath.map((ancestorMessage, index) => {
					const sideBranches = chatTree.filter((child) => {
						if (child.parentId !== ancestorMessage.id) return false;
						if (index + 1 < ancestorPath.length && child.id === ancestorPath[index + 1].id) {
							return false;
						}
						return true;
					});

					return (
						<Box key={ancestorMessage.id}>
							{renderSingleMessageItem(
								ancestorMessage,
								editingMessage,
								handleEditClick,
								handleReplyClick,
							)}
							{sideBranches.map((branchHead) =>
								renderMessageBranch(
									branchHead,
									chatTree,
									1, // Side branches start at level 1
									editingMessage,
									handleEditClick,
									handleReplyClick,
								),
							)}
						</Box>
					);
				})}
			</>
		);
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
					<DisplayedChatMessages
						chatTree={chatTree}
						currentParentId={currentParentId}
						editingMessage={editingMessage}
						handleEditClick={handleEditClick}
						handleReplyClick={handleReplyClick}
					/>
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
