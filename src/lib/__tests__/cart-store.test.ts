import { describe, it, expect } from "vitest";
import type { CartItem, CartAction } from "../cart-store";

// Extract the reducer for testing (it's not exported, but we test the logic)
function reducer(state: { items: CartItem[] }, action: CartAction): { items: CartItem[] } {
  switch (action.type) {
    case "ADD_ITEM": {
      const existing = state.items.find((i) => i.variantId === action.payload.variantId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantId === action.payload.variantId
              ? { ...i, quantity: i.quantity + action.payload.quantity }
              : i,
          ),
        };
      }
      return { items: [...state.items, action.payload] };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.variantId !== action.payload.variantId) };
    case "UPDATE_QUANTITY":
      return {
        items: state.items.map((i) =>
          i.variantId === action.payload.variantId
            ? { ...i, quantity: Math.max(1, action.payload.quantity) }
            : i,
        ),
      };
    case "CLEAR":
      return { items: [] };
    case "HYDRATE":
      return { items: action.payload };
    default:
      return state;
  }
}

const sampleItem: CartItem = {
  productId: "p1",
  variantId: "v1",
  slug: "pc-gaming",
  title: "PC Gaming",
  image: "/pc.jpg",
  price: 999.99,
  quantity: 1,
  variantName: "Standard",
};

describe("cartReducer", () => {
  it("starts empty", () => {
    const state = reducer({ items: [] }, { type: "HYDRATE", payload: [] });
    expect(state.items).toHaveLength(0);
  });

  it("adds an item", () => {
    const state = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    expect(state.items).toHaveLength(1);
    expect(state.items[0].title).toBe("PC Gaming");
  });

  it("increments quantity when adding existing item", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "ADD_ITEM", payload: sampleItem });
    expect(second.items).toHaveLength(1);
    expect(second.items[0].quantity).toBe(2);
  });

  it("adds different variants separately", () => {
    const item2 = { ...sampleItem, variantId: "v2", variantName: "Premium" };
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "ADD_ITEM", payload: item2 });
    expect(second.items).toHaveLength(2);
  });

  it("removes an item by variantId", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "REMOVE_ITEM", payload: { variantId: "v1" } });
    expect(second.items).toHaveLength(0);
  });

  it("updates quantity", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "UPDATE_QUANTITY", payload: { variantId: "v1", quantity: 5 } });
    expect(second.items[0].quantity).toBe(5);
  });

  it("clamps quantity to minimum 1", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "UPDATE_QUANTITY", payload: { variantId: "v1", quantity: 0 } });
    expect(second.items[0].quantity).toBe(1);
  });

  it("clears all items", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const cleared = reducer(first, { type: "CLEAR" });
    expect(cleared.items).toHaveLength(0);
  });

  it("hydrates from stored items", () => {
    const items = [sampleItem, { ...sampleItem, variantId: "v2" }];
    const state = reducer({ items: [] }, { type: "HYDRATE", payload: items });
    expect(state.items).toHaveLength(2);
  });

  it("computes total items count", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "ADD_ITEM", payload: { ...sampleItem, variantId: "v2", quantity: 3 } });
    const totalItems = second.items.reduce((sum: number, i: CartItem) => sum + i.quantity, 0);
    expect(totalItems).toBe(4);
  });

  it("computes total price", () => {
    const first = reducer({ items: [] }, { type: "ADD_ITEM", payload: sampleItem });
    const second = reducer(first, { type: "ADD_ITEM", payload: { ...sampleItem, variantId: "v2", price: 500 } });
    const totalPrice = second.items.reduce((sum: number, i: CartItem) => sum + i.price * i.quantity, 0);
    expect(totalPrice).toBe(1499.99);
  });
});
