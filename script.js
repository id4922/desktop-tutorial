// --- 全局變數 ---
let records = [];
let currentAmountStr = '0'; 
let editingId = null; 
let currentCategory = '';

// --- 初始化 ---
window.onload = function() {
    // 讀取 V4/V5 的資料 (如果資料庫名稱要改，記得這裡也要改)
    const savedData = localStorage.getItem('myMoneyRecordsV4'); 
    if (savedData) {
        records = JSON.parse(savedData);
    }
    renderHome(); // 預設渲染首頁
};

// --- Tab 切換邏輯 ---
function switchTab(tabName) {
    // 1. 隱藏所有頁面，顯示目標頁面
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // 2. 更新按鈕狀態
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');

    // 3. 重新渲染該頁面的數據
    if (tabName === 'home') {
        renderHome();
    } else {
        renderHistory();
    }
}

// --- 渲染：首頁 (只顯示今天) ---
function renderHome() {
    const todayStr = new Date().toLocaleDateString();
    const homeList = document.getElementById('homeList');
    const todayTotalEl = document.getElementById('todayTotal');
    
    homeList.innerHTML = '';
    let todaySum = 0;

    // 篩選今天的資料
    const todayRecords = records.filter(r => new Date(r.timestamp).toLocaleDateString() === todayStr);

    todayRecords.forEach(r => {
        todaySum += r.amount;
        const li = createLogItem(r);
        homeList.appendChild(li);
    });

    todayTotalEl.textContent = todaySum.toLocaleString();
}

// --- 渲染：歷史頁 (分組顯示) ---
function renderHistory() {
    const container = document.getElementById('historyListContainer');
    container.innerHTML = '';

    if (records.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">尚無紀錄</div>';
        return;
    }

    // 資料分組邏輯
    const groups = {};
    records.forEach(r => {
        const date = new Date(r.timestamp).toLocaleDateString();
        if (!groups[date]) groups[date] = { total: 0, items: [] };
        groups[date].items.push(r);
        groups[date].total += r.amount;
    });

    // 排序日期 (假設資料大致有序，但安全起見做排序)
    const sortedDates = Object.keys(groups).sort((a,b) => new Date(b) - new Date(a));

    sortedDates.forEach(date => {
        const group = groups[date];
        
        // 標題列
        const header = document.createElement('div');
        header.className = 'history-date-header';
        header.innerHTML = `
            <span>📅 ${date}</span>
            <span class="daily-total">$${group.total.toLocaleString()}</span>
        `;
        container.appendChild(header);

        // 內容列
        const ul = document.createElement('ul');
        ul.className = 'log-list';
        ul.style.background = 'white';
        
        group.items.forEach(r => {
            ul.appendChild(createLogItem(r));
        });
        container.appendChild(ul);
    });
}

// 輔助：建立列表項目
function createLogItem(r) {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.onclick = () => openEditModal(r.id); 
    li.innerHTML = `
        <div class="log-info">
            <span class="log-time">${r.timeDisplay}</span>
            <span class="log-cat">${r.category}</span>
        </div>
        <span class="log-money">$${r.amount}</span>
    `;
    return li;
}

// --- Modal 與 輸入邏輯 ---
const modal = document.getElementById('inputModal');
const displayEl = document.getElementById('displayNum');
const noteEl = document.getElementById('noteInput');
const modalTitle = document.getElementById('modalTitle');
const btnConfirm = document.getElementById('btnConfirm');
const btnDelete = document.getElementById('btnDelete');

function openModal(category) {
    editingId = null; 
    currentCategory = category; 
    currentAmountStr = '0'; 
    noteEl.value = '';
    
    modalTitle.textContent = `記一筆：${category}`; 
    btnConfirm.textContent = "確認記錄"; 
    btnDelete.style.display = 'none';
    
    updateDisplay(); 
    modal.style.display = 'flex';
}

function openEditModal(id) {
    const r = records.find(item => item.id === id);
    if (!r) return;
    
    editingId = id; 
    currentCategory = r.pureCategory || r.category.split(' (')[0]; 
    currentAmountStr = r.amount.toString();
    
    const match = r.category.match(/\((.*)\)/); 
    noteEl.value = match ? match[1] : '';
    
    modalTitle.textContent = `修改：${r.pureCategory || r.category}`; 
    btnConfirm.textContent = "保存修改"; 
    btnDelete.style.display = 'block';
    
    updateDisplay(); 
    modal.style.display = 'flex';
}

function closeModal() { modal.style.display = 'none'; }

function pressNum(key) {
    if (key === 'DEL') {
        currentAmountStr = currentAmountStr.length > 1 ? currentAmountStr.slice(0, -1) : '0';
    } else if (key === '00') { 
        if (currentAmountStr !== '0' && currentAmountStr.length < 8) currentAmountStr += '00'; 
    } else { 
        if (currentAmountStr.length >= 9) return; 
        currentAmountStr = currentAmountStr === '0' ? key : currentAmountStr + key; 
    }
    updateDisplay();
}

function updateDisplay() { displayEl.textContent = parseInt(currentAmountStr).toLocaleString(); }

function confirmRecord() {
    const amount = parseInt(currentAmountStr);
    if (amount === 0) return alert("金額不能為 0");
    
    const note = noteEl.value.trim();
    const displayCategory = note ? `${currentCategory} (${note})` : currentCategory;
    
    if (editingId) {
        // 修改
        const idx = records.findIndex(r => r.id === editingId);
        if (idx !== -1) { 
            records[idx].amount = amount; 
            records[idx].category = displayCategory; 
        }
    } else {
        // 新增
        const now = new Date();
        records.unshift({
            id: Date.now(), 
            timestamp: now.toLocaleString(), 
            timeDisplay: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
            category: displayCategory, 
            pureCategory: currentCategory, 
            amount: amount
        });
    }
    saveAndRefresh();
    closeModal();
}

function deleteCurrentRecord() {
    if (!editingId) return;
    if (confirm("確定刪除？")) { 
        records = records.filter(r => r.id !== editingId); 
        saveAndRefresh(); 
        closeModal(); 
    }
}

// --- 系統功能 ---
function saveAndRefresh() {
    localStorage.setItem('myMoneyRecordsV4', JSON.stringify(records));
    // 判斷目前在哪個頁面就刷新哪個，避免切換
    if (document.getElementById('tab-home').classList.contains('active')) {
        renderHome();
    } else {
        renderHistory();
    }
}

function clearAllData() { 
    if(confirm("確定清空所有資料？此動作無法復原！")) { 
        records = []; 
        saveAndRefresh(); 
    } 
}

function exportCSV() {
    if(records.length === 0) return alert("無資料");
    let csv = "data:text/csv;charset=utf-8,\uFEFF時間,項目,金額\n";
    records.forEach(r => csv += `${r.timestamp},${r.category},${r.amount}\n`);
    const link = document.createElement("a"); 
    link.href = encodeURI(csv);
    link.download = `money_log_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link); 
    link.click();
}

// 點擊背景關閉 Modal
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
