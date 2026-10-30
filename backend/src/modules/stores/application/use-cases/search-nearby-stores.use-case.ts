import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreBranchEntity } from '../../infrastructure/persistence/entities/store-branch.entity';
import { SearchNearbyStoresDto } from '../../presentation/http/dto/search-nearby-stores.dto';

export interface NearbyStoreResult {
  branchId: string;
  supermarketId: string;
  supermarketName: string;
  supermarketLogoUrl: string;
  branchName: string;
  address: string;
  city: string;
  distanceMeters: number;
  distanceKm: number;
  latitude: number;
  longitude: number;
}

@Injectable()
export class SearchNearbyStoresUseCase {
  constructor(
    @InjectRepository(StoreBranchEntity)
    private readonly branchRepository: Repository<StoreBranchEntity>,
  ) {}

  async execute(dto: SearchNearbyStoresDto): Promise<NearbyStoreResult[]> {
    const radiusMeters = (dto.radiusKm || 5) * 1000;

    // PostGIS Raw SQL Query for ST_DistanceSphere and ST_DWithin for maximum geospatial speed
    const rawResults = await this.branchRepository
      .createQueryBuilder('branch')
      .innerJoinAndSelect('branch.supermarket', 'supermarket')
      .select([
        'branch.id AS "branchId"',
        'supermarket.id AS "supermarketId"',
        'supermarket.name AS "supermarketName"',
        'supermarket.logoUrl AS "supermarketLogoUrl"',
        'branch.branchName AS "branchName"',
        'branch.address AS "address"',
        'branch.city AS "city"',
        `ST_Y(branch.location::geometry) AS "latitude"`,
        `ST_X(branch.location::geometry) AS "longitude"`,
        `ST_DistanceSphere(branch.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) AS "distanceMeters"`,
      ])
      .where('branch.isActive = :isActive', { isActive: true })
      .andWhere(
        'ST_DWithin(branch.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        {
          lng: dto.longitude,
          lat: dto.latitude,
          radiusMeters,
        },
      )
      .orderBy('"distanceMeters"', 'ASC')
      .setParameters({
        lat: dto.latitude,
        lng: dto.longitude,
      })
      .getRawMany();

    return rawResults.map((item) => ({
      branchId: item.branchId,
      supermarketId: item.supermarketId,
      supermarketName: item.supermarketName,
      supermarketLogoUrl: item.supermarketLogoUrl,
      branchName: item.branchName,
      address: item.address,
      city: item.city,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
      distanceMeters: Math.round(parseFloat(item.distanceMeters)),
      distanceKm: Math.round((parseFloat(item.distanceMeters) / 1000) * 100) / 100,
    }));
  }
}
