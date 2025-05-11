import { Html, Head, Main, NextScript } from "next/document";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";

export default function Document() {
	return (
		<Html lang="ja" {...mantineHtmlProps}>
			<Head>
				<ColorSchemeScript />
			</Head>
			<body>
				<Main />
				<NextScript />
			</body>
		</Html>
	);
}
