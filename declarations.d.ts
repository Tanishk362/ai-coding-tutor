declare module 'react-syntax-highlighter' {
	import * as React from 'react';
	export interface SyntaxHighlighterProps extends React.HTMLAttributes<HTMLElement> {
		language?: string;
		style?: any;
		wrapLines?: boolean;
		wrapLongLines?: boolean;
		showLineNumbers?: boolean;
		children?: React.ReactNode;
	}
	export const Prism: React.ComponentType<SyntaxHighlighterProps>;
	const SyntaxHighlighter: React.ComponentType<SyntaxHighlighterProps>;
	export default SyntaxHighlighter;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
	export const oneDark: any;
	export const oneLight: any;
	export const dracula: any;
	export const vscDarkPlus: any;
	const styles: any;
	export default styles;
}

// Fallback for other subpaths if referenced
declare module 'react-syntax-highlighter/*';
