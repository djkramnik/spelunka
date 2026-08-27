import {resolve} from 'node:path';
import {importSpelunkyHd} from '../spelunky-hd-import.js';

interface CliOptions {
    readonly sourceRoot: string;
    readonly outputRoot: string;
}

function usage(): string {
    return [
        'Import selected graphics from a user-owned Spelunky HD Steam depot.',
        '',
        'Usage:',
        '  npm run graphics:import:spelunky-hd -- --source <depot-dir> [--output <project-dir>]',
        '',
        'Options:',
        '  --source   Directory containing Data/Textures/alltex.wad.',
        '             May also be set with SPELUNKY_HD_DIR.',
        '  --output   Spelunka project/output root (default: current directory).',
        '  --help     Print this help.',
    ].join('\n');
}

function readValue(args: readonly string[], index: number, option: string): string {
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
        throw new Error(`${option} requires a value`);
    }
    return value;
}

function parseArgs(args: readonly string[]): CliOptions | null {
    let sourceRoot = process.env['SPELUNKY_HD_DIR'];
    let outputRoot = process.cwd();

    for (let index = 0; index < args.length; index += 1) {
        const argument = args[index];
        switch (argument) {
            case '--help':
                return null;
            case '--source':
                sourceRoot = readValue(args, index, '--source');
                index += 1;
                break;
            case '--output':
                outputRoot = readValue(args, index, '--output');
                index += 1;
                break;
            default:
                throw new Error(`Unknown option: ${argument ?? ''}`);
        }
    }

    if (sourceRoot === undefined || sourceRoot.trim() === '') {
        throw new Error('--source or SPELUNKY_HD_DIR is required');
    }
    return {
        sourceRoot: resolve(sourceRoot),
        outputRoot: resolve(outputRoot),
    };
}

async function main(): Promise<void> {
    try {
        const options = parseArgs(process.argv.slice(2));
        if (options === null) {
            console.log(usage());
            return;
        }
        const result = await importSpelunkyHd(options);
        console.log('Spelunky HD graphics import complete.');
        console.log(`Player PNG: ${result.playerImagePath}`);
        console.log(`Player metadata: ${result.playerSpecPath}`);
        console.log(`Enemy PNG: ${result.enemyImagePath}`);
        console.log(`Enemy metadata: ${result.enemySpecPath}`);
        console.log(`Mines terrain PNG: ${result.terrainImagePath}`);
        console.log(`Import report: ${result.reportPath}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Spelunky HD graphics import failed: ${message}`);
        console.error('');
        console.error(usage());
        process.exitCode = 1;
    }
}

await main();
