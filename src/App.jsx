import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, onSnapshot, 
  query, orderBy, doc, updateDoc, deleteDoc, serverTimestamp, increment, writeBatch 
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { 
  Package, ShoppingCart, TrendingUp, DollarSign, 
  Settings, PlusCircle, Trash2, Save, Activity, LayoutGrid,
  Image as ImageIcon, Plus, X, Pencil, RotateCcw,
  ArrowRightLeft, FileDown, Calendar, Home, StickyNote
} from 'lucide-react';

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDpYFlx8gAiV1peCmT2XjHxhkfwi9YQUu8",
  authDomain: "cuchareli.firebaseapp.com",
  projectId: "cuchareli",
  storageBucket: "cuchareli.firebasestorage.app",
  messagingSenderId: "1085898940488",
  appId: "1:1085898940488:web:1e1b23dda539237a13f87d",
  measurementId: "G-Q1YTR3RBH1"
};

// --- ESTILO Y MARCA ---
const BRAND = {
  brown: 'bg-[#5D4037]',
  brownText: 'text-[#3E2723]',
  pink: 'text-[#E91E63]',
  pinkBg: 'bg-[#E91E63]',
  cream: 'bg-[#F9F7F2]',
  creamDark: 'bg-[#F0EBE0]',
  blueSoft: 'bg-[#E3F2FD]',
  blueText: 'text-[#1565C0]',
};

// Datos iniciales
const initialProducts = [
  { id: '1', name: 'Cheesecake de Maracuyá', photo: null, stock: 0, stockDaniela: 0 },
  { id: '2', name: 'Cheesecake de Oreo', photo: null, stock: 0, stockDaniela: 0 },
];

