import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VehicleStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { VehicleFilterDto } from './dto/vehicle-filter.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filter: VehicleFilterDto) {
    const {
      brand, model, transmission, fuelType,
      featured, status, yearFrom, yearTo,
      page = 1, limit = 12,
    } = filter;

    const where: Prisma.VehicleWhereInput = {
      ...(brand && { brand: { contains: brand, mode: 'insensitive' } }),
      ...(model && { model: { contains: model, mode: 'insensitive' } }),
      ...(transmission && { transmission }),
      ...(fuelType && { fuelType }),
      ...(featured !== undefined && { featured }),
      status: status ?? VehicleStatus.AVAILABLE,
      ...(yearFrom || yearTo
        ? { year: { gte: yearFrom, lte: yearTo } }
        : {}),
    };

    const [total, vehicles] = await Promise.all([
      this.prisma.vehicle.count({ where }),
      this.prisma.vehicle.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          plans: { where: { isActive: true }, orderBy: { monthlyPrice: 'asc' }, take: 1 },
        },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      data: vehicles,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        plans: { where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } },
      },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  create(dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({ data: dto });
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: VehicleStatus.UNAVAILABLE },
    });
  }
}
