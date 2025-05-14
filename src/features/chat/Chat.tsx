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
} from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Message, ChatMessage, ChatTree } from "../../types/Message";
import { v4 as uuidv4 } from "uuid";
import { IconArrowUp, IconMessage, IconPencil } from "@tabler/icons-react"; // IconMessageReply is not used

export const Chat = () => {
	const [chatTree, setChatTree] = useState<ChatTree>([]);
	const [input, setInput] = useState<string>("");
	// currentParentId determines which branch of the tree is displayed in the main chat view.
	// null means the root (top-level messages).
	const [currentParentId, setCurrentParentId] = useState<string | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [replyTargetId, setReplyTargetId] = useState<string | null>(null); // New state for reply target
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

	const sendMessageMutation = useMutation<
		{ message: Message }, // TData: API response type
		Error,                // TError: Error type
		{ messages: Message[]; userMessageId: string } // TVariables: Variables type
	>({
		mutationFn: async ({ messages, userMessageId }: { messages: Message[]; userMessageId: string }) => {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages }),
			});
			if (!response.ok) throw new Error('エラーが発生しました');
			return response.json();
		},
		onSuccess: (data: { message: Message }, variables: { messages: Message[]; userMessageId: string }) => {
			const assistantMessageId = uuidv4();
			const assistantMessage: ChatMessage = {
				id: assistantMessageId,
				parentId: variables.userMessageId,
				role: "assistant",
				content: data.message.content,
			};
			setChatTree((prev) => [...prev, assistantMessage]);
			setCurrentParentId(assistantMessageId);
		},
	});

	const handleSendMessage = async () => {
		if (!input.trim()) return;

		const content = input.trim();
		const userMessageId = uuidv4();
		let parentId: string | null;

		if (editingMessage) {
			parentId = editingMessage.parentId;
		} else if (replyTargetId) {
			parentId = replyTargetId;
		} else {
			parentId = currentParentId;
		}

		const newUserMessage: ChatMessage = {
			id: userMessageId,
			parentId,
			role: "user",
			content,
		};

		setChatTree((prevTree) => [...prevTree, newUserMessage]);
		setInput("");
		setEditingMessage(null);
		setReplyTargetId(null);

		const getMessageHistory = (
			allMessages: ChatTree,
			currentMsg: ChatMessage,
		): Message[] => {
			const history: Message[] = [];
			let msg: ChatMessage | undefined = currentMsg;
			while (msg) {
				history.unshift({ role: msg.role, content: msg.content });
				msg = allMessages.find((m) => m.id === msg!.parentId);
			}
			return history;
		};
		// Pass the latest chatTree to getMessageHistory
		const messagesForApi = getMessageHistory([...chatTree, newUserMessage], newUserMessage);

		sendMessageMutation.mutate({ messages: messagesForApi, userMessageId });
	};

	const handleReplyClick = (messageId: string) => {
		setReplyTargetId(messageId); // Set the target for the next reply
		setEditingMessage(null); // Ensure not in editing mode
		setInput(""); // Clear input for fresh reply
	};

	const handleEditClick = (messageToEdit: ChatMessage) => {
		setPreviousParentIdBeforeEdit(currentParentId);
		setInput(messageToEdit.content);
		setEditingMessage(messageToEdit);
	};

	const cancelEdit = () => {
		setInput("");
		setEditingMessage(null);
		setReplyTargetId(null); // Also cancel reply targeting
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
				<Paper withBorder shadow='md' p='md'>

					<Text>{message.content}</Text>
					{message.id !== currentEditingMessage?.id && (
						<ActionIcon variant="subtle" onClick={() => onEditClick(message)} title="Edit & Branch">
							<IconPencil size={16} />
						</ActionIcon>
					)}
				</Paper>
			);
		}
		return (
			<Box p="md" mb="sm" style={{ maxWidth: "80%" }}>
				<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
				<ActionIcon variant="subtle" onClick={() => onReplyClick(message.id)} title="Reply to this">
					<IconMessage size={18} />
				</ActionIcon>
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
				{ancestorPath.map((ancestorMessage, index) => (
					<Box key={ancestorMessage.id}>
						{renderSingleMessageItem(
							ancestorMessage,
							editingMessage,
							handleEditClick,
							handleReplyClick,
						)}
						{index === ancestorPath.length - 1 &&
							chatTree
								.filter((child) => child.parentId === ancestorMessage.id)
								.map((childMsg) =>
									renderMessageBranch(
										childMsg,
										chatTree,
										1, // Children of the selected node start at level 1 for indentation
										editingMessage,
										handleEditClick,
										handleReplyClick,
									),
								)}
					</Box>
				))}
			</>
		);
	};

	return (
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
			<Paper withBorder shadow='md' p='md'>
				<Group>
					<Textarea
					   autosize
						variant="unstyled"
						value={input}
						onChange={(event) => setInput(event.currentTarget.value)}
						style={{ flexGrow: 1 }}
					/>
					<ActionIcon onClick={handleSendMessage} color='black' radius='xl' size='lg'>
						<IconArrowUp />
					</ActionIcon>
				</Group>
			</Paper>
			{editingMessage && (
				<Button variant="outline" size="xs" onClick={cancelEdit} style={{ marginTop: "5px" }}>
					Cancel Edit
				</Button>
			)}
		</Stack>
	);
};
