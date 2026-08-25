import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true,
  gfm: true
});

const ASSET_PROTOCOL = 'todoba-asset://local/';

export function resolveAssetSrc(src: string | undefined | null): string {
  if (!src) return '';
  const s = src.trim();
  if (!s) return '';
  if (/^(https?:|data:|todoba-asset:|blob:)/i.test(s)) return s;
  if (s.startsWith('//')) return 'https:' + s;
  const clean = s.replace(/^[\\/]+/, '');
  return ASSET_PROTOCOL + encodeURI(clean).replace(/#/g, '%23').replace(/\?/g, '%3F');
}

export function toStoredAssetPath(src: string): string {
  if (!src) return '';
  if (src.startsWith(ASSET_PROTOCOL)) {
    return decodeURIComponent(src.slice(ASSET_PROTOCOL.length));
  }
  if (/^(https?:|data:|blob:)/i.test(src)) return src;
  return src;
}

marked.use({
  renderer: {
    image({ href, title, text }: { href: string; title?: string | null; text: string }) {
      const src = resolveAssetSrc(href);
      const alt = text ? ` alt="${text.replace(/"/g, '&quot;')}"` : '';
      const t = title ? ` title="${title.replace(/"/g, '&quot;')}"` : '';
      return `<img src="${src}"${alt}${t} />`;
    }
  }
});

const ALLOWED_URI = /^(?:(?:https?|mailto|tel|data|todoba-asset):|#)/i;

export function renderMarkdown(md: string): string {
  if (!md) return '';
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_URI_REGEXP: ALLOWED_URI
  });
}

export { marked };
