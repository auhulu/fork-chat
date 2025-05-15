import React from "react";
import {
	Stack,
	Textarea,
	Paper,
	ScrollArea,
	Group,
	ActionIcon,
	Text,
	Box,
} from "@mantine/core";
import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Message } from "../../../types/message";
import { v4 as uuidv4 } from "uuid";
import { IconArrowUp } from "@tabler/icons-react";
import { ChatMessage, ChatTree } from "../types/chat";
import { getHistory } from "../libs/getHistory";
import { UserMessage } from "./UserMessage";
import { AssistantMessage } from "./AssistantMessage";

export const Chat = () => {
	const [chatTree, setChatTree] = useState<ChatTree>([]);
	const [input, setInput] = useState<string>("");
	// 今いるスレッドの最新のメッセージのID
	const [currntId, setCurrentId] = useState<string | null>(null);
	const scrollAreaRef = useRef<HTMLDivElement>(null);
	const currentMessage = chatTree.find((msg) => msg.id === currntId) ?? null;
	const threadMessages = currentMessage
		? getHistory(chatTree, currentMessage)
		: [];

	useEffect(() => {
		if (scrollAreaRef.current) {
			scrollAreaRef.current.scrollTo({
				top: scrollAreaRef.current.scrollHeight,
				behavior: "smooth",
			});
		}
	}, [currntId]);

	const sendMessageMutation = useMutation({
		mutationFn: async (variables: {
			messageText: string;
			id: string | null;
		}): Promise<ChatMessage> => {
			const chatMessage: ChatMessage = {
				id: uuidv4(),
				parentId: variables.id,
				role: "user",
				content: variables.messageText,
			};
			const newChatTree = [...chatTree, chatMessage];
			setChatTree(newChatTree);
			setCurrentId(chatMessage.id);
			const history = getHistory(newChatTree, chatMessage);
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: history }),
			});
			if (!response.ok) throw new Error("エラーが発生しました");
			const { message } = (await response.json()) as { message: Message };
			return { ...message, parentId: chatMessage.id, id: uuidv4() };
		},
		onSuccess: (message: ChatMessage) => {
			setChatTree((prev) => [...prev, message]);
			setCurrentId(message.id);
		},
	});

	return (
		<Stack py="md" style={{ flexGrow: 1, height: "100vh" }}>
			<ScrollArea
				viewportRef={scrollAreaRef}
				style={{ flexGrow: 1, marginBottom: "1rem" }}
			>
				<Stack>
					{threadMessages.map((message) =>
						message.role === "user" ? (
							<UserMessage
								key={message.id}
								message={message}
								mutation={sendMessageMutation}
							/>
						) : (
							<AssistantMessage
								key={message.id}
								message={message}
								mutation={sendMessageMutation}
							/>
						),
					)}
				</Stack>
			</ScrollArea>
			<Paper withBorder shadow="xs" p="md">
				<Group>
					<Textarea
						autosize
						variant="unstyled"
						value={input}
						onChange={(event) => setInput(event.currentTarget.value)}
						style={{ flexGrow: 1 }}
					/>
					<ActionIcon
						onClick={() => {
							setInput("");
							sendMessageMutation.mutate({ messageText: input, id: currntId });
						}}
						color="black"
						radius="xl"
						size="lg"
					>
						<IconArrowUp />
					</ActionIcon>
				</Group>
			</Paper>
		</Stack>
	);
};
