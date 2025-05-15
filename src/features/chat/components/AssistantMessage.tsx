import {
	ActionIcon,
	Button,
	Divider,
	Group,
	Paper,
	Stack,
	Text,
	Textarea,
} from "@mantine/core";
import { ChatMessage, ChatTree } from "../types/chat";
import {
	IconArrowUp,
	IconGitMerge,
	IconMessage,
	IconX,
} from "@tabler/icons-react";
import { useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { getEndMessage } from "../libs/getEndMessage";

export const AssistantMessage = ({
	message,
	chatTree,
	currentId,
	setCurrentId,
	mutation,
}: {
	message: ChatMessage;
	chatTree: ChatTree;
	currentId: string | null;
	setCurrentId: (id: string | null) => void;
	mutation: UseMutationResult<
		ChatMessage,
		Error,
		{ messageText: string; id: string | null },
		unknown
	>;
}) => {
	const [editMessage, setEditMessage] = useState("");
	const [mode, setMode] = useState("");
	const childMessages = chatTree.filter((msg) => msg.parentId === message.id);
	const send = (messageText: string) => {
		setMode("");
		setEditMessage("");
		mutation.mutate({ messageText, id: message.id });
	};
	return (
		<>
			<Stack>
				<Paper p="md">
					<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
					<Group>
						{message.id !== currentId && (
							<ActionIcon
								variant="subtle"
								color="black"
								onClick={() => setMode("reply")}
							>
								<IconMessage size={20} />
							</ActionIcon>
						)}
						{childMessages.length > 1 && (
							<Button
								size="compact-md"
								variant="subtle"
								color="black"
								leftSection={<IconGitMerge size={20} />}
								onClick={() => setMode("branch")}
							>
								{childMessages.length}
							</Button>
						)}
					</Group>
				</Paper>
				{mode === "reply" && (
					<Paper p="md" withBorder shadow="xs">
						<Group>
							<Textarea
								autosize
								variant="unstyled"
								value={editMessage}
								onChange={(event) => setEditMessage(event.currentTarget.value)}
								style={{ flexGrow: 1 }}
							/>
							<Group>
								<ActionIcon
									onClick={() => send(editMessage)}
									color="black"
									radius="xl"
									size="md"
								>
									<IconArrowUp />
								</ActionIcon>
								<ActionIcon
									onClick={() => setMode("")}
									color="gray"
									radius="xl"
									size="md"
								>
									<IconX />
								</ActionIcon>
							</Group>
						</Group>
					</Paper>
				)}
				{mode === "branch" &&
					childMessages.map((message) => (
						<Paper
							ml="xl"
							withBorder
							shadow="xs"
							p="md"
							key={message.id}
							onClick={() => {
								setCurrentId(getEndMessage(chatTree, message.id).id);
								setMode("");
							}}
							style={{ cursor: "pointer" }}
						>
							<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
						</Paper>
					))}
			</Stack>
			{mode !== "" && <Divider variant="dashed" my="xl" />}
		</>
	);
};
