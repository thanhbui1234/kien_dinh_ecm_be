import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { GetLeadsFilterDto } from './dto/get-leads-filter.dto';
import { AppMessages } from '../../common/constants/messages.constant';
import { PageMetaDto, PageDto } from '../../common/dto/pagination.dto';
import { Prisma, Language } from '@prisma/client';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createLeadDto: CreateLeadDto) {
    return this.prisma.contactRequest.create({
      data: createLeadDto,
    });
  }

  async findAll(filterDto: GetLeadsFilterDto) {
    const { search, status, priority, targetProductId, targetJobId, startDate, endDate, sortBy } = filterDto;
    const skip = filterDto.skip;
    const limit = filterDto.limit ?? 10;

    const where: Prisma.ContactRequestWhereInput = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (targetProductId) {
      where.targetProductId = targetProductId;
    }

    if (targetJobId) {
      where.targetJobId = targetJobId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    let orderBy: Prisma.ContactRequestOrderByWithRelationInput = { createdAt: 'desc' };
    if (sortBy) {
      const [field, direction] = sortBy.split('_');
      if (field && direction && (direction === 'asc' || direction === 'desc')) {
        orderBy = { [field]: direction };
      }
    }

    const [rawLeads, total] = await this.prisma.$transaction([
      this.prisma.contactRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          product: {
            select: {
              id: true,
              translations: { where: { lang: Language.VI }, take: 1, select: { name: true } },
            },
          },
          job: {
            select: {
              id: true,
              translations: { where: { lang: Language.VI }, take: 1, select: { title: true } },
            },
          },
        },
      }),
      this.prisma.contactRequest.count({ where }),
    ]);

    const leads = rawLeads.map((lead) => ({
      ...lead,
      product: lead.product
        ? { id: lead.product.id, name: lead.product.translations[0]?.name }
        : null,
      job: lead.job
        ? { id: lead.job.id, title: lead.job.translations[0]?.title }
        : null,
    }));

    const pageMetaDto = new PageMetaDto(total, filterDto, leads.length);
    return new PageDto(leads, pageMetaDto);
  }

  async updateStatus(id: string, updateDto: UpdateLeadStatusDto) {
    const existing = await this.prisma.contactRequest.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        message: AppMessages.LEAD.NOT_FOUND,
        errorCode: 'LEAD_NOT_FOUND',
      });
    }

    return this.prisma.contactRequest.update({
      where: { id },
      data: updateDto,
    });
  }
}
