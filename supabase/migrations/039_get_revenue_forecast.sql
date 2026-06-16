-- Ensure get_revenue_forecast exists (from 035; safe to re-run if skipped)

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
