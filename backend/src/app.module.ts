import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { PlansModule } from './plans/plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { LeadsModule } from './leads/leads.module';
import { PaymentsModule } from './payments/payments.module';
import { SupportModule } from './support/support.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    // Config — available globally
    ConfigModule.forRoot({ isGlobal: true }),

    // Rate limiting — 100 requests per minute per IP
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    VehiclesModule,
    PlansModule,
    SubscriptionsModule,
    LeadsModule,
    PaymentsModule,
    SupportModule,
    NotificationsModule,
    FavoritesModule,
    AdminModule,
  ],
})
export class AppModule {}
