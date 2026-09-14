import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Diagnostic only — reports presence/length of env vars, NEVER their values.
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (key !== 'masir2026seed') {
    return NextResponse.json({ error: 'unauthorized' }, { status: 403 });
  }

  const endpoint = process.env.ARVAN_ENDPOINT;
  const apiKey = process.env.ARVAN_API_KEY;
  const model = process.env.ARVAN_MODEL_NAME;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  return NextResponse.json({
    ARVAN_ENDPOINT: { present: !!endpoint, length: endpoint?.length ?? 0, preview: endpoint ? endpoint.substring(0, 15) + '...' : null },
    ARVAN_API_KEY: { present: !!apiKey, length: apiKey?.length ?? 0 },
    ARVAN_MODEL_NAME: { present: !!model, length: model?.length ?? 0, preview: model ?? null },
    ANTHROPIC_API_KEY: { present: !!anthropicKey, length: anthropicKey?.length ?? 0 },
    willUseArvan: !!(endpoint && apiKey && model),
  });
}
