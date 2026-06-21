import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RouteShellProps = {
  title: string;
  eyebrow: string;
  description: string;
  icon: LucideIcon;
  primaryHref?: string;
  primaryLabel?: string;
  details: string[];
};

export function RouteShell({
  title,
  eyebrow,
  description,
  icon: Icon,
  primaryHref = "/",
  primaryLabel = "Back to Home",
  details
}: RouteShellProps) {
  return (
    <section aria-labelledby="route-shell-title" className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>
          <h1 id="route-shell-title" className="text-2xl font-semibold tracking-normal sm:text-3xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Module Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm leading-6 text-muted-foreground">
                This route is available for navigation now. The feature workflow will be implemented
                in its assigned v0 module.
              </p>
              <ul className="mt-4 grid gap-2 text-sm text-foreground sm:grid-cols-2">
                {details.map((detail) => (
                  <li key={detail} className="rounded-md border border-border bg-muted px-3 py-2">
                    {detail}
                  </li>
                ))}
              </ul>
            </div>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
