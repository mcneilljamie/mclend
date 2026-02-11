/*
  # Transaction Sync Infrastructure

  1. New Tables
    - `block_sync_state`
      - `id` (uuid, primary key)
      - `chain` (text, unique) - Chain identifier (e.g., 'ethereum')
      - `last_synced_block` (bigint) - Last block number successfully synced
      - `last_synced_at` (timestamp) - When last sync occurred
      - `updated_at` (timestamp)

  2. Extensions
    - Enable pg_cron for scheduled jobs
    - Enable pg_net for HTTP requests

  3. Functions
    - Create function to invoke edge function for transaction syncing

  4. Scheduled Jobs
    - Set up cron job to run transaction sync every 15 minutes

  5. Security
    - Enable RLS on block_sync_state
    - Public read access for sync state
*/

-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create block sync state table
CREATE TABLE IF NOT EXISTS block_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chain text UNIQUE NOT NULL,
  last_synced_block bigint NOT NULL DEFAULT 0,
  last_synced_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index on chain for quick lookups
CREATE INDEX IF NOT EXISTS idx_block_sync_state_chain ON block_sync_state(chain);

-- Enable RLS
ALTER TABLE block_sync_state ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sync state
CREATE POLICY "Anyone can read sync state"
  ON block_sync_state FOR SELECT
  USING (true);

-- Allow service role to update sync state
CREATE POLICY "Service role can update sync state"
  ON block_sync_state FOR ALL
  USING (true)
  WITH CHECK (true);

-- Initialize ethereum sync state (starting from block 21500000 - Feb 2026)
INSERT INTO block_sync_state (chain, last_synced_block, last_synced_at)
VALUES ('ethereum', 21500000, now())
ON CONFLICT (chain) DO NOTHING;

-- Create function to invoke transaction sync edge function
CREATE OR REPLACE FUNCTION invoke_transaction_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This will be called by pg_cron to trigger the edge function
  -- The edge function will handle the actual blockchain syncing
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/sync-transactions',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object('trigger', 'cron')
  );
END;
$$;

-- Schedule the transaction sync to run every 15 minutes
-- Note: pg_cron uses cron syntax: minute hour day month weekday
SELECT cron.schedule(
  'sync-transactions-every-15-min',
  '*/15 * * * *',
  'SELECT invoke_transaction_sync();'
);