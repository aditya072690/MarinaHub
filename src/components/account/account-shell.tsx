"use client";

import {
  AccountMobileSignOut,
  AccountSidebarDesktop,
  AccountSidebarMobileTabs,
} from "@/components/account/sidebar";

export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-stretch">
      <AccountSidebarMobileTabs />
      <AccountSidebarDesktop />
      <div className="col-start-1 row-start-2 flex min-w-0 flex-col bg-white lg:col-start-2 lg:row-start-1">
        <div className="flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
        <AccountMobileSignOut />
      </div>
    </div>
  );
}
