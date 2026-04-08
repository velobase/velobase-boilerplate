'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Folder, MoreHorizontal, Settings, Archive, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProjectsTableProps {
  projects: Project[];
  onCreateClick?: () => void;
}

export function ProjectsTable({ projects, onCreateClick }: ProjectsTableProps) {
  const router = useRouter();

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 p-4 rounded-full bg-muted/50">
          <Folder className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          Create your first project to organize your conversations and files
        </p>
        <Button onClick={onCreateClick}>
          Create Project
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Project</TableHead>
            <TableHead className="w-[25%]">Last Activity</TableHead>
            <TableHead className="w-[30%]">Recent Topic</TableHead>
            <TableHead className="w-[5%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow 
              key={project.id}
              className="cursor-pointer hover:bg-muted/30"
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              {/* Project Name + Description */}
              <TableCell>
                <div className="flex items-start gap-3">
                  <Folder className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium leading-tight">
                      {project.name}
                    </div>
                    {project.description && (
                      <div className="text-sm text-muted-foreground leading-tight mt-1 truncate">
                        {project.description}
                      </div>
                    )}
                  </div>
                </div>
              </TableCell>

              {/* Last Activity */}
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
                </div>
              </TableCell>

              {/* Recent Topic - 暂时显示占位符 */}
              <TableCell>
                <div className="text-sm text-muted-foreground italic">
                  No recent activity
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}`)}>
                      <Folder className="h-4 w-4 mr-2" />
                      Open Project
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

