export interface Product {
  id: string;
  name: string;
  slug?: string;

  /* 🖼 MEDIA */
  image?: string;
  images?: {
    url: string;
    is_primary?: boolean;
  }[];

  /* 💰 PRICING */
  price?: number;
  selling_price?: number;

  minPrice?: number;
  maxPrice?: number;

  /* 📦 VARIANTS */
  variants?: {
    id?: string;
    size?: string | null;
    color?: string | null;
    cost_price: number;
    mrp: number;
    stock: number;
    selling?: number;
    profit?: number;
  }[];

  /* 📂 CATEGORY */
  category_id: string;
  category_name?: string;

  /* 📊 STATUS */
  status?: "pending" | "approved" | "rejected" | "deleted";

  /* 🔥 FIX HERE */
  approval_status?: "pending" | "approved" | "rejected";

  /* 👤 SELLER */
  seller_id?: string;
  seller?: {
    name?: string;
    email?: string;
  };

  stock?: number;
  rating?: number;
  total_orders?: number;

  created_at?: string;
}