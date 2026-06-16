"use client";

import { formatHourlyRate } from "@/lib/currency/format";
import { deleteBoat } from "@/actions/boats";
import { BoatFormDialog } from "@/components/dashboard/boat-form-dialog";
import {
  DashCard,
  DashCardContent,
  DashPageHeader,
  DashSection,
} from "@/components/dashboard/dash-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canManageBoats } from "@/lib/auth/permissions";
import { resolveBoatImageUrl } from "@/lib/images/stock";
import { cn } from "@/lib/utils";
import { useMarina } from "@/providers/marina-provider";
import type { Boat, BoatStatus } from "@/types/database";
import { Pencil, Plus, Search, Ship, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_CLASS: Record<BoatStatus, string> = {
  active: "fleet-status--active",
  inactive: "fleet-status--inactive",
  maintenance: "fleet-status--maintenance",
};

type FleetSort =
  | "name-asc"
  | "name-desc"
  | "rate-asc"
  | "rate-desc"
  | "capacity-asc"
  | "capacity-desc";

function filterAndSortBoats(
  boats: Boat[],
  {
    search,
    statusFilter,
    typeFilter,
    sort,
  }: {
    search: string;
    statusFilter: BoatStatus | "all";
    typeFilter: string;
    sort: FleetSort;
  }
) {
  const query = search.trim().toLowerCase();

  let result = boats.filter((boat) => {
    if (statusFilter !== "all" && boat.status !== statusFilter) return false;
    if (typeFilter !== "all" && (boat.boat_type ?? "") !== typeFilter) return false;
    if (!query) return true;

    const haystack = [boat.name, boat.boat_type ?? ""]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });

  result = [...result].sort((a, b) => {
    switch (sort) {
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "rate-asc":
        return Number(a.hourly_rate) - Number(b.hourly_rate);
      case "rate-desc":
        return Number(b.hourly_rate) - Number(a.hourly_rate);
      case "capacity-asc":
        return a.capacity - b.capacity;
      case "capacity-desc":
        return b.capacity - a.capacity;
      case "name-asc":
      default:
        return a.name.localeCompare(b.name);
    }
  });

  return result;
}

function FleetFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  sort,
  onSortChange,
  boatTypes,
  filteredCount,
  totalCount,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BoatStatus | "all";
  onStatusFilterChange: (value: BoatStatus | "all") => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  sort: FleetSort;
  onSortChange: (value: FleetSort) => void;
  boatTypes: string[];
  filteredCount: number;
  totalCount: number;
}) {
  const hasFilters =
    search.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  return (
    <div className="fleet-toolbar">
      <div className="fleet-toolbar-search relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B88A0]" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name or type..."
          className="h-10 border-[rgba(11,31,58,0.12)] bg-white pl-9"
        />
      </div>

      <Select
        value={statusFilter}
        onValueChange={(value) =>
          onStatusFilterChange((value ?? "all") as BoatStatus | "all")
        }
      >
        <SelectTrigger className="fleet-toolbar-select h-10">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>

      <Select value={typeFilter} onValueChange={(value) => onTypeFilterChange(value ?? "all")}>
        <SelectTrigger className="fleet-toolbar-select h-10">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {boatTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sort} onValueChange={(value) => onSortChange((value ?? "name-asc") as FleetSort)}>
        <SelectTrigger className="fleet-toolbar-select h-10">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name-asc">Name (A–Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z–A)</SelectItem>
          <SelectItem value="rate-asc">Rate (low to high)</SelectItem>
          <SelectItem value="rate-desc">Rate (high to low)</SelectItem>
          <SelectItem value="capacity-asc">Capacity (low to high)</SelectItem>
          <SelectItem value="capacity-desc">Capacity (high to low)</SelectItem>
        </SelectContent>
      </Select>

      <p className="fleet-toolbar-meta">
        {hasFilters
          ? `Showing ${filteredCount} of ${totalCount}`
          : `${totalCount} vessel${totalCount === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}

function FleetStatusBadge({ status }: { status: BoatStatus }) {
  return (
    <span className={cn("fleet-status", STATUS_CLASS[status])}>{status}</span>
  );
}

function BoatThumbnail({
  boat,
  large = false,
}: {
  boat: Boat;
  large?: boolean;
}) {
  const imageUrl = resolveBoatImageUrl(boat.image_urls?.[0]);

  return (
    <div className={cn("fleet-thumb", large && "fleet-thumb--lg")}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes={large ? "72px" : "44px"}
        />
      ) : (
        <div className="fleet-thumb-fallback">
          <Ship className={large ? "h-6 w-6" : "h-4 w-4"} />
        </div>
      )}
    </div>
  );
}

function FleetSummary({ boats }: { boats: Boat[] }) {
  const stats = useMemo(() => {
    const active = boats.filter((boat) => boat.status === "active").length;
    const capacity = boats.reduce((sum, boat) => sum + boat.capacity, 0);
    const avgRate =
      boats.length > 0
        ? boats.reduce((sum, boat) => sum + Number(boat.hourly_rate), 0) /
          boats.length
        : 0;

    return { total: boats.length, active, capacity, avgRate };
  }, [boats]);

  return (
    <div className="dash-insights-grid dash-insights-grid--four">
      <div className="dash-insight-card">
        <div className="dash-insight-icon">
          <Ship className="h-4 w-4" />
        </div>
        <p className="dash-insight-label">Total boats</p>
        <p className="dash-insight-value">{stats.total}</p>
      </div>
      <div className="dash-insight-card">
        <div className="dash-insight-icon">
          <Ship className="h-4 w-4" />
        </div>
        <p className="dash-insight-label">Active</p>
        <p className="dash-insight-value">{stats.active}</p>
      </div>
      <div className="dash-insight-card">
        <div className="dash-insight-icon">
          <Users className="h-4 w-4" />
        </div>
        <p className="dash-insight-label">Guest capacity</p>
        <p className="dash-insight-value">{stats.capacity}</p>
      </div>
      <div className="dash-insight-card">
        <div className="dash-insight-icon">
          <span className="text-sm font-bold leading-none">₹</span>
        </div>
        <p className="dash-insight-label">Avg hourly rate</p>
        <p className="dash-insight-value text-[1.375rem]">
          {formatHourlyRate(stats.avgRate)}
        </p>
      </div>
    </div>
  );
}

function FleetDesktopTable({
  boats,
  canManage,
  onEdit,
  onDelete,
}: {
  boats: Boat[];
  canManage: boolean;
  onEdit: (boat: Boat) => void;
  onDelete: (boat: Boat) => void;
}) {
  return (
    <div className="fleet-table-wrap">
      <table className="fleet-table">
        <thead>
          <tr>
            <th>Boat</th>
            <th>Type</th>
            <th>Capacity</th>
            <th>Rate</th>
            <th>Status</th>
            {canManage && <th className="text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {boats.map((boat) => (
            <tr key={boat.id}>
              <td>
                <div className="fleet-boat-cell">
                  <BoatThumbnail boat={boat} />
                  <div className="min-w-0">
                    <p className="fleet-boat-name truncate">{boat.name}</p>
                    {boat.min_booking_hours > 0 && (
                      <p className="fleet-boat-meta">
                        {boat.min_booking_hours}h minimum
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <span className="fleet-type">{boat.boat_type ?? "—"}</span>
              </td>
              <td>
                <span className="fleet-capacity">{boat.capacity} guests</span>
              </td>
              <td>
                <span className="fleet-rate">
                  {formatHourlyRate(Number(boat.hourly_rate))}
                </span>
              </td>
              <td>
                <FleetStatusBadge status={boat.status} />
              </td>
              {canManage && (
                <td>
                  <div className="fleet-actions justify-end">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="fleet-action-btn h-9 w-9"
                      aria-label={`Edit ${boat.name}`}
                      onClick={() => onEdit(boat)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="fleet-action-btn fleet-action-btn--danger h-9 w-9"
                      aria-label={`Delete ${boat.name}`}
                      onClick={() => onDelete(boat)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FleetMobileCard({
  boat,
  canManage,
  onEdit,
  onDelete,
}: {
  boat: Boat;
  canManage: boolean;
  onEdit: (boat: Boat) => void;
  onDelete: (boat: Boat) => void;
}) {
  return (
    <article className="fleet-mobile-card">
      <div className="fleet-mobile-card-top">
        <BoatThumbnail boat={boat} large />
        <div className="fleet-mobile-body">
          <div className="fleet-mobile-title-row">
            <h3 className="fleet-mobile-title">{boat.name}</h3>
            <FleetStatusBadge status={boat.status} />
          </div>
          <p className="mt-1 text-sm capitalize text-[#4A6580]">
            {boat.boat_type ?? "Unspecified type"}
          </p>
        </div>
      </div>

      <div className="fleet-mobile-details">
        <div className="fleet-mobile-detail">
          <span className="fleet-mobile-detail-label">Capacity</span>
          <span className="fleet-mobile-detail-value">{boat.capacity} guests</span>
        </div>
        <div className="fleet-mobile-detail">
          <span className="fleet-mobile-detail-label">Hourly rate</span>
          <span className="fleet-mobile-detail-value">
            {formatHourlyRate(Number(boat.hourly_rate))}
          </span>
        </div>
        {boat.min_booking_hours > 0 && (
          <div className="fleet-mobile-detail">
            <span className="fleet-mobile-detail-label">Minimum</span>
            <span className="fleet-mobile-detail-value">
              {boat.min_booking_hours} hours
            </span>
          </div>
        )}
      </div>

      {canManage && (
        <div className="fleet-mobile-actions">
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 flex-1 border-[rgba(11,31,58,0.12)]"
            onClick={() => onEdit(boat)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="min-h-11 border-[rgba(11,31,58,0.12)] text-destructive hover:bg-red-50 hover:text-destructive"
            onClick={() => onDelete(boat)}
            aria-label={`Delete ${boat.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </article>
  );
}

export function FleetTable({ boats }: { boats: Boat[] }) {
  const router = useRouter();
  const { marina, role } = useMarina();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBoat, setEditingBoat] = useState<Boat | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Boat | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BoatStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sort, setSort] = useState<FleetSort>("name-asc");
  const canManage = canManageBoats(role);

  const boatTypes = useMemo(
    () =>
      [...new Set(boats.map((boat) => boat.boat_type).filter(Boolean) as string[])].sort(
        (a, b) => a.localeCompare(b)
      ),
    [boats]
  );

  const filteredBoats = useMemo(
    () =>
      filterAndSortBoats(boats, {
        search,
        statusFilter,
        typeFilter,
        sort,
      }),
    [boats, search, statusFilter, typeFilter, sort]
  );

  const hasActiveFilters =
    search.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSort("name-asc");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteBoat(deleteTarget.id);
    setDeleting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Boat deleted");
    setDeleteTarget(null);
    router.refresh();
  }

  function openAddDialog() {
    setEditingBoat(null);
    setDialogOpen(true);
  }

  function openEditDialog(boat: Boat) {
    setEditingBoat(boat);
    setDialogOpen(true);
  }

  return (
    <div className="dash-page" data-dash-page>
      <div className="fleet-page-header">
        <DashPageHeader
          title="Fleet"
          description={`Manage boats and availability for ${marina.name}`}
        />
        {canManage && (
          <Button onClick={openAddDialog} className="fleet-add-btn min-h-11">
            <Plus className="mr-2 h-4 w-4" />
            Add Boat
          </Button>
        )}
      </div>

      {boats.length === 0 ? (
        <DashCard hover={false}>
          <DashCardContent>
            <EmptyState
              icon={Ship}
              title="No boats in your fleet"
              description="Add your first boat to start accepting bookings."
              actionLabel="Add your first boat"
              onAction={canManage ? openAddDialog : undefined}
              className="border-0 py-8"
            />
          </DashCardContent>
        </DashCard>
      ) : (
        <>
          <DashSection title="Overview" description="Fleet capacity and pricing at a glance">
            <FleetSummary boats={boats} />
          </DashSection>

          <DashSection
            title="All boats"
            description={
              hasActiveFilters
                ? `${filteredBoats.length} of ${boats.length} vessels match your filters`
                : `${boats.length} vessel${boats.length === 1 ? "" : "s"} in your fleet`
            }
          >
            <DashCard hover={false}>
              <FleetFilters
                search={search}
                onSearchChange={setSearch}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                sort={sort}
                onSortChange={setSort}
                boatTypes={boatTypes}
                filteredCount={filteredBoats.length}
                totalCount={boats.length}
              />
              <DashCardContent className="!p-0 sm:!px-0">
                {filteredBoats.length === 0 ? (
                  <div className="fleet-empty-filter">
                    <EmptyState
                      icon={Search}
                      title="No boats match your filters"
                      description="Try adjusting your search or filter criteria."
                      actionLabel="Clear filters"
                      onAction={clearFilters}
                      className="border-0 py-4"
                    />
                  </div>
                ) : (
                  <>
                    <FleetDesktopTable
                      boats={filteredBoats}
                      canManage={canManage}
                      onEdit={openEditDialog}
                      onDelete={setDeleteTarget}
                    />
                    <div className="fleet-mobile-grid p-4">
                      {filteredBoats.map((boat) => (
                        <FleetMobileCard
                          key={boat.id}
                          boat={boat}
                          canManage={canManage}
                          onEdit={openEditDialog}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </div>
                  </>
                )}
              </DashCardContent>
            </DashCard>
          </DashSection>
        </>
      )}

      <BoatFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        marinaId={marina.id}
        boat={editingBoat}
        onSuccess={() => router.refresh()}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete boat?</DialogTitle>
            <DialogDescription>
              This will permanently remove{" "}
              <span className="font-medium">{deleteTarget?.name}</span> from your fleet.
              Existing bookings are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
