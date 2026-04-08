"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Example page component demonstrating tRPC integration.
 * Replace with your actual feature UI.
 */
export function ExamplePage() {
  const [title, setTitle] = useState("");

  const { data, isLoading } = api.example.list.useQuery();
  const createMutation = api.example.create.useMutation({
    onSuccess: () => setTitle(""),
  });

  return (
    <div className="container mx-auto max-w-2xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle>Example Module</CardTitle>
          <CardDescription>
            This is a template module. Replace it with your own business logic.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (title.trim()) {
                createMutation.mutate({ title: title.trim() });
              }
            }}
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title..."
              className="flex-1"
            />
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </form>

          {isLoading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : data?.items.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No items yet. Create one above to get started.
            </p>
          ) : (
            <ul className="space-y-2">
              {data?.items.map((item: { id: string; title: string }) => (
                <li key={item.id} className="p-3 rounded-md border text-sm">
                  {item.title}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
