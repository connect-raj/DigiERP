import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productLineService } from './product-line.service';
import { productLineRepository } from '@/repositories/product-line.repository';
import { lineRoleRepository } from '@/repositories/line-role.repository';
import { NotFoundError, BadRequestError } from '@/lib/errors';

vi.mock('@/repositories/product-line.repository', () => ({
  productLineRepository: {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/repositories/line-role.repository', () => ({
  lineRoleRepository: {
    findById: vi.fn(),
  },
}));

const roleUsesColours = { id: 'role-1', name: 'Dye Sub', usesColours: true };
const roleNoColours = { id: 'role-2', name: 'Flush', usesColours: false };

const baseInkInput = {
  kind: 'INK' as const,
  name: 'Premium UV Ink',
  taxClassId: 'tc-1',
  technologyId: 'tech-1',
  roleId: 'role-1',
  colourSetId: 'cs-1',
  printheadIds: ['head-1'],
};

const baseMachineInput = {
  kind: 'MACHINE' as const,
  name: 'Konica 512i',
  taxClassId: 'tc-1',
  technologyId: 'tech-1',
  formatId: 'format-1',
};

const baseSparePartInput = {
  kind: 'SPARE_PART' as const,
  name: 'Wiper Blade',
  taxClassId: 'tc-1',
};

const existingInkLine = {
  id: 'line-1',
  kind: 'INK',
  name: 'Premium UV Ink',
  technologyId: 'tech-1',
  roleId: 'role-1',
  formatId: null,
  colourSetId: 'cs-1',
  heads: [{ printheadId: 'head-1' }],
};

describe('ProductLineService kind validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('create', () => {
    it('creates an INK line with technology, role, >=1 head and a colour set (role.usesColours)', async () => {
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleUsesColours as never);
      vi.spyOn(productLineRepository, 'create').mockResolvedValue({ id: 'line-1' } as never);

      await productLineService.create(baseInkInput as never);

      expect(productLineRepository.create).toHaveBeenCalled();
    });

    it('rejects an INK line missing technology', async () => {
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleUsesColours as never);
      await expect(
        productLineService.create({ ...baseInkInput, technologyId: undefined } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects an INK line missing role', async () => {
      await expect(
        productLineService.create({ ...baseInkInput, roleId: undefined } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects an INK line with no printheads', async () => {
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleUsesColours as never);
      await expect(
        productLineService.create({ ...baseInkInput, printheadIds: [] } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects an INK line whose role uses colours but no colourSetId is given', async () => {
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleUsesColours as never);
      await expect(
        productLineService.create({ ...baseInkInput, colourSetId: undefined } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('allows an INK line whose role does not use colours, without a colourSetId', async () => {
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleNoColours as never);
      vi.spyOn(productLineRepository, 'create').mockResolvedValue({ id: 'line-2' } as never);

      await productLineService.create({
        ...baseInkInput,
        roleId: 'role-2',
        colourSetId: undefined,
      } as never);

      expect(productLineRepository.create).toHaveBeenCalled();
    });

    it('creates a MACHINE line with technology and format', async () => {
      vi.spyOn(productLineRepository, 'create').mockResolvedValue({ id: 'line-3' } as never);
      await productLineService.create(baseMachineInput as never);
      expect(productLineRepository.create).toHaveBeenCalled();
    });

    it('rejects a MACHINE line missing technology', async () => {
      await expect(
        productLineService.create({ ...baseMachineInput, technologyId: undefined } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects a MACHINE line missing format', async () => {
      await expect(
        productLineService.create({ ...baseMachineInput, formatId: undefined } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('creates a SPARE_PART line with no required attributes beyond the base fields', async () => {
      vi.spyOn(productLineRepository, 'create').mockResolvedValue({ id: 'line-4' } as never);
      await productLineService.create(baseSparePartInput as never);
      expect(productLineRepository.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('re-validates kind rules against the merged existing + patch data', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(existingInkLine as never);
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleUsesColours as never);
      // Patch removes the technology that made the existing INK line valid.
      await expect(
        productLineService.update('line-1', { technologyId: null } as never)
      ).rejects.toThrow(BadRequestError);
    });

    it('throws NotFoundError when the line does not exist', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(null);
      await expect(productLineService.update('missing', {} as never)).rejects.toThrow(
        NotFoundError
      );
    });

    it('allows an update that keeps the merged line valid', async () => {
      vi.spyOn(productLineRepository, 'findById').mockResolvedValue(existingInkLine as never);
      vi.spyOn(lineRoleRepository, 'findById').mockResolvedValue(roleUsesColours as never);
      vi.spyOn(productLineRepository, 'update').mockResolvedValue({ id: 'line-1' } as never);

      await productLineService.update('line-1', { name: 'Renamed Ink' } as never);

      expect(productLineRepository.update).toHaveBeenCalled();
    });
  });
});
