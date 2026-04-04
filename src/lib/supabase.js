import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Este es el cliente que usaremos en los componentes de React para escuchar los WebSockets
export const supabase = createClient(supabaseUrl, supabaseAnonKey);