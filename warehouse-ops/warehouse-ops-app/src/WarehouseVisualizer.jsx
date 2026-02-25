import React, { useState, useMemo, useRef, useCallback } from 'react'
import { WAREHOUSE_STRUCTURE, WAREHOUSE_ROWS, INITIAL_INVENTORY } from './InventoryData'

// --- TOOLTIP FLOTANTE (sale del objeto) ---
function Tooltip({ tooltip }) {
    if (!tooltip.visible) return null;
    return (
        <div
            className="fixed z-[9999] pointer-events-none animate-slide-up"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -110%)' }}
        >
            <div className="bg-white rounded-xl shadow-2xl px-4 py-3 border border-gray-200 min-w-[180px] max-w-[260px]">
                <div className="text-[10px] font-black uppercase tracking-wider text-orange-600 mb-1">{tooltip.title}</div>
                <div className="text-[11px] font-semibold text-black leading-snug">{tooltip.desc}</div>
                {tooltip.extra && <div className="text-[9px] text-gray-500 mt-1 border-t border-gray-100 pt-1">{tooltip.extra}</div>}
            </div>
            <div className="w-3 h-3 bg-white border-b border-r border-gray-200 rotate-45 mx-auto -mt-1.5" />
        </div>
    );
}

export function WarehouseVisualizer() {
    const [view, setView] = useState('global')
    const [selectedBay, setSelectedBay] = useState(null)
    const [selectedRow, setSelectedRow] = useState(null)
    const [inventory, setInventory] = useState(INITIAL_INVENTORY)
    const [aisleWidth, setAisleWidth] = useState(15)
    const [scale, setScale] = useState(8)
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, title: '', desc: '', extra: '' })

    const showTooltip = useCallback((e, title, desc, extra = '') => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.top,
            title, desc, extra
        });
    }, []);

    const hideTooltip = useCallback(() => {
        setTooltip(t => ({ ...t, visible: false }));
    }, []);

    const getRowData = (id) => WAREHOUSE_ROWS.find(r => r.row === id)
    const getRowInventory = (id) => inventory[id] || []

    const goToGlobal = () => { setView('global'); setSelectedBay(null); setSelectedRow(null); hideTooltip(); }
    const goToBay = (bay) => { setView('bay'); setSelectedBay(bay); setSelectedRow(null); hideTooltip(); }
    const goToRow = (row) => { setView('row'); setSelectedRow(row); hideTooltip(); }

    // --- LOGIC: ROW STACKING PLAN ---
    const generateStackingPlan = (rowId, totalCapacity) => {
        const inv = [...getRowInventory(rowId)].sort((a, b) => b.qty - a.qty);
        if (inv.length === 0) return { slots: [], summary: { towers: 0, lines: 0 } };

        let remainingInv = inv.map(i => ({ ...i }));
        const slots = [];

        const extractTower = () => {
            const idx = remainingInv.findIndex(i => i.qty >= 6);
            if (idx !== -1) {
                const sku = remainingInv[idx].sku;
                const take = Math.min(30, remainingInv[idx].qty);
                remainingInv[idx].qty -= take;
                return { type: 'tower', sku, qty: take };
            }
            return null;
        };

        const entryTower = extractTower();
        const exitTower = extractTower();

        let consecutiveLines = 0;
        while (remainingInv.some(i => i.qty > 0)) {
            if (consecutiveLines >= 6) {
                const midTower = extractTower();
                if (midTower) {
                    slots.push(midTower);
                    consecutiveLines = 0;
                    continue;
                }
            }

            const nextIdx = remainingInv.findIndex(i => i.qty > 0);
            if (nextIdx === -1) break;

            const item = remainingInv[nextIdx];
            if (item.qty >= 6) {
                slots.push({ type: 'line', sku: item.sku, qty: 6 });
                item.qty -= 6;
                consecutiveLines++;
            } else {
                let mixedStack = [];
                let mixedTotal = 0;
                remainingInv.filter(i => i.qty > 0).forEach(rem => {
                    const space = 6 - mixedTotal;
                    if (space > 0 && rem.qty > 0) {
                        const take = Math.min(space, rem.qty);
                        mixedStack.push({ sku: rem.sku, qty: take });
                        mixedTotal += take;
                        rem.qty -= take;
                    }
                });
                if (mixedTotal > 0) {
                    slots.push({ type: 'line-mixed', items: mixedStack, qty: mixedTotal });
                    consecutiveLines++;
                }
            }
        }

        const finalSlots = [];
        if (entryTower) finalSlots.push(entryTower);
        finalSlots.push(...slots);
        if (exitTower) finalSlots.push(exitTower);

        return { slots: finalSlots };
    };

    // --- VIEWS ---

    const GlobalView = () => (
        <div className="p-10 animate-in fade-in zoom-in-95 duration-500 max-w-7xl mx-auto">
            <header className="mb-12 flex justify-between items-end border-b border-white/5 pb-10">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter text-white italic">WAREHOUSE OPS</h1>
                    <p className="text-gray-500 text-[10px] font-mono uppercase tracking-[0.4em] mt-3">Strategic Distribution & Safety Stacking</p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-orange-500 font-black block mb-1">GLOBAL STATUS</span>
                    <span className="text-2xl font-mono text-white">ACTIVE / SECURE</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {WAREHOUSE_STRUCTURE.bays.map(bay => {
                    const totalUnits = bay.rows.reduce((sum, rowId) => {
                        const inv = getRowInventory(rowId);
                        return sum + inv.reduce((s, i) => s + i.qty, 0);
                    }, 0);
                    const totalSkus = bay.rows.reduce((sum, rowId) => sum + (getRowInventory(rowId)).length, 0);

                    return (
                        <div
                            key={bay.id}
                            onClick={() => goToBay(bay)}
                            onMouseEnter={(e) => showTooltip(e, bay.name, `${totalUnits} units across ${bay.rows.length} rows`, `${totalSkus} unique SKUs in section`)}
                            onMouseLeave={hideTooltip}
                            className="group relative bg-[#0f0f12] border border-white/5 p-10 rounded-[2.5rem] hover:border-orange-500/50 hover:shadow-[0_0_50px_rgba(249,115,22,0.1)] transition-all duration-500 cursor-pointer overflow-hidden"
                        >
                            <h3 className="text-3xl font-black text-white mb-2">{bay.name}</h3>
                            <p className="text-[10px] text-gray-500 font-mono mb-8 uppercase">{bay.rows.length} STRATEGIC ROWS</p>

                            <div className="grid grid-cols-4 gap-1 mb-8 opacity-20 group-hover:opacity-40 transition-opacity">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <div key={i} className="h-6 bg-white/20 rounded-sm" />
                                ))}
                            </div>

                            <button className="text-[10px] font-black uppercase tracking-widest text-orange-400">Manage Sections →</button>
                        </div>
                    );
                })}
            </div>
        </div>
    )

    const BayDetailView = () => (
        <div className="flex flex-col h-full bg-[#050507] animate-in slide-in-from-right duration-500">
            <div className="px-10 py-6 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button onClick={goToGlobal} className="text-[10px] font-black text-gray-500 hover:text-white transition-colors uppercase">Warehouse</button>
                    <span className="text-gray-800">/</span>
                    <h2 className="text-sm font-black text-orange-500 uppercase tracking-widest leading-none">{selectedBay.name}</h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-gray-600 uppercase font-black mb-1">Aisle Spacing</span>
                        <input type="range" min="10" max="80" value={aisleWidth} onChange={(e) => setAisleWidth(parseInt(e.target.value))} className="w-32 accent-orange-500" />
                    </div>
                </div>
            </div>

            <div className="flex-1 p-20 overflow-auto bg-[#08080a] custom-scrollbar">
                <div className="max-w-5xl mx-auto flex flex-col" style={{ gap: `${aisleWidth}px` }}>
                    {selectedBay.rows.map(rowId => {
                        const rowData = getRowData(rowId);
                        const inv = getRowInventory(rowId);
                        const totalUnits = inv.reduce((sum, i) => sum + i.qty, 0);
                        const occupancy = (totalUnits / rowData.totalBikes) * 100;

                        return (
                            <div
                                key={rowId}
                                onClick={() => goToRow(rowData)}
                                onMouseEnter={(e) => showTooltip(e, `Row ${rowId}`, `${totalUnits} / ${rowData.totalBikes} units (${Math.round(occupancy)}%)`, `${inv.length} SKUs · ${rowData.length} ft`)}
                                onMouseLeave={hideTooltip}
                                className="group relative flex items-center h-16 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-orange-500/30 transition-all cursor-pointer rounded-lg overflow-hidden"
                                style={{ width: `${rowData.length * scale}px` }}
                            >
                                <div className="absolute -left-12 text-[10px] font-mono text-gray-700 font-black">R{rowId}</div>
                                <div className="absolute left-0 top-0 h-full bg-orange-500/10 transition-all duration-1000" style={{ width: `${Math.min(100, occupancy)}%` }} />
                                <div className="relative z-10 w-full px-6 flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/20 italic group-hover:text-white/60 transition-colors uppercase">{rowData.length} FEET LINEAR</span>
                                    <span className="font-mono text-xs text-orange-400 font-black">{totalUnits} / {rowData.totalBikes}</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )

    const RowDetailView = () => {
        const plan = useMemo(() => generateStackingPlan(selectedRow.row, selectedRow.totalBikes), [selectedRow]);

        return (
            <div className="h-full bg-[#050507] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
                <div className="px-10 py-10 bg-black/40 border-b border-orange-500/10">
                    <div className="flex items-center gap-4 mb-8">
                        <button onClick={() => goToBay(selectedBay)} className="text-[10px] font-black text-gray-600 hover:text-white transition-colors uppercase">Back to {selectedBay.name}</button>
                        <span className="text-gray-800">/</span>
                        <h2 className="text-2xl font-black italic tracking-tighter text-white">ROW {selectedRow.row.toString().padStart(2, '0')} STACKING PROTOCOL</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <StatCard label="Length" value={`${selectedRow.length} ft`} />
                        <StatCard label="Current Load" value={`${getRowInventory(selectedRow.row).reduce((s, i) => s + i.qty, 0)} Units`} />
                        <StatCard label="Stability Setup" value="2 Towers + Lines" color="text-green-500" />
                        <StatCard label="Protocol" value="Mixed Allowed (Lines only)" />
                    </div>
                </div>

                {/* VISUAL STACKING PLAN */}
                <div className="flex-1 overflow-auto p-16 bg-[#08080a]">
                    <div className="mb-10 flex gap-4 items-center">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500 rounded-sm" /> <span className="text-[9px] uppercase font-bold text-gray-500">Stable Tower (Crossed)</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-cyan-500 rounded-sm" /> <span className="text-[9px] uppercase font-bold text-gray-500">Standard 6-Line Stack</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-fuchsia-500 rounded-sm" /> <span className="text-[9px] uppercase font-bold text-gray-500">Mixed Line (Safety Restricted)</span></div>
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                        {plan.slots.map((slot, idx) => {
                            let color = "bg-cyan-500/20 shadow-[0_4px_0_0_rgba(6,182,212,0.1)] border-cyan-500/30";
                            if (slot.type === 'tower') {
                                color = "bg-orange-500 shadow-[0_8px_0_0_rgba(249,115,22,0.2)] border-orange-400";
                            }
                            if (slot.type === 'line-mixed') {
                                color = "bg-fuchsia-500/20 border-fuchsia-500/40";
                            }

                            const isTower = slot.type === 'tower';
                            const ttTitle = isTower ? 'STABILITY ANCHOR' : (slot.type === 'line-mixed' ? 'MIXED LINE' : 'PICKING LINE');
                            const ttDesc = slot.sku || (slot.items ? slot.items.map(i => i.sku).join(', ') : 'Mixed');
                            const ttExtra = `${slot.qty} units · ${isTower ? '5ft tower block' : '8" line stack'}`;

                            return (
                                <div
                                    key={idx}
                                    onMouseEnter={(e) => showTooltip(e, ttTitle, ttDesc, ttExtra)}
                                    onMouseLeave={hideTooltip}
                                    className={`relative rounded-sm border flex flex-col items-center justify-center transition-all hover:brightness-125 group overflow-hidden cursor-default ${color}`}
                                    style={{
                                        width: isTower ? `${5 * 18}px` : `${0.66 * 18}px`,
                                        height: '140px'
                                    }}
                                >
                                    <span className={`font-black uppercase tracking-tighter transition-all ${isTower ? 'text-[10px] opacity-100' : 'text-[6px] opacity-40 group-hover:opacity-100 rotate-90'}`}>
                                        {slot.sku ? slot.sku.split('-')[1] : 'MIX'}
                                    </span>

                                    <div className="absolute bottom-1 w-full text-center">
                                        <span className="text-[10px] font-mono font-black text-white/40">{slot.qty}</span>
                                    </div>

                                    <div className="absolute top-2 opacity-20">
                                        {isTower ? '▩' : '☰'}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-8 bg-black/60 border-t border-white/5 flex justify-between text-[10px] font-mono uppercase tracking-[0.2em] text-gray-600">
                    <div className="flex gap-10">
                        <span className="flex items-center gap-2"><div className="w-10 h-2 bg-orange-500 rounded-px" /> 5ft TOWER ZONE</span>
                        <span className="flex items-center gap-2"><div className="w-2 h-2 bg-cyan-500 rounded-px" /> 8" LINE ZONE</span>
                    </div>
                    <span className="text-orange-500 font-bold tracking-normal">STACKING PROTOCOL: SAFETY-FIRST INTERLEAVED</span>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full bg-[#050507] text-white">
            <Tooltip tooltip={tooltip} />
            {view === 'global' && <GlobalView />}
            {view === 'bay' && <BayDetailView />}
            {view === 'row' && <RowDetailView />}
        </div>
    )
}

function StatCard({ label, value, color = "text-white" }) {
    return (
        <div className="border-l border-white/10 pl-4">
            <span className="text-[9px] text-gray-500 font-black uppercase block mb-1">{label}</span>
            <span className={`text-xl font-mono font-black ${color}`}>{value}</span>
        </div>
    )
}
