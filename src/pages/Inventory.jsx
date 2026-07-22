import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import { Package, Plus, Search, AlertTriangle, CheckCircle2, Clock, Factory, Loader2, ArrowRight, DollarSign, Filter, ChevronRight, LayoutGrid, List } from 'lucide-react';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('parts');
  const [parts, setParts] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list' for POs

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [partsRes, consumablesRes, poRes] = await Promise.all([
        supabase.from('parts').select('*').order('name'),
        supabase.from('consumables').select('*').order('name'),
        supabase.from('purchase_orders').select('*, factories(name)').order('created_at', { ascending: false })
      ]);

      if (partsRes.error) throw partsRes.error;
      if (consumablesRes.error) throw consumablesRes.error;
      if (poRes.error) throw poRes.error;

      setParts(partsRes.data || []);
      setConsumables(consumablesRes.data || []);
      setPurchaseOrders(poRes.data || []);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updatePOStatus = async (poId, newStatus) => {
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: newStatus, ...(newStatus === 'approved' ? { approved_at: new Date().toISOString() } : {}) })
        .eq('id', poId);
      if (error) throw error;
      fetchInventory();
    } catch (err) {
      alert('Failed to update PO: ' + err.message);
    }
  };

  const filteredParts = parts.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.part_number?.toLowerCase().includes(search.toLowerCase()));
  const filteredConsumables = consumables.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()));
  const filteredPOs = purchaseOrders.filter(po => po.po_code?.toLowerCase().includes(search.toLowerCase()) || po.item_name?.toLowerCase().includes(search.toLowerCase()));

  const renderStockStatus = (stock, minLevel) => {
    if (stock === 0) return <span className="inline-flex items-center gap-1 text-red-600 bg-red-50/80 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-red-100"><AlertTriangle size={12} /> Out of Stock</span>;
    if (stock <= minLevel) return <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50/80 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-amber-100"><AlertTriangle size={12} /> Low Stock</span>;
    return <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50/80 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border border-emerald-100"><CheckCircle2 size={12} /> Healthy</span>;
  };

  const poStatuses = ['pending', 'approved', 'ordered', 'received'];
  
  const getStatusColor = (status) => {
    const colors = {
      pending: 'border-amber-200 bg-amber-50/50 text-amber-800',
      approved: 'border-blue-200 bg-blue-50/50 text-blue-800',
      ordered: 'border-indigo-200 bg-indigo-50/50 text-indigo-800',
      received: 'border-emerald-200 bg-emerald-50/50 text-emerald-800',
      rejected: 'border-red-200 bg-red-50/50 text-red-800',
      cancelled: 'border-gray-200 bg-gray-50/50 text-gray-800'
    };
    return colors[status] || colors.pending;
  };

  return (
    <AppShell active="inventory">
      <div className="inventory-page max-w-7xl mx-auto space-y-6">
        <header className="inventory-page-heading">
          <div><span>Supply readiness</span><h1>Inventory &amp; Supply Chain</h1><p>TurboFix manages the supply workflow here; analytics keeps the stock and reorder signals current underneath so work can continue without clutter.</p></div>
          <div className="inventory-live-chip"><i />Live stock view</div>
        </header>
        
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-gray-200/50 shadow-sm">
          <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50">
            {['parts', 'consumables', 'pos'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm scale-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50 scale-95 hover:scale-100'}`}
              >
                {tab === 'pos' ? 'Purchase Orders' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search items, POs..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm"
              />
            </div>
            {activeTab === 'pos' && (
              <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200/50 mr-2">
                <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-400'}`}><List size={18} /></button>
              </div>
            )}
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-semibold shadow-md shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 shrink-0">
              <Plus size={18} />
              <span>Add New</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className={`min-h-[500px] ${activeTab === 'pos' && viewMode === 'kanban' ? '' : 'bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden'}`}>
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="font-medium animate-pulse">Syncing Inventory...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-96 text-red-500 gap-3 p-8 text-center">
              <AlertTriangle size={48} className="opacity-50" />
              <p className="font-semibold text-lg">Failed to load data</p>
              <p className="text-sm text-red-400">{error}</p>
              <button onClick={fetchInventory} className="mt-4 px-6 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-sm font-semibold transition-colors">Retry Sync</button>
            </div>
          ) : activeTab === 'parts' || activeTab === 'consumables' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Availability</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Reserved</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Reorder At</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {(activeTab === 'parts' ? filteredParts : filteredConsumables).length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400">
                      <Package size={48} className="mx-auto mb-4 opacity-20" />
                      <p>No items found matching your criteria.</p>
                    </td></tr>
                  ) : (activeTab === 'parts' ? filteredParts : filteredConsumables).map(item => (
                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-200/50 flex items-center justify-center text-gray-500 shadow-inner">
                            <Package size={20} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{item.name}</div>
                            {item.part_number && <div className="text-xs text-gray-500 font-mono mt-0.5">{item.part_number}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-bold text-gray-900">{item.stock_qty}</span>
                          <span className="text-xs text-gray-500 font-medium">in stock</span>
                        </div>
                        <div className="text-xs text-blue-600/80 font-medium mt-0.5">
                          {item.stock_qty - (item.reserved_qty || 0)} available
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 text-sm font-semibold">
                          {item.reserved_qty || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden sm:table-cell text-gray-600 font-medium">
                        {item.reorder_level || 0}
                      </td>
                      <td className="px-6 py-4">
                        {renderStockStatus(item.stock_qty - (item.reserved_qty || 0), item.reorder_level || 0)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <ChevronRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">PO Code</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Est. Cost</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50">
                  {filteredPOs.length === 0 ? (
                    <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-400">No purchase orders found.</td></tr>
                  ) : filteredPOs.map(po => (
                    <tr key={po.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-gray-900">{po.po_code}</div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(po.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{po.item_name}</div>
                        {po.item_number && <div className="text-xs text-gray-500 font-mono mt-0.5">{po.item_number}</div>}
                        {po.auto_generated && (
                          <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] uppercase font-bold tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            Auto-Generated
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-lg font-bold text-gray-900">{po.qty}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {po.estimated_cost ? <span className="flex items-center"><DollarSign size={14} className="text-gray-400"/>{po.estimated_cost}</span> : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {po.status === 'pending' && (
                          <button onClick={() => updatePOStatus(po.id, 'approved')} className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg transition-colors">Approve</button>
                        )}
                        {po.status === 'approved' && (
                          <button onClick={() => updatePOStatus(po.id, 'ordered')} className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors">Mark Ordered</button>
                        )}
                         {po.status === 'ordered' && (
                          <button onClick={() => updatePOStatus(po.id, 'received')} className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg transition-colors">Receive</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Kanban View for POs */
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x">
              {poStatuses.map(status => {
                const columnPOs = filteredPOs.filter(po => po.status === status);
                return (
                  <div key={status} className="flex-shrink-0 w-80 bg-gray-50/80 backdrop-blur rounded-2xl border border-gray-200/60 flex flex-col snap-start">
                    <div className="p-4 border-b border-gray-200/60 flex justify-between items-center bg-white/50 rounded-t-2xl">
                      <h3 className="font-bold text-gray-700 uppercase tracking-wider text-xs">{status}</h3>
                      <span className="bg-white text-gray-500 text-xs font-bold px-2 py-1 rounded-full shadow-sm border border-gray-100">{columnPOs.length}</span>
                    </div>
                    <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[300px]">
                      {columnPOs.map(po => (
                        <div key={po.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative overflow-hidden">
                          {po.auto_generated && <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-indigo-400 to-indigo-500"></div>}
                          
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded">{po.po_code}</span>
                            <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Clock size={12}/>{new Date(po.created_at).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                          </div>
                          
                          <h4 className="font-bold text-gray-900 text-sm mb-1">{po.item_name}</h4>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 font-medium">Qty:</span>
                              <span className="text-sm font-bold text-gray-900">{po.qty}</span>
                            </div>
                            <div className="font-semibold text-gray-700 text-sm flex items-center">
                              {po.estimated_cost ? <><DollarSign size={14} className="text-green-600 mr-0.5"/>{po.estimated_cost}</> : '-'}
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {status === 'pending' && <button onClick={() => updatePOStatus(po.id, 'approved')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors w-full">Approve PO</button>}
                            {status === 'approved' && <button onClick={() => updatePOStatus(po.id, 'ordered')} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors w-full">Mark Ordered</button>}
                            {status === 'ordered' && <button onClick={() => updatePOStatus(po.id, 'received')} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors w-full">Receive Stock</button>}
                          </div>
                        </div>
                      ))}
                      {columnPOs.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                          <p className="text-xs font-medium">No {status} POs</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default Inventory;
