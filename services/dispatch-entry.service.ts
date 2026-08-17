import { Prisma, DocStatus } from '@prisma/client';
import {
  dispatchEntryRepository,
  DispatchEntryFilters,
  DispatchLineItemInput,
} from '@/repositories/dispatch-entry.repository';
import { customerRepository } from '@/repositories/customer.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';
import { CreateDispatchEntryInput } from '@/validations/dispatch-entry';

export interface CreditLimitWarning {
  code: 'CREDIT_LIMIT_EXCEEDED';
  message: string;
  outstandingAfter: number;
  creditLimit: number;
}

export class DispatchEntryService {
  async getAll(filters: DispatchEntryFilters) {
    return dispatchEntryRepository.findAll(filters);
  }

  async getById(id: string) {
    const dispatchEntry = await dispatchEntryRepository.findById(id);
    if (!dispatchEntry) {
      throw new NotFoundError(`Dispatch entry with id '${id}' not found`);
    }
    return dispatchEntry;
  }

  async create(data: CreateDispatchEntryInput) {
    const customer = await dispatchEntryRepository.findCustomerById(data.customerId);
    if (!customer) {
      throw new NotFoundError(`Customer with id '${data.customerId}' not found`);
    }

    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await dispatchEntryRepository.findProductsByIds(productIds);
    if (products.length !== productIds.length) {
      throw new BadRequestError('One or more products not found');
    }
    const productMap = new Map(products.map((p) => [p.id, p]));

    const customerPrices = await dispatchEntryRepository.findCustomerPrices(
      data.customerId,
      productIds
    );
    const customerPriceMap = new Map(customerPrices.map((cp) => [cp.productId, Number(cp.price)]));

    let totalAmount = 0;

    const items: DispatchLineItemInput[] = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const price = item.price ?? customerPriceMap.get(item.productId) ?? Number(product.basePrice);
      const lineTotal = price * item.quantity;

      totalAmount += lineTotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        price,
        lineTotal,
      };
    });

    let dispatchEntry;
    try {
      dispatchEntry = await dispatchEntryRepository.createWithStockDecrement({
        challanNo: data.challanNo,
        customerId: data.customerId,
        place: data.place,
        transport: data.transport,
        transportAmount: data.transportAmount,
        date: new Date(data.date),
        totalAmount,
        items,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestError(
          `A dispatch entry with challan number '${data.challanNo}' already exists`,
          'CHALLAN_NUMBER_ALREADY_EXISTS'
        );
      }
      throw error;
    }

    const currentPending = await customerRepository.getPendingTotal(customer.id);
    const outstandingAfter = currentPending + totalAmount;
    const creditLimit = Number(customer.creditLimit);
    const warning: CreditLimitWarning | undefined =
      outstandingAfter > creditLimit
        ? {
            code: 'CREDIT_LIMIT_EXCEEDED',
            message: 'This dispatch pushes the customer beyond their credit limit.',
            outstandingAfter,
            creditLimit,
          }
        : undefined;

    return { dispatchEntry, warning };
  }

  async cancel(id: string) {
    const dispatchEntry = await this.getById(id);

    if (dispatchEntry.status === DocStatus.BILLED) {
      throw new BadRequestError(
        'Cannot cancel a dispatch entry that has been invoiced.',
        'DISPATCH_ENTRY_ALREADY_BILLED'
      );
    }
    if (dispatchEntry.isCancelled) {
      throw new BadRequestError(
        'Dispatch entry is already cancelled',
        'DISPATCH_ENTRY_ALREADY_CANCELLED'
      );
    }

    const items = dispatchEntry.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
    }));

    return dispatchEntryRepository.cancelWithStockRestore(id, items);
  }
}

export const dispatchEntryService = new DispatchEntryService();
