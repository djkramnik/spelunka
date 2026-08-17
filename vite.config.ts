import {defineConfig} from 'vite';
import {execFileSync} from 'node:child_process';

function readGitCommit(): string {
    try {
        return execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
        }).trim();
    } catch {
        return 'unknown';
    }
}

export default defineConfig({
    define: {
        __GIT_COMMIT__: JSON.stringify(readGitCommit()),
    },
    server: {
        proxy: {
            '/api': process.env['PERFORMANCE_SERVER_URL']
                ?? 'http://127.0.0.1:3001',
        },
    },
});
