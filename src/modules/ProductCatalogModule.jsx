import React, { useState, useRef, useCallback } from 'react';
import { C, generateId, formatCurrency, fmt } from '../utils/constants';
import { useFirestoreCollection } from '../hooks/useFirestoreCollection';
import TasksPanel from '../components/TasksPanel';

    function ProductCatalogModule({ user, role, crmUsers }) {
      const CATS = ["Shingles", "TPO/Membrane", "Underlayment", "Ice & Water", "Flashing", "Fasteners", "Sealants", "Accessories", "Equipment"];
      const VENDOR_TYPES = ["Distributor", "Manufacturer", "Subcontractor", "Equipment Rental", "Other"];
      const [products, saveProducts, catalogLoaded] = useFirestoreCollection("cr_product_catalog", [], null);
      const productsRef = useRef(products); productsRef.current = products;
      const setProducts = useCallback((updater) => { const next = typeof updater === "function" ? updater(productsRef.current) : updater; saveProducts(next); }, [saveProducts]);

      const [vendors, saveVendors] = useFirestoreCollection("cr_vendors", []);
      const vendorsRef = useRef(vendors); vendorsRef.current = vendors;
      const setVendors = useCallback((updater) => { const next = typeof updater === "function" ? updater(vendorsRef.current) : updater; saveVendors(next); }, [saveVendors]);

      const [assemblies, saveAssemblies] = useFirestoreCollection("cr_assemblies", []);
      const assembliesRef = useRef(assemblies); assembliesRef.current = assemblies;
      const setAssemblies = useCallback((updater) => { const next = typeof updater === "function" ? updater(assembliesRef.current) : updater; saveAssemblies(next); }, [saveAssemblies]);

      const [systems, saveSystems] = useFirestoreCollection("cr_systems", []);
      const systemsRef = useRef(systems); systemsRef.current = systems;
      const setSystems = useCallback((updater) => { const next = typeof updater === "function" ? updater(systemsRef.current) : updater; saveSystems(next); }, [saveSystems]);

      const [activeTab, setActiveTab] = useState("products");
      const [activeCat, setActiveCat] = useState("All");
      const [showAdd, setShowAdd] = useState(false);
      const [form, setForm] = useState({ name: "", manufacturer: "", sku: "", category: "Shingles", unit: "EACH", price: "", notes: "" });
      const [vendorForm, setVendorForm] = useState({ name: "", type: "Distributor", contact: "", phone: "", email: "", address: "", notes: "" });
      const [assemblyForm, setAssemblyForm] = useState({ name: "", description: "", productIds: [] });
      const [systemForm, setSystemForm] = useState({ name: "", description: "", assemblyIds: [], productIds: [], standardSOW: "" });
      const [expandedCatalogItem, setExpandedCatalogItem] = useState(null);

      const fs = { width: "100%", padding: "8px 12px", border: `1px solid ${C.gray300}`, borderRadius: 6, fontSize: 13, color: C.navy, outline: "none" };
      const ls = { fontSize: 11, fontWeight: 600, color: C.gray500, marginBottom: 3, display: "block", textTransform: "uppercase" };

      // — Products —
      const filtered = activeCat === "All" ? products : products.filter(p => p.category === activeCat);
      const handleAddProduct = () => {
        if (!form.name) return;
        setProducts(prev => [...prev, { ...form, id: generateId(), price: Number(form.price) || 0, dataSheets: [], createdAt: new Date().toISOString() }]);
        setForm({ name: "", manufacturer: "", sku: "", category: "Shingles", unit: "EACH", price: "", notes: "" });
        setShowAdd(false);
      };
      const handleDeleteProduct = (id) => { setProducts(prev => prev.filter(p => p.id !== id)); };
      const handleDataSheetUpload = (productId, file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setProducts(prev => prev.map(p => p.id === productId ? { ...p, dataSheets: [...(p.dataSheets || (p.dataSheet ? [p.dataSheet] : [])), { id: generateId(), name: file.name, size: file.size, data: e.target.result, uploadedAt: new Date().toISOString() }] } : p));
        };
        reader.readAsDataURL(file);
      };
      const handleRemoveDataSheet = (productId, sheetId) => {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, dataSheets: (p.dataSheets || []).filter(s => s.id !== sheetId) } : p));
      };
      const getProductSheets = (p) => p.dataSheets || (p.dataSheet ? [{ ...p.dataSheet, id: "legacy" }] : []);

      // — Vendors —
      const handleAddVendor = () => {
        if (!vendorForm.name) return;
        setVendors(prev => [...prev, { ...vendorForm, id: generateId(), createdAt: new Date().toISOString() }]);
        setVendorForm({ name: "", type: "Distributor", contact: "", phone: "", email: "", address: "", notes: "" });
        setShowAdd(false);
      };
      const handleDeleteVendor = (id) => { setVendors(prev => prev.filter(v => v.id !== id)); };

      // — Assemblies —
      const handleAddAssembly = () => {
        if (!assemblyForm.name) return;
        setAssemblies(prev => [...prev, { ...assemblyForm, id: generateId(), createdAt: new Date().toISOString() }]);
        setAssemblyForm({ name: "", description: "", productIds: [] });
        setShowAdd(false);
      };
      const handleDeleteAssembly = (id) => { setAssemblies(prev => prev.filter(a => a.id !== id)); };
      const toggleAssemblyProduct = (pid) => {
        setAssemblyForm(f => ({ ...f, productIds: f.productIds.includes(pid) ? f.productIds.filter(x => x !== pid) : [...f.productIds, pid] }));
      };

      // — Systems —
      const handleAddSystem = () => {
        if (!systemForm.name) return;
        setSystems(prev => [...prev, { ...systemForm, id: generateId(), createdAt: new Date().toISOString() }]);
        setSystemForm({ name: "", description: "", assemblyIds: [], productIds: [], standardSOW: "" });
        setShowAdd(false);
      };
      const handleDeleteSystem = (id) => { setSystems(prev => prev.filter(s => s.id !== id)); };
      const toggleSystemAssembly = (aid) => {
        setSystemForm(f => ({ ...f, assemblyIds: f.assemblyIds.includes(aid) ? f.assemblyIds.filter(x => x !== aid) : [...f.assemblyIds, aid] }));
      };
      const toggleSystemProduct = (pid) => {
        setSystemForm(f => ({ ...f, productIds: f.productIds.includes(pid) ? f.productIds.filter(x => x !== pid) : [...f.productIds, pid] }));
      };

      const TABS = [
        { id: "products", label: "Products", icon: "📦", count: products.length },
        { id: "vendors", label: "Vendors", icon: "🏢", count: vendors.length },
        { id: "assemblies", label: "Assemblies", icon: "🔧", count: assemblies.length },
        { id: "systems", label: "Systems", icon: "🏗️", count: systems.length },
      ];

      const addLabels = { products: "+ Add Product", vendors: "+ Add Vendor", assemblies: "+ Add Assembly", systems: "+ Add System" };

      return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navy }}>Product Catalog</h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: C.gray500 }}>Products, vendors, assemblies & systems — used for estimates and submittal packages</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {(activeTab === "products" || activeTab === "vendors") && <>
                <button onClick={() => {
                  const isVendor = activeTab === "vendors";
                  const headers = isVendor ? "name,type,contact,phone,email,address,notes" : "name,manufacturer,sku,category,unit,price,notes";
                  const example = isVendor ? "ABC Supply,Distributor,John Smith,555-0100,john@abc.com,123 Main St,Primary distributor" : "GAF Timberline HDZ,GAF,0601400,Shingles,BUNDLE,115.00,Lifetime warranty architectural shingle";
                  const csv = headers + "\n" + example;
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `${activeTab}_import_template.csv`; a.click(); URL.revokeObjectURL(url);
                }} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>📥 Template</button>
                <label style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.navy, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center" }}>
                  📤 Import CSV/Excel
                  <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => {
                    const file = e.target.files[0]; if (!file) return;
                    const isExcel = file.name.match(/\.(xlsx|xls)$/i);
                    const processRows = (rows) => {
                      if (activeTab === "vendors") {
                        const newVendors = rows.filter(r => r.name).map(r => ({ id: generateId(), name: r.name, type: r.type || "Distributor", contact: r.contact || "", phone: r.phone || "", email: r.email || "", address: r.address || "", notes: r.notes || "", createdAt: new Date().toISOString() }));
                        setVendors(prev => [...newVendors, ...prev]);
                        alert(`Imported ${newVendors.length} vendors!`);
                      } else {
                        const newProducts = rows.filter(r => r.name).map(r => ({ id: generateId(), name: r.name, manufacturer: r.manufacturer || "", sku: r.sku || "", category: r.category || "Shingles", unit: r.unit || "EACH", price: Number(r.price) || 0, notes: r.notes || "", dataSheets: [], createdAt: new Date().toISOString() }));
                        setProducts(prev => [...newProducts, ...prev]);
                        alert(`Imported ${newProducts.length} products!`);
                      }
                    };
                    if (isExcel && window.XLSX) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
                          const ws = wb.Sheets[wb.SheetNames[0]];
                          const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
                          const rows = json.map(r => { const obj = {}; Object.keys(r).forEach(k => { obj[k.toLowerCase().trim()] = String(r[k]).trim(); }); return obj; });
                          processRows(rows);
                        } catch (err) { alert("Error reading Excel file: " + err.message); }
                      };
                      reader.readAsArrayBuffer(file);
                    } else {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const lines = ev.target.result.split("\n").filter(l => l.trim());
                        if (lines.length < 2) { alert("File must have a header row and at least one data row."); return; }
                        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
                        const rows = lines.slice(1).map(line => {
                          const vals = line.split(",").map(v => v.trim());
                          const obj = {}; headers.forEach((h, i) => { obj[h] = vals[i] || ""; }); return obj;
                        });
                        processRows(rows);
                      };
                      reader.readAsText(file);
                    }
                    e.target.value = "";
                  }} />
                </label>
              </>}
              <button onClick={() => setShowAdd(!showAdd)} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: C.red, color: C.white, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{addLabels[activeTab]}</button>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: "flex", gap: 2, marginBottom: 16, background: C.gray100, borderRadius: 8, padding: 3 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => { setActiveTab(t.id); setShowAdd(false); setActiveCat("All"); }}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "none", background: activeTab === t.id ? C.white : "transparent", color: activeTab === t.id ? C.navy : C.gray500, fontSize: 12, fontWeight: 600, cursor: "pointer", boxShadow: activeTab === t.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <span>{t.icon}</span> {t.label} <span style={{ fontSize: 10, fontWeight: 700, color: activeTab === t.id ? C.red : C.gray400, background: activeTab === t.id ? C.redBg : C.gray200, padding: "1px 6px", borderRadius: 8 }}>{t.count}</span>
              </button>
            ))}
          </div>

          {/* ─── PRODUCTS TAB ─── */}
          {activeTab === "products" && <>
            <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
              <button onClick={() => setActiveCat("All")} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: activeCat === "All" ? C.navy : C.gray100, color: activeCat === "All" ? C.white : C.gray700, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>All ({products.length})</button>
              {CATS.map(cat => {
                const count = products.filter(p => p.category === cat).length;
                return <button key={cat} onClick={() => setActiveCat(cat)} style={{ padding: "6px 12px", borderRadius: 20, border: "none", background: activeCat === cat ? C.navy : C.gray100, color: activeCat === cat ? C.white : C.gray700, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{cat} ({count})</button>;
              })}
            </div>
            {showAdd && (
              <div style={{ padding: 20, borderRadius: 10, border: `1px solid ${C.red}40`, background: C.white, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Add Product</h4>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={ls}>Product Name</label><input style={fs} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="GAF Timberline HDZ" /></div>
                  <div><label style={ls}>Manufacturer</label><input style={fs} value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} placeholder="GAF" /></div>
                  <div><label style={ls}>Category</label><select style={fs} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label style={ls}>Unit Price</label><input style={fs} type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={ls}>SKU</label><input style={fs} value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
                  <div><label style={ls}>Unit</label><input style={fs} value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="BNDL, ROLL, EACH" /></div>
                  <div><label style={ls}>Notes</label><input style={fs} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAddProduct} disabled={!form.name} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: form.name ? C.green : C.gray300, color: form.name ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: form.name ? "pointer" : "default" }}>Add Product</button>
                </div>
              </div>
            )}
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
                <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>📦</div>
                <p style={{ fontSize: 13, color: C.gray400 }}>No products yet. Add products to build your catalog for estimates and submittal packages.</p>
              </div>
            ) : (
              <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.gray50 }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Product</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Manufacturer</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Category</th>
                    <th style={{ padding: "10px 8px", textAlign: "right", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Price</th>
                    <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Data Sheets</th>
                    <th style={{ width: 32 }}></th>
                  </tr></thead>
                  <tbody>
                    {filtered.map(p => {
                      const sheets = getProductSheets(p);
                      const isExp = expandedCatalogItem === "product_" + p.id;
                      return (
                      <React.Fragment key={p.id}>
                      <tr style={{ borderTop: `1px solid ${C.gray100}`, cursor: "pointer", background: isExp ? C.gray50 : "transparent" }} onClick={() => setExpandedCatalogItem(isExp ? null : "product_" + p.id)}>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontWeight: 600, color: C.navy }}>{p.name}</div>
                          {p.sku && <div style={{ fontSize: 10, color: C.gray400 }}>SKU: {p.sku}</div>}
                        </td>
                        <td style={{ padding: "10px 8px", color: C.gray600 }}>{p.manufacturer}</td>
                        <td style={{ padding: "10px 8px" }}><span style={{ padding: "2px 8px", borderRadius: 4, background: C.gray100, color: C.gray600, fontSize: 11, fontWeight: 600 }}>{p.category}</span></td>
                        <td style={{ padding: "10px 8px", textAlign: "right", fontWeight: 700, color: C.navy }}>{fmt(p.price || 0)}/{p.unit}</td>
                        <td style={{ padding: "10px 8px", textAlign: "center" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            {sheets.map(s => (
                              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <span style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>📄 {s.name}</span>
                                <button onClick={() => handleRemoveDataSheet(p.id, s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 10 }}>×</button>
                              </div>
                            ))}
                            <label style={{ fontSize: 10, color: C.blue, fontWeight: 600, cursor: "pointer" }}>
                              + Add PDF
                              <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => e.target.files?.[0] && handleDataSheetUpload(p.id, e.target.files[0])} />
                            </label>
                          </div>
                        </td>
                        <td style={{ padding: "10px 4px" }} onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleDeleteProduct(p.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 14 }}>×</button>
                        </td>
                      </tr>
                      {isExp && <tr><td colSpan={6} style={{ padding: "8px 12px 16px", background: C.gray50 }}><TasksPanel objectType="catalog_product" objectId={p.id} user={user} crmUsers={crmUsers} /></td></tr>}
                      </React.Fragment>);
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>}

          {/* ─── VENDORS TAB ─── */}
          {activeTab === "vendors" && <>
            {showAdd && (
              <div style={{ padding: 20, borderRadius: 10, border: `1px solid ${C.red}40`, background: C.white, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Add Vendor</h4>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={ls}>Vendor Name</label><input style={fs} value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} placeholder="ABC Supply" /></div>
                  <div><label style={ls}>Type</label><select style={fs} value={vendorForm.type} onChange={e => setVendorForm(f => ({ ...f, type: e.target.value }))}>{VENDOR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div><label style={ls}>Contact Name</label><input style={fs} value={vendorForm.contact} onChange={e => setVendorForm(f => ({ ...f, contact: e.target.value }))} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={ls}>Phone</label><input style={fs} value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><label style={ls}>Email</label><input style={fs} value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} /></div>
                  <div><label style={ls}>Address</label><input style={fs} value={vendorForm.address} onChange={e => setVendorForm(f => ({ ...f, address: e.target.value }))} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={ls}>Notes</label><input style={fs} value={vendorForm.notes} onChange={e => setVendorForm(f => ({ ...f, notes: e.target.value }))} /></div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAddVendor} disabled={!vendorForm.name} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: vendorForm.name ? C.green : C.gray300, color: vendorForm.name ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: vendorForm.name ? "pointer" : "default" }}>Add Vendor</button>
                </div>
              </div>
            )}
            {vendors.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
                <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>🏢</div>
                <p style={{ fontSize: 13, color: C.gray400 }}>No vendors yet. Add your suppliers, distributors, and subcontractors.</p>
              </div>
            ) : (
              <div style={{ borderRadius: 10, border: `1px solid ${C.gray200}`, overflow: "hidden", background: C.white }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: C.gray50 }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Vendor</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Type</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Contact</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Phone</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Email</th>
                    <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase" }}>Notes</th>
                    <th style={{ width: 32 }}></th>
                  </tr></thead>
                  <tbody>
                    {vendors.map(v => {
                      const isExp = expandedCatalogItem === "vendor_" + v.id;
                      return (
                      <React.Fragment key={v.id}>
                      <tr style={{ borderTop: `1px solid ${C.gray100}`, cursor: "pointer", background: isExp ? C.gray50 : "transparent" }} onClick={() => setExpandedCatalogItem(isExp ? null : "vendor_" + v.id)}>
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: C.navy }}>{v.name}</td>
                        <td style={{ padding: "10px 8px" }}><span style={{ padding: "2px 8px", borderRadius: 4, background: v.type === "Manufacturer" ? "#DBEAFE" : v.type === "Distributor" ? "#D1FAE5" : C.gray100, color: v.type === "Manufacturer" ? "#2563EB" : v.type === "Distributor" ? "#059669" : C.gray600, fontSize: 11, fontWeight: 600 }}>{v.type}</span></td>
                        <td style={{ padding: "10px 8px", color: C.gray600 }}>{v.contact}</td>
                        <td style={{ padding: "10px 8px", color: C.gray600 }}>{v.phone}</td>
                        <td style={{ padding: "10px 8px", color: C.blue, fontSize: 11 }}>{v.email}</td>
                        <td style={{ padding: "10px 8px", color: C.gray500, fontSize: 11 }}>{v.notes}</td>
                        <td style={{ padding: "10px 4px" }} onClick={e => e.stopPropagation()}><button onClick={() => handleDeleteVendor(v.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 14 }}>×</button></td>
                      </tr>
                      {isExp && <tr><td colSpan={7} style={{ padding: "8px 12px 16px", background: C.gray50 }}><TasksPanel objectType="catalog_vendor" objectId={v.id} user={user} crmUsers={crmUsers} /></td></tr>}
                      </React.Fragment>);
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>}

          {/* ─── ASSEMBLIES TAB ─── */}
          {activeTab === "assemblies" && <>
            {showAdd && (
              <div style={{ padding: 20, borderRadius: 10, border: `1px solid ${C.red}40`, background: C.white, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Create Assembly</h4>
                <p style={{ fontSize: 12, color: C.gray500, margin: "0 0 12px" }}>An assembly is a group of products that go together (e.g., "TPO Roofing System Base Layer").</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={ls}>Assembly Name</label><input style={fs} value={assemblyForm.name} onChange={e => setAssemblyForm(f => ({ ...f, name: e.target.value }))} placeholder="TPO Base Layer Assembly" /></div>
                  <div><label style={ls}>Description</label><input style={fs} value={assemblyForm.description} onChange={e => setAssemblyForm(f => ({ ...f, description: e.target.value }))} placeholder="All components for..." /></div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={ls}>Select Products</label>
                  <div style={{ maxHeight: 200, overflow: "auto", border: `1px solid ${C.gray200}`, borderRadius: 6, padding: 8 }}>
                    {products.length === 0 ? <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>Add products first to create assemblies.</p> :
                      products.map(p => (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: C.navy, cursor: "pointer" }}>
                          <input type="checkbox" checked={assemblyForm.productIds.includes(p.id)} onChange={() => toggleAssemblyProduct(p.id)} />
                          <span style={{ fontWeight: 600 }}>{p.name}</span> <span style={{ color: C.gray400 }}>— {p.category} — {fmt(p.price || 0)}/{p.unit}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAddAssembly} disabled={!assemblyForm.name || assemblyForm.productIds.length === 0} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: assemblyForm.name && assemblyForm.productIds.length > 0 ? C.green : C.gray300, color: assemblyForm.name && assemblyForm.productIds.length > 0 ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: assemblyForm.name && assemblyForm.productIds.length > 0 ? "pointer" : "default" }}>Create Assembly</button>
                </div>
              </div>
            )}
            {assemblies.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
                <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>🔧</div>
                <p style={{ fontSize: 13, color: C.gray400 }}>No assemblies yet. Combine products into assemblies for grouped estimation.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {assemblies.map(a => {
                  const aProducts = (a.productIds || []).map(id => products.find(p => p.id === id)).filter(Boolean);
                  const totalCost = aProducts.reduce((s, p) => s + (p.price || 0), 0);
                  const isExp = expandedCatalogItem === "assembly_" + a.id;
                  return (
                    <div key={a.id} style={{ borderRadius: 10, border: `1px solid ${isExp ? C.navy + "40" : C.gray200}`, background: C.white, overflow: "hidden" }}>
                      <div style={{ padding: 16, cursor: "pointer" }} onClick={() => setExpandedCatalogItem(isExp ? null : "assembly_" + a.id)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{a.name}</div>
                            {a.description && <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>{a.description}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{fmt(totalCost)}</span>
                            <button onClick={() => handleDeleteAssembly(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 14 }}>×</button>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {aProducts.map(p => (
                            <span key={p.id} style={{ padding: "3px 10px", borderRadius: 4, background: C.gray100, fontSize: 11, fontWeight: 600, color: C.gray600 }}>{p.name} ({fmt(p.price || 0)})</span>
                          ))}
                          {aProducts.length === 0 && <span style={{ fontSize: 11, color: C.gray400 }}>No products linked</span>}
                        </div>
                      </div>
                      {isExp && <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.gray100}` }}><TasksPanel objectType="catalog_assembly" objectId={a.id} user={user} crmUsers={crmUsers} /></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>}

          {/* ─── SYSTEMS TAB ─── */}
          {activeTab === "systems" && <>
            {showAdd && (
              <div style={{ padding: 20, borderRadius: 10, border: `1px solid ${C.red}40`, background: C.white, marginBottom: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: C.navy, margin: "0 0 12px" }}>Create System</h4>
                <p style={{ fontSize: 12, color: C.gray500, margin: "0 0 12px" }}>A system is a combination of assemblies and individual products (e.g., "Complete TPO Roofing System").</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
                  <div><label style={ls}>System Name</label><input style={fs} value={systemForm.name} onChange={e => setSystemForm(f => ({ ...f, name: e.target.value }))} placeholder="Complete TPO System" /></div>
                  <div><label style={ls}>Description</label><input style={fs} value={systemForm.description} onChange={e => setSystemForm(f => ({ ...f, description: e.target.value }))} /></div>
                  <div><label style={ls}>Standard Scope of Work (used in proposals)</label><textarea style={{ ...fs, minHeight: 80, resize: "vertical" }} value={systemForm.standardSOW} onChange={e => setSystemForm(f => ({ ...f, standardSOW: e.target.value }))} placeholder="Enter the standard scope of work for this roofing system..." /></div>
                </div>
                {assemblies.length > 0 && <div style={{ marginBottom: 12 }}>
                  <label style={ls}>Include Assemblies</label>
                  <div style={{ maxHeight: 150, overflow: "auto", border: `1px solid ${C.gray200}`, borderRadius: 6, padding: 8 }}>
                    {assemblies.map(a => (
                      <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: C.navy, cursor: "pointer" }}>
                        <input type="checkbox" checked={systemForm.assemblyIds.includes(a.id)} onChange={() => toggleSystemAssembly(a.id)} />
                        <span style={{ fontWeight: 600 }}>🔧 {a.name}</span> <span style={{ color: C.gray400 }}>({(a.productIds || []).length} products)</span>
                      </label>
                    ))}
                  </div>
                </div>}
                <div style={{ marginBottom: 12 }}>
                  <label style={ls}>Include Individual Products</label>
                  <div style={{ maxHeight: 150, overflow: "auto", border: `1px solid ${C.gray200}`, borderRadius: 6, padding: 8 }}>
                    {products.length === 0 ? <p style={{ fontSize: 12, color: C.gray400, margin: 0 }}>Add products first.</p> :
                      products.map(p => (
                        <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12, color: C.navy, cursor: "pointer" }}>
                          <input type="checkbox" checked={systemForm.productIds.includes(p.id)} onChange={() => toggleSystemProduct(p.id)} />
                          <span style={{ fontWeight: 600 }}>{p.name}</span> <span style={{ color: C.gray400 }}>— {p.category}</span>
                        </label>
                      ))
                    }
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", borderRadius: 6, border: `1px solid ${C.gray300}`, background: C.white, color: C.gray600, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAddSystem} disabled={!systemForm.name || (systemForm.assemblyIds.length === 0 && systemForm.productIds.length === 0)} style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: systemForm.name && (systemForm.assemblyIds.length > 0 || systemForm.productIds.length > 0) ? C.green : C.gray300, color: systemForm.name && (systemForm.assemblyIds.length > 0 || systemForm.productIds.length > 0) ? C.white : C.gray400, fontSize: 12, fontWeight: 600, cursor: systemForm.name && (systemForm.assemblyIds.length > 0 || systemForm.productIds.length > 0) ? "pointer" : "default" }}>Create System</button>
                </div>
              </div>
            )}
            {systems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, background: C.white, borderRadius: 10, border: `2px dashed ${C.gray300}` }}>
                <div style={{ fontSize: 36, opacity: 0.2, marginBottom: 12 }}>🏗️</div>
                <p style={{ fontSize: 13, color: C.gray400 }}>No systems yet. Combine assemblies and products into complete roofing systems.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {systems.map(sys => {
                  const sysAssemblies = (sys.assemblyIds || []).map(id => assemblies.find(a => a.id === id)).filter(Boolean);
                  const sysProducts = (sys.productIds || []).map(id => products.find(p => p.id === id)).filter(Boolean);
                  const assemblyProducts = sysAssemblies.flatMap(a => (a.productIds || []).map(id => products.find(p => p.id === id)).filter(Boolean));
                  const allProducts = [...assemblyProducts, ...sysProducts];
                  const totalCost = allProducts.reduce((s, p) => s + (p.price || 0), 0);
                  const isExp = expandedCatalogItem === "system_" + sys.id;
                  return (
                    <div key={sys.id} style={{ borderRadius: 10, border: `1px solid ${isExp ? C.navy + "40" : C.gray200}`, background: C.white, overflow: "hidden" }}>
                      <div style={{ padding: 16, cursor: "pointer" }} onClick={() => setExpandedCatalogItem(isExp ? null : "system_" + sys.id)}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: C.navy }}>{sys.name}</div>
                            {sys.description && <div style={{ fontSize: 12, color: C.gray500, marginTop: 2 }}>{sys.description}</div>}
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{fmt(totalCost)}</span>
                            <button onClick={() => handleDeleteSystem(sys.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.gray400, fontSize: 14 }}>×</button>
                          </div>
                        </div>
                        {sysAssemblies.length > 0 && <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 4 }}>Assemblies</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {sysAssemblies.map(a => <span key={a.id} style={{ padding: "3px 10px", borderRadius: 4, background: "#DBEAFE", fontSize: 11, fontWeight: 600, color: "#2563EB" }}>🔧 {a.name}</span>)}
                          </div>
                        </div>}
                        {sysProducts.length > 0 && <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: "uppercase", marginBottom: 4 }}>Additional Products</div>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {sysProducts.map(p => <span key={p.id} style={{ padding: "3px 10px", borderRadius: 4, background: C.gray100, fontSize: 11, fontWeight: 600, color: C.gray600 }}>{p.name}</span>)}
                          </div>
                        </div>}
                      </div>
                      {isExp && <div style={{ padding: "0 16px 16px", borderTop: `1px solid ${C.gray100}` }}><TasksPanel objectType="catalog_system" objectId={sys.id} user={user} crmUsers={crmUsers} /></div>}
                    </div>
                  );
                })}
              </div>
            )}
          </>}
        </div>
      );
    }


    // ============================================================
    // MODULE: SALES (Jobs linked to Companies/Properties/Contacts)
    // ============================================================
    const SALES_STAGES = [
      { id: "new_lead", label: "New Lead", color: "#94A3B8" },
      { id: "appointment_scheduled", label: "Appointment Scheduled", color: "#3B82F6" },
      { id: "inspected", label: "Inspected", color: "#8B5CF6" },
      { id: "being_estimated", label: "Being Estimated", color: "#6366F1" },
      { id: "estimate_approved", label: "Estimate Approved", color: "#06B6D4" },
      { id: "proposal_sent", label: "Proposal Sent", color: "#F59E0B" },
      { id: "negotiation", label: "Negotiation", color: "#EC4899" },
      { id: "awarded", label: "Awarded", color: "#10B981" },
      { id: "closed_lost", label: "Closed Lost", color: "#EF4444" },
    ];
    const PROPERTY_TYPES = ["Residential", "Apartment Complex", "HOA / Condo", "Office / Commercial", "Retail", "Industrial / Warehouse", "Church / Non-Profit", "Government", "Other"];
    const CONTACT_TYPES = ["B2C", "B2B"];
    const LEAD_SOURCES = ["ZoomInfo", "Referral", "Website", "Cold Outreach", "Repeat Client", "Property Manager", "Other"];

export default ProductCatalogModule;
