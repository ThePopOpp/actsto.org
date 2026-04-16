-- CreateTable
CREATE TABLE "AdminIntegrationSettings" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminIntegrationSettings_pkey" PRIMARY KEY ("key")
);
