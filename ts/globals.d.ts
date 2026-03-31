/** Global variables injected by PHP */
declare const csrfToken: string;

/** Global functions from other TS modules */
declare function autosize(textarea: HTMLTextAreaElement): void;
declare function markdownToHtml(md: string): string;
declare function renderBlocks(blocks: { type: string; data: Record<string, unknown> }[]): string;

/** Editor instance attached to container element */
interface HTMLElement {
    __editor?: InstanceType<typeof Editor>;
}
