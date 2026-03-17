import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  findByUser(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: {
        vehicle: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            plans: { where: { isActive: true }, orderBy: { monthlyPrice: 'asc' }, take: 1 },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggle(userId: string, vehicleId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_vehicleId: { userId, vehicleId } },
    });

    if (existing) {
      await this.prisma.favorite.delete({ where: { userId_vehicleId: { userId, vehicleId } } });
      return { favorited: false };
    }

    await this.prisma.favorite.create({ data: { userId, vehicleId } });
    return { favorited: true };
  }

  async isFavorited(userId: string, vehicleId: string) {
    const fav = await this.prisma.favorite.findUnique({
      where: { userId_vehicleId: { userId, vehicleId } },
    });
    return { favorited: !!fav };
  }
}
