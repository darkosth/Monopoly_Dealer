CREATE TABLE "HeadsUpGenerationJob" (
    "id" TEXT NOT NULL,
    "requestName" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "instructions" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" JSONB,
    "errorCode" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "workerId" TEXT,
    "importedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeadsUpGenerationJob_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HeadsUpGenerationJob_status_check" CHECK ("status" IN ('PENDING', 'RUNNING', 'READY', 'FAILED', 'IMPORTED', 'CANCELLED')),
    CONSTRAINT "HeadsUpGenerationJob_request_name_length" CHECK (char_length("requestName") BETWEEN 1 AND 80),
    CONSTRAINT "HeadsUpGenerationJob_explanation_length" CHECK (char_length("explanation") BETWEEN 1 AND 600),
    CONSTRAINT "HeadsUpGenerationJob_instructions_length" CHECK (char_length("instructions") <= 1200),
    CONSTRAINT "HeadsUpGenerationJob_attempt_count" CHECK ("attemptCount" BETWEEN 0 AND 2)
);

ALTER TABLE "HeadsUpCategory" ADD COLUMN "generationJobId" TEXT;

CREATE INDEX "HeadsUpGenerationJob_status_createdAt_idx" ON "HeadsUpGenerationJob"("status", "createdAt");
CREATE INDEX "HeadsUpGenerationJob_createdAt_idx" ON "HeadsUpGenerationJob"("createdAt");
CREATE UNIQUE INDEX "HeadsUpGenerationJob_one_active_idx" ON "HeadsUpGenerationJob" ((true)) WHERE "status" IN ('PENDING', 'RUNNING');
CREATE UNIQUE INDEX "HeadsUpCategory_generationJobId_key" ON "HeadsUpCategory"("generationJobId");

ALTER TABLE "HeadsUpCategory"
ADD CONSTRAINT "HeadsUpCategory_generationJobId_fkey"
FOREIGN KEY ("generationJobId") REFERENCES "HeadsUpGenerationJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HeadsUpGenerationJob" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE "HeadsUpGenerationJob" FROM anon, authenticated;
