-- Rename the existing tables in place so collected sessions and samples survive.
ALTER TABLE "PerformanceSession" RENAME TO "performance_session";
ALTER TABLE "PerformanceSample" RENAME TO "performance_sample";

-- Keep PostgreSQL-managed object names consistent with the physical tables.
ALTER TABLE "performance_session"
    RENAME CONSTRAINT "PerformanceSession_pkey" TO "performance_session_pkey";
ALTER TABLE "performance_sample"
    RENAME CONSTRAINT "PerformanceSample_pkey" TO "performance_sample_pkey";
ALTER TABLE "performance_sample"
    RENAME CONSTRAINT "PerformanceSample_sessionId_fkey"
    TO "performance_sample_sessionId_fkey";
ALTER INDEX "PerformanceSample_capturedAt_idx"
    RENAME TO "performance_sample_capturedAt_idx";
ALTER INDEX "PerformanceSample_sessionId_sequence_key"
    RENAME TO "performance_sample_sessionId_sequence_key";
ALTER SEQUENCE "PerformanceSample_id_seq"
    RENAME TO "performance_sample_id_seq";
