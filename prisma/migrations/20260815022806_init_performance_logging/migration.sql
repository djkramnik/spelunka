-- CreateTable
CREATE TABLE "PerformanceSession" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceSample" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" DOUBLE PRECISION NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PerformanceSample_capturedAt_idx" ON "PerformanceSample"("capturedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceSample_sessionId_sequence_key" ON "PerformanceSample"("sessionId", "sequence");

-- AddForeignKey
ALTER TABLE "PerformanceSample" ADD CONSTRAINT "PerformanceSample_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PerformanceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
