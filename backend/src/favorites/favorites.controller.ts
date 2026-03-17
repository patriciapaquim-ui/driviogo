import { Controller, Get, Post, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  @ApiOperation({ summary: 'List favorited vehicles' })
  findMine(@Request() req: { user: { id: string } }) {
    return this.favoritesService.findByUser(req.user.id);
  }

  @Post(':vehicleId')
  @ApiOperation({ summary: 'Toggle favorite on a vehicle' })
  toggle(
    @Param('vehicleId') vehicleId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.favoritesService.toggle(req.user.id, vehicleId);
  }

  @Get(':vehicleId')
  @ApiOperation({ summary: 'Check if vehicle is favorited' })
  check(
    @Param('vehicleId') vehicleId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.favoritesService.isFavorited(req.user.id, vehicleId);
  }
}
