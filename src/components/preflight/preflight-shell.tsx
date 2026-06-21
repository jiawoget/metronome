import { CircleDashed, Construction, Guitar, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const boundaries = [
  "App routes",
  "Domain models",
  "Services",
  "Infrastructure adapters",
  "Stores and hooks",
  "Smoke tests"
] as const;

export function PreflightShell() {
  return (
    <main
      aria-labelledby="preflight-title"
      className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-10"
    >
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1 text-sm font-medium text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
              v0 preflight
            </p>
            <h1 id="preflight-title" className="text-3xl font-semibold tracking-normal sm:text-4xl">
              Metronome Practice
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
              Engineering foundation is in place for separate module verification. Product modules
              are intentionally unavailable in this build.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 shadow-soft">
            <CircleDashed className="h-5 w-5 text-primary" aria-hidden="true" />
            <span className="text-sm font-medium">Smoke-ready shell</span>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Guitar className="h-5 w-5 text-primary" aria-hidden="true" />
                Foundation Boundaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {boundaries.map((boundary) => (
                  <div
                    key={boundary}
                    className="flex min-h-14 items-center rounded-md border border-border bg-muted px-4 text-sm font-medium"
                  >
                    {boundary}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Construction className="h-5 w-5 text-accent" aria-hidden="true" />
                Module Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-muted-foreground">
                This placeholder exists only for install, build, unit, and browser smoke checks.
                Metronome playback, recording, sheet import, sheet viewing, references, and settings
                remain out of scope for preflight.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
