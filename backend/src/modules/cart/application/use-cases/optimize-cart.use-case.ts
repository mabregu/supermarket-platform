import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchProductEntity } from '../../../pricing/infrastructure/persistence/entities/branch-product.entity';
import { OptimizeCartDto } from '../../presentation/http/dto/optimize-cart.dto';

export interface CartOptimizationResult {
  singleStoreOption: {
    branchId: string;
    supermarketName: string;
    branchName: string;
    address: string;
    totalCost: number;
    distanceKm: number;
    fulfilledItemsCount: number;
    totalItemsRequested: number;
  } | null;
  splitStoresEnabled: boolean;
  optimizedSplitOption: {
    totalCost: number;
    totalSavings: number;
    savingsPercentage: number;
    suggestedRoute: Array<{
      step: number;
      supermarketName: string;
      branchName: string;
      address: string;
      distanceKm: number;
      itemsToBuy: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }>;
      subtotalForBranch: number;
    }>;
  };
}

@Injectable()
export class OptimizeCartUseCase {
  constructor(
    @InjectRepository(BranchProductEntity)
    private readonly branchProductRepository: Repository<BranchProductEntity>,
  ) {}

  async execute(dto: OptimizeCartDto): Promise<CartOptimizationResult> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('La lista de productos no puede estar vacía.');
    }

    const productIds = dto.items.map((i) => i.productId);
    const radiusKm = dto.maxDistanceKm || 5;
    const radiusMeters = radiusKm * 1000;

    // Consultar todos los precios de los productos seleccionados en sucursales dentro del radio PostGIS
    const rawPrices = await this.branchProductRepository
      .createQueryBuilder('bp')
      .innerJoinAndSelect('bp.branch', 'branch')
      .innerJoinAndSelect('branch.supermarket', 'supermarket')
      .innerJoinAndSelect('bp.product', 'product')
      .select([
        'bp.productId AS "productId"',
        'product.name AS "productName"',
        'bp.currentPrice AS "currentPrice"',
        'branch.id AS "branchId"',
        'branch.branchName AS "branchName"',
        'branch.address AS "address"',
        'supermarket.name AS "supermarketName"',
        `ST_DistanceSphere(branch.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) AS "distanceMeters"`,
      ])
      .where('bp.productId IN (:...productIds)', { productIds })
      .andWhere('branch.isActive = true')
      .andWhere(
        'ST_DWithin(branch.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)',
        { radiusMeters },
      )
      .setParameters({ lat: dto.latitude, lng: dto.longitude })
      .getRawMany();

    // Map de cantidades solicitadas
    const qtyMap = new Map<string, number>();
    dto.items.forEach((item) => qtyMap.set(item.productId, item.quantity));

    // Grouping por BranchId para calcular opción mono-tienda
    const storeMap = new Map<
      string,
      {
        branchId: string;
        supermarketName: string;
        branchName: string;
        address: string;
        distanceKm: number;
        items: Map<string, { productName: string; price: number }>;
        totalCost: number;
      }
    >();

    rawPrices.forEach((row) => {
      const bId = row.branchId;
      if (!storeMap.has(bId)) {
        storeMap.set(bId, {
          branchId: bId,
          supermarketName: row.supermarketName,
          branchName: row.branchName,
          address: row.address,
          distanceKm: Math.round((parseFloat(row.distanceMeters) / 1000) * 100) / 100,
          items: new Map(),
          totalCost: 0,
        });
      }
      const store = storeMap.get(bId)!;
      const price = parseFloat(row.currentPrice);
      store.items.set(row.productId, { productName: row.productName, price });
    });

    // 1. Calcular la mejor opción MONO-TIENDA (Single Store)
    let bestSingleStore: any = null;
    let minSingleCost = Infinity;

    storeMap.forEach((store) => {
      let cost = 0;
      let fulfilled = 0;

      productIds.forEach((pId) => {
        if (store.items.has(pId)) {
          const itemInfo = store.items.get(pId)!;
          const qty = qtyMap.get(pId) || 1;
          cost += itemInfo.price * qty;
          fulfilled++;
        }
      });

      if (fulfilled === productIds.length && cost < minSingleCost) {
        minSingleCost = cost;
        bestSingleStore = {
          branchId: store.branchId,
          supermarketName: store.supermarketName,
          branchName: store.branchName,
          address: store.address,
          totalCost: Math.round(cost * 100) / 100,
          distanceKm: store.distanceKm,
          fulfilledItemsCount: fulfilled,
          totalItemsRequested: productIds.length,
        };
      }
    });

    // 2. Calcular la opción OPTIMIZADA MULTI-TIENDA (Split Store)
    // Una sola pasada sobre los precios: nos quedamos con el más barato de cada producto (O(n)).
    const bestPricePerProduct = new Map<
      string,
      {
        branchId: string;
        supermarketName: string;
        branchName: string;
        address: string;
        distanceKm: number;
        productName: string;
        price: number;
      }
    >();

    rawPrices.forEach((row) => {
      const p = parseFloat(row.currentPrice);
      const current = bestPricePerProduct.get(row.productId);
      if (!current || p < current.price) {
        bestPricePerProduct.set(row.productId, {
          branchId: row.branchId,
          supermarketName: row.supermarketName,
          branchName: row.branchName,
          address: row.address,
          distanceKm: Math.round((parseFloat(row.distanceMeters) / 1000) * 100) / 100,
          productName: row.productName,
          price: p,
        });
      }
    });

    // Agrupar los mejores precios por sucursal sugerida para armar la ruta
    const routeBranchMap = new Map<
      string,
      {
        supermarketName: string;
        branchName: string;
        address: string;
        distanceKm: number;
        itemsToBuy: any[];
        subtotalForBranch: number;
      }
    >();

    let splitTotalCost = 0;

    bestPricePerProduct.forEach((best, pId) => {
      const qty = qtyMap.get(pId) || 1;
      const subtotal = best.price * qty;
      splitTotalCost += subtotal;

      if (!routeBranchMap.has(best.branchId)) {
        routeBranchMap.set(best.branchId, {
          supermarketName: best.supermarketName,
          branchName: best.branchName,
          address: best.address,
          distanceKm: best.distanceKm,
          itemsToBuy: [],
          subtotalForBranch: 0,
        });
      }

      const branchRoute = routeBranchMap.get(best.branchId)!;
      branchRoute.itemsToBuy.push({
        productId: pId,
        productName: best.productName,
        quantity: qty,
        unitPrice: best.price,
        subtotal: Math.round(subtotal * 100) / 100,
      });
      branchRoute.subtotalForBranch += subtotal;
    });

    // Formatear array de ruta sugerida ordenado por distancia
    const splitSuggestedRoute = Array.from(routeBranchMap.values())
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .map((route, idx) => ({
        step: idx + 1,
        supermarketName: route.supermarketName,
        branchName: route.branchName,
        address: route.address,
        distanceKm: route.distanceKm,
        itemsToBuy: route.itemsToBuy,
        subtotalForBranch: Math.round(route.subtotalForBranch * 100) / 100,
      }));

    // El usuario puede desactivar la división de la compra (allowSplitStores = false).
    const allowSplit = dto.allowSplitStores !== false;

    let suggestedRoute = splitSuggestedRoute;
    let optimizedTotalCost = splitTotalCost;

    if (!allowSplit) {
      if (!bestSingleStore) {
        throw new BadRequestException(
          'No existe un supermercado que tenga todos los productos solicitados dentro del radio.',
        );
      }

      const singleStore = storeMap.get(bestSingleStore.branchId)!;
      const singleItemsToBuy = productIds
        .filter((pId) => singleStore.items.has(pId))
        .map((pId) => {
          const itemInfo = singleStore.items.get(pId)!;
          const qty = qtyMap.get(pId) || 1;
          return {
            productId: pId,
            productName: itemInfo.productName,
            quantity: qty,
            unitPrice: itemInfo.price,
            subtotal: Math.round(itemInfo.price * qty * 100) / 100,
          };
        });

      optimizedTotalCost = bestSingleStore.totalCost;
      suggestedRoute = [
        {
          step: 1,
          supermarketName: bestSingleStore.supermarketName,
          branchName: bestSingleStore.branchName,
          address: bestSingleStore.address,
          distanceKm: bestSingleStore.distanceKm,
          itemsToBuy: singleItemsToBuy,
          subtotalForBranch: bestSingleStore.totalCost,
        },
      ];
    }

    const benchmarkCost = bestSingleStore ? bestSingleStore.totalCost : optimizedTotalCost;
    const totalSavings = Math.max(0, benchmarkCost - optimizedTotalCost);
    const savingsPercentage = benchmarkCost > 0 ? (totalSavings / benchmarkCost) * 100 : 0;

    return {
      singleStoreOption: bestSingleStore,
      splitStoresEnabled: allowSplit,
      optimizedSplitOption: {
        totalCost: Math.round(optimizedTotalCost * 100) / 100,
        totalSavings: Math.round(totalSavings * 100) / 100,
        savingsPercentage: Math.round(savingsPercentage * 10) / 10,
        suggestedRoute,
      },
    };
  }
}
