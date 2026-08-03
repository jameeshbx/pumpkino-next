-- CreateEnum
CREATE TYPE "ItinerarySource" AS ENUM ('MANUAL', 'AI_DRAFT');

-- CreateTable
CREATE TABLE "Itinerary" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "overview" TEXT,
    "hotelName" TEXT,
    "hotelCategory" TEXT,
    "days" JSONB NOT NULL DEFAULT '[]',
    "source" "ItinerarySource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Itinerary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Itinerary_leadId_key" ON "Itinerary"("leadId");

-- AddForeignKey
ALTER TABLE "Itinerary" ADD CONSTRAINT "Itinerary_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
