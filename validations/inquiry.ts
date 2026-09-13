import { z } from 'zod';

/** `website_hp` is the honeypot field — real users never see or fill it. */
export const publicInquiryCreateSchema = z.object({
  company: z.string().min(1, 'Company is required'),
  contactName: z.string().min(1, 'Contact name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email').optional(),
  city: z.string().optional(),
  interestCategory: z.enum(['INK', 'LARGE_FORMAT_PRINTER', 'NOT_SURE']),
  inkType: z.enum(['UV', 'SOLVENT', 'ECO_SOLVENT']).optional(),
  volume: z.string().optional(),
  printerBrand: z.string().optional(),
  currentSupplier: z.string().optional(),
  notes: z.string().optional(),
  website_hp: z.string().optional(),
});

export const updateInquiryStatusSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'CONVERTED', 'CLOSED']),
});

export const convertInquirySchema = z.object({
  state: z.string().min(1, 'State is required'),
});

export type PublicInquiryCreateInput = z.infer<typeof publicInquiryCreateSchema>;
export type UpdateInquiryStatusInput = z.infer<typeof updateInquiryStatusSchema>;
export type ConvertInquiryInput = z.infer<typeof convertInquirySchema>;
