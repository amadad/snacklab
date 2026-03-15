"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useCart } from "@/components/CartProvider";

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  description: string;
};

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const { addItem } = useCart();

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json() as Promise<Product[]>)
      .then(setProducts);
  }, []);

  const inStock = products.filter((p) => p.quantity > 0);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-pink-bold mb-2">Welcome to Snack Lab!</h1>
        <p className="text-center text-caramel mb-8">Browse our yummy selection</p>

        {inStock.length === 0 ? (
          <p className="text-center text-caramel/70 text-lg mt-20">
            No items yet — check back soon!
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {inStock.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden border-2 border-pink-light hover:border-pink-mid hover:shadow-lg transition-all hover:-translate-y-1"
              >
                {p.image ? (
                  <img
                    src={p.image}
                    alt={p.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-peach flex items-center justify-center text-4xl">
                    🍡
                  </div>
                )}
                <div className="p-4">
                  <h2 className="font-bold text-lg text-chocolate">{p.name}</h2>
                  {p.description && (
                    <p className="text-sm text-caramel mt-1">{p.description}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-pink-bold font-bold text-lg">
                      ${p.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-caramel">
                      {p.quantity} left
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      addItem({
                        productId: p.id,
                        name: p.name,
                        price: p.price,
                        image: p.image,
                      })
                    }
                    className="mt-3 w-full bg-pink-bold text-white py-2 rounded-full font-semibold hover:bg-pink-mid transition-colors active:scale-95"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
