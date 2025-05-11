import { Stack, Textarea } from "@mantine/core";
import { useState } from "react";
import { Message } from "../../types/Message";

type ChatTree = {
	nodes: (Message & { id: string })[];
	edges: { from: string; to: string }[];
};

export const Chat = () => {
	const [chatTree, setChatTree] = useState<ChatTree>();
	const [input, setInput] = useState<string>("");
	return (
		<Stack>
			<Textarea />
		</Stack>
	);
};
