-- Baseline for the existing Monopoly and Chameleon schema.
-- This migration is marked as applied on the original database and executed
-- normally when provisioning a new empty database.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "public"."ChameleonPlayer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasVoted" BOOLEAN NOT NULL DEFAULT false,
    "isParticipating" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ChameleonPlayer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ChameleonSession" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'lobby',
    "category" TEXT,
    "secretWord" TEXT,
    "chameleonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "maxVotesAllowed" INTEGER NOT NULL DEFAULT 1,
    "votesUsed" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ChameleonSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ChameleonVote" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "votedTargetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChameleonVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."GameSession" (
    "id" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "freeParkingAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."PaymentRequest" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetPlayerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameSessionId" TEXT NOT NULL,
    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."Player" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 1500,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameSessionId" TEXT NOT NULL,
    "pin" TEXT NOT NULL DEFAULT '0000',
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."TransactionLog" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "senderId" TEXT,
    "receiverId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gameSessionId" TEXT NOT NULL,
    CONSTRAINT "TransactionLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChameleonSession_roomCode_key" ON "public"."ChameleonSession"("roomCode" ASC);
CREATE UNIQUE INDEX "ChameleonVote_sessionId_voterId_key" ON "public"."ChameleonVote"("sessionId" ASC, "voterId" ASC);
CREATE UNIQUE INDEX "GameSession_roomCode_key" ON "public"."GameSession"("roomCode" ASC);

ALTER TABLE "public"."ChameleonPlayer" ADD CONSTRAINT "ChameleonPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ChameleonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ChameleonVote" ADD CONSTRAINT "ChameleonVote_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ChameleonSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."ChameleonVote" ADD CONSTRAINT "ChameleonVote_votedTargetId_fkey" FOREIGN KEY ("votedTargetId") REFERENCES "public"."ChameleonPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."ChameleonVote" ADD CONSTRAINT "ChameleonVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "public"."ChameleonPlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."PaymentRequest" ADD CONSTRAINT "PaymentRequest_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "public"."GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Player" ADD CONSTRAINT "Player_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "public"."GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."TransactionLog" ADD CONSTRAINT "TransactionLog_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "public"."GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
