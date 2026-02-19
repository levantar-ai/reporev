import type { GitStatsRawData } from '../../types/gitStats';
import type { CloneMessage, WorkerOutMessage } from './git.worker';

const TIMEOUT_MS = 120_000; // 2 minutes

const DEFAULT_CORS_PROXY = 'https://cors.isomorphic-git.org';

function getCorsProxy(): string {
  return import.meta.env.VITE_CORS_PROXY_URL || DEFAULT_CORS_PROXY;
}

export function cloneAndExtract(
  owner: string,
  repo: string,
  onProgress: (step: string, percent: number, message: string) => void,
): Promise<GitStatsRawData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL('./git.worker.ts', import.meta.url),
      { type: 'module' },
    );

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Clone timed out after 2 minutes'));
    }, TIMEOUT_MS);

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      const msg = e.data;

      switch (msg.type) {
        case 'progress':
          onProgress(msg.step, msg.percent, msg.message);
          break;

        case 'result':
          clearTimeout(timeout);
          worker.terminate();
          resolve(msg.data);
          break;

        case 'error':
          clearTimeout(timeout);
          worker.terminate();
          reject(new Error(msg.message));
          break;
      }
    };

    worker.onerror = (err) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(new Error(err.message || 'Worker error'));
    };

    const message: CloneMessage = {
      type: 'clone',
      owner,
      repo,
      corsProxy: getCorsProxy(),
    };

    worker.postMessage(message);
  });
}
