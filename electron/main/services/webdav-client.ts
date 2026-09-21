import { Buffer } from 'node:buffer';

export class WebDAVError extends Error {
  status: number;
  method: string;
  constructor(method: string, status: number, message: string) {
    super(message);
    this.name = 'WebDAVError';
    this.method = method;
    this.status = status;
  }
}

const PROPFIND_BODY =
  '<?xml version="1.0" encoding="utf-8"?>' +
  '<propfind xmlns="DAV:"><prop>' +
  '<resourcetype/><getcontentlength/><getetag/>' +
  '</prop></propfind>';

export class WebDAVClient {
  private baseUrl: string;
  private auth: string;

  constructor(baseUrl: string, username: string, password: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    this.auth =
      'Basic ' + Buffer.from(username + ':' + password, 'utf8').toString('base64');
  }

  private urlFor(relPath: string): string {
    const cleanRel = relPath.replace(/^\/+/, '');
    return new URL(cleanRel.split('/').map(encodeURIComponent).join('/'), this.baseUrl)
      .toString();
  }

  private async request(
    method: string,
    relPath: string,
    init: RequestInit & { timeoutMs?: number } = {}
  ): Promise<Response> {
    const { timeoutMs = 30000, headers, ...rest } = init;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(this.urlFor(relPath), {
        method,
        ...rest,
        signal: controller.signal,
        headers: {
          Authorization: this.auth,
          ...(headers || {})
        }
      });
    } catch (e) {
      clearTimeout(timer);
      if (e instanceof DOMException && e.name === 'AbortError') {
        throw new WebDAVError(method, 0, '连接超时');
      }
      const code = (e as { cause?: { code?: string } })?.cause?.code;
      if (code === 'ENOTFOUND') throw new WebDAVError(method, 0, '无法解析服务器地址');
      if (code === 'ECONNREFUSED' || code === 'ECONNRESET')
        throw new WebDAVError(method, 0, '无法连接服务器');
      throw new WebDAVError(method, 0, '网络错误：' + (e as Error).message);
    }
    clearTimeout(timer);
    return res;
  }

  /** PROPFIND on root with Depth:0. Any 2xx means credentials + URL are valid. */
  async test(): Promise<void> {
    const res = await this.request('PROPFIND', '', {
      headers: {
        Depth: '0',
        'Content-Type': 'application/xml; charset=utf-8'
      },
      body: PROPFIND_BODY,
      timeoutMs: 15000
    });
    if (res.status === 401 || res.status === 403) {
      throw new WebDAVError('PROPFIND', res.status, '账户或应用密码错误（401 未授权）');
    }
    if (!res.ok) {
      throw new WebDAVError('PROPFIND', res.status, `服务器返回 ${res.status}`);
    }
  }

  /** Create the remote directory chain. 405 (already exists) is ignored. */
  async ensureDir(relDir: string): Promise<void> {
    const parts = relDir.split('/').filter(Boolean);
    let cur = '';
    for (const part of parts) {
      cur = cur ? cur + '/' + part : part;
      const res = await this.request('MKCOL', cur);
      if (!res.ok && res.status !== 405 && res.status !== 301) {
        throw new WebDAVError('MKCOL', res.status, `创建目录失败（${res.status}）`);
      }
    }
  }

  /** Ensure all parent directories of a file path exist remotely. */
  async ensureParentDirs(relFilePath: string): Promise<void> {
    const idx = relFilePath.lastIndexOf('/');
    if (idx > 0) await this.ensureDir(relFilePath.slice(0, idx));
  }

  async getBuffer(relPath: string): Promise<Buffer> {
    const res = await this.request('GET', relPath, { timeoutMs: 60000 });
    if (!res.ok) {
      throw new WebDAVError('GET', res.status, `下载失败（${res.status}）`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  async getText(relPath: string): Promise<string | null> {
    const res = await this.request('GET', relPath, { timeoutMs: 60000 });
    if (res.status === 404) return null;
    if (!res.ok) throw new WebDAVError('GET', res.status, `读取失败（${res.status}）`);
    return res.text();
  }

  async put(relPath: string, data: Buffer | string): Promise<void> {
    const res = await this.request('PUT', relPath, {
      body: data as BodyInit,
      headers: { 'Content-Type': 'application/octet-stream' },
      timeoutMs: 60000
    });
    if (!res.ok && res.status !== 201 && res.status !== 204) {
      throw new WebDAVError('PUT', res.status, `上传失败（${res.status}）`);
    }
  }

  /** Atomic upload: write to .tmp then MOVE over the target. */
  async putAtomic(relPath: string, data: Buffer | string): Promise<void> {
    const tmp = relPath + '.sync-tmp';
    await this.put(tmp, data);
    const res = await this.request('MOVE', tmp, {
      headers: {
        Destination: this.urlFor(relPath),
        Overwrite: 'T'
      },
      timeoutMs: 60000
    });
    if (res.ok) return;

    if (res.status === 409 || res.status === 412 || res.status === 403) {
      try {
        await this.put(relPath, data);
        return;
      } finally {
        await this.delete(tmp).catch(() => undefined);
      }
    }

    await this.delete(tmp).catch(() => undefined);
    throw new WebDAVError('MOVE', res.status, `提交文件失败（${res.status}）`);
  }

  async delete(relPath: string): Promise<void> {
    const res = await this.request('DELETE', relPath);
    if (!res.ok && res.status !== 404) {
      throw new WebDAVError('DELETE', res.status, `删除失败（${res.status}）`);
    }
  }
}
