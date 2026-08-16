import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../generated/prisma/client.js';
import {getServerEnvironment} from '../environment.js';

const adapter = new PrismaPg({
    connectionString: getServerEnvironment().databaseUrl,
});

export const prisma = new PrismaClient({adapter});
