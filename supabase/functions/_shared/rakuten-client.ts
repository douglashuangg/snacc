import { request } from "undici";
import { fetchJsonWithRetry, type RetryOptions } from "./retry.ts";
import {
  parseGenreResponse,
  parseProductSearchResponse,
  type RakutenGenreResponse,
  type RakutenProductSearchResponse,
} from "./rakuten-types.ts";

export const PRODUCT_SEARCH_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibaproduct/api/Product/Search/20250801";
export const GENRE_SEARCH_ENDPOINT =
  "https://openapi.rakuten.co.jp/ichibagt/api/IchibaGenre/Search/20260701";

const PRODUCT_ELEMENTS = [
  "productId",
  "productCode",
  "productName",
  "brandName",
  "mediumImageUrl",
  "productCaption",
  "releaseDate",
  "makerName",
  "makerNameFormal",
  "itemCount",
  "salesItemCount",
  "minPrice",
  "maxPrice",
  "salesMinPrice",
  "salesMaxPrice",
  "averagePrice",
  "reviewCount",
  "reviewAverage",
  "reviewUrlPC",
  "rank",
  "rankTargetGenreId",
  "rankTargetProductCount",
  "genreId",
  "genreName",
  "detail",
  "productUrlPC",
].join(",");

export interface RakutenCredentials {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
  /**
   * Web Application mode only: must match an Allowed Website on the Rakuten app.
   * Leave unset for API/Backend apps that use IP allowlisting; sending a bogus
   * Origin (e.g. https://localhost) causes Authentication service error.
   */
  origin?: string;
}

export interface ProductSearchParams {
  keyword?: string;
  genreId?: string;
  productId?: string;
  productCode?: string;
  page?: number;
}

/**
 * Deno/browser fetch forbids setting Referer. Web Application mode needs
 * Origin + Referer, so use undici which allows those headers. Backend/IP
 * mode omits them.
 */
export async function rakutenFetch(
  input: string | URL | Request,
  init: RequestInit = {},
): Promise<Response> {
  const url = String(input);
  const headers = new Headers(init.headers);
  const { statusCode, headers: responseHeaders, body } = await request(url, {
    method: init.method ?? "GET",
    headers: Object.fromEntries(headers.entries()),
    signal: init.signal ?? undefined,
  });
  return new Response(await body.text(), {
    status: statusCode,
    headers: responseHeaders as HeadersInit,
  });
}

export class RakutenClient {
  constructor(
    private readonly credentials: RakutenCredentials,
    private readonly retryOptions: RetryOptions = {},
  ) {}

  private async get(
    endpoint: string,
    parameters: Record<string, string>,
    formatVersion?: string,
  ): Promise<unknown> {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      applicationId: this.credentials.applicationId,
      accessKey: this.credentials.accessKey,
      format: "json",
      ...(formatVersion ? { formatVersion } : {}),
      ...(this.credentials.affiliateId
        ? { affiliateId: this.credentials.affiliateId }
        : {}),
      ...parameters,
    }).toString();
    const origin = this.credentials.origin?.trim().replace(/\/$/u, "");
    const headers: Record<string, string> = {
      accept: "application/json",
    };
    if (origin) {
      headers.origin = origin;
      headers.referer = `${origin}/`;
    }
    return fetchJsonWithRetry(
      url.toString(),
      { headers },
      {
        ...this.retryOptions,
        fetchImpl: this.retryOptions.fetchImpl ?? rakutenFetch,
      },
    );
  }

  async searchProducts(
    params: ProductSearchParams,
  ): Promise<RakutenProductSearchResponse> {
    const selectors = [
      params.keyword,
      params.genreId,
      params.productId,
      params.productCode,
    ].filter(Boolean);
    if (selectors.length !== 1) {
      throw new Error(
        "Product Search requires exactly one keyword, genreId, productId, or productCode",
      );
    }
    const response = await this.get(
      PRODUCT_SEARCH_ENDPOINT,
      {
        hits: "30",
        page: String(params.page ?? 1),
        elements: PRODUCT_ELEMENTS,
        ...(params.keyword ? { keyword: params.keyword } : {}),
        ...(params.genreId ? { genreId: params.genreId } : {}),
        ...(params.productId ? { productId: params.productId } : {}),
        ...(params.productCode ? { productCode: params.productCode } : {}),
      },
      "2",
    );
    return parseProductSearchResponse(response);
  }

  async searchGenre(genreId: string): Promise<RakutenGenreResponse> {
    const response = await this.get(GENRE_SEARCH_ENDPOINT, { genreId });
    return parseGenreResponse(response);
  }
}

export function rakutenClientFromEnv(
  retryOptions: RetryOptions = {},
): RakutenClient {
  const applicationId = Deno.env.get("RAKUTEN_APPLICATION_ID");
  const accessKey = Deno.env.get("RAKUTEN_ACCESS_KEY");
  if (!applicationId || !accessKey) {
    throw new Error("Rakuten API secrets are not configured");
  }
  return new RakutenClient(
    {
      applicationId: applicationId.trim(),
      accessKey: accessKey.trim(),
      affiliateId: Deno.env.get("RAKUTEN_AFFILIATE_ID")?.trim() || undefined,
      origin: Deno.env.get("RAKUTEN_ORIGIN")?.trim() || undefined,
    },
    retryOptions,
  );
}
