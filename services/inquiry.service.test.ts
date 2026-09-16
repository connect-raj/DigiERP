import { describe, it, expect, vi, beforeEach } from 'vitest';
import { inquiryService } from './inquiry.service';
import { inquiryRepository } from '@/repositories/inquiry.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';

vi.mock('@/repositories/inquiry.repository', () => ({
  inquiryRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    findByPhone: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    convertToCustomer: vi.fn(),
  },
}));

const mockInquiry = {
  id: 'inq-1',
  source: 'WEBSITE',
  status: 'NEW',
  company: 'Acme Prints',
  contactName: 'Jane Doe',
  phone: '9999999999',
  interestCategory: 'INK',
};

describe('InquiryService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('throws NotFoundError when the inquiry does not exist', async () => {
      vi.mocked(inquiryRepository.findById).mockResolvedValue(null);
      await expect(inquiryService.getById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('createFromPublicSubmission', () => {
    it('creates the inquiry with the source forced from the verified API key', async () => {
      vi.mocked(inquiryRepository.create).mockResolvedValue(mockInquiry as never);

      const result = await inquiryService.createFromPublicSubmission(
        {
          company: 'Acme Prints',
          contactName: 'Jane Doe',
          phone: '9999999999',
          interestCategory: 'INK',
        },
        'EXPO'
      );

      expect(result).toEqual({ dropped: false, inquiry: mockInquiry });
      expect(inquiryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'EXPO' })
      );
    });

    it('ignores a source claimed in the body — only the API-key-derived source is used', async () => {
      vi.mocked(inquiryRepository.create).mockResolvedValue(mockInquiry as never);

      await inquiryService.createFromPublicSubmission(
        {
          company: 'Acme Prints',
          contactName: 'Jane Doe',
          phone: '9999999999',
          interestCategory: 'INK',
          // @ts-expect-error - simulating a malicious/naive client claiming a source
          source: 'WEBSITE',
        },
        'EXPO'
      );

      expect(inquiryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'EXPO' })
      );
    });

    it('silently drops the submission when the honeypot field is filled, without persisting it', async () => {
      const result = await inquiryService.createFromPublicSubmission(
        {
          company: 'Bot Inc',
          contactName: 'Bot',
          phone: '0000000000',
          interestCategory: 'INK',
          website_hp: 'i-am-a-bot',
        },
        'WEBSITE'
      );

      expect(result).toEqual({ dropped: true });
      expect(inquiryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('allows NEW -> CONTACTED', async () => {
      vi.mocked(inquiryRepository.findById).mockResolvedValue(mockInquiry as never);
      vi.mocked(inquiryRepository.updateStatus).mockResolvedValue({
        ...mockInquiry,
        status: 'CONTACTED',
      } as never);

      await inquiryService.updateStatus('inq-1', 'CONTACTED');

      expect(inquiryRepository.updateStatus).toHaveBeenCalledWith('inq-1', 'CONTACTED');
    });

    it('rejects an invalid transition, e.g. NEW -> CONVERTED directly', async () => {
      vi.mocked(inquiryRepository.findById).mockResolvedValue(mockInquiry as never);

      await expect(inquiryService.updateStatus('inq-1', 'CONVERTED')).rejects.toThrow(
        BadRequestError
      );
      expect(inquiryRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('rejects any transition out of a terminal CLOSED status', async () => {
      vi.mocked(inquiryRepository.findById).mockResolvedValue({
        ...mockInquiry,
        status: 'CLOSED',
      } as never);

      await expect(inquiryService.updateStatus('inq-1', 'CONTACTED')).rejects.toThrow(
        BadRequestError
      );
    });
  });

  describe('convertToCustomer', () => {
    it('404s on a missing inquiry before attempting conversion', async () => {
      vi.mocked(inquiryRepository.findById).mockResolvedValue(null);

      await expect(inquiryService.convertToCustomer('missing', 'Maharashtra')).rejects.toThrow(
        NotFoundError
      );
      expect(inquiryRepository.convertToCustomer).not.toHaveBeenCalled();
    });

    it('delegates to the repository transaction for an existing inquiry', async () => {
      vi.mocked(inquiryRepository.findById).mockResolvedValue(mockInquiry as never);
      vi.mocked(inquiryRepository.convertToCustomer).mockResolvedValue({
        customer: { id: 'cust-1' },
        inquiry: { ...mockInquiry, status: 'CONVERTED' },
      } as never);

      await inquiryService.convertToCustomer('inq-1', 'Maharashtra');

      expect(inquiryRepository.convertToCustomer).toHaveBeenCalledWith('inq-1', 'Maharashtra');
    });
  });
});