export default function CucharelliApp() {
  // --- ESTADOS ---
  const [activeTab, setActiveTab] = useState('stock');
  const [products, setProducts] = useState(initialProducts);
  const [transactions, setTransactions] = useState([]);
  
  // Firebase
  const [isFirebaseReady, setIsFirebaseReady] = useState(false);
  const [appId] = useState('cucharelli-v2');
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);

  // Estados de Interfaz
  const [companyName, setCompanyName] = useState('Cucharelli');
  const [stockViewMode, setStockViewMode] = useState('main'); // 'main' | 'daniela'
  const [reportFilter, setReportFilter] = useState('month'); 

  // Formularios
  const [newProdName, setNewProdName] = useState('');
  const [newProdImage, setNewProdImage] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [stockInputs, setStockInputs] = useState({});
  const [transferInputs, setTransferInputs] = useState({});

  // Ventas y Gastos
  const [saleRows, setSaleRows] = useState([{ id: Date.now(), prodId: '', qty: 1, price: '' }]);
  const [saleLocation, setSaleLocation] = useState('main'); // 'main' (Vitrina) | 'daniela' (Casa Daniela)
  const [saleNote, setSaleNote] = useState(''); // Nueva nota de venta
  const [expenseRows, setExpenseRows] = useState([{ id: Date.now(), desc: '', amount: '' }]);

  // Edición de Reportes
  const [editingTransId, setEditingTransId] = useState(null);
  const [editTransAmount, setEditTransAmount] = useState('');
  const [editTransDesc, setEditTransDesc] = useState('');

  // --- LOGICA FIREBASE ---
  useEffect(() => {
    const savedName = localStorage.getItem('cucharelli_company_name');
    if (savedName) setCompanyName(savedName);
    initFirebase(firebaseConfig);
  }, []);

  const initFirebase = async (config) => {
    try {
      let app;
      try { app = initializeApp(config); } catch(e) { return; }
      const authInstance = getAuth(app);
      const dbInstance = getFirestore(app);
      setAuth(authInstance);
      setDb(dbInstance);
      try { await signInAnonymously(authInstance); } catch (e) {}
      onAuthStateChanged(authInstance, (u) => { if (u) { setUser(u); setIsFirebaseReady(true); } });
    } catch (error) { console.error("Error Firebase:", error); }
  };

  useEffect(() => {
    if (!isFirebaseReady || !db || !user) return;
    const qProd = query(collection(db, 'artifacts', appId, 'public', 'data', 'products'), orderBy('name'));
    const unsubProd = onSnapshot(qProd, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ 
        id: doc.id, ...doc.data(),
        stock: doc.data().stock || 0,
        stockDaniela: doc.data().stockDaniela || 0
      })));
    });
    const qTrans = query(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), orderBy('createdAt', 'desc'));
    const unsubTrans = onSnapshot(qTrans, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate() || new Date() })));
    });
    return () => { unsubProd(); unsubTrans(); };
  }, [isFirebaseReady, db, user, appId]);

  // --- GESTIÓN PRODUCTOS ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewProdImage(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = async () => {
    if (!newProdName) return alert("Falta el nombre");
    if (editingId) {
      if (isFirebaseReady && db) {
        const updateData = { name: newProdName };
        if (newProdImage) updateData.photo = newProdImage;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', editingId), updateData);
      }
      alert("¡Actualizado!");
    } else {
      const newProd = { name: newProdName, photo: newProdImage, stock: 0, stockDaniela: 0 };
      if (isFirebaseReady && db) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), newProd);
      alert("Agregado");
    }
    setNewProdName(''); setNewProdImage(null); setEditingId(null);
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("¿Eliminar?")) return;
    if (isFirebaseReady && db) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'products', id));
  };

  // --- MOVIMIENTOS STOCK ---
  const updateStockBulk = async () => {
    const updates = Object.entries(stockInputs).filter(([_, qty]) => parseInt(qty) > 0);
    if (updates.length === 0) return;
    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      updates.forEach(([id, qty]) => {
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { stock: increment(parseInt(qty)) });
      });
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
        type: 'restock', location: 'main', items: updates.map(([id, qty]) => ({ name: products.find(x => x.id === id)?.name, qty: parseInt(qty) })), createdAt: serverTimestamp()
      });
      await batch.commit();
    }
    setStockInputs({}); alert("Producción registrada");
  };

  const transferToDaniela = async () => {
    const updates = Object.entries(transferInputs).filter(([_, qty]) => parseInt(qty) > 0);
    if (updates.length === 0) return;
    for (let [id, qty] of updates) {
      const prod = products.find(p => p.id === id);
      if (prod.stock < parseInt(qty)) return alert(`Falta stock de ${prod.name} en vitrina.`);
    }
    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      updates.forEach(([id, qty]) => {
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'products', id), { stock: increment(-parseInt(qty)), stockDaniela: increment(parseInt(qty)) });
      });
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
        type: 'transfer', description: 'Envío a Daniela', amount: 0, items: updates.map(([id, qty]) => ({ name: products.find(x => x.id === id)?.name, qty: parseInt(qty) })), createdAt: serverTimestamp()
      });
      await batch.commit();
    }
    setTransferInputs({}); alert("Enviado a Daniela");
  };

  // --- VENTAS (ACTUALIZADO V4) ---
  const addSaleRow = () => setSaleRows([...saleRows, { id: Date.now(), prodId: '', qty: 1, price: '' }]);
  const removeSaleRow = (id) => setSaleRows(saleRows.filter(row => row.id !== id));
  const updateSaleRow = (id, field, value) => setSaleRows(saleRows.map(row => row.id === id ? { ...row, [field]: value } : row));
  const totalSaleAmount = saleRows.reduce((acc, row) => acc + (parseFloat(row.price || 0)), 0);

  const registerMultiSale = async () => {
    const validRows = saleRows.filter(r => r.prodId && r.qty > 0 && r.price);
    if (validRows.length === 0) return alert("Añade productos válidos");

    // Verificar Stock según Ubicación
    for (let row of validRows) {
      const prod = products.find(p => p.id === row.prodId);
      const stockAvailable = saleLocation === 'main' ? prod.stock : prod.stockDaniela;
      if (!prod || stockAvailable < row.qty) {
        return alert(`¡Stock insuficiente de ${prod?.name || 'producto'} en ${saleLocation === 'main' ? 'Vitrina' : 'Casa Daniela'}!`);
      }
    }

    if (isFirebaseReady && db) {
      const batch = writeBatch(db);
      validRows.forEach(row => {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'products', row.prodId);
        // Descontar del lugar correcto
        if (saleLocation === 'main') {
          batch.update(ref, { stock: increment(-parseInt(row.qty)) });
        } else {
          batch.update(ref, { stockDaniela: increment(-parseInt(row.qty)) });
        }
      });
      
      batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions')), {
        type: 'sale', 
        location: saleLocation, // Guardamos dónde fue
        amount: totalSaleAmount,
        description: saleNote || (saleLocation === 'main' ? 'Venta Vitrina' : 'Venta Daniela'), // Guardamos la nota
        items: validRows.map(row => ({
          name: products.find(p => p.id === row.prodId)?.name,
          qty: parseInt(row.qty),
          lineTotal: parseFloat(row.price)
        })),
        createdAt: serverTimestamp()
      });
      await batch.commit();
    }
    setSaleRows([{ id: Date.now(), prodId: '', qty: 1, price: '' }]);
    setSaleNote(''); // Limpiar nota
    alert("¡Venta Registrada!");
  };

  // --- GASTOS Y REPORTES ---
  const addExpenseRow = () => setExpenseRows([...expenseRows, { id: Date.now(), desc: '', amount: '' }]);
  const registerMultiExpense = async () => {
    const validRows = expenseRows.filter(r => r.desc && r.amount);
    if (validRows.length === 0) return alert("Datos incompletos");
    const total = validRows.reduce((acc, r) => acc + parseFloat(r.amount), 0);
    if (isFirebaseReady && db) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), {
      type: 'expense', amount: total, items: validRows.map(r => ({ desc: r.desc, price: parseFloat(r.amount) })), createdAt: serverTimestamp()
    });
    setExpenseRows([{ id: Date.now(), desc: '', amount: '' }]); alert("Gastos registrados");
  };

  const saveTransactionEdit = async () => {
    if (!editingTransId) return;
    if (isFirebaseReady && db) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', editingTransId), { 
        amount: parseFloat(editTransAmount), ...(editTransDesc ? { description: editTransDesc } : {})
      });
      alert("Corregido"); setEditingTransId(null);
    }
  };

  const deleteTransaction = async (id) => {
    if (window.confirm("¿Borrar?")) if (isFirebaseReady && db) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', id));
  };

  const exportToCSV = () => {
    const rows = filteredTransactions.map(t => `${t.createdAt.toLocaleDateString()},${t.type},"${t.description || ''}",${t.amount || 0}`);
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encodeURI("Fecha,Tipo,Desc,Monto\n" + rows.join("\n"));
    link.download = "reporte.csv"; document.body.appendChild(link); link.click();
  };

  const filteredTransactions = useMemo(() => {
    if (reportFilter === 'all') return transactions;
    const now = new Date();
    return transactions.filter(t => t.createdAt.getMonth() === now.getMonth() && t.createdAt.getFullYear() === now.getFullYear());
  }, [transactions, reportFilter]);

  // Totales de Stock
  const totalStockMain = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalStockDaniela = products.reduce((acc, p) => acc + (p.stockDaniela || 0), 0);

  // --- UI COMPONENTS ---
  const Header = ({ title }) => (
    <div className={`${BRAND.brown} p-4 text-white shadow-md sticky top-0 z-10 flex justify-between items-center`}>
      <div className="flex flex-col">
        <h1 className="text-xl font-bold tracking-wider font-serif">{companyName}</h1>
        <span className="text-[10px] text-pink-200 tracking-widest uppercase">By Araceli Palomino</span>
      </div>
      <span className={`${BRAND.pinkBg} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm`}>{title}</span>
    </div>
  );

  const NavButton = ({ id, icon: Icon, label }) => (
    <button onClick={() => setActiveTab(id)} className={`flex flex-col items-center justify-center w-full py-2 transition-colors ${activeTab === id ? `${BRAND.pink}` : 'text-gray-400'}`}>
      <Icon size={24} strokeWidth={activeTab === id ? 2.5 : 2} /> <span className="text-[10px] font-medium mt-1">{label}</span>
    </button>
  );

  const renderContent = () => {
    switch(activeTab) {
      case 'stock':
        return (
          <div className="p-4 space-y-4 pb-20">
            {/* 3. CONTADOR TOTAL (OJO DE ÁGUILA) */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-[#EFEBE9] grid grid-cols-3 gap-2 text-center">
              <div className="border-r border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Total Global</p>
                <p className={`text-2xl font-bold ${BRAND.brownText}`}>{totalStockMain + totalStockDaniela}</p>
              </div>
              <div className="border-r border-gray-100">
                <p className="text-[10px] text-gray-400 uppercase font-bold">Vitrina</p>
                <p className="text-xl font-bold text-[#5D4037]">{totalStockMain}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 uppercase font-bold">Daniela</p>
                <p className="text-xl font-bold text-[#E91E63]">{totalStockDaniela}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-2">
              <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}>
                <Package className="text-[#E91E63]" /> {stockViewMode === 'main' ? 'Tu Vitrina' : 'Casa Daniela'}
              </h2>
              <div className="bg-gray-100 p-1 rounded-lg flex text-xs font-bold">
                <button onClick={() => setStockViewMode('main')} className={`px-3 py-1 rounded-md transition-all ${stockViewMode === 'main' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}>Vitrina</button>
                <button onClick={() => setStockViewMode('daniela')} className={`px-3 py-1 rounded-md transition-all ${stockViewMode === 'daniela' ? 'bg-white shadow text-[#E91E63]' : 'text-gray-400'}`}>Daniela</button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {products.map(p => {
                const currentStock = stockViewMode === 'main' ? p.stock : p.stockDaniela;
                return (
                  <div key={p.id} className="bg-white rounded-xl shadow-sm border border-[#EFEBE9] overflow-hidden flex flex-col group">
                    <div className="h-32 w-full relative bg-gray-100 flex items-center justify-center">
                      {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <Package className="text-gray-300" size={40} />}
                      <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold shadow ${stockViewMode === 'main' ? 'bg-white text-[#5D4037]' : 'bg-[#E91E63] text-white'}`}>x{currentStock}</div>
                    </div>
                    <div className="p-3 text-center bg-white">
                      <h3 className="font-bold text-[#5D4037] text-sm leading-tight">{p.name}</h3>
                      <p className={`text-xs mt-1 font-medium ${currentStock < 5 ? 'text-red-500' : 'text-green-600'}`}>{currentStock === 0 ? 'AGOTADO' : 'Disponible'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {products.length === 0 && <div className="text-center p-8 text-gray-400">Sin productos.</div>}
          </div>
        );

      case 'add_stock':
        return (
          <div className="p-4 pb-24 space-y-8">
            <div>
              <h2 className={`text-xl font-bold ${BRAND.brownText} mb-2 flex items-center gap-2`}><PlusCircle className="text-[#E91E63]" /> Producción (Vitrina)</h2>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-[#EFEBE9]">
                    <span className={`font-bold ${BRAND.brownText} truncate text-sm w-1/2`}>{p.name}</span>
                    <input type="number" placeholder="0" className="w-12 bg-[#F9F7F2] rounded p-1 text-center font-bold text-[#E91E63] outline-none"
                        value={stockInputs[p.id] || ''} onChange={(e) => setStockInputs({...stockInputs, [p.id]: e.target.value})} />
                  </div>
                ))}
              </div>
              <button onClick={updateStockBulk} className={`mt-4 ${BRAND.brown} text-white w-full py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2`}><Save size={20} /> GUARDAR</button>
            </div>

            <div className="bg-[#E3F2FD] p-5 rounded-2xl border border-blue-100">
              <h2 className={`text-lg font-bold text-blue-800 mb-2 flex items-center gap-2`}><Home size={18} /> Enviar a Daniela</h2>
              <div className="space-y-2">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-white/50 p-2 rounded-lg border border-blue-100">
                     <span className="text-xs text-blue-900 font-medium truncate w-1/2">{p.name}</span>
                     <div className="flex items-center gap-2">
                       <span className="text-[10px] text-gray-400">Disp: {p.stock}</span>
                       <input type="number" placeholder="0" className="w-12 bg-white rounded p-1 text-center font-bold text-blue-600 outline-none"
                          value={transferInputs[p.id] || ''} onChange={(e) => setTransferInputs({...transferInputs, [p.id]: e.target.value})} />
                     </div>
                  </div>
                ))}
              </div>
              <button onClick={transferToDaniela} className={`mt-4 bg-blue-600 text-white w-full py-3 rounded-xl font-bold shadow-lg flex justify-center gap-2`}><ArrowRightLeft size={18} /> ENVIAR</button>
            </div>
          </div>
        );

      case 'sales':
        return (
          <div className="p-4 pb-24 max-w-lg mx-auto">
            {/* 1. SELECCIÓN DE LUGAR DE VENTA */}
            <div className="bg-gray-100 p-1 rounded-xl flex text-sm font-bold mb-4">
              <button onClick={() => setSaleLocation('main')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${saleLocation === 'main' ? 'bg-white shadow text-[#5D4037]' : 'text-gray-400'}`}>
                <Package size={16}/> Mi Vitrina
              </button>
              <button onClick={() => setSaleLocation('daniela')} className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 transition-all ${saleLocation === 'daniela' ? 'bg-white shadow text-[#E91E63]' : 'text-gray-400'}`}>
                <Home size={16}/> Casa Daniela
              </button>
            </div>

            <h2 className={`text-xl font-bold ${BRAND.brownText} mb-2 flex items-center gap-2`}><ShoppingCart className="text-[#E91E63]" /> Nueva Venta</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex gap-2 text-xs font-bold text-[#8D6E63] px-1"><div className="flex-1">Producto</div><div className="w-16 text-center">Cant.</div><div className="w-20 text-right">Total (S/)</div></div>
              {saleRows.map((row) => (
                <div key={row.id} className="bg-white p-2 rounded-xl shadow-sm border border-[#EFEBE9] flex gap-2 items-center animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex-1">
                     <select className={`w-full p-2 bg-[#F9F7F2] border border-[#E0E0E0] rounded-lg text-sm ${BRAND.brownText} outline-none`}
                      value={row.prodId} onChange={(e) => updateSaleRow(row.id, 'prodId', e.target.value)}>
                      <option value="">Sabor...</option>
                      {products.filter(p => (saleLocation === 'main' ? p.stock : p.stockDaniela) > 0).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {row.prodId && (
                      <div className="text-[9px] text-gray-400 ml-1 mt-0.5">
                        Stock {saleLocation === 'main' ? 'Vitrina' : 'Dani'}: {saleLocation === 'main' ? products.find(p => p.id === row.prodId)?.stock : products.find(p => p.id === row.prodId)?.stockDaniela}
                      </div>
                    )}
                  </div>
                  <div className="w-16"><input type="number" min="1" className={`w-full p-2 bg-[#F9F7F2] border border-[#E0E0E0] rounded-lg text-center font-bold ${BRAND.brownText}`} value={row.qty} onChange={(e) => updateSaleRow(row.id, 'qty', e.target.value)}/></div>
                  <div className="w-20"><input type="number" placeholder="0.00" className={`w-full p-2 bg-[#F9F7F2] border border-[#E0E0E0] rounded-lg text-right font-bold ${BRAND.brownText}`} value={row.price} onChange={(e) => updateSaleRow(row.id, 'price', e.target.value)}/></div>
                  {saleRows.length > 1 && <button onClick={() => removeSaleRow(row.id)} className="text-red-400 p-1"><Trash2 size={18} /></button>}
                </div>
              ))}
              <button onClick={addSaleRow} className="w-full py-2 border-2 border-dashed border-[#D7CCC8] rounded-xl text-[#8D6E63] font-bold text-xs flex justify-center items-center gap-2 hover:bg-[#EFEBE9]"><Plus size={16} /> Agregar producto</button>
            </div>

            {/* 2. CAMPO DE NOTA/DESCRIPCIÓN */}
            <div className="mb-20">
              <label className="text-xs font-bold text-[#8D6E63] mb-1 block">Nota / Cliente (Opcional):</label>
              <div className="flex items-center gap-2 bg-white border border-[#E0E0E0] rounded-xl p-2">
                <StickyNote className="text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder='Ej: "Mamá de Dani", "Fiado", "Promo"'
                  className="w-full bg-transparent text-sm outline-none text-[#5D4037]"
                  value={saleNote}
                  onChange={(e) => setSaleNote(e.target.value)}
                />
              </div>
            </div>

            <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center mb-3"><span className="text-[#8D6E63] font-medium">Total a cobrar:</span><span className={`text-2xl font-bold ${BRAND.brownText}`}>S/ {totalSaleAmount.toFixed(2)}</span></div>
              <button onClick={registerMultiSale} className="w-full bg-[#4CAF50] text-white py-3 rounded-xl font-bold shadow-lg hover:bg-[#43A047]">CONFIRMAR VENTA</button>
            </div>
          </div>
        );

      case 'expenses':
        return (
          <div className="p-4 pb-24">
             <h2 className={`text-xl font-bold ${BRAND.brownText} mb-2 flex items-center gap-2`}><TrendingUp className="text-red-500" /> Registrar Gastos</h2>
            <div className="space-y-3 mb-20">
              {expenseRows.map((row) => (
                <div key={row.id} className="bg-white p-3 rounded-xl shadow-sm border border-l-4 border-l-red-400 flex gap-2 items-center">
                  <div className="flex-1"><input type="text" placeholder="Descripción" className={`w-full p-2 bg-transparent border-b border-gray-100 text-sm font-medium outline-none ${BRAND.brownText}`} value={row.desc} onChange={(e) => {const newRows = expenseRows.map(r => r.id === row.id ? {...r, desc: e.target.value} : r); setExpenseRows(newRows);}}/></div>
                  <div className="w-24"><input type="number" placeholder="S/ 0" className="w-full p-2 bg-red-50 rounded-lg text-right font-bold text-red-600 text-sm outline-none" value={row.amount} onChange={(e) => {const newRows = expenseRows.map(r => r.id === row.id ? {...r, amount: e.target.value} : r); setExpenseRows(newRows);}}/></div>
                  {expenseRows.length > 1 && <button onClick={() => setExpenseRows(expenseRows.filter(r => r.id !== row.id))} className="text-gray-400"><X size={16}/></button>}
                </div>
              ))}
              <button onClick={addExpenseRow} className="text-xs font-bold text-[#8D6E63] underline p-2">+ Agregar otro ítem</button>
            </div>
            <div className="fixed bottom-20 left-0 right-0 p-4"><button onClick={registerMultiExpense} className="w-full bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg">GUARDAR GASTOS</button></div>
          </div>
        );

      case 'reports':
        const totalSales = filteredTransactions.filter(t => t.type === 'sale').reduce((acc, t) => acc + (t.amount || 0), 0);
        const totalExpenses = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + (t.amount || 0), 0);
        return (
          <div className="p-4 pb-20">
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}><Activity className="text-[#E91E63]" /> Reporte</h2>
              <div className="flex gap-2">
                <button onClick={exportToCSV} className="bg-green-100 text-green-700 p-2 rounded-lg text-xs font-bold flex items-center gap-1"><FileDown size={16}/> CSV</button>
                <select value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="bg-gray-100 text-xs p-2 rounded-lg outline-none font-bold">
                  <option value="month">Este Mes</option>
                  <option value="all">Todo</option>
                </select>
              </div>
            </div>

            <div className={`${BRAND.brown} text-white p-6 rounded-2xl shadow-lg mb-6 relative overflow-hidden`}>
               <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#E91E63] rounded-full opacity-20 blur-xl"></div>
               <p className="text-orange-100 text-sm mb-1">Ganancia Neta ({reportFilter === 'month' ? 'Mes' : 'Total'})</p>
               <h3 className="text-4xl font-bold">S/ {(totalSales - totalExpenses).toFixed(2)}</h3>
               <div className="flex gap-4 mt-4 pt-4 border-t border-white/10">
                 <div><p className="text-[10px] text-green-300 uppercase">Ingresos</p><p className="font-bold">S/ {totalSales.toFixed(2)}</p></div>
                 <div><p className="text-[10px] text-red-300 uppercase">Egresos</p><p className="font-bold">S/ {totalExpenses.toFixed(2)}</p></div>
               </div>
            </div>
            
            <h3 className="font-bold text-[#8D6E63] mb-3 text-sm uppercase tracking-wide">Movimientos</h3>
            <div className="space-y-3">
              {filteredTransactions.map(t => (
                <div key={t.id} className={`bg-white p-3 rounded-xl shadow-sm border ${editingTransId === t.id ? 'border-blue-400 bg-blue-50' : 'border-[#EFEBE9]'}`}>
                  {editingTransId === t.id ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-bold text-blue-600">Corrigiendo...</p>
                      <input type="number" className="p-2 border rounded bg-white font-bold" value={editTransAmount} onChange={(e) => setEditTransAmount(e.target.value)} />
                      <input type="text" className="p-2 border rounded bg-white text-xs" value={editTransDesc} onChange={(e) => setEditTransDesc(e.target.value)} />
                      <div className="flex gap-2 justify-end mt-1"><button onClick={() => setEditingTransId(null)} className="text-gray-500 text-xs p-1">Cancelar</button><button onClick={saveTransactionEdit} className="bg-blue-600 text-white text-xs px-3 py-1 rounded font-bold">Guardar</button></div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${t.type === 'sale' ? 'bg-green-500' : t.type === 'expense' ? 'bg-red-500' : t.type === 'transfer' ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                          <span className={`font-bold ${BRAND.brownText} text-sm`}>
                            {t.type === 'sale' ? (t.location === 'daniela' ? 'Venta (Dani)' : 'Venta (Vitrina)') : t.type === 'expense' ? 'Gasto' : t.type === 'transfer' ? 'Traslado' : 'Producción'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-400">{t.createdAt.toLocaleDateString()}</span>
                          <button onClick={() => {setEditingTransId(t.id); setEditTransAmount(t.amount); setEditTransDesc(t.description || t.items?.[0]?.name);}} className="text-blue-400"><Pencil size={14}/></button>
                          <button onClick={() => deleteTransaction(t.id)} className="text-red-300"><Trash2 size={14}/></button>
                        </div>
                      </div>
                      <p className="text-xs font-medium text-gray-600 mb-1">{t.description}</p>
                      {t.items && <div className="bg-[#F9F7F2] rounded p-2 text-xs text-[#5D4037] space-y-1 mb-2">{t.items.map((item, idx) => (<div key={idx} className="flex justify-between"><span>{item.qty ? `${item.qty}x ` : ''}{item.name || item.desc}</span>{item.lineTotal && <span>S/ {item.lineTotal.toFixed(2)}</span>}</div>))}</div>}
                      <div className="text-right">{t.amount !== 0 && <span className={`font-bold ${t.type === 'sale' ? 'text-green-600' : 'text-red-500'}`}>{t.type === 'expense' ? '-' : '+'} S/ {parseFloat(t.amount).toFixed(2)}</span>}</div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="p-4 space-y-6 pb-20">
            <h2 className={`text-xl font-bold ${BRAND.brownText} flex items-center gap-2`}><Settings className="text-gray-400" /> Ajustes</h2>
            <div className={`p-5 rounded-2xl shadow-sm border transition-colors ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-[#EFEBE9]'}`}>
              <h3 className={`font-bold ${editingId ? 'text-orange-700' : BRAND.brownText} mb-4 flex items-center gap-2 justify-between`}>
                <span className="flex items-center gap-2"><ImageIcon size={18} className={editingId ? 'text-orange-500' : 'text-[#E91E63]'}/> {editingId ? 'Editando' : 'Nuevo Sabor'}</span>
                {editingId && <button onClick={() => {setEditingId(null); setNewProdName(''); setNewProdImage(null);}} className="text-xs bg-white px-2 py-1 rounded border shadow-sm flex items-center gap-1"><RotateCcw size={12}/> Cancelar</button>}
              </h3>
              <div className="space-y-3">
                <input className="w-full p-3 bg-white border border-[#E0E0E0] rounded-xl text-sm outline-none focus:border-[#E91E63]" placeholder="Nombre del Cuchariable" value={newProdName} onChange={(e) => setNewProdName(e.target.value)}/>
                <div className="relative"><input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 w-full h-full opacity-0 z-10 cursor-pointer"/><div className={`w-full p-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-sm ${newProdImage ? 'border-[#E91E63] bg-pink-50 text-[#E91E63]' : 'border-gray-300 text-gray-400'}`}>{newProdImage ? <><ImageIcon size={16} /> ¡Foto Lista!</> : <><Plus size={16} /> {editingId ? 'Cambiar Foto' : 'Subir Foto'}</>}</div></div>
                {newProdImage && <div className="w-20 h-20 rounded-lg overflow-hidden mx-auto border border-gray-200"><img src={newProdImage} className="w-full h-full object-cover" /></div>}
                <button onClick={handleSaveProduct} className={`${editingId ? 'bg-orange-600 hover:bg-orange-700' : BRAND.brown} text-white w-full py-3 rounded-xl font-bold text-sm shadow transition`}>{editingId ? 'Actualizar' : 'Guardar'}</button>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#EFEBE9]">
              <h3 className={`font-bold ${BRAND.brownText} mb-4 flex items-center gap-2`}>Gestionar Sabores</h3>
              <div className="space-y-3">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-[#F9F7F2] p-2 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3 overflow-hidden"><div className="w-10 h-10 rounded-lg bg-white flex-shrink-0 overflow-hidden border border-gray-100">{p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#5D4037]/10" />}</div><p className={`font-medium ${BRAND.brownText} truncate text-sm max-w-[120px]`}>{p.name}</p></div>
                    <div className="flex items-center gap-1"><button onClick={() => {setEditingId(p.id); setNewProdName(p.name); window.scrollTo({top:0,behavior:'smooth'});}} className="p-2 text-blue-500 bg-white rounded-lg border border-gray-100 shadow-sm hover:bg-blue-50"><Pencil size={16}/></button><button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500 bg-white rounded-lg border border-gray-100 shadow-sm hover:bg-red-50"><Trash2 size={16}/></button></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#E3F2FD] p-5 rounded-2xl border border-blue-100 text-center"><p className="text-sm text-gray-500 mb-2">Base de datos configurada internamente.</p>{!isFirebaseReady ? <span className="text-orange-500 font-bold text-xs">Conectando...</span> : <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs font-bold">● Conectado a Cucharelli</span>}</div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className={`min-h-screen ${BRAND.cream} flex flex-col font-sans max-w-lg mx-auto shadow-2xl overflow-hidden relative`}>
      <Header title={activeTab === 'stock' ? 'Vitrina' : activeTab === 'add_stock' ? 'Cocina' : activeTab === 'sales' ? 'Caja' : activeTab === 'expenses' ? 'Finanzas' : activeTab === 'reports' ? 'Balance' : 'Admin'} />
      <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      <nav className="bg-white border-t border-[#EFEBE9] flex justify-around items-center pb-safe pt-2 sticky bottom-0 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <NavButton id="stock" icon={LayoutGrid} label="Stock" />
        <NavButton id="add_stock" icon={PlusCircle} label="Aumentar" />
        <NavButton id="sales" icon={DollarSign} label="Vender" />
        <NavButton id="expenses" icon={TrendingUp} label="Gastos" />
        <NavButton id="reports" icon={Activity} label="Reportes" />
        <NavButton id="settings" icon={Settings} label="Ajustes" />
      </nav>
    </div>
  );
}