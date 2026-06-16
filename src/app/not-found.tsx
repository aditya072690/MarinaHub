import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Anchor } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Anchor className="mb-4 h-12 w-12 text-sky-600" />
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The marina, boat, or page you&apos;re looking for doesn&apos;t exist or may have been
        removed.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={cn(buttonVariants(), "bg-sky-600 hover:bg-sky-700")}>
          Go home
        </Link>
        <Link href="/search" className={buttonVariants({ variant: "outline" })}>
          Search boats
        </Link>
      </div>
    </div>
  );
}
