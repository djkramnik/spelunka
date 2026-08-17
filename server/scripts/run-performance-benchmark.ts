import 'dotenv/config';

import {execFileSync, spawn} from 'node:child_process';
import type {ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';
import process from 'node:process';
import {chromium} from 'playwright-core';

import {PerformanceSummaryZ} from '../../shared/performance.js';

const BENCHMARK_NAME = 'run-right';
const EXPECTED_SAMPLE_COUNT = 8;
const WARMUP_SAMPLE_COUNT = 1;
const STARTUP_TIMEOUT_MS = 30_000;
const BENCHMARK_TIMEOUT_MS = 90_000;

interface BenchmarkStatus {
    name: string;
    gitCommit: string;
    status: 'running' | 'complete' | 'failed';
    completedAt?: string;
    workloadLevelLoads?: number;
}

function gitOutput(args: string[]): string {
    return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

function cleanWorktreeCommit(): string | null {
    const status = gitOutput(['status', '--porcelain']);
    if (status) {
        console.warn(
            '[performance-benchmark] refusing to run: Git worktree is dirty.\n'
            + `${status}\n`
            + '[performance-benchmark] commit or stash these changes first.',
        );
        return null;
    }

    return gitOutput(['rev-parse', 'HEAD']);
}

async function availablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                server.close();
                reject(new Error('Unable to allocate a local benchmark port'));
                return;
            }
            server.close(error => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(address.port);
            });
        });
    });
}

function runBuild(): void {
    console.log('[performance-benchmark] building the production game');
    execFileSync('npm', ['run', 'build'], {stdio: 'inherit'});
}

function startProcess(
    name: string,
    args: string[],
    environment: NodeJS.ProcessEnv,
): ChildProcess {
    const child = spawn('npm', args, {
        cwd: process.cwd(),
        detached: process.platform !== 'win32',
        env: environment,
        stdio: 'inherit',
    });
    child.once('error', error => {
        console.error(`[performance-benchmark] ${name} failed to start`, error);
    });
    return child;
}

