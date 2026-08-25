import TurndownService from 'turndown';
import { marked } from 'marked';
import { resolveAssetSrc, toStoredAssetPath } from './markdown';

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

turndown.addRule('images', {
  filter: 'img',
  replacement: (_content, node) => {
    const img = node as HTMLImageElement;
    const src = toStoredAssetPath(img.getAttribute('src') || '');
    if (!src) return '';
    const alt = (img.getAttribute('alt') || '').replace(/[\[\]]/g, '');
    const title = img.getAttribute('title');
    const titlePart = title ? ` "${title.replace(/"/g, '')}"` : '';
    return `![${alt}](${src}${titlePart})`;
  }
});

turndown.addRule('table', {
  filter: 'table',
  replacement: (_content: string, node: HTMLElement) => {
    const table = node as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const getCells = (tr: HTMLTableRowElement): { text: string; isHeader: boolean }[] =>
      Array.from(tr.querySelectorAll('th,td')).map((cell) => ({
        text: turndown
          .turndown((cell as HTMLElement).innerHTML || '')
          .replace(/\n+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
        isHeader: cell.tagName === 'TH'
      }));

    const colCount = rows.reduce((max, tr) => {
      const cells = tr.querySelectorAll('th,td');
      let span = 0;
      cells.forEach((c) => {
        span += Number(c.getAttribute('colspan') || 1);
      });
      return Math.max(max, span || cells.length);
    }, 0);

    const escapeCell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');

    let header: string[] = [];
    let bodyRows: string[][] = [];

    const firstRowCells = getCells(rows[0]);
    const firstIsHeader =
      firstRowCells.length > 0 && firstRowCells.every((c) => c.isHeader);

    if (firstIsHeader) {
      header = firstRowCells.map((c) => escapeCell(c.text));
      while (header.length < colCount) header.push('');
      bodyRows = rows.slice(1).map((tr) => {
        const cells = getCells(tr).map((c) => escapeCell(c.text));
        while (cells.length < colCount) cells.push('');
        return cells;
      });
    } else {
      header = new Array(colCount).fill('');
      bodyRows = rows.map((tr) => {
        const cells = getCells(tr).map((c) => escapeCell(c.text));
        while (cells.length < colCount) cells.push('');
        return cells;
      });
    }

    const lines: string[] = [];
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`| ${header.map(() => '---').join(' | ')} |`);
    bodyRows.forEach((r) => lines.push(`| ${r.join(' | ')} |`));

    return `\n\n${lines.join('\n')}\n\n`;
  }
});

export function markdownToHtml(md: string): string {
  if (!md) return '';
  const raw = marked.parse(md, { async: false }) as string;
  return raw;
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  return turndown.turndown(html).replace(/\n{3,}/g, '\n\n').trimEnd();
}
