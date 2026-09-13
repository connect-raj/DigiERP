import prisma from '@/lib/prisma';
import { Prisma, InquirySource, InquiryStatus, InquiryInterest, InkType } from '@prisma/client';
import { PublicInquiryCreateInput } from '@/validations/inquiry';
import { ConflictError } from '@/lib/errors';

export interface InquiryFilters {
  source?: InquirySource;
  status?: InquiryStatus;
  search?: string;
  skip?: number;
  take?: number;
}

export interface CreateInquiryData extends Omit<PublicInquiryCreateInput, 'website_hp'> {
  source: InquirySource;
}

export class InquiryRepository {
  async findAll(params: InquiryFilters) {
    const { source, status, search, skip, take } = params;
    const where: Prisma.InquiryWhereInput = {
      ...(source && { source }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { company: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string) {
    return prisma.inquiry.findUnique({ where: { id } });
  }

  async findByPhone(phone: string) {
    return prisma.customer.findFirst({ where: { phone } });
  }

  async create(data: CreateInquiryData) {
    return prisma.inquiry.create({
      data: {
        source: data.source,
        company: data.company,
        contactName: data.contactName,
        phone: data.phone,
        email: data.email,
        city: data.city,
        interestCategory: data.interestCategory as InquiryInterest,
        inkType: data.inkType as InkType | undefined,
        volume: data.volume,
        printerBrand: data.printerBrand,
        currentSupplier: data.currentSupplier,
        notes: data.notes,
      },
    });
  }

  async updateStatus(id: string, status: InquiryStatus) {
    return prisma.inquiry.update({ where: { id }, data: { status } });
  }

  /**
   * Atomically creates a new Customer from an inquiry and marks the inquiry
   * CONVERTED. Guards against re-converting an already-converted/closed
   * inquiry inside the transaction, so a replayed/direct call can't create a
   * duplicate Customer even though the UI already hides the action.
   */
  async convertToCustomer(inquiryId: string, state: string) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const inquiry = await tx.inquiry.findUnique({ where: { id: inquiryId } });
      if (!inquiry) {
        throw new ConflictError('Inquiry not found');
      }
      if (inquiry.status === 'CONVERTED' || inquiry.status === 'CLOSED') {
        throw new ConflictError(
          `Inquiry is already ${inquiry.status.toLowerCase()} and cannot be converted again`,
          'INQUIRY_ALREADY_CONVERTED'
        );
      }

      const customer = await tx.customer.create({
        data: {
          firmName: inquiry.company,
          phone: inquiry.phone,
          state,
        },
      });

      const updatedInquiry = await tx.inquiry.update({
        where: { id: inquiryId },
        data: { status: 'CONVERTED', convertedCustomerId: customer.id },
      });

      return { customer, inquiry: updatedInquiry };
    });
  }
}

export const inquiryRepository = new InquiryRepository();
