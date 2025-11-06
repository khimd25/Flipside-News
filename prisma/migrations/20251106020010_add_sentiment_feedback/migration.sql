-- CreateEnum
CREATE TYPE "UserSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateTable
CREATE TABLE "SentimentFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleUrl" TEXT NOT NULL,
    "sourceName" TEXT,
    "userSentiment" "UserSentiment" NOT NULL,
    "userScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentimentFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SentimentFeedback_userId_articleUrl_key" ON "SentimentFeedback"("userId", "articleUrl");

-- AddForeignKey
ALTER TABLE "SentimentFeedback" ADD CONSTRAINT "SentimentFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
