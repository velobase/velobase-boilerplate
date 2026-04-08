import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { createLogger } from "@/lib/logger";

const logger = createLogger("repository");

/**
 * Repository Router
 * 
 * Manages GitHub repository connections for code-related features
 */
export const repositoryRouter = createTRPCRouter({
  // Connect a repository by URL
  connect: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        createProject: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate the URL format
      const githubUrlPattern = /^https?:\/\/(www\.)?github\.com\/[\w-]+\/[\w.-]+\/?$/;
      if (!githubUrlPattern.test(input.url)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid GitHub repository URL",
        });
      }

      // Extract owner and repo name
      const match = /github\.com\/([\w-]+)\/([\w.-]+)/.exec(input.url);
      if (!match?.[1] || !match[2]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not parse repository URL",
        });
      }

      const owner = match[1];
      const repo = match[2];
      const repoName = repo.replace(/\.git$/, "");
      const fullName = `${owner}/${repoName}`;
      const cleanUrl = `https://github.com/${fullName}`;

      // Get GitHub connection if exists
      const connection = await ctx.db.gitHubConnection.findUnique({
        where: { userId: ctx.session.user.id },
      });

      // Fetch repository details from GitHub
      let repoData: {
        private: boolean;
        description: string | null;
        default_branch: string;
        language: string | null;
      } | null = null;

      try {
        // Try public access first
        let response = await fetch(
          `https://api.github.com/repos/${fullName}`,
          {
            headers: {
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        logger.info({ status: response.status, repo: fullName }, 'GitHub public access attempt');

        // If 404 and user has connection, try with auth
        if (response.status === 404 && connection) {
          logger.info({ repo: fullName }, 'Trying authenticated access');
          response = await fetch(
            `https://api.github.com/repos/${fullName}`,
            {
              headers: {
                Authorization: `Bearer ${connection.accessToken}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
          logger.info({ status: response.status, repo: fullName }, 'GitHub authenticated access result');
        }

        if (!response.ok) {
          const errorBody = await response.text();
          logger.error({ status: response.status, repo: fullName, error: errorBody }, 'GitHub API error');
          
          // Parse error for better user feedback
          if (response.status === 404) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Repository not found or private. Please connect your GitHub account.',
            });
          }
          
          if (response.status === 403) {
            const orgName = fullName.split('/')[0];
            
            // Check if it's an organization access restriction
            if (errorBody.includes('organization has enabled OAuth App access restrictions')) {
              throw new TRPCError({
                code: 'FORBIDDEN',
                message: JSON.stringify({
                  type: 'org_restriction',
                  organization: orgName,
                  message: `Access request sent to ${orgName} organization administrators. Please wait for approval and try again.`,
                }),
              });
            }
            
            // Non-member or other 403 errors
            throw new TRPCError({
              code: 'FORBIDDEN',
              message: JSON.stringify({
                type: 'forbidden',
                organization: orgName,
                message: `Unable to access this repository. You may not be a member of the ${orgName} organization or don't have sufficient permissions.`,
              }),
            });
          }
          
          // Other errors
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to access repository (HTTP ${response.status})`,
          });
        }

        repoData = await response.json() as {
          private: boolean;
          description: string | null;
          default_branch: string;
          language: string | null;
        };
        
        logger.info({ repo: fullName, isPrivate: repoData.private }, 'Successfully fetched repository');
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error({ error, repo: fullName }, 'Unexpected error fetching repository');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to fetch repository from GitHub: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }

      // Store/update in database
      const githubRepo = await ctx.db.gitHubRepository.upsert({
        where: {
          userId_owner_name: {
            userId: ctx.session.user.id,
            owner,
            name: repoName,
          },
        },
        create: {
          userId: ctx.session.user.id,
          owner,
          name: repoName,
          fullName,
          url: cleanUrl,
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private,
          description: repoData.description,
          language: repoData.language,
          indexStatus: 'pending',
        },
        update: {
          defaultBranch: repoData.default_branch,
          isPrivate: repoData.private,
          description: repoData.description,
          language: repoData.language,
          lastSyncedAt: new Date(),
        },
      });

      // Optionally create a project
      let project = null;
      if (input.createProject) {
        project = await ctx.db.project.create({
          data: {
            userId: ctx.session.user.id,
            name: repoName,
            description: repoData.description ?? `GitHub repository: ${fullName}`,
            githubRepositoryId: githubRepo.id,
          },
        });
      }

      return {
        id: githubRepo.id,
        url: githubRepo.url,
        owner: githubRepo.owner,
        name: githubRepo.name,
        fullName: githubRepo.fullName,
        isPrivate: githubRepo.isPrivate,
        indexStatus: githubRepo.indexStatus,
        projectId: project?.id,
      };
    }),

  // List user's connected repositories
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['pending', 'indexing', 'ready', 'error']).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const repos = await ctx.db.gitHubRepository.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input?.status && { indexStatus: input.status }),
        },
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          projects: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return repos.map(repo => ({
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        url: repo.url,
        isPrivate: repo.isPrivate,
        description: repo.description,
        language: repo.language,
        indexStatus: repo.indexStatus,
        indexedAt: repo.indexedAt,
        lastSyncedAt: repo.lastSyncedAt,
        projects: repo.projects,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
      }));
    }),

  // Get repository details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const repo = await ctx.db.gitHubRepository.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
        include: {
          projects: true,
        },
      });

      if (!repo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repository not found",
        });
      }

      return {
        id: repo.id,
        owner: repo.owner,
        name: repo.name,
        fullName: repo.fullName,
        url: repo.url,
        isPrivate: repo.isPrivate,
        description: repo.description,
        language: repo.language,
        defaultBranch: repo.defaultBranch,
        indexStatus: repo.indexStatus,
        indexedAt: repo.indexedAt,
        lastSyncedAt: repo.lastSyncedAt,
        metadata: repo.metadata,
        projects: repo.projects,
        createdAt: repo.createdAt,
        updatedAt: repo.updatedAt,
      };
    }),

  // Disconnect/remove a repository
  disconnect: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const repo = await ctx.db.gitHubRepository.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.user.id,
        },
      });

      if (!repo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Repository not found",
        });
      }

      // Delete the repository (cascade will handle projects)
      await ctx.db.gitHubRepository.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});

