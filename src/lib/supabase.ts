import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserAction = {
  id?: string;
  user_address: string;
  action_type: 'supply' | 'withdraw' | 'borrow' | 'repay';
  amount: string;
  asset: string;
  health_factor: string;
  tx_hash: string;
  created_at?: string;
};

export async function logUserAction(action: Omit<UserAction, 'id' | 'created_at'>) {
  try {
    const { error } = await supabase.from('user_actions').insert([action]);
    if (error) {
      console.error('Error logging user action:', error);
    }
  } catch (err) {
    console.error('Error logging user action:', err);
  }
}

export async function getUserActions(userAddress: string) {
  const { data, error } = await supabase
    .from('user_actions')
    .select('*')
    .eq('user_address', userAddress)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching user actions:', error);
    return [];
  }

  return data || [];
}

export async function getProtocolStats() {
  const { data, error } = await supabase.from('protocol_stats').select('*').single();

  if (error) {
    console.error('Error fetching protocol stats:', error);
    return null;
  }

  return data;
}
