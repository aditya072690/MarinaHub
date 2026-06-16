-- Conflict resolution, revenue forecast, buffer-aware availability

CREATE OR REPLACE FUNCTION is_boat_available(
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_marina_id UUID;
  v_buffer INT;
  v_buffered_start TIMESTAMPTZ;
  v_buffered_end TIMESTAMPTZ;
BEGIN
  SELECT marina_id INTO v_marina_id FROM boats WHERE id = p_boat_id;
  SELECT COALESCE(booking_buffer_minutes, 30) INTO v_buffer
  FROM marina_settings WHERE marina_id = v_marina_id;

  v_buffered_start := p_start - (v_buffer || ' minutes')::INTERVAL;
  v_buffered_end := p_end + (v_buffer || ' minutes')::INTERVAL;

  RETURN NOT EXISTS (
    SELECT 1 FROM bookings
    WHERE boat_id = p_boat_id
      AND status IN ('pending', 'confirmed', 'checked_in', 'checked_out')
      AND id IS DISTINCT FROM p_exclude_booking_id
      AND tstzrange(start_at, end_at) && tstzrange(v_buffered_start, v_buffered_end)
  ) AND NOT EXISTS (
    SELECT 1 FROM availability_blocks
    WHERE (boat_id = p_boat_id OR boat_id IS NULL)
      AND marina_id = v_marina_id
      AND tstzrange(start_at, end_at) && tstzrange(p_start, p_end)
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION suggest_alternative_boats(
  p_marina_id UUID,
  p_boat_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ,
  p_guest_count INT DEFAULT 1,
  p_limit INT DEFAULT 5
) RETURNS JSONB AS $$
DECLARE
  v_original_price NUMERIC;
  v_original_type TEXT;
  v_result JSONB := '[]'::jsonb;
  v_row RECORD;
  v_score NUMERIC;
  v_price JSONB;
  v_items JSONB := '[]'::jsonb;
BEGIN
  SELECT (resolve_booking_price(p_boat_id, p_start, p_end)->>'base_price')::NUMERIC,
         (SELECT boat_type FROM boats WHERE id = p_boat_id)
  INTO v_original_price, v_original_type;

  FOR v_row IN
    SELECT b.*,
      (SELECT COUNT(*) FROM bookings bk
       WHERE bk.boat_id = b.id AND bk.start_at > now() - INTERVAL '90 days'
         AND bk.status NOT IN ('cancelled', 'no_show')) AS booking_count_90d
    FROM boats b
    WHERE b.marina_id = p_marina_id
      AND b.id != p_boat_id
      AND b.status = 'active'
      AND b.capacity >= p_guest_count
      AND is_boat_available(b.id, p_start, p_end)
    ORDER BY b.sort_order
  LOOP
    v_price := resolve_booking_price(v_row.id, p_start, p_end);

    v_score :=
      (40.0 * (1.0 - LEAST((v_row.capacity - p_guest_count)::NUMERIC / GREATEST(v_row.capacity, 1), 1.0)))
      + (CASE WHEN v_row.boat_type IS NOT DISTINCT FROM v_original_type THEN 25.0 ELSE 0 END)
      + (20.0 * GREATEST(0, 1.0 - ABS((v_price->>'base_price')::NUMERIC - COALESCE(v_original_price, 0)) / GREATEST(COALESCE(v_original_price, 1), 1)))
      + (10.0 * (1.0 - LEAST(v_row.sort_order::NUMERIC / 100.0, 1.0)))
      + (5.0 * LEAST(v_row.booking_count_90d::NUMERIC / 50.0, 1.0));

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'boat_id', v_row.id,
      'name', v_row.name,
      'capacity', v_row.capacity,
      'boat_type', v_row.boat_type,
      'image_url', COALESCE(v_row.image_urls[1], NULL),
      'estimated_total', (v_price->>'total_price')::NUMERIC,
      'estimated_base', (v_price->>'base_price')::NUMERIC,
      'rule_label', v_price->>'rule_label',
      'score', ROUND(v_score, 2),
      'availability_confirmed', true
    ));
  END LOOP;

  SELECT COALESCE(jsonb_agg(elem ORDER BY (elem->>'score')::NUMERIC DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT elem FROM jsonb_array_elements(v_items) elem
    LIMIT LEAST(p_limit, 10)
  ) sub;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION suggest_alternative_boats FROM PUBLIC;
GRANT EXECUTE ON FUNCTION suggest_alternative_boats TO authenticated, anon;

CREATE OR REPLACE FUNCTION get_revenue_forecast(
  p_marina_id UUID,
  p_days INT DEFAULT 30
) RETURNS JSONB AS $$
DECLARE
  v_role user_role;
  v_avg_daily NUMERIC;
  v_daily JSONB := '[]'::jsonb;
  v_day DATE;
  v_confirmed NUMERIC;
  v_projected NUMERIC;
  v_total_confirmed NUMERIC := 0;
  v_total_projected NUMERIC := 0;
  v_booking_count INT;
  v_dow INT;
  v_factor NUMERIC;
BEGIN
  IF NOT (p_marina_id = ANY(SELECT auth_user_marina_ids())) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  v_role := auth_user_role(p_marina_id);
  IF v_role NOT IN ('owner', 'manager') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(AVG(daily_rev), 0) INTO v_avg_daily
  FROM (
    SELECT DATE(start_at) AS d, SUM(total_price) AS daily_rev
    FROM bookings
    WHERE marina_id = p_marina_id
      AND status IN ('completed', 'checked_out', 'confirmed', 'checked_in')
      AND start_at >= now() - INTERVAL '90 days'
      AND start_at < now()
    GROUP BY DATE(start_at)
  ) hist;

  FOR i IN 0..(p_days - 1) LOOP
    v_day := (CURRENT_DATE + i);
    v_dow := EXTRACT(DOW FROM v_day);

    SELECT COALESCE(SUM(total_price), 0), COUNT(*)
    INTO v_confirmed, v_booking_count
    FROM bookings
    WHERE marina_id = p_marina_id
      AND status IN ('confirmed', 'checked_in')
      AND DATE(start_at AT TIME ZONE (SELECT timezone FROM marina_settings WHERE marina_id = p_marina_id LIMIT 1)) = v_day;

    v_factor := CASE WHEN v_dow IN (0, 6) THEN 1.15 ELSE 1.0 END;
    IF classify_pricing_day(p_marina_id, v_day) = 'peak_season' THEN
      v_factor := v_factor * 1.2;
    ELSIF classify_pricing_day(p_marina_id, v_day) = 'holiday' THEN
      v_factor := v_factor * 1.25;
    END IF;

    v_projected := CASE
      WHEN v_booking_count >= 3 THEN 0
      ELSE ROUND(v_avg_daily * v_factor * 0.85, 2)
    END;

    v_total_confirmed := v_total_confirmed + v_confirmed;
    v_total_projected := v_total_projected + v_projected;

    v_daily := v_daily || jsonb_build_object(
      'date', v_day,
      'confirmed', v_confirmed,
      'projected', v_projected,
      'total', v_confirmed + v_projected,
      'booking_count', v_booking_count
    );
  END LOOP;

  RETURN jsonb_build_object(
    'marina_id', p_marina_id,
    'period', jsonb_build_object(
      'start', CURRENT_DATE,
      'end', CURRENT_DATE + (p_days - 1)
    ),
    'total_forecast', v_total_confirmed + v_total_projected,
    'confirmed_portion', v_total_confirmed,
    'projected_portion', v_total_projected,
    'daily', v_daily,
    'confidence', CASE
      WHEN v_total_confirmed > (v_total_confirmed + v_total_projected) * 0.6 THEN 'high'
      WHEN v_total_confirmed > (v_total_confirmed + v_total_projected) * 0.3 THEN 'medium'
      ELSE 'low'
    END
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_revenue_forecast FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_revenue_forecast TO authenticated;

-- Demo pricing rules seed (marina-wide defaults)
INSERT INTO pricing_rules (marina_id, boat_id, rule_type, rate_multiplier, priority)
SELECT m.id, NULL, 'weekend', 1.25, 30
FROM marinas m
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_rules pr WHERE pr.marina_id = m.id AND pr.rule_type = 'weekend' AND pr.boat_id IS NULL
);

INSERT INTO pricing_rules (marina_id, boat_id, rule_type, rate_multiplier, priority)
SELECT m.id, NULL, 'weekday', 1.00, 10
FROM marinas m
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_rules pr WHERE pr.marina_id = m.id AND pr.rule_type = 'weekday' AND pr.boat_id IS NULL
);

-- Demo holidays (July 4)
INSERT INTO marina_holidays (marina_id, date, name, is_recurring)
SELECT id, '2026-07-04', 'Independence Day', true FROM marinas
ON CONFLICT (marina_id, date) DO NOTHING;

INSERT INTO pricing_rules (marina_id, boat_id, rule_type, rate_multiplier, holiday_date, holiday_name, priority)
SELECT m.id, NULL, 'holiday', 1.50, '2026-07-04', 'Independence Day', 50
FROM marinas m
WHERE NOT EXISTS (
  SELECT 1 FROM pricing_rules pr WHERE pr.marina_id = m.id AND pr.rule_type = 'holiday' AND pr.holiday_date = '2026-07-04'
);

-- Multi-marina owner membership for demo user
INSERT INTO marina_members (marina_id, user_id, role)
SELECT m.id, 'b0000000-0000-4000-8000-000000000001'::UUID, 'owner'
FROM marinas m
WHERE m.id != 'a0000000-0000-4000-8000-000000000001'
ON CONFLICT (marina_id, user_id) DO NOTHING;
