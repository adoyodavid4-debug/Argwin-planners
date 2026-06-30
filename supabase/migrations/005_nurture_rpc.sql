-- ============================================================
--  Arwign Planners — Nurture Engine RPC
-- ============================================================

-- Claims up to `batch_size` due sequence rows atomically (SKIP LOCKED),
-- returning all data the cron worker needs to send each step.
CREATE OR REPLACE FUNCTION claim_due_sequence_rows(batch_size INT DEFAULT 50)
RETURNS TABLE (
  state_id          UUID,
  subscriber_id     UUID,
  sequence_id       UUID,
  current_step      INT,
  email             TEXT,
  locale            TEXT,
  subscriber_status TEXT,
  template_key      TEXT,
  data_overrides    JSONB,
  unsub_token       TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT sss.id
    FROM subscriber_sequence_state sss
    WHERE sss.status = 'active'
      AND sss.next_send_at <= NOW()
    ORDER BY sss.next_send_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  SELECT
    sss.id              AS state_id,
    sss.subscriber_id,
    sss.sequence_id,
    sss.current_step,
    s.email::TEXT       AS email,
    s.locale,
    s.status            AS subscriber_status,
    ess.template_key,
    ess.data_overrides,
    s.unsub_token
  FROM subscriber_sequence_state sss
  JOIN claimed              c   ON c.id = sss.id
  JOIN subscribers          s   ON s.id = sss.subscriber_id
  JOIN email_sequence_steps ess ON ess.sequence_id = sss.sequence_id
                               AND ess.step_order   = sss.current_step;
END;
$$;
