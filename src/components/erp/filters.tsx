"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export function BranchFilter({
  branches,
}: {
  branches: { id: number; name: string; code: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const current = params.get("branch") ?? "all";

  return (
    <Select
      value={current}
      onValueChange={(value) =>
        startTransition(() => {
          const next = new URLSearchParams(params.toString());
          if (value === "all") next.delete("branch");
          else next.set("branch", value);
          router.push(`?${next.toString()}`);
        })
      }
    >
      <SelectTrigger className="h-9 w-[190px] bg-card" aria-label="Filter by showroom">
        {pending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <SelectValue placeholder="All showrooms" />
        )}
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All showrooms</SelectItem>
        {branches.map((branch) => (
          <SelectItem key={branch.id} value={String(branch.id)}>
            {branch.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function RefreshButton({ label = "Refresh" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 bg-card"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      <RefreshCw className={`mr-2 size-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Refreshing…" : label}
    </Button>
  );
}
