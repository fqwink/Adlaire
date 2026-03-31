/** Global variables injected by PHP */
declare const csrfToken: string;

/** Global functions from other TS modules */
declare function autosize(textarea: HTMLTextAreaElement): void;
declare function markdownToHtml(md: string): string;
