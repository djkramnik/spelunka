import 'dotenv/config';

import {execFileSync} from 'node:child_process';
import {prisma} from '../db/prisma.js';

function currentGitCommit(): string {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
    }).trim();
}

async function main(): Promise<void> {
    const benchmarkName = process.argv[2] ?? 'idle-start';
    const gitCommit = process.argv[3] ?? currentGitCommit();

    const session = await prisma.performanceSession.findFirst({
        where: {benchmarkName, gitCommit},
        orderBy: {startedAt: 'desc'},
        include: {
            samples: {
                orderBy: {sequence: 'asc'},
            },
        },
    });

    if (!session) {
        throw new Error(
            `No ${benchmarkName} benchmark found for commit ${gitCommit}`,
        );
    }

    console.log(JSON.stringify(session, null, 2));
}

void main().catch(error => {
    console.error('[performance-query] unable to load benchmark', error);
    process.exitCode = 1;
}).finally(async () => {
    await prisma.$disconnect();
});
