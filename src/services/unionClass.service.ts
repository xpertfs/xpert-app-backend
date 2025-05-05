import { PrismaClient } from '@prisma/client';
import { BadRequestError } from '../utils/errors';

const prisma = new PrismaClient();

export const unionClassService = {
  async createUnionClass(data: {
    name: string;
    companyId: string;
  }) {
    return prisma.unionClass.create({
      data: {
        name: data.name,
        companyId: data.companyId,
      },
      include: {
        baseRates: true,
        customRates: true,
      },
    });
  },

  async getUnionClasses(companyId: string) {
    return prisma.unionClass.findMany({
      where: { companyId },
      include: {
        baseRates: true,
        customRates: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  },

  async getUnionClassById(id: number, companyId: string) {
    const unionClass = await prisma.unionClass.findFirst({
      where: { 
        id,
        companyId,
      },
      include: {
        baseRates: {
          orderBy: {
            effectiveDate: 'desc',
          },
        },
        customRates: {
          orderBy: {
            effectiveDate: 'desc',
          },
        },
      },
    });

    if (!unionClass) {
      throw new BadRequestError('Union class not found');
    }

    return unionClass;
  },

  async updateUnionClass(id: number, companyId: string, data: { name: string }) {
    const unionClass = await prisma.unionClass.findFirst({
      where: { 
        id,
        companyId,
      },
    });

    if (!unionClass) {
      throw new BadRequestError('Union class not found');
    }

    return prisma.unionClass.update({
      where: { id },
      data: {
        name: data.name,
      },
      include: {
        baseRates: true,
        customRates: true,
      },
    });
  },

  async deleteUnionClass(id: number, companyId: string) {
    const unionClass = await prisma.unionClass.findFirst({
      where: { 
        id,
        companyId,
      },
    });

    if (!unionClass) {
      throw new BadRequestError('Union class not found');
    }

    return prisma.unionClass.delete({
      where: { id },
    });
  },

  async createBaseRate(data: {
    unionClassId: number;
    regularRate: number;
    overtimeRate: number;
    benefitsRate: number;
    effectiveDate: Date;
    endDate?: Date;
  }) {
    return prisma.unionClassBaseRate.create({
      data: {
        unionClassId: data.unionClassId,
        regularRate: data.regularRate,
        overtimeRate: data.overtimeRate,
        benefitsRate: data.benefitsRate,
        effectiveDate: data.effectiveDate,
        endDate: data.endDate,
      },
    });
  },

  async deleteBaseRate(unionClassId: number, rateId: number, companyId: string) {
    // First verify the union class exists and belongs to the company
    const unionClass = await prisma.unionClass.findFirst({
      where: { 
        id: unionClassId,
        companyId,
      },
    });

    if (!unionClass) {
      throw new BadRequestError('Union class not found');
    }

    // Then verify the base rate exists and belongs to the union class
    const baseRate = await prisma.unionClassBaseRate.findFirst({
      where: {
        id: rateId,
        unionClassId,
      },
    });

    if (!baseRate) {
      throw new BadRequestError('Base rate not found');
    }

    // Delete the base rate
    return prisma.unionClassBaseRate.delete({
      where: { id: rateId },
    });
  },

  async createCustomRate(data: {
    unionClassId: number;
    name: string;
    description?: string;
    rate: number;
    effectiveDate: Date;
    endDate?: Date;
  }) {
    return prisma.unionClassCustomRate.create({
      data: {
        unionClassId: data.unionClassId,
        name: data.name,
        description: data.description,
        rate: data.rate,
        effectiveDate: data.effectiveDate,
        endDate: data.endDate,
      },
    });
  },

  async deleteCustomRate(unionClassId: number, rateId: number, companyId: string) {
    // First verify the union class exists and belongs to the company
    const unionClass = await prisma.unionClass.findFirst({
      where: { 
        id: unionClassId,
        companyId,
      },
    });

    if (!unionClass) {
      throw new BadRequestError('Union class not found');
    }

    // Then verify the custom rate exists and belongs to the union class
    const customRate = await prisma.unionClassCustomRate.findFirst({
      where: {
        id: rateId,
        unionClassId,
      },
    });

    if (!customRate) {
      throw new BadRequestError('Custom rate not found');
    }

    // Delete the custom rate
    return prisma.unionClassCustomRate.delete({
      where: { id: rateId },
    });
  },
}; 