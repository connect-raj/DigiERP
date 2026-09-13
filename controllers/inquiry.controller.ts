import { NextRequest } from 'next/server';
import { InquirySource, InquiryStatus } from '@prisma/client';
import { inquiryService } from '@/services/inquiry.service';
import { updateInquiryStatusSchema, convertInquirySchema } from '@/validations/inquiry';
import { successResponse, paginatedResponse, BadRequestError } from '@/lib/errors';
import { parsePagination } from '@/lib/pagination';
import { authenticate } from '@/controllers/user.controller';

async function parseBody(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError('Invalid JSON body');
  }
}

export class InquiryController {
  async getAll(req: NextRequest) {
    authenticate(req);
    const { searchParams } = new URL(req.url);
    const source = (searchParams.get('source') as InquirySource) ?? undefined;
    const status = (searchParams.get('status') as InquiryStatus) ?? undefined;
    const search = searchParams.get('search') ?? undefined;
    const { page, limit, skip, take } = parsePagination(searchParams);

    const { data, total } = await inquiryService.getAll({ source, status, search, skip, take });
    return paginatedResponse(data, { page, limit, total });
  }

  async getById(req: NextRequest, id: string) {
    authenticate(req);
    const inquiry = await inquiryService.getById(id);
    return successResponse(inquiry);
  }

  async updateStatus(req: NextRequest, id: string) {
    authenticate(req);
    const body = await parseBody(req);

    const validated = updateInquiryStatusSchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const inquiry = await inquiryService.updateStatus(id, validated.data.status);
    return successResponse(inquiry);
  }

  /** Preview for the convert action: surfaces a possible existing-customer
   * phone match without creating anything, so the UI can show a non-blocking
   * warning banner before the salesperson confirms. */
  async previewConvert(req: NextRequest, id: string) {
    authenticate(req);
    const inquiry = await inquiryService.getById(id);
    const existingMatch = await inquiryService.checkExistingCustomerByPhone(inquiry.phone);
    return successResponse({ existingMatch });
  }

  async convert(req: NextRequest, id: string) {
    authenticate(req);
    const body = await parseBody(req);

    const validated = convertInquirySchema.safeParse(body);
    if (!validated.success) {
      throw new BadRequestError(validated.error.issues[0]?.message ?? 'Validation error');
    }

    const result = await inquiryService.convertToCustomer(id, validated.data.state);
    return successResponse(result);
  }
}

export const inquiryController = new InquiryController();
