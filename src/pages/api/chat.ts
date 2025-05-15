import type { NextApiRequest, NextApiResponse } from "next";
import { Message } from "../../types/message";
import { getMessage } from "../../features/backend/getMessage";

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<{ message: Message }>,
) {
	if (req.method !== "POST") return res.status(405);
	const { messages } = req.body as { messages: Message[] };
	const message = await getMessage(messages);
	res.status(200).json({ message });
}
