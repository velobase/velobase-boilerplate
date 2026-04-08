-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "github_repository_id" TEXT;

-- CreateTable
CREATE TABLE "github_repositories" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "default_branch" TEXT NOT NULL DEFAULT 'main',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "language" TEXT,
    "index_status" TEXT NOT NULL DEFAULT 'pending',
    "indexed_at" TIMESTAMP(3),
    "last_synced_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "github_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "github_repositories_user_id_idx" ON "github_repositories"("user_id");

-- CreateIndex
CREATE INDEX "github_repositories_user_id_index_status_idx" ON "github_repositories"("user_id", "index_status");

-- CreateIndex
CREATE INDEX "github_repositories_full_name_idx" ON "github_repositories"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "github_repositories_user_id_owner_name_key" ON "github_repositories"("user_id", "owner", "name");

-- CreateIndex
CREATE INDEX "projects_github_repository_id_idx" ON "projects"("github_repository_id");

-- AddForeignKey
ALTER TABLE "github_repositories" ADD CONSTRAINT "github_repositories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_github_repository_id_fkey" FOREIGN KEY ("github_repository_id") REFERENCES "github_repositories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
