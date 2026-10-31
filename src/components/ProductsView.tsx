import React, { useState } from 'react';
import { db } from '../services/db';
import { useAuth } from '../context/AuthContext';
import { Product, ProductType, ProductVariant } from '../types';
import { Plus, Edit2, Trash2, Tag, Layers, Check, X } from 'lucide-react';

export function ProductsView() {
  const { currentUser } = useAuth();
  const isAdmin = currentUser.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>(() => db.getProducts());
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<ProductType>('SOFTWARE_LICENSE');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [variants, setVariants] = useState<ProductVariant[]>([]);

  // Variant Form Input
  const [newVarName, setNewVarName] = useState('');
  const [newVarPrice, setNewVarPrice] = useState('0.00');

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setType('SOFTWARE_LICENSE');
    setSalesPrice('1200.00');
    setCostPrice('400.00');
    setNotes('');
    setVariants([
      { id: `var-std-${Date.now()}`, name: 'Standard Edition', extra_price: '0.00' },
    ]);
    setModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setType(product.type);
    setSalesPrice(product.sales_price);
    setCostPrice(product.cost_price);
    setNotes(product.notes);
    setVariants([...product.variants]);
    setModalOpen(true);
  };

  const handleAddVariant = () => {
    if (!newVarName.trim()) return;
    setVariants([
      ...variants,
      {
        id: `var-${Date.now()}`,
        name: newVarName.trim(),
        extra_price: parseFloat(newVarPrice || '0').toFixed(2),
      },
    ]);
    setNewVarName('');
    setNewVarPrice('0.00');
  };

  const handleRemoveVariant = (id: string) => {
    setVariants(variants.filter((v) => v.id !== id));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    db.saveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      name: name.trim(),
      type,
      sales_price: parseFloat(salesPrice || '0').toFixed(2),
      cost_price: parseFloat(costPrice || '0').toFixed(2),
      notes: notes.trim(),
      variants,
    });

    setProducts(db.getProducts());
    setModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      db.deleteProduct(id);
      setProducts(db.getProducts());
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products & Pricing Variants
          </h1>
          <p className="text-sm text-slate-500">
            Define software licenses, add-ons, and edition variants with pricing surcharges.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
              <th className="py-3 px-4 font-semibold">Product Name</th>
              <th className="py-3 px-4 font-semibold">Type</th>
              <th className="py-3 px-4 font-semibold text-right">Base Sales Price</th>
              <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
              <th className="py-3 px-4 font-semibold">Configured Variants (Extra Price)</th>
              {isAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((prod) => (
              <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-3.5 px-4 font-medium text-slate-900">
                  <div className="font-semibold text-sm">{prod.name}</div>
                  {prod.notes && (
                    <div className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{prod.notes}</div>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[11px] font-mono text-slate-600">
                    {prod.type.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-right font-semibold text-slate-900">
                  ${prod.sales_price}
                </td>
                <td className="py-3.5 px-4 font-mono tabular-nums text-right text-slate-500">
                  ${prod.cost_price}
                </td>
                <td className="py-3.5 px-4">
                  {prod.variants.length === 0 ? (
                    <span className="text-slate-400 text-[11px]">No variants (Standard only)</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {prod.variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-700"
                        >
                          <span className="font-medium">{v.name}</span>
                          <span className="font-mono text-slate-500">
                            (+${v.extra_price})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
                {isAdmin && (
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEditModal(prod)}
                        className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingProduct ? 'Edit Product & Variants' : 'Create New Product'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Brightloop ERP Suite"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as ProductType)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                  >
                    <option value="SOFTWARE_LICENSE">Software License</option>
                    <option value="ADDON">Add-on</option>
                    <option value="SERVICE">Service</option>
                    <option value="HARDWARE">Hardware</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Base Sales Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={salesPrice}
                    onChange={(e) => setSalesPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:border-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Cost Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono focus:border-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Internal Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Operational details or support level info"
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:border-slate-900 focus:outline-none"
                />
              </div>

              {/* Variants Section */}
              <div className="pt-2 border-t border-slate-200">
                <label className="block font-semibold text-slate-900 mb-1">
                  Product Variants & Surcharges
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Variants add an extra amount to the unit price (e.g., Odoo Brand = +$560.00).
                </p>

                <div className="space-y-2 mb-3">
                  {variants.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-200"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{v.name}</span>
                        <span className="text-slate-500 font-mono ml-2">(+${v.extra_price})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(v.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newVarName}
                    onChange={(e) => setNewVarName(e.target.value)}
                    placeholder="Variant name (e.g. Odoo Brand Edition)"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={newVarPrice}
                    onChange={(e) => setNewVarPrice(e.target.value)}
                    placeholder="Extra price"
                    className="w-24 px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddVariant}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
