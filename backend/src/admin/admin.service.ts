import { Injectable } from '@nestjs/common';
import { SubscriptionStatus, PaymentStatus, LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      totalVehicles,
      activeSubscriptions,
      pendingLeads,
      revenueThisMonth,
      openTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.vehicle.count(),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.lead.count({ where: { status: LeadStatus.NEW } }),
      this.prisma.payment.aggregate({
        where: {
          status: PaymentStatus.PAID,
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      totalUsers,
      totalVehicles,
      activeSubscriptions,
      pendingLeads,
      revenueThisMonth: revenueThisMonth._sum.amount ?? 0,
      openTickets,
    };
  }

  async getRecentActivity() {
    const [recentSubscriptions, recentLeads, recentPayments] = await Promise.all([
      this.prisma.subscription.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          vehicle: { select: { brand: true, model: true } },
        },
      }),
      this.prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { vehicle: { select: { brand: true, model: true } } },
      }),
      this.prisma.payment.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      }),
    ]);

    return { recentSubscriptions, recentLeads, recentPayments };
  }
}
