import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Anchor, Ship, User } from "lucide-react";
import Link from "next/link";

export function PersonaPicker() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100">
          <Anchor className="h-6 w-6 text-sky-600" />
        </div>
        <CardTitle>Welcome to MarinaHub</CardTitle>
        <CardDescription>How would you like to continue?</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Link href="/account/login" className="block">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-4 px-4 py-6 text-left hover:border-sky-300 hover:bg-sky-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
              <User className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="font-semibold">Continue as Customer</p>
              <p className="text-sm font-normal text-muted-foreground">
                Book boats, manage trips & favorites
              </p>
            </div>
          </Button>
        </Link>
        <Link href="/marina/login" className="block">
          <Button
            variant="outline"
            className="h-auto w-full justify-start gap-4 px-4 py-6 text-left hover:border-slate-400 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <Ship className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="font-semibold">Continue as Marina</p>
              <p className="text-sm font-normal text-muted-foreground">
                Manage fleet, bookings & operations
              </p>
            </div>
          </Button>
        </Link>
        <p className="pt-2 text-center text-sm text-muted-foreground">
          <Link href="/" className="text-sky-600 hover:underline">
            Back to home
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
