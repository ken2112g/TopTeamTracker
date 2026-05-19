import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuth } from '@/lib/supabase/server';

function cors(req: NextRequest) {
  const origin = req.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': origin.startsWith('chrome-extension://') ? origin : 'https://topteamtracker.id.vn',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { headers: cors(req) });
}

export async function GET(req: NextRequest) {
  const headers = cors(req);
  try {
    const supabase = await getSupabaseAuth();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return NextResponse.json({ token: null }, { headers });
    return NextResponse.json({ token: session.access_token }, { headers });
  } catch {
    return NextResponse.json({ token: null }, { headers });
  }
}
