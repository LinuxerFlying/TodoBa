import TurndownService from 'turndown';
import { marked } from 'marked';

marked.setOptions({ breaks: true, gfm: true });

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*'
});

turndown.addRule('taskList', {
  filter: (node: HTMLElement) => {
    return (
      node.nodeName === 'LI' &&
      node.getAttribute('data-type') === 'taskItem'
    );
  },
  replacement: (_content: string, node: HTMLElement) => {
    const li = node as HTMLLIElement;
    const checked = li.getAttribute('data-checked') === 'true';
    const indent = Number(li.getAttribute('data-indent') || '0');
    const pad = '  '.repeat(indent);
    const text = (_content || '')
      .replace(/^\n+|\n+$/g, '')
      .replace(/\n(?!$)/g, `\n${pad}  `);
    return `${pad}- [${checked ? 'x' : ' '}] ${text}\n`;
  }
});

turndown.addRule('taskListContainer', {
  filter: (node: HTMLElement) =>
    node.nodeName === 'UL' && node.getAttribute('data-type') === 'taskList',
  replacement: (content: string) => content
});

turndown.keep(['del']);

export function markdownToHtml(md: string): string {
  if (!md) return '';
  const raw = marked.parse(md, { async: false }) as string;
  return raw;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return turndown.turndown(html).replace(/\n{3,}/g, '\n\n').trimEnd();
}
