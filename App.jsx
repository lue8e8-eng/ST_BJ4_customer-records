import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Users, BookOpen, Plus, Search, Filter, Edit, Trash2, UserPlus, Calculator, Download, Upload, History, DollarSign, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// 計算年齡的輔助函數
const calculateAge = (birthday) => {
  if (!birthday) return '';
  const today = new Date();
  const birthDate = new Date(birthday);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// 計算顧客的統計數據 (堂數、總價、次數、平均)
const getCustomerStats = (purchases = []) => {
  const totalSessions = purchases.reduce((sum, p) => sum + p.sessions, 0);
  const totalSpent = purchases.reduce((sum, p) => sum + p.price, 0);
  const purchaseCount = purchases.length;
  const avgPrice = totalSessions > 0 ? Math.round(totalSpent / totalSessions) : 0;
  return { totalSessions, totalSpent, purchaseCount, avgPrice };
};

// 簡易 CSV 剖析輔助函數
const parseCSVLine = (text) => {
  let result = [], keep = false, token = '';
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '"') keep = !keep;
    else if (text[i] === ',' && !keep) { result.push(token); token = ''; }
    else token += text[i];
  }
  result.push(token);
  return result;
};

export default function App() {
  // 从本地 localStorage 载入资料
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('sd_customer_records_v1');
    return saved ? JSON.parse(saved) : [];
  });

  // 当资料变动时，自动存入 localStorage
  useEffect(() => {
    localStorage.setItem('sd_customer_records_v1', JSON.stringify(customers));
  }, [customers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [minSessions, setMinSessions] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Modal 状态
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  // 自订确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    message: '', 
    onConfirm: null,
    confirmText: '確定',
    confirmStyle: 'danger' 
  });
  
  // 表单状态
  const [formData, setFormData] = useState({
    name: '', phone: '', birthday: '', initialSessions: 0, initialPrice: 0, notes: ''
  });
  
  // 购买课程表单状态
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionToAdd, setSessionToAdd] = useState(10);
  const [purchasePrice, setPurchasePrice] = useState('');

  const fileInputRef = useRef(null);

  // ---------------- 衍生状态与统计 ----------------
  const filteredCustomers = useMemo(() => {
    let result = customers.filter(c => {
      const stats = getCustomerStats(c.purchases);
      const matchName = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSessions = stats.totalSessions >= (minSessions || 0);
      return matchName && matchSessions;
    });

    if (sortConfig.key) {
      result.sort((a, b) => {
        const statsA = getCustomerStats(a.purchases);
        const statsB = getCustomerStats(b.purchases);
        let aValue, bValue;

        switch (sortConfig.key) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'age':
            aValue = a.birthday ? calculateAge(a.birthday) : -1;
            bValue = b.birthday ? calculateAge(b.birthday) : -1;
            break;
          case 'totalSessions':
            aValue = statsA.totalSessions;
            bValue = statsB.totalSessions;
            break;
          case 'totalSpent':
            aValue = statsA.totalSpent;
            bValue = statsB.totalSpent;
            break;
          case 'purchaseCount':
            aValue = statsA.purchaseCount;
            bValue = statsB.purchaseCount;
            break;
          case 'avgPrice':
            aValue = statsA.avgPrice;
            bValue = statsB.avgPrice;
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [customers, searchQuery, minSessions, sortConfig]);

  const totalCustomersCount = customers.length;
  const totalSessionsCount = customers.reduce((sum, c) => sum + getCustomerStats(c.purchases).totalSessions, 0);
  const totalRevenue = customers.reduce((sum, c) => sum + getCustomerStats(c.purchases).totalSpent, 0);
  
  const filteredCustomersCount = filteredCustomers.length;
  const filteredSessionsCount = filteredCustomers.reduce((sum, c) => sum + getCustomerStats(c.purchases).totalSessions, 0);

  // ---------------- 处理函数 ----------------
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleOpenAddCustomer = () => {
    setFormData({ name: '', phone: '', birthday: '', initialSessions: 0, initialPrice: 0, notes: '' });
    setEditingCustomer(null);
    setIsCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (customer) => {
    setFormData({ ...customer, initialSessions: 0, initialPrice: 0 });
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  const handleOpenAddSession = (customer) => {
    setEditingCustomer(customer);
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setSessionToAdd(10);
    setPurchasePrice('');
    setIsSessionModalOpen(true);
  };

  const handleOpenHistory = (customer) => {
    setEditingCustomer(customer);
    setIsHistoryModalOpen(true);
  };

  const handleDeleteCustomer = (id) => {
    setConfirmDialog({
      isOpen: true,
      message: '確定要刪除這位顧客的所有資料與購買紀錄嗎？',
      confirmText: '確定刪除',
      confirmStyle: 'danger',
      onConfirm: () => {
        setCustomers(prev => prev.filter(c => c.id !== id));
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, confirmText: '確定', confirmStyle: 'danger' });
      }
    });
  };

  // 一鍵刪除所有資料功能
  const handleClearAllCustomers = () => {
    setConfirmDialog({
      isOpen: true,
      message: '⚠️ 警告：確定要清空系統內的所有顧客資料與購課紀錄嗎？此操作無法回復！建議在執行前先匯出 CSV 進行備份。',
      confirmText: '確定清空所有資料',
      confirmStyle: 'danger',
      onConfirm: () => {
        setCustomers([]);
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, confirmText: '確定', confirmStyle: 'danger' });
      }
    });
  };

  const handleDeletePurchase = (customerId, purchaseId) => {
    setConfirmDialog({
      isOpen: true,
      message: '確定要刪除這筆購買紀錄嗎？相關的堂數與金額將會被扣除。',
      confirmText: '確定刪除',
      confirmStyle: 'danger',
      onConfirm: () => {
        setCustomers(prev => prev.map(c => {
          if (c.id === customerId) {
            const updated = { ...c, purchases: c.purchases.filter(p => p.id !== purchaseId) };
            setEditingCustomer(updated); 
            return updated;
          }
          return c;
        }));
        setConfirmDialog({ isOpen: false, message: '', onConfirm: null, confirmText: '確定', confirmStyle: 'danger' });
      }
    });
  };

  const handleSaveCustomer = (e) => {
    e.preventDefault();
    if (editingCustomer) {
      setCustomers(prev => prev.map(c => c.id === editingCustomer.id ? { 
        ...c, name: formData.name, phone: formData.phone, birthday: formData.birthday, notes: formData.notes 
      } : c));
    } else {
      const newCustomer = {
        id: Date.now().toString(),
        name: formData.name,
        phone: formData.phone,
        birthday: formData.birthday,
        notes: formData.notes,
        purchases: []
      };
      
      if (Number(formData.initialSessions) > 0) {
        newCustomer.purchases.push({
          id: Date.now() + 1,
          date: new Date().toISOString().split('T')[0],
          sessions: Number(formData.initialSessions),
          price: Number(formData.initialPrice) || 0
        });
      }
      setCustomers(prev => [newCustomer, ...prev]);
    }
    setIsCustomerModalOpen(false);
  };

  const handleSaveSessions = (e) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const newPurchase = {
      id: Date.now(),
      date: purchaseDate,
      sessions: Number(sessionToAdd),
      price: Number(purchasePrice) || 0
    };
    
    setCustomers(prev => prev.map(c => {
      if (c.id === editingCustomer.id) {
        const updated = {
          ...c,
          purchases: [...c.purchases, newPurchase].sort((a, b) => new Date(b.date) - new Date(a.date))
        };
        setIsSessionModalOpen(false);
        return updated;
      }
      return c;
    }));
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      
      if (lines.length <= 1) {
        alert('檔案沒有資料或格式不正確');
        return;
      }

      const newCustomers = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]).map(c => c.replace(/^"|"$/g, '')); 
        if (cols.length >= 1 && cols[0]) {
          const sessions = Number(cols[3]) || 0;
          const price = Number(cols[4]) || 0;
          const initialPurchases = [];
          
          if (sessions > 0) {
            initialPurchases.push({
              id: Date.now() + i,
              date: new Date().toISOString().split('T')[0],
              sessions: sessions,
              price: price
            });
          }

          newCustomers.push({
            id: (Date.now() + 1000 + i).toString(),
            name: cols[0],
            phone: cols[1] || '',
            birthday: cols[2] || '',
            notes: cols[7] || '', 
            purchases: initialPurchases
          });
        }
      }

      if (newCustomers.length > 0) {
        setConfirmDialog({
          isOpen: true,
          message: `成功讀取 ${newCustomers.length} 筆資料，確定要新增進系統中嗎？`,
          confirmText: '確定新增',
          confirmStyle: 'primary',
          onConfirm: () => {
            setCustomers(prev => [...newCustomers, ...prev]);
            setConfirmDialog({ isOpen: false, message: '', onConfirm: null, confirmText: '確定', confirmStyle: 'danger' });
          }
        });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleExportCSV = () => {
    const headers = ['客戶名稱', '聯絡電話', '生日', '累積購課堂數', '總消費金額', '購買次數', '平均單價', '備註'];
    const rows = customers.map(c => {
      const stats = getCustomerStats(c.purchases);
      return [
        `"${c.name || ''}"`,
        `"${c.phone || ''}"`,
        `"${c.birthday || ''}"`,
        stats.totalSessions,
        stats.totalSpent,
        stats.purchaseCount,
        stats.avgPrice,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ];
    });
    
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `顧客總表_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortHeader = (title, key, align = 'left') => {
    const isActive = sortConfig.key === key;
    return (
      <th 
        className={`p-4 font-semibold cursor-pointer hover:bg-gray-200 transition-colors text-${align} group select-none`}
        onClick={() => handleSort(key)}
        title={`點擊以${isActive && sortConfig.direction === 'asc' ? '降冪' : '升冪'}排序`}
      >
        <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
          {title}
          <span className="text-gray-400 group-hover:text-gray-600 transition-opacity">
            {isActive ? (
              sortConfig.direction === 'asc' 
                ? <ArrowUp className="w-4 h-4 text-indigo-600" /> 
                : <ArrowDown className="w-4 h-4 text-indigo-600" />
            ) : (
              <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-100" />
            )}
          </span>
        </div>
      </th>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans tracking-tight">
      <header className="bg-indigo-600 text-white shadow-md py-4 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            <h1 className="text-xl font-bold tracking-wider">顧客課程紀錄系統</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
            <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-full font-semibold hover:bg-indigo-50 transition-colors shadow-sm" title="請上傳 .csv 檔案"><Upload className="w-4 h-4" />匯入</button>
            <button onClick={handleExportCSV} className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-full font-semibold hover:bg-indigo-50 transition-colors shadow-sm"><Download className="w-4 h-4" />匯出</button>
            <button onClick={handleOpenAddCustomer} className="flex items-center gap-2 bg-white text-indigo-600 px-4 py-2 rounded-full font-semibold hover:bg-indigo-50 transition-colors shadow-sm sm:ml-2"><UserPlus className="w-4 h-4" />新增</button>
            
            {/* 一鍵清空按鈕：只有在有資料時才顯示，避免誤觸，使用醒目的紅色邊框與字體 */}
            {customers.length > 0 && (
              <button 
                onClick={handleClearAllCustomers} 
                className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-full font-semibold hover:bg-red-100 transition-colors shadow-sm"
                title="清空系統所有資料"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">總顧客數</p>
              <p className="text-xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{totalCustomersCount} <span className="text-sm font-normal text-gray-500">人</span></p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-full"><BookOpen className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">系統總售出堂數</p>
              <p className="text-xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{totalSessionsCount} <span className="text-sm font-normal text-gray-500">堂</span></p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-full"><DollarSign className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-gray-500 font-medium">系統總營業額</p>
              <p className="text-xl font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
          <div className="bg-indigo-50 p-5 rounded-xl shadow-sm border border-indigo-100 flex items-center gap-4">
            <div className="p-3 bg-indigo-200 text-indigo-700 rounded-full"><Calculator className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-indigo-700 font-medium">篩選人數 / 堂數</p>
              <p className="text-lg font-bold text-indigo-900" style={{ fontVariantNumeric: 'tabular-nums' }}>{filteredCustomersCount} 人 / {filteredSessionsCount} 堂</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
            <input type="text" placeholder="搜尋顧客名稱..." className="pl-10 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <Filter className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">篩選購課超過：</label>
            <input type="number" min="0" className="w-20 p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-center" value={minSessions} onChange={(e) => setMinSessions(Number(e.target.value))} />
            <span className="text-sm text-gray-600">堂</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse whitespace-nowrap">
              <thead className="bg-gray-100 text-gray-700 text-sm border-b border-gray-200">
                <tr>
                  {renderSortHeader('客戶名稱', 'name', 'center')}
                  <th className="p-4 font-semibold">聯絡電話</th>
                  {renderSortHeader('生日 (年齡)', 'age', 'center')}
                  {renderSortHeader('累積堂數', 'totalSessions', 'center')}
                  {renderSortHeader('總消費', 'totalSpent', 'center')}
                  {renderSortHeader('購買次數', 'purchaseCount', 'center')}
                  {renderSortHeader('平均單價', 'avgPrice', 'center')}
                  <th className="p-4 font-semibold text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm font-medium">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => {
                    const stats = getCustomerStats(customer.purchases);
                    return (
                      <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-gray-900">{customer.name}</div>
                          {customer.notes && <div className="text-xs text-gray-400 mt-1 truncate max-w-[120px] mx-auto" title={customer.notes}>{customer.notes}</div>}
                        </td>
                        <td className="p-4 text-gray-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{customer.phone || '-'}</td>
                        <td className="p-4 text-gray-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {customer.birthday ? `${customer.birthday} (${calculateAge(customer.birthday)}歲)` : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold bg-indigo-100 text-indigo-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {stats.totalSessions} 堂
                          </span>
                        </td>
                        <td className="p-4 text-blue-600 font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          ${stats.totalSpent.toLocaleString()}
                        </td>
                        <td className="p-4 text-center text-gray-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {stats.purchaseCount} 次
                        </td>
                        <td className="p-4 text-gray-500 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          ${stats.avgPrice.toLocaleString()} / 堂
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleOpenAddSession(customer)} className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 transition-colors text-xs font-bold border border-emerald-200" title="新增購買堂數"><Plus className="w-3.5 h-3.5" />買課</button>
                            <button onClick={() => handleOpenHistory(customer)} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-xs font-bold border border-blue-200" title="查看購買明細"><History className="w-3.5 h-3.5" />明細</button>
                            <button onClick={() => handleOpenEditCustomer(customer)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="編輯基本資料"><Edit className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteCustomer(customer.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="刪除顧客"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="8" className="p-8 text-center text-gray-400 italic">找不到符合條件的顧客資料。</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal: 新增/編輯顧客 */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 p-4 text-white"><h2 className="text-xl font-bold">{editingCustomer ? '編輯顧客資料' : '新增顧客資料'}</h2></div>
            <form onSubmit={handleSaveCustomer} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客戶名稱 <span className="text-red-500">*</span></label>
                  <input required type="text" className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">聯絡電話</label>
                    <input type="tel" className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">生日</label>
                    <input type="date" className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" value={formData.birthday} onChange={e => setFormData({...formData, birthday: e.target.value})} />
                  </div>
                </div>
                {!editingCustomer && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <p className="text-xs text-gray-500 mb-2">可選填：直接建立第一筆購課紀錄</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">初始堂數</label>
                        <input type="number" min="0" className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" value={formData.initialSessions} onChange={e => setFormData({...formData, initialSessions: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">初始總金額</label>
                        <input type="number" min="0" className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" value={formData.initialPrice} onChange={e => setFormData({...formData, initialPrice: e.target.value})} />
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                  <textarea rows="2" className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">儲存資料</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 购买新课程 */}
      {isSessionModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="bg-emerald-600 p-4 text-white"><h2 className="text-xl font-bold flex items-center gap-2"><Plus className="w-5 h-5"/> 新增購買紀錄</h2></div>
            <form onSubmit={handleSaveSessions} className="p-6">
              <p className="mb-4 text-gray-700">正在為 <strong>{editingCustomer.name}</strong> 登錄新課程。</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">購買日期</label>
                  <input required type="date" className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">本次購買堂數</label>
                    <div className="flex items-center gap-1">
                      <input required type="number" min="1" className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 text-center" value={sessionToAdd} onChange={e => setSessionToAdd(e.target.value)} />
                      <span className="text-sm text-gray-600">堂</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">本次總消費金</label>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-600">$</span>
                      <input required type="number" min="0" placeholder="0" className="w-full p-2 border border-gray-300 rounded-md focus:ring-emerald-500 text-center" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded border border-gray-200 mt-2">
                  <p className="text-sm text-gray-600 text-center">本次單價約： <span className="font-bold text-gray-800" style={{ fontVariantNumeric: 'tabular-nums' }}>${sessionToAdd && purchasePrice ? Math.round(purchasePrice / sessionToAdd).toLocaleString() : 0}</span> / 堂</p>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsSessionModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors">取消</button>
                <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors">確認結帳</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: 查看购买明细 */}
      {isHistoryModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2"><History className="w-5 h-5"/> {editingCustomer.name} 的購買明細</h2>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-blue-100 hover:text-white transition-colors text-xl font-bold">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto">
              {editingCustomer.purchases && editingCustomer.purchases.length > 0 ? (
                <div className="space-y-3">
                  {[...editingCustomer.purchases].sort((a, b) => new Date(b.date) - new Date(a.date)).map((purchase, index) => (
                    <div key={purchase.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center bg-gray-50 hover:bg-white transition-colors">
                      <div>
                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">第 {editingCustomer.purchases.length - index} 次購買</span>
                          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{purchase.date}</span>
                        </p>
                        <p className="text-sm text-gray-600 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          購買 <span className="font-bold text-indigo-600">{purchase.sessions}</span> 堂 / 花費 <span className="font-bold text-amber-600">${purchase.price.toLocaleString()}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          換算單價：${Math.round(purchase.price / purchase.sessions).toLocaleString()}
                        </p>
                      </div>
                      <button onClick={() => handleDeletePurchase(editingCustomer.id, purchase.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="刪除此筆紀錄"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500"><BookOpen className="w-12 h-12 mx-auto text-gray-300 mb-2" /><p>目前沒有任何購買紀錄</p></div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
               {(() => {
                 const stats = getCustomerStats(editingCustomer.purchases);
                 return (
                   <div className="text-sm text-gray-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                     總計：<span className="font-bold text-gray-800">{stats.totalSessions} 堂</span> / 累積消費：<span className="font-bold text-gray-800">${stats.totalSpent.toLocaleString()}</span>
                   </div>
                 );
               })()}
              <button type="button" onClick={() => setIsHistoryModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors">關閉視窗</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: 自订确认对话框 */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <h3 className="text-lg font-bold text-gray-900 mb-3">請確認操作</h3>
            <p className="text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => setConfirmDialog({ isOpen: false, message: '', onConfirm: null, confirmText: '確定', confirmStyle: 'danger' })} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors font-medium">取消</button>
              <button onClick={confirmDialog.onConfirm} className={`px-4 py-2 text-white rounded-md transition-colors font-medium ${confirmDialog.confirmStyle === 'primary' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-red-600 hover:bg-red-700'}`}>{confirmDialog.confirmText}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
