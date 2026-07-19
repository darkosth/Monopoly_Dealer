CREATE TABLE "HeadsUpCategory" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nameEs" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HeadsUpCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HeadsUpOption" (
  "id" TEXT NOT NULL,
  "textEs" TEXT NOT NULL,
  "textEn" TEXT NOT NULL,
  "imageUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "HeadsUpOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HeadsUpCategory_slug_key" ON "HeadsUpCategory"("slug");
CREATE INDEX "HeadsUpCategory_isActive_sortOrder_idx" ON "HeadsUpCategory"("isActive", "sortOrder");
CREATE INDEX "HeadsUpOption_categoryId_isActive_sortOrder_idx" ON "HeadsUpOption"("categoryId", "isActive", "sortOrder");
ALTER TABLE "HeadsUpOption" ADD CONSTRAINT "HeadsUpOption_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "HeadsUpCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HeadsUpCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HeadsUpOption" ENABLE ROW LEVEL SECURITY;
