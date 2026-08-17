ALTER TABLE "performance_session"
    ADD COLUMN "benchmark_name" TEXT,
    ADD COLUMN "git_commit" TEXT;

CREATE INDEX "performance_session_benchmark_name_git_commit_idx"
    ON "performance_session"("benchmark_name", "git_commit");
