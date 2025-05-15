import { ActionIcon, Group, Paper, Text, Textarea } from "@mantine/core";
import { IconArrowUp, IconPencil, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";
import { ChatMessage } from "../types/chat";

export const UserMessage = ({
	message,
	mutation,
}: {
	message: ChatMessage;
	mutation: UseMutationResult<
		ChatMessage,
		Error,
		{ messageText: string; id: string | null },
		unknown
	>;
}) => {
	const [isEdit, setIsEdit] = useState(false);
	const [editMessage, setEditMessage] = useState(message.content);
	const send = (messageText: string) => {
		setIsEdit(false);
		setEditMessage("");
		mutation.mutate({ messageText, id: message.parentId });
	};
	return (
		<Paper withBorder shadow="xs" p="md">
			{!isEdit && (
				<>
					<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
					<ActionIcon
						variant="subtle"
						color="black"
						onClick={() => setIsEdit(true)}
					>
						<IconPencil size={20} />
					</ActionIcon>
				</>
			)}
			{isEdit && (
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
							onClick={() => setIsEdit(false)}
							color="gray"
							radius="xl"
							size="md"
						>
							<IconX />
						</ActionIcon>
					</Group>
				</Group>
			)}
		</Paper>
	);
};
