/**
 * Type for async page params in Next.js 15+
 */
export type AsyncPageParams<T = {}> = Promise<T>;

/**
 * Type for async search params in Next.js 15+
 */
export type AsyncSearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

/**
 * Common page props with async params and search params
 */
export interface PageProps<TParams = {}, TSearchParams = {}> {
  params: AsyncPageParams<TParams>;
  searchParams?: AsyncSearchParams;
}

/**
 * Inventory page params
 */
export interface InventoryPageParams {
  slug: string;
}

/**
 * Layout props with async params
 */
export interface LayoutProps<TParams = {}> {
  children: React.ReactNode;
  params: AsyncPageParams<TParams>;
}
