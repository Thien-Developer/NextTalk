-- Make phone optional
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;

-- Add Google OAuth fields
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;

-- Unique constraints
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
