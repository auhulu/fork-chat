import { Box, Text, NavLink, ScrollArea } from "@mantine/core";
// Message type is part of ChatMessage now
import { IconPointFilled } from "@tabler/icons-react";
import type { ChatMessage, ChatTree } from "../types/Message"; // Import types from the correct location

interface ChatSidebarProps {
	chatTree: ChatTree;
	onSelectNode: (nodeId: string | null) => void;
	currentNodeId: string | null; // To highlight the currently selected node/branch
}

export const ChatSidebar = ({
	chatTree,
	onSelectNode,
	currentNodeId,
}: ChatSidebarProps) => {
	const renderTreeNodes = (parentId: string | null, level = 0) => {
		return chatTree
			.filter((message) => message.parentId === parentId)
			.map((message) => {
				const hasChildren = chatTree.some(
					(child) => child.parentId === message.id,
				);
				return (
					<Box key={message.id} style={{ paddingLeft: `${level * 15}px` }}>
						<NavLink
							label={
								<Text size="sm" truncate>
									{message.role}: {message.content || "..."}
								</Text>
							}
							onClick={() => onSelectNode(message.id)}
							active={currentNodeId === message.id} // Highlight if this node's children are being viewed
							leftSection={<IconPointFilled size={12} />} // Basic indicator
							childrenOffset={0} // We handle indentation manually
						/>
						{/* Recursively render children.
                For a sidebar, we might not want to auto-expand all children initially.
                This simple version will render all. A more complex tree view might be needed later.
            */}
						{hasChildren && renderTreeNodes(message.id, level + 1)}
					</Box>
				);
			});
	};

	return (
		<Box style={{ width: 300, borderRight: "1px solid var(--mantine-color-divider)", padding: "var(--mantine-spacing-md)" }}>
			<NavLink
				label="Start New Thread (Root)"
				onClick={() => onSelectNode(null)}
				active={currentNodeId === null}
				leftSection={<IconPointFilled size={12} />}
			/>
			<ScrollArea style={{ height: "calc(100vh - 120px)" }}> {/* Adjust height as needed */}
				{renderTreeNodes(null)}
			</ScrollArea>
		</Box>
	);
};