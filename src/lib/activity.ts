import { supabase } from '@/lib/supabase';

export async function logActivity(
  pluginId: string, 
  actor: string, 
  action: string, 
  metadata?: any
) {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      plugin_id: pluginId,
      actor,
      action,
      metadata
    });
    
    if (error) {
      console.error('Failed to log activity:', error);
    }
  } catch (err) {
    console.error('Unexpected error logging activity:', err);
  }
}
