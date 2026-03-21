import { createContext, useContext, useState, ReactNode } from "react";

export type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  images?: string[];
};

type ProductContextType = {
  products: Product[];
  addProduct: (product: Product) => void;
};

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      title: "Crépuscule sur toile",
      description: "Peinture originale sur toile.",
      price: 250,
      category: "Peinture",
      stock: 1,
      images: [],
    },
  ]);

  const addProduct = (product: Product) => {
    setProducts((prev) => [product, ...prev]);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error("useProducts must be used inside ProductProvider");
  }
  return context;
}