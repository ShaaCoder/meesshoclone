export interface Product {
  id: string;
  name: string;
  slug: string;
  image?: string;

  price: number;
  selling_price?: number;

  category_id: string;
  stock?: number;

  created_at?: string;
}