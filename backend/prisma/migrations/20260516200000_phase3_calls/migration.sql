-- Phase 3: Call model for Voice/Video signaling
CREATE TABLE "Call" (
    "id"             TEXT NOT NULL,
    "callerId"       TEXT NOT NULL,
    "calleeId"       TEXT NOT NULL,
    "conversationId" TEXT,
    "type"           TEXT NOT NULL DEFAULT 'audio',
    "status"         TEXT NOT NULL DEFAULT 'ringing',
    "startedAt"      TIMESTAMP(3),
    "endedAt"        TIMESTAMP(3),
    "duration"       INTEGER,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Call_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Call_callerId_idx" ON "Call"("callerId");
CREATE INDEX "Call_calleeId_idx" ON "Call"("calleeId");

ALTER TABLE "Call"
    ADD CONSTRAINT "Call_callerId_fkey"
    FOREIGN KEY ("callerId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Call"
    ADD CONSTRAINT "Call_calleeId_fkey"
    FOREIGN KEY ("calleeId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Call"
    ADD CONSTRAINT "Call_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