async function waitForHttp(
    name: string,
    url: string,
    child: ChildProcess,
): Promise<void> {
    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (Date.now() < deadline) {
        if (child.exitCode !== null || child.signalCode !== null) {
            throw new Error(
                `${name} exited with code ${child.exitCode} and signal ${child.signalCode}`,
            );
        }
        try {
            await fetch(url);
            return;
        } catch {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    throw new Error(`${name} did not become ready within ${STARTUP_TIMEOUT_MS}ms`);
}

async function stopProcess(child: ChildProcess | undefined): Promise<void> {
    if (!child?.pid || child.exitCode !== null || child.signalCode !== null) {
        return;
    }

    const exited = new Promise<void>(resolve => child.once('exit', () => resolve()));
    try {
        if (process.platform === 'win32') {
            child.kill('SIGTERM');
        } else {
            process.kill(-child.pid, 'SIGTERM');
        }
    } catch {
        child.kill('SIGTERM');
    }

    const stopped = await Promise.race([
        exited.then(() => true),
        new Promise<false>(resolve => setTimeout(() => resolve(false), 5_000)),
    ]);
    if (!stopped) {
        try {
            if (process.platform === 'win32') {
                child.kill('SIGKILL');
            } else {
                process.kill(-child.pid, 'SIGKILL');
            }
        } catch {
            child.kill('SIGKILL');
        }
        await exited;
    }
}

async function runBrowserBenchmark(
    url: string,
    gitCommit: string,
): Promise<BenchmarkStatus> {
    const launchOptions = process.env['PERFORMANCE_CHROME_PATH']
        ? {headless: true, executablePath: process.env['PERFORMANCE_CHROME_PATH']}
        : {headless: true, channel: 'chrome' as const};
    const browser = await chromium.launch(launchOptions);
    try {
        const page = await browser.newPage({viewport: {width: 1280, height: 720}});
        const pageErrors: Error[] = [];
        page.on('pageerror', error => pageErrors.push(error));
        page.on('console', message => {
            if (message.type() === 'error') {
                console.error(`[benchmark-browser] ${message.text()}`);
            }
        });

        console.log(`[performance-benchmark] opening ${url}`);
        await page.goto(url, {waitUntil: 'load'});
        await page.waitForFunction(
            () => {
                const benchmarkWindow = window as typeof window & {
                    performanceBenchmark?: BenchmarkStatus;
                };
                return benchmarkWindow.performanceBenchmark?.status !== undefined
                    && benchmarkWindow.performanceBenchmark.status !== 'running';
            },
            undefined,
            {timeout: BENCHMARK_TIMEOUT_MS},
        );
        const status = await page.evaluate(() => {
            const benchmarkWindow = window as typeof window & {
                performanceBenchmark?: BenchmarkStatus;
            };
            return benchmarkWindow.performanceBenchmark;
        });
        if (!status) {
            throw new Error('Browser did not expose benchmark status');
        }
        if (status.status !== 'complete') {
            throw new Error(`Browser benchmark ended with status ${status.status}`);
        }
        if (status.name !== BENCHMARK_NAME || status.gitCommit !== gitCommit) {
            throw new Error(
                `Browser reported ${status.name}@${status.gitCommit}, expected `
                + `${BENCHMARK_NAME}@${gitCommit}`,
            );
        }
        if (pageErrors.length > 0) {
            throw new AggregateError(pageErrors, 'Browser page errors occurred');
        }
        return status;
    } finally {
        await browser.close();
    }
}

async function verifySavedBenchmark(gitCommit: string): Promise<void> {
    const {prisma} = await import('../db/prisma.js');
    try {
        const session = await prisma.performanceSession.findFirst({
            where: {benchmarkName: BENCHMARK_NAME, gitCommit},
            orderBy: {startedAt: 'desc'},
            include: {samples: {orderBy: {sequence: 'asc'}}},
        });
        if (!session) {
            throw new Error(`No saved benchmark session found for ${gitCommit}`);
        }
        if (session.samples.length !== EXPECTED_SAMPLE_COUNT) {
            throw new Error(
                `Saved session ${session.id} has ${session.samples.length} samples; `
                + `expected ${EXPECTED_SAMPLE_COUNT}`,
            );
        }

        const summaries = session.samples.map(sample => (
            PerformanceSummaryZ.parse(sample.payload)
        ));
        const expectedSequences = Array.from(
            {length: EXPECTED_SAMPLE_COUNT},
            (_, index) => index + 1,
        );
        const sequences = summaries.map(summary => summary.sequence);
        if (JSON.stringify(sequences) !== JSON.stringify(expectedSequences)) {
            throw new Error(`Saved sample sequence is incomplete: ${sequences.join(', ')}`);
        }

        const measured = summaries.slice(WARMUP_SAMPLE_COUNT);
        const average = (values: number[]): number => (
            Math.round(
                values.reduce((sum, value) => sum + value, 0) / values.length * 1_000,
            ) / 1_000
        );
        console.log('[performance-benchmark] saved benchmark', {
            benchmark: BENCHMARK_NAME,
            gitCommit,
            sessionId: session.id,
            samples: session.samples.length,
            measuredSamples: measured.length,
            averageEntities: average(measured.map(summary => (
                summary.counters.averageEntities ?? 0
            ))),
            fixedStepP95Ms: average(measured.map(summary => (
                summary.timings.fixedStepMs.p95 ?? 0
            ))),
            collisionP95Ms: average(measured.map(summary => (
                summary.timings.collisionMs.p95 ?? 0
            ))),
            renderP95Ms: average(measured.map(summary => (
                summary.timings.renderMs.p95 ?? 0
            ))),
        });
    } finally {
        await prisma.$disconnect();
    }
}

async function main(): Promise<void> {
    const gitCommit = cleanWorktreeCommit();
    if (!gitCommit) {
        process.exitCode = 1;
        return;
    }
    console.log(`[performance-benchmark] benchmarking commit ${gitCommit}`);

    runBuild();

    const performancePort = await availablePort();
    let gamePort = await availablePort();
    while (gamePort === performancePort) {
        gamePort = await availablePort();
    }
    const performanceUrl = `http://127.0.0.1:${performancePort}`;
    const gameUrl = `http://127.0.0.1:${gamePort}`;
    let performanceServer: ChildProcess | undefined;
    let gameServer: ChildProcess | undefined;

    try {
        performanceServer = startProcess(
            'performance server',
            ['run', 'server'],
            {...process.env, PERFORMANCE_PORT: String(performancePort)},
        );
        await waitForHttp('Performance server', performanceUrl, performanceServer);

        gameServer = startProcess(
            'game preview server',
            ['run', 'preview', '--', '--port', String(gamePort), '--strictPort'],
            {...process.env, PERFORMANCE_SERVER_URL: performanceUrl},
        );
        await waitForHttp('Game preview server', gameUrl, gameServer);

        const benchmarkUrl = `${gameUrl}/?perf=1&benchmark=${BENCHMARK_NAME}`;
        const status = await runBrowserBenchmark(benchmarkUrl, gitCommit);
        console.log('[performance-benchmark] browser workload complete', status);
        await verifySavedBenchmark(gitCommit);
    } finally {
        await Promise.all([
            stopProcess(gameServer),
            stopProcess(performanceServer),
        ]);
    }
}

void main().catch(error => {
    console.error('[performance-benchmark] failed', error);
    process.exitCode = 1;
});
