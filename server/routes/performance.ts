import {Router} from 'express';
import type {NextFunction, Request, Response} from 'express';
import type {Prisma} from '../generated/prisma/client.js';
import {PerformanceSummaryZ} from '../../shared/performance.js';
import {prisma} from '../db/prisma.js';

const performanceRouter = Router();

performanceRouter.post(
    '/',
    async (request: Request, response: Response, next: NextFunction) => {
        const parsedSummary = PerformanceSummaryZ.safeParse(request.body);
        if (!parsedSummary.success) {
            return response.status(400).json({
                error: 'Invalid performance summary',
                issues: parsedSummary.error.issues,
            });
        }

        const summary = parsedSummary.data;
        const capturedAt = new Date(summary.capturedAt);

        try {
            const sample = await prisma.$transaction(async transaction => {
                await transaction.performanceSession.upsert({
                    where: {id: summary.sessionId},
                    create: {
                        id: summary.sessionId,
                        sourceUrl: summary.environment.sourceUrl,
                        userAgent: summary.environment.userAgent,
                        startedAt: capturedAt,
                        lastSeenAt: capturedAt,
                    },
                    update: {
                        sourceUrl: summary.environment.sourceUrl,
                        userAgent: summary.environment.userAgent,
                        lastSeenAt: capturedAt,
                    },
                });

                return transaction.performanceSample.upsert({
                    where: {
                        sessionId_sequence: {
                            sessionId: summary.sessionId,
                            sequence: summary.sequence,
                        },
                    },
                    create: {
                        sessionId: summary.sessionId,
                        sequence: summary.sequence,
                        capturedAt,
                        durationMs: summary.window.durationMs,
                        payload: summary as Prisma.InputJsonValue,
                    },
                    update: {
                        capturedAt,
                        durationMs: summary.window.durationMs,
                        payload: summary as Prisma.InputJsonValue,
                    },
                });
            });

            console.log(
                `[performance-server] saved sample ${sample.sequence} `
                + `for session ${sample.sessionId} (database id ${sample.id})`,
            );

            return response.status(201).json({
                id: sample.id,
                sessionId: sample.sessionId,
                sequence: sample.sequence,
            });
        } catch (error) {
            return next(error);
        }
    },
);

export default performanceRouter;
