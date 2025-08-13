-- CreateTable
CREATE TABLE "service_category_changes" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "previousCategoryId" TEXT,
    "newCategoryId" TEXT NOT NULL,
    "changedById" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_category_changes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "service_category_changes" ADD CONSTRAINT "service_category_changes_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category_changes" ADD CONSTRAINT "service_category_changes_previousCategoryId_fkey" FOREIGN KEY ("previousCategoryId") REFERENCES "service_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category_changes" ADD CONSTRAINT "service_category_changes_newCategoryId_fkey" FOREIGN KEY ("newCategoryId") REFERENCES "service_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_category_changes" ADD CONSTRAINT "service_category_changes_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
