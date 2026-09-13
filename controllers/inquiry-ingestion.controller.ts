import { NextRequest, NextResponse } from 'next/server';
import { inquiryService } from '@/services/inquiry.service';
import { publicInquiryCreateSchema } from '@/validations/inquiry';
import { verifyIngestionApiKey } from '@/lib/api-key';
import { BadRequestError } from '@/lib/errors';

/** Public, key-gated route — already scoped by the per-source API key
 * regardless of caller origin, so a permissive CORS policy is safe here and
 * lets external forms (expo microsite, digi-tech.in) POST directly from
 * browser JS without a server-side proxy. */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export class InquiryIngestionController {
  async create(req: NextRequest) {
    const { source } = await verifyIngestionApiKey(req.headers.get('x-api-key'));

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      throw new BadRequestError('Invalid JSON body');
    }

    const validated = publicInquiryCreateSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    // Honeypot-dropped and genuine submissions get an identical response —
    // deliberately not the app's standard successResponse envelope, so a bot
    // that tripped the honeypot gets no signal it was caught.
    await inquiryService.createFromPublicSubmission(validated.data, source);
    return NextResponse.json({ ok: true }, { status: 200, headers: CORS_HEADERS });
  }
}

export const inquiryIngestionController = new InquiryIngestionController();
