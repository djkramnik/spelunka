import {z} from 'zod';

const DEFAULT_DATABASE_URL =
    'postgresql://postgres:elephant@localhost:5432/spelunka';

const ServerEnvironmentZ = z.object({
    port: z.number().int().positive(),
    databaseUrl: z.string().url(),
});

export type ServerEnvironment = z.infer<typeof ServerEnvironmentZ>;

let serverEnvironment: ServerEnvironment | null = null;

export function getServerEnvironment(): ServerEnvironment {
    if (serverEnvironment) {
        return serverEnvironment;
    }

    const parsedEnvironment = ServerEnvironmentZ.safeParse({
        port: Number(process.env['PERFORMANCE_PORT'] ?? 3001),
        databaseUrl: process.env['DATABASE_URL']
            ?? DEFAULT_DATABASE_URL,
    });

    if (!parsedEnvironment.success) {
        console.error('Invalid server environment', parsedEnvironment.error);
        throw new Error('Invalid performance server environment');
    }

    serverEnvironment = parsedEnvironment.data;
    return serverEnvironment;
}
