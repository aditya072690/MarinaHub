"use client";

import {
  deletePricingRule,
  upsertPricingRule,
} from "@/actions/pricing-rules";
import {
  DashCard,
  DashCardContent,
  DashCardHeader,
  DashCardTitle,
} from "@/components/dashboard/dash-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Boat, PricingRule, PricingRuleType } from "@/types/database";
import { formatCurrency } from "@/lib/currency/format";
import { Loader2, PlusCircle, Tags, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const RULE_TYPES: { value: PricingRuleType; label: string }[] = [
  { value: "weekday", label: "Weekday" },
  { value: "weekend", label: "Weekend" },
  { value: "holiday", label: "Holiday" },
  { value: "peak_season", label: "Peak Season" },
];

export function PricingRulesEditor({
  marinaId,
  rules,
  boats,
  boatId,
  currency = "USD",
}: {
  marinaId: string;
  rules: PricingRule[];
  boats: Boat[];
  boatId?: string | null;
  currency?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [ruleType, setRuleType] = useState<PricingRuleType>("weekend");
  const [multiplier, setMultiplier] = useState("1.25");
  const [hourlyRate, setHourlyRate] = useState("");
  const [peakStart, setPeakStart] = useState("");
  const [peakEnd, setPeakEnd] = useState("");
  const [holidayDate, setHolidayDate] = useState("");
  const [selectedBoat, setSelectedBoat] = useState<string>(boatId ?? "marina-wide");

  async function handleAdd() {
    setSaving(true);
    const result = await upsertPricingRule(marinaId, {
      boat_id: selectedBoat === "marina-wide" ? null : selectedBoat,
      rule_type: ruleType,
      rate_multiplier: parseFloat(multiplier) || 1,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      peak_start: ruleType === "peak_season" ? peakStart : null,
      peak_end: ruleType === "peak_season" ? peakEnd : null,
      holiday_date: ruleType === "holiday" ? holidayDate : null,
      is_active: true,
    });
    setSaving(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Pricing rule saved");
    router.refresh();
  }

  async function handleDelete(ruleId: string) {
    const result = await deletePricingRule(marinaId, ruleId);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Rule deleted");
    router.refresh();
  }

  return (
    <div className="dash-pricing-stack">
      <DashCard hover={false} className="dash-settings-card">
        <DashCardHeader>
          <div className="dash-settings-card-heading">
            <div className="dash-settings-card-icon">
              <PlusCircle className="h-4 w-4" />
            </div>
            <div>
              <DashCardTitle className="dash-card-title-lg">Add Pricing Rule</DashCardTitle>
              <p className="dash-card-meta">
                Configure marina-wide or boat-specific pricing multipliers.
              </p>
            </div>
          </div>
        </DashCardHeader>
        <DashCardContent className="dash-settings-card-body">
          <div className="dash-settings-field-grid dash-settings-field-grid--two">
            <div className="dash-settings-field">
              <Label>Scope</Label>
              <Select value={selectedBoat} onValueChange={(v) => setSelectedBoat(v ?? "marina-wide")}>
                <SelectTrigger className="dash-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marina-wide">Marina-wide default</SelectItem>
                  {boats.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="dash-settings-field">
              <Label>Rule Type</Label>
              <Select value={ruleType} onValueChange={(v) => setRuleType((v ?? "weekend") as PricingRuleType)}>
                <SelectTrigger className="dash-input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="dash-settings-field">
              <Label>Rate Multiplier</Label>
              <Input
                type="number"
                step="0.05"
                min="0.5"
                value={multiplier}
                onChange={(e) => setMultiplier(e.target.value)}
                placeholder="1.25 = 25% increase"
                className="dash-input"
              />
            </div>
            <div className="dash-settings-field">
              <Label>Fixed Hourly Rate (optional)</Label>
              <Input
                type="number"
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="Overrides multiplier"
                className="dash-input"
              />
            </div>
            {ruleType === "peak_season" && (
              <>
                <div className="dash-settings-field">
                  <Label>Peak Start</Label>
                  <Input
                    type="date"
                    value={peakStart}
                    onChange={(e) => setPeakStart(e.target.value)}
                    className="dash-input"
                  />
                </div>
                <div className="dash-settings-field">
                  <Label>Peak End</Label>
                  <Input
                    type="date"
                    value={peakEnd}
                    onChange={(e) => setPeakEnd(e.target.value)}
                    className="dash-input"
                  />
                </div>
              </>
            )}
            {ruleType === "holiday" && (
              <div className="dash-settings-field">
                <Label>Holiday Date</Label>
                <Input
                  type="date"
                  value={holidayDate}
                  onChange={(e) => setHolidayDate(e.target.value)}
                  className="dash-input"
                />
              </div>
            )}
          </div>
          <div className="dash-settings-save-bar">
            <p className="dash-settings-save-hint">
              Rules apply immediately to new quotes and bookings.
            </p>
            <Button onClick={handleAdd} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Rule
            </Button>
          </div>
        </DashCardContent>
      </DashCard>

      <DashCard hover={false} className="dash-settings-card">
        <DashCardHeader>
          <div className="dash-settings-card-heading">
            <div className="dash-settings-card-icon">
              <Tags className="h-4 w-4" />
            </div>
            <div>
              <DashCardTitle className="dash-card-title-lg">Active Rules</DashCardTitle>
              <p className="dash-card-meta">
                Currently applied pricing rules for your marina and fleet.
              </p>
            </div>
          </div>
        </DashCardHeader>
        <DashCardContent className="dash-settings-card-body">
          {rules.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="No pricing rules"
              description="Configure weekday, weekend, and peak pricing for your fleet."
              className="border-0 py-6"
            />
          ) : (
            <ul className="dash-rule-list">
              {rules.map((rule) => {
                const boatName =
                  rule.boat_id != null
                    ? boats.find((b) => b.id === rule.boat_id)?.name ?? "Boat"
                    : "Marina-wide";
                return (
                  <li key={rule.id} className="dash-rule-item">
                    <div className="dash-rule-item-body">
                      <div className="dash-rule-badges">
                        <Badge>{rule.rule_type.replace("_", " ")}</Badge>
                        <Badge variant="outline">{boatName}</Badge>
                      </div>
                      <p className="dash-rule-meta">
                        {rule.hourly_rate != null
                          ? `${formatCurrency(rule.hourly_rate, currency)}/hr fixed`
                          : `${Number(rule.rate_multiplier ?? 1)}× multiplier`}
                        {rule.peak_start && ` · ${rule.peak_start} – ${rule.peak_end}`}
                        {rule.holiday_date && ` · ${rule.holiday_date}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule.id)}
                      aria-label="Delete rule"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </DashCardContent>
      </DashCard>
    </div>
  );
}
