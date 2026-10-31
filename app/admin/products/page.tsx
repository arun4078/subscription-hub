"use client";

import React, { useState, useEffect } from "react";
import { Product, ProductVariant } from "@/lib/types";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/ui/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { Package, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<"SOFTWARE" | "SERVICE" | "HARDWARE">("SOFTWARE");
  const [salesPrice, setSalesPrice] = useState(1200);
  const [costPrice, setCostPrice] = useState(400);
  const [notes, setNotes] = useState("");
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [newVarName, setNewVarName] = useState("");
  const [newVarExtra, setNewVarExtra] = useState(560);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const res = await api.getProducts();
      setProducts(res.data);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName(""); setType("SOFTWARE"); setSalesPrice(1200); setCostPrice(400); setNotes("");
    setVariants([{ id: "v-def", name: "Standard", extraPrice: 0 }, { id: "v-odoo", name: "Odoo Brand Integration", extraPrice: 560 }]);
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name); setType(prod.type); setSalesPrice(prod.salesPrice);
    setCostPrice(prod.costPrice); setNotes(prod.notes); setVariants([...prod.variants]);
    setIsModalOpen(true);
  };

  const handleAddVariant = () => {
    if (!newVarName) return;
    setVariants([...variants, { id: `var-${Date.now()}`, name: newVarName, extraPrice: Number(newVarExtra) || 0 }]);
    setNewVarName(""); setNewVarExtra(0);
  };

  const handleRemoveVariant = (id: string) => setVariants(variants.filter((v) => v.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, { name, type, salesPrice: Number(salesPrice), costPrice: Number(costPrice), notes, variants });
        toast.success("Product Updated", { description: `${name} modified successfully.` });
      } else {
        await api.createProduct({ name, type, salesPrice: Number(salesPrice), costPrice: Number(costPrice), notes, variants });
        toast.success("Product Created", { description: `${name} added to catalog.` });
      }
      setIsModalOpen(false);
      loadProducts();
    } catch {
      toast.error("Failed to save product");
    }
  };

  const inputCls = "w-full bg-white border border-[#ced4da] rounded-xl px-3 py-2 text-xs text-[#212529] focus:outline-none focus:border-[#343a40] transition-all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Variants"
        description="Configure software licenses, hardware items, and brand add-on variants with extra prices."
        actions={
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] text-xs font-semibold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-3 text-center text-[#6c757d] py-8">Loading products...</div>
        ) : products.map((prod) => (
          <div
            key={prod.id}
            className="bg-white border border-[#dee2e6] rounded-2xl p-5 flex flex-col justify-between hover:border-[#ced4da] hover:shadow-sm transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#343a40] bg-[#e9ecef] px-2.5 py-0.5 rounded-full border border-[#ced4da]">
                  {prod.type}
                </span>
                <button
                  onClick={() => openEditModal(prod)}
                  className="text-[#6c757d] hover:text-[#212529] p-1 rounded-lg transition-colors cursor-pointer"
                  title="Edit Product"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-base font-bold text-[#212529]">{prod.name}</h3>
              <p className="text-xs text-[#6c757d] mt-1 line-clamp-2">{prod.notes}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 bg-[#f8f9fa] p-2.5 rounded-xl border border-[#dee2e6]">
                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider">Sales Price</span>
                  <div className="text-sm font-bold text-[#212529]">${prod.salesPrice.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[#6c757d] uppercase tracking-wider">Cost Price</span>
                  <div className="text-sm font-semibold text-[#495057]">${prod.costPrice.toFixed(2)}</div>
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <span className="text-[11px] font-semibold text-[#495057]">Configured Variants:</span>
                <div className="space-y-1">
                  {prod.variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between text-xs bg-[#f8f9fa] px-2.5 py-1.5 rounded-lg border border-[#dee2e6]"
                    >
                      <span className="text-[#495057]">{v.name}</span>
                      <span className="font-semibold text-[#343a40] font-mono text-[11px]">
                        {v.extraPrice > 0 ? `+$${v.extraPrice.toFixed(2)}` : "Base ($0)"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#dee2e6] flex items-center justify-between text-[11px] text-[#6c757d]">
              <span>Variants: {prod.variants.length}</span>
              <span className="text-[#137333] font-medium">Margin: +${(prod.salesPrice - prod.costPrice).toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? "Edit Product & Variants" : "Add New Product"}
        description="Specify sales prices, cost basis, and custom variant surcharges (e.g., Odoo Brand +$560)."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Product Name</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Brightloop ERP Cloud" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Product Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as "SOFTWARE" | "SERVICE" | "HARDWARE")} className={inputCls}>
                <option value="SOFTWARE">SOFTWARE</option>
                <option value="SERVICE">SERVICE</option>
                <option value="HARDWARE">HARDWARE</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Sales Price ($)</label>
              <input type="number" step="0.01" required value={salesPrice}
                onChange={(e) => setSalesPrice(Number(e.target.value))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#495057] mb-1">Cost Price ($)</label>
              <input type="number" step="0.01" required value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#495057] mb-1">Product Notes</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Enterprise software suite with modules for finance, sales, and inventory..."
              className={inputCls} />
          </div>

          {/* Variants section */}
          <div className="p-3 bg-[#f8f9fa] rounded-xl border border-[#dee2e6] space-y-3">
            <span className="text-xs font-semibold text-[#212529]">Product Variants & Extra Price</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {variants.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-[#dee2e6]">
                  <div>
                    <span className="font-medium text-[#212529]">{v.name}</span>
                    <span className="ml-2 text-[#343a40] font-mono text-[11px]">
                      {v.extraPrice > 0 ? `+ $${v.extraPrice}` : "Included ($0)"}
                    </span>
                  </div>
                  <button type="button" onClick={() => handleRemoveVariant(v.id)}
                    className="text-[#6c757d] hover:text-[#c5221f] p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[#dee2e6]">
              <input type="text" placeholder="Variant name (e.g. Odoo brand)" value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="flex-1 bg-white border border-[#ced4da] rounded-lg px-2.5 py-1.5 text-xs text-[#212529] focus:outline-none focus:border-[#343a40]" />
              <input type="number" placeholder="Extra price" value={newVarExtra}
                onChange={(e) => setNewVarExtra(Number(e.target.value))}
                className="w-24 bg-white border border-[#ced4da] rounded-lg px-2.5 py-1.5 text-xs text-[#212529] focus:outline-none focus:border-[#343a40]" />
              <button type="button" onClick={handleAddVariant}
                className="bg-[#e9ecef] hover:bg-[#dee2e6] text-[#212529] text-xs px-3 py-1.5 rounded-lg font-medium border border-[#ced4da] transition-colors">
                Add
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[#dee2e6]">
            <button type="button" onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 text-xs font-medium text-[#495057] hover:bg-[#e9ecef] rounded-xl transition-colors cursor-pointer">
              Cancel
            </button>
            <button type="submit"
              className="bg-[#343a40] hover:bg-[#212529] text-[#f8f9fa] font-semibold px-4 py-2 text-xs rounded-xl shadow-xs transition-all cursor-pointer">
              {editingProduct ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
