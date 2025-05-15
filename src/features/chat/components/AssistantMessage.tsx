import {
	ActionIcon,
	Divider,
	Group,
	Paper,
	Stack,
	Text,
	Textarea,
} from "@mantine/core";
import { ChatMessage } from "../types/chat";
import { IconArrowUp, IconMessage, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { UseMutationResult } from "@tanstack/react-query";

export const AssistantMessage = ({
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
	const [isReplied, setIsReplied] = useState(false);
	const [editMessage, setEditMessage] = useState("");
	const send = (messageText: string) => {
		setIsReplied(false);
		setEditMessage("");
		mutation.mutate({ messageText, id: message.id });
	};
	return (
		<>
			<Stack>
				<Paper p="md">
					<Text style={{ whiteSpace: "pre-wrap" }}>{message.content}</Text>
					<ActionIcon
						variant="subtle"
						color="black"
						onClick={() => setIsReplied(true)}
					>
						<IconMessage size={16} />
					</ActionIcon>
				</Paper>
				{isReplied && (
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
									onClick={() => setIsReplied(false)}
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
			</Stack>
			{isReplied && <Divider variant="dashed" my="xl" />}
		</>
	);
};
