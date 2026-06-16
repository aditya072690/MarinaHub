-- Pricing rules and holiday calendar

CREATE TABLE marina_holidays (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id    UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  date         DATE NOT NULL,
  name         TEXT NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marina_id, date)
);

CREATE INDEX idx_marina_holidays_marina_date ON marina_holidays(marina_id, date);

CREATE TABLE pricing_rules (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  marina_id       UUID NOT NULL REFERENCES marinas(id) ON DELETE CASCADE,
  boat_id         UUID REFERENCES boats(id) ON DELETE CASCADE,
  rule_type       pricing_rule_type NOT NULL,
  priority        INT NOT NULL DEFAULT 0,
  hourly_rate     DECIMAL(10,2),
  daily_rate      DECIMAL(10,2),
  rate_multiplier DECIMAL(5,2) DEFAULT 1.00,
  peak_start      DATE,
  peak_end        DATE,
  holiday_date    DATE,
  holiday_name    TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by      UUID REFERENCES profiles(id),
  CONSTRAINT pricing_rules_peak_dates CHECK (
    rule_type != 'peak_season' OR (peak_start IS NOT NULL AND peak_end IS NOT NULL)
  )
);

CREATE INDEX idx_pricing_rules_lookup ON pricing_rules(marina_id, boat_id, rule_type, is_active);
CREATE INDEX idx_pricing_rules_holiday ON pricing_rules(marina_id, holiday_date) WHERE holiday_date IS NOT NULL;

CREATE UNIQUE INDEX idx_pricing_rules_weekday_boat ON pricing_rules(marina_id, boat_id, rule_type)
  WHERE is_active = true AND rule_type IN ('weekday', 'weekend') AND boat_id IS NOT NULL;

CREATE UNIQUE INDEX idx_pricing_rules_weekday_marina ON pricing_rules(marina_id, rule_type)
  WHERE is_active = true AND rule_type IN ('weekday', 'weekend') AND boat_id IS NULL;

ALTER TABLE marina_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY marina_holidays_select ON marina_holidays
  FOR SELECT USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY marina_holidays_write ON marina_holidays
  FOR ALL USING (auth_user_role(marina_id) IN ('owner', 'manager'))
  WITH CHECK (auth_user_role(marina_id) IN ('owner', 'manager'));

CREATE POLICY pricing_rules_select ON pricing_rules
  FOR SELECT USING (marina_id IN (SELECT auth_user_marina_ids()));

CREATE POLICY pricing_rules_write ON pricing_rules
  FOR ALL USING (auth_user_role(marina_id) IN ('owner', 'manager'))
  WITH CHECK (auth_user_role(marina_id) IN ('owner', 'manager'));

-- Booking pricing audit columns
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_rule_id UUID REFERENCES pricing_rules(id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0;

-- Classify a local date for pricing
CREATE OR REPLACE FUNCTION classify_pricing_day(
  p_marina_id UUID,
  p_local_date DATE
) RETURNS pricing_rule_type AS $$
DECLARE
  v_dow INT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM marina_holidays
    WHERE marina_id = p_marina_id
      AND (date = p_local_date OR (is_recurring AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM p_local_date) AND EXTRACT(DAY FROM date) = EXTRACT(DAY FROM p_local_date)))
  ) OR EXISTS (
    SELECT 1 FROM pricing_rules
    WHERE marina_id = p_marina_id AND rule_type = 'holiday' AND is_active = true
      AND holiday_date = p_local_date
  ) THEN
    RETURN 'holiday';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pricing_rules
    WHERE marina_id = p_marina_id AND rule_type = 'peak_season' AND is_active = true
      AND p_local_date BETWEEN peak_start AND peak_end
  ) THEN
    RETURN 'peak_season';
  END IF;

  v_dow := EXTRACT(DOW FROM p_local_date);
  IF v_dow IN (0, 6) THEN
    RETURN 'weekend';
  END IF;

  RETURN 'weekday';
END;
$$ LANGUAGE plpgsql STABLE;

-- Resolve applicable pricing rule for a boat on a given day type
CREATE OR REPLACE FUNCTION get_applicable_pricing_rule(
  p_marina_id UUID,
  p_boat_id UUID,
  p_day_type pricing_rule_type,
  p_local_date DATE DEFAULT NULL
) RETURNS pricing_rules AS $$
DECLARE
  v_rule pricing_rules%ROWTYPE;
