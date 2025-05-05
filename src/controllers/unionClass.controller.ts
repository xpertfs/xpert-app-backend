import { Request, Response } from 'express';
import { unionClassService } from '../services/unionClass.service';

export const unionClassController = {
  async createUnionClass(req: Request, res: Response) {
    const { name } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unionClass = await unionClassService.createUnionClass({
      name,
      companyId,
    });

    res.status(201).json(unionClass);
  },

  async getUnionClasses(req: Request, res: Response) {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unionClasses = await unionClassService.getUnionClasses(companyId);
    res.json(unionClasses);
  },

  async getUnionClassById(req: Request, res: Response) {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unionClass = await unionClassService.getUnionClassById(Number(id), companyId);
    res.json(unionClass);
  },

  async updateUnionClass(req: Request, res: Response) {
    const { id } = req.params;
    const { name } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const unionClass = await unionClassService.updateUnionClass(Number(id), companyId, { name });
    res.json(unionClass);
  },

  async deleteUnionClass(req: Request, res: Response) {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await unionClassService.deleteUnionClass(Number(id), companyId);
    res.status(204).send();
  },

  async createBaseRate(req: Request, res: Response) {
    const { unionClassId, regularRate, overtimeRate, benefitsRate, effectiveDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const baseRate = await unionClassService.createBaseRate({
      unionClassId: Number(unionClassId),
      regularRate: Number(regularRate),
      overtimeRate: Number(overtimeRate),
      benefitsRate: Number(benefitsRate),
      effectiveDate: new Date(effectiveDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json(baseRate);
  },

  async deleteBaseRate(req: Request, res: Response) {
    const { id, rateId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await unionClassService.deleteBaseRate(Number(id), Number(rateId), companyId);
    res.status(204).send();
  },

  async createCustomRate(req: Request, res: Response) {
    const { unionClassId, name, description, rate, effectiveDate, endDate } = req.body;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const customRate = await unionClassService.createCustomRate({
      unionClassId: Number(unionClassId),
      name,
      description,
      rate: Number(rate),
      effectiveDate: new Date(effectiveDate),
      endDate: endDate ? new Date(endDate) : undefined,
    });

    res.status(201).json(customRate);
  },

  async deleteCustomRate(req: Request, res: Response) {
    const { id, rateId } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await unionClassService.deleteCustomRate(Number(id), Number(rateId), companyId);
    res.status(204).send();
  },
}; 