import { assertActiveMarina, AuthError } from "@/lib/auth/guards";
import { requireSession } from "@/lib/auth/session";
import { writeAuditLog } from "@/lib/audit/write-audit-log";
import { buildAttachmentContentDisposition } from "@/lib/export/content-disposition";
import { buildCsv } from "@/lib/export/build-csv";
import { canExportData, type ExportType } from "@/lib/export/auth";
import {
  EXPORT_COLUMNS,
  fetchBookingsExportRows,
  fetchCustomersExportRows,
  fetchRevenueExportRows,
} from "@/lib/export/fetch-rows";
import { DEFAULT_CURRENCY } from "@/lib/currency/format";
import { DEFAULT_TIMEZONE, formatInMarinaTimezone } from "@/lib/timezone";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const VALID_TYPES: ExportType[] = ["bookings", "customers", "revenue"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (!VALID_TYPES.includes(type as ExportType)) {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  const exportType = type as ExportType;

  try {
    const session = await requireSession();
    const marina = session.activeMarina;

    if (!marina) {
      return NextResponse.json({ error: "No active marina" }, { status: 400 });
    }

    assertActiveMarina(session, marina.id);

    if (!canExportData(session.activeRole, exportType)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const timezone = marina.timezone ?? DEFAULT_TIMEZONE;
    const admin = createAdminClient();

    const { data: settings } = await admin
      .from("marina_settings")
      .select("currency")
      .eq("marina_id", marina.id)
      .maybeSingle();

    const currency = settings?.currency ?? DEFAULT_CURRENCY;

    let rows;
    if (exportType === "bookings") {
      rows = await fetchBookingsExportRows(marina.id, timezone, marina.name, currency);
    } else if (exportType === "customers") {
      rows = await fetchCustomersExportRows(marina.id, timezone, marina.name);
    } else {
      rows = await fetchRevenueExportRows(marina.id, timezone, marina.name);
    }

    const csv = buildCsv(EXPORT_COLUMNS[exportType], rows);
    const dateStr = formatInMarinaTimezone(
      new Date().toISOString(),
      timezone,
      "yyyy-MM-dd"
    );
    const filename = `${marina.slug}-${exportType}-${dateStr}.csv`;

    await writeAuditLog({
      marinaId: marina.id,
      action: `export.${exportType}`,
      entityType: "export",
      summary: `Exported ${rows.length} ${exportType} record(s) to CSV`,
      metadata: { rowCount: rows.length, filename },
      visibility: exportType === "revenue" ? "owner_only" : "staff",
      showInFeed: false,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": buildAttachmentContentDisposition(filename),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Export error:", err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