BEGIN
  SELECT * INTO v_rule FROM pricing_rules
  WHERE marina_id = p_marina_id AND boat_id = p_boat_id AND rule_type = p_day_type AND is_active = true
  ORDER BY priority DESC LIMIT 1;

  IF FOUND THEN RETURN v_rule; END IF;

  IF p_day_type = 'holiday' AND p_local_date IS NOT NULL THEN
    SELECT * INTO v_rule FROM pricing_rules
    WHERE marina_id = p_marina_id AND boat_id = p_boat_id AND rule_type = 'holiday'
      AND is_active = true AND holiday_date = p_local_date
    ORDER BY priority DESC LIMIT 1;
    IF FOUND THEN RETURN v_rule; END IF;
  END IF;

  SELECT * INTO v_rule FROM pricing_rules
  WHERE marina_id = p_marina_id AND boat_id IS NULL AND rule_type = p_day_type AND is_active = true
  ORDER BY priority DESC LIMIT 1;

  RETURN v_rule;
END;
$$ LANGUAGE plpgsql STABLE;

-- Resolve booking price (source of truth)
CREATE OR REPLACE FUNCTION resolve_booking_price(
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_boat boats%ROWTYPE;
  v_settings marina_settings%ROWTYPE;
  v_local_start DATE;
  v_day_type pricing_rule_type;
  v_rule pricing_rules%ROWTYPE;
  v_hours NUMERIC;
  v_hourly NUMERIC;
  v_daily NUMERIC;
  v_base NUMERIC;
  v_tax NUMERIC;
  v_deposit NUMERIC;
  v_total NUMERIC;
  v_rule_label TEXT;
BEGIN
  SELECT * INTO v_boat FROM boats WHERE id = p_boat_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Boat not found';
  END IF;

  SELECT * INTO v_settings FROM marina_settings WHERE marina_id = v_boat.marina_id;
  IF NOT FOUND THEN
    SELECT v_boat.marina_id, 0.0825, 25.00, m.timezone
    INTO v_settings.marina_id, v_settings.tax_rate, v_settings.deposit_pct, v_settings.timezone
    FROM marinas m WHERE m.id = v_boat.marina_id;
  END IF;

  v_local_start := (p_start AT TIME ZONE v_settings.timezone)::DATE;
  v_day_type := classify_pricing_day(v_boat.marina_id, v_local_start);
  v_rule := get_applicable_pricing_rule(v_boat.marina_id, p_boat_id, v_day_type, v_local_start);

  v_hourly := v_boat.hourly_rate;
  v_daily := v_boat.daily_rate;

  IF v_rule.id IS NOT NULL THEN
    IF v_rule.hourly_rate IS NOT NULL THEN v_hourly := v_rule.hourly_rate; END IF;
    IF v_rule.daily_rate IS NOT NULL THEN v_daily := v_rule.daily_rate; END IF;
    IF v_rule.hourly_rate IS NULL AND v_rule.rate_multiplier IS NOT NULL THEN
      v_hourly := ROUND(v_boat.hourly_rate * v_rule.rate_multiplier, 2);
    END IF;
    IF v_rule.daily_rate IS NULL AND v_rule.rate_multiplier IS NOT NULL AND v_boat.daily_rate IS NOT NULL THEN
      v_daily := ROUND(v_boat.daily_rate * v_rule.rate_multiplier, 2);
    END IF;
  END IF;

  v_hours := GREATEST(
    EXTRACT(EPOCH FROM (p_end - p_start)) / 3600.0,
    v_boat.min_booking_hours
  );

  IF v_daily IS NOT NULL AND v_hours >= 8 THEN
    v_base := LEAST(
      CEIL(v_hours / 24.0) * v_daily,
      v_hours * v_hourly
    );
  ELSE
    v_base := ROUND(v_hours * v_hourly, 2);
  END IF;

  v_tax := ROUND(v_base * v_settings.tax_rate, 2);
  v_total := ROUND(v_base + v_tax, 2);
  v_deposit := ROUND(v_total * (v_settings.deposit_pct / 100.0), 2);

  v_rule_label := CASE v_day_type
    WHEN 'holiday' THEN 'Holiday Rate'
    WHEN 'peak_season' THEN 'Peak Season Rate'
    WHEN 'weekend' THEN 'Weekend Rate'
    ELSE 'Weekday Rate'
  END;

  RETURN jsonb_build_object(
    'base_price', v_base,
    'tax_amount', v_tax,
    'deposit_amount', v_deposit,
    'total_price', v_total,
    'subtotal_with_tax', v_total,
    'pricing_rule_id', v_rule.id,
    'rule_type', v_day_type,
    'rule_label', v_rule_label,
    'hourly_rate', v_hourly,
    'daily_rate', v_daily,
    'hours', v_hours,
    'currency', v_settings.currency,
    'breakdown', jsonb_build_object(
      'base_rate', v_hourly,
      'rule_type', v_day_type,
      'multiplier', COALESCE(v_rule.rate_multiplier, 1),
      'hours', v_hours,
      'tax', v_tax,
      'deposit', v_deposit,
      'tax_rate', v_settings.tax_rate,
      'deposit_pct', v_settings.deposit_pct
    )
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION resolve_booking_price FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolve_booking_price TO authenticated, anon;
