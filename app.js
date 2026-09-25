// Configuración de Supabase
const SUPABASE_URL = 'https://gWOLb2P47i8qiQuSAnAldA.supabase.co'; // Asegúrate de verificar/completar la URL exacta de tu proyecto
const SUPABASE_KEY = 'sb_publishable_gWOLb2P47i8qiQuSAnAldA_54neh6U7';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let productos = [];
let ventas = [];
let gastos = [];

// Cargar datos iniciales desde Supabase
async function cargarIt looks like you've pasted two Supabase API credentials: an anon/publishable key (`sb_publishable_...`) and a secret/service role key (`sb_secret_...`). 

**Security Warning:**
1. **Rotate the Secret Key:** The `sb_secret_` token carries full administrative privileges, bypassing all Row Level Security (RLS) policies. Since it has been posted here, it should be considered compromised. You should immediately regenerate or revoke this API key inside your **Supabase Dashboard > Project Settings > API**.
2. **Environment Variables:** Always keep your secret keys stored safely in a `.env.local` or environment file and never commit or paste them into public facing code or chats.

If you were trying to set up your project configuration, you typically load them into your client setup like this:

```javascript
// Example setup (React / JavaScript)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://YOUR_PROJECT_ID.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use publishable/anon key here

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
