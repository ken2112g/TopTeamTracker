import { NextResponse } from 'next/server';
import { getTrackedListings } from '@/lib/actions/listings';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function GET() {
  try {
    const tracked = await getTrackedListings();
    return NextResponse.json(tracked, { headers: CORS });
  } catch {
    return NextResponse.json([], { headers: CORS });
  }
}
