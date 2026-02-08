/*
  # McLend Analytics Schema

  1. New Tables
    - `user_actions`
      - `id` (uuid, primary key)
      - `user_address` (text, indexed)
      - `action_type` (text: supply, withdraw, borrow, repay)
      - `amount` (text)
      - `asset` (text: WBTC, USDT)
      - `health_factor` (text)
      - `tx_hash` (text, unique)
      - `created_at` (timestamp)

    - `protocol_stats`
      - `id` (uuid, primary key)
      - `total_value_locked` (numeric)
      - `total_borrowed` (numeric)
      - `total_fees_collected` (numeric)
      - `active_positions` (integer)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Users can read their own actions
    - Public can read protocol stats
*/

CREATE TABLE IF NOT EXISTS user_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('supply', 'withdraw', 'borrow', 'repay')),
  amount text NOT NULL,
  asset text NOT NULL CHECK (asset IN ('WBTC', 'USDT')),
  health_factor text DEFAULT '0',
  tx_hash text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_actions_address ON user_actions(user_address);
CREATE INDEX IF NOT EXISTS idx_user_actions_created_at ON user_actions(created_at DESC);

ALTER TABLE user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own actions"
  ON user_actions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own actions"
  ON user_actions FOR INSERT
  WITH CHECK (true);

CREATE TABLE IF NOT EXISTS protocol_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_value_locked numeric DEFAULT 0,
  total_borrowed numeric DEFAULT 0,
  total_fees_collected numeric DEFAULT 0,
  active_positions integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE protocol_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read protocol stats"
  ON protocol_stats FOR SELECT
  USING (true);

INSERT INTO protocol_stats (total_value_locked, total_borrowed, total_fees_collected, active_positions)
VALUES (0, 0, 0, 0)
ON CONFLICT DO NOTHING;