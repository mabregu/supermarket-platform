import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Un item detectado en un ticket.
 */
export interface ExtractedItem {
  eanCode?: string;
  name: string;
  price: number;
  quantity?: number;
}

export interface ReceiptExtraction {
  items: ExtractedItem[];
  /** Fecha de compra detectada en el ticket (si el OCR la leyo). */
  purchasedAt?: Date;
  /** Que extractor se uso realmente. */
  extractor: 'azure' | 'provided' | 'none';
  note?: string;
}

/**
 * Contrato de extraccion de tickets. Hay dos implementaciones:
 *  - AzureDocumentIntelligenceExtractor: OCR real (si hay credenciales).
 *  - ProvidedItemsExtractor: el cliente ya trae los items (modo sin OCR).
 *
 * Es una clase abstracta (y no una interfaz) para poder usarla como token de
 * inyeccion de dependencias en Nest.
 */
export abstract class ReceiptExtractor {
  abstract readonly name: 'azure' | 'provided' | 'none';
  abstract isAvailable(): boolean;
  abstract extract(input: {
    imageBase64?: string;
    imageUrl?: string;
    items?: ExtractedItem[];
  }): Promise<ReceiptExtraction>;
}

/**
 * Modo sin OCR: usa los items que envio el cliente.
 */
@Injectable()
export class ProvidedItemsExtractor extends ReceiptExtractor {
  readonly name = 'provided' as const;

  isAvailable(): boolean {
    return true;
  }

  async extract(input: {
    imageBase64?: string;
    imageUrl?: string;
    items?: ExtractedItem[];
  }): Promise<ReceiptExtraction> {
    return {
      items: input.items ?? [],
      extractor: 'provided',
      note: 'Extraccion provista por el cliente (OCR no configurado).',
    };
  }
}

/**
 * OCR real con Azure AI Document Intelligence (modelo prebuilt-receipt).
 *
 * Solo se usa si hay endpoint + key configurados. Si no, el modulo cae al
 * extractor por defecto.
 *
 * Referencia: https://learn.microsoft.com/azure/ai-services/document-intelligence/
 */
@Injectable()
export class AzureDocumentIntelligenceExtractor extends ReceiptExtractor {
  readonly name = 'azure' as const;
  private readonly logger = new Logger(AzureDocumentIntelligenceExtractor.name);

  private readonly endpoint?: string;
  private readonly key?: string;
  private readonly apiVersion: string;
  private readonly timeoutMs: number;

  constructor(configService: ConfigService) {
    super();
    this.endpoint = configService.get<string>('AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT')?.replace(/\/+$/, '');
    this.key = configService.get<string>('AZURE_DOCUMENT_INTELLIGENCE_KEY');
    this.apiVersion = configService.get<string>('AZURE_DOCUMENT_INTELLIGENCE_API_VERSION', '2024-11-30-preview');
    this.timeoutMs = configService.get<number>('AZURE_DOCUMENT_INTELLIGENCE_TIMEOUT_MS', 45000);
  }

  isAvailable(): boolean {
    return Boolean(this.endpoint && this.key);
  }

  async extract(input: {
    imageBase64?: string;
    imageUrl?: string;
    items?: ExtractedItem[];
  }): Promise<ReceiptExtraction> {
    if (!this.isAvailable()) {
      return { items: [], extractor: 'none', note: 'Azure Document Intelligence no configurado.' };
    }

    const body = input.imageBase64
      ? { binaryDocument: input.imageBase64 }
      : input.imageUrl
        ? { urlSource: input.imageUrl }
        : null;

    if (!body) {
      return { items: [], extractor: 'none', note: 'No se recibio imagen para procesar.' };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const analyzeUrl = `${this.endpoint}/documentintelligence/documentModels/prebuilt-receipt:analyze?api-version=${this.apiVersion}`;
      const start = await fetch(analyzeUrl, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Ocp-Apim-Subscription-Key': this.key!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!start.ok) {
        throw new Error(`Azure analyze respondió HTTP ${start.status}`);
      }

      const { operationId } = (await start.json()) as { operationId: string };
      const result = await this.pollOperation(operationId);
      return this.toExtraction(result);
    } catch (error) {
      this.logger.warn(`Fallo la extraccion con Azure: ${(error as Error).message}`);
      return { items: [], extractor: 'none', note: `Error de Azure: ${(error as Error).message}` };
    } finally {
      clearTimeout(timer);
    }
  }

  private async pollOperation(operationId: string): Promise<any> {
    const statusUrl = `${this.endpoint}/documentintelligence/documentModels/prebuilt-receipt:analyzeResults/${operationId}?api-version=${this.apiVersion}`;

    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const response = await fetch(statusUrl, {
        headers: { 'Ocp-Apim-Subscription-Key': this.key! },
      });
      if (!response.ok) {
        throw new Error(`Azure status respondió HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (payload.status === 'succeeded') {
        return payload;
      }
      if (payload.status === 'failed') {
        throw new Error('Azure no pudo procesar el documento.');
      }
    }

    throw new Error('Timeout esperando el resultado de Azure.');
  }

  /** Traduce el analyzeResult de Azure a items normalizados. */
  private toExtraction(payload: any): ReceiptExtraction {
    const documents = payload?.analyzeResult?.documents ?? [];
    const doc = documents[0];
    const fields = doc?.fields ?? {};

    const items: ExtractedItem[] = [];
    const lineItems = fields.LineItems?.valueArray ?? [];
    for (const line of lineItems) {
      const name = line?.Description?.content ?? line?.Name?.content ?? '';
      const total = Number(line?.TotalPrice?.content ?? line?.Amount?.content ?? 0);
      if (!name || !Number.isFinite(total) || total <= 0) continue;

      items.push({
        name,
        price: total,
        quantity: Number(line?.Quantity?.content ?? 1) || 1,
        eanCode: this.extractEan(line),
      });
    }

    const purchasedAtRaw = fields.TransactionDate?.content ?? fields.TransactionTime?.content;
    const purchasedAt = purchasedAtRaw ? new Date(purchasedAtRaw) : undefined;

    return {
      items,
      purchasedAt: purchasedAt && !Number.isNaN(purchasedAt.getTime()) ? purchasedAt : undefined,
      extractor: 'azure',
    };
  }

  /** Busca un EAN (13 digitos) dentro del texto del item. */
  private extractEan(line: any): string | undefined {
    const text = JSON.stringify(line);
    const match = text.match(/\b\d{13}\b/);
    return match ? match[0] : undefined;
  }
}
