import { InquirySource, InquiryStatus } from '@prisma/client';
import { inquiryRepository, InquiryFilters } from '@/repositories/inquiry.repository';
import { PublicInquiryCreateInput } from '@/validations/inquiry';
import { NotFoundError, BadRequestError } from '@/lib/errors';

/** NEW -> CONTACTED -> CONVERTED -> CLOSED. CONVERTED is only ever reached
 * through the dedicated convert action, never a plain status update. */
const ALLOWED_TRANSITIONS: Record<InquiryStatus, InquiryStatus[]> = {
  NEW: ['CONTACTED', 'CLOSED'],
  CONTACTED: ['CLOSED'],
  CONVERTED: [],
  CLOSED: [],
};

export class InquiryService {
  async getAll(params: InquiryFilters) {
    return inquiryRepository.findAll(params);
  }

  async getById(id: string) {
    const inquiry = await inquiryRepository.findById(id);
    if (!inquiry) {
      throw new NotFoundError(`Inquiry with id '${id}' not found`);
    }
    return inquiry;
  }

  /**
   * Honeypot: a real form never fills `website_hp`. A non-empty value means a
   * bot filled every field it could find — return the sentinel so the caller
   * responds exactly as if the submission succeeded, without ever writing it,
   * so the bot gets no signal that it was caught.
   */
  async createFromPublicSubmission(
    data: PublicInquiryCreateInput,
    source: InquirySource
  ): Promise<
    | { dropped: true }
    | { dropped: false; inquiry: Awaited<ReturnType<typeof inquiryRepository.create>> }
  > {
    if (data.website_hp) {
      return { dropped: true };
    }

    // The repository only reads the fields it declares, so the extra
    // `website_hp` key on `data` (already known-falsy here) is harmless.
    const inquiry = await inquiryRepository.create({ ...data, source });
    return { dropped: false, inquiry };
  }

  async updateStatus(id: string, status: InquiryStatus) {
    const inquiry = await this.getById(id);
    if (!ALLOWED_TRANSITIONS[inquiry.status].includes(status)) {
      throw new BadRequestError(
        `Cannot move inquiry from ${inquiry.status} to ${status}`,
        'INVALID_STATUS_TRANSITION'
      );
    }
    return inquiryRepository.updateStatus(id, status);
  }

  /** Non-blocking: an existing Customer match on phone is surfaced as a
   * warning only — it never prevents creating the new Customer record. */
  async checkExistingCustomerByPhone(phone: string) {
    return inquiryRepository.findByPhone(phone);
  }

  async convertToCustomer(id: string, state: string) {
    await this.getById(id);
    return inquiryRepository.convertToCustomer(id, state);
  }
}

export const inquiryService = new InquiryService();
