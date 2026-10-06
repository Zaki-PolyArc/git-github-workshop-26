const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSt-SN7sQR68rESXBlVfJwT_oh3PjrZyVUHDavN3Q4R6uVDSq64m4zNYlsb4cwMHiIzQcTJkzTEnLqa/pub?gid=1989815925&single=true&output=csv';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(SHEET_CSV, { cache: 'no-store' });
    if (!response.ok) return Response.json({ error: 'Published Google Sheet is unavailable.' }, { status: 502 });
    return new Response(await response.text(), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'Could not reach the published Google Sheet.' }, { status: 502 });
  }
}
