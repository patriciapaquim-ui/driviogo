import { PrismaClient, Role, VehicleStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DrivioGo database...');

  // Admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@driviogo.com.br' },
    update: {},
    create: {
      name: 'Admin DrivioGo',
      email: 'admin@driviogo.com.br',
      passwordHash: adminPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`✅ Admin created: ${admin.email}`);

  // Sample vehicles
  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { plate: 'DRV-0001' },
      update: {},
      create: {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2024,
        color: 'Prata',
        plate: 'DRV-0001',
        transmission: 'automatic',
        fuelType: 'flex',
        status: VehicleStatus.AVAILABLE,
        featured: true,
        description: 'Sedan executivo com tecnologia Toyota Safety Sense.',
        plans: {
          create: [
            {
              name: 'Plano 12 meses',
              durationMonths: 12,
              monthlyPrice: 2800,
              includedKm: 2000,
              extraKmPrice: 1.5,
            },
            {
              name: 'Plano 24 meses',
              durationMonths: 24,
              monthlyPrice: 2500,
              includedKm: 2500,
              extraKmPrice: 1.2,
            },
          ],
        },
      },
    }),
    prisma.vehicle.upsert({
      where: { plate: 'DRV-0002' },
      update: {},
      create: {
        brand: 'Volkswagen',
        model: 'T-Cross',
        year: 2024,
        color: 'Branco',
        plate: 'DRV-0002',
        transmission: 'automatic',
        fuelType: 'flex',
        status: VehicleStatus.AVAILABLE,
        featured: true,
        description: 'SUV compacto com excelente custo-benefício.',
        plans: {
          create: [
            {
              name: 'Plano 12 meses',
              durationMonths: 12,
              monthlyPrice: 2600,
              includedKm: 2000,
              extraKmPrice: 1.5,
            },
          ],
        },
      },
    }),
    prisma.vehicle.upsert({
      where: { plate: 'DRV-0003' },
      update: {},
      create: {
        brand: 'Chevrolet',
        model: 'Onix',
        year: 2024,
        color: 'Vermelho',
        plate: 'DRV-0003',
        transmission: 'manual',
        fuelType: 'flex',
        status: VehicleStatus.AVAILABLE,
        featured: false,
        description: 'Hatch popular com baixo custo de manutenção.',
        plans: {
          create: [
            {
              name: 'Plano 6 meses',
              durationMonths: 6,
              monthlyPrice: 1800,
              includedKm: 1500,
              extraKmPrice: 1.8,
            },
            {
              name: 'Plano 12 meses',
              durationMonths: 12,
              monthlyPrice: 1600,
              includedKm: 2000,
              extraKmPrice: 1.5,
            },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ ${vehicles.length} vehicles seeded`);
  console.log('🚀 Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
