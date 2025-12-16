// --- 全局變數 ---
let records = [];
let currentAmountStr = '0'; 
let editingId = null; 
let currentCategory = '';

// --- 初始化 ---
window.onload = function() {
    const savedData = localStorage.getItem('myMoneyRecordsV4'); 
    if (savedData) {
        records = JSON.parse(savedData);
    }
    initElements();
    
    // 根據目前的 Tab 決定渲染哪一頁
    if (document.getElementById('tab-home').classList.contains('active')) {
        renderHome();
    } else {
        renderHistory();
    }
};

// 統一抓取 DOM 元素
let modal, displayEl, noteEl, modalTitle, btnConfirm, btnDelete;
function initElements() {
    modal = document.getElementById('inputModal');
    displayEl = document.getElementById('displayNum');
    noteEl = document.getElementById('noteInput');
    modalTitle = document.getElementById('modalTitle');
    btnConfirm = document.getElementById('btnConfirm');
    btnDelete = document.getElementById('btnDelete');
}

// --- 核心工具：統一日期格式 (解決手機相容性問題) ---
// 輸入：毫秒數 (Timestamp) -> 輸出："2025/12/16"
function getFormattedDate(timestamp) {
    const d = new Date(timestamp);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// --- Tab 切換邏輯 ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');

    if (tabName === 'home') renderHome();
    else renderHistory();
}

// --- 渲染：首頁 (只顯示今天) ---
function renderHome() {
    const homeList = document.getElementById('homeList');
    const todayTotalEl = document.getElementById('todayTotal');
    
    // 取得「今天」的標準字串 (例如 "2025/12/16")
    const todayStr = getFormattedDate(Date.now());
    
    homeList.innerHTML = '';
    let todaySum = 0;

    // 比對每一筆紀錄的 ID (時間戳) 是否屬於今天
    const todayRecords = records.filter(r => {
        return getFormattedDate(r.id) === todayStr;
    });

    todayRecords.forEach(r => {
        todaySum += r.amount;
        homeList.appendChild(createLogItem(r));
    });

    todayTotalEl.textContent = todaySum.toLocaleString();
}

// --- 渲染：歷史頁 (顯示所有紀錄，包含今天) ---
function renderHistory() {
    const container = document.getElementById('historyListContainer');
    container.innerHTML = '';

    if (records.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">尚無紀錄</div>';
        return;
    }

    // 1. 排序：新的在上面
    records.sort((a, b) => b.id - a.id);

    // 2. 分組邏輯
    let lastDateStr = '';
    let currentUl = null;

    records.forEach(r => {
        // 使用統一格式轉換日期
        const dateStr = getFormattedDate(r.id);

        // 如果換了一天 (或是第一筆)，就建立標題
        if (dateStr !== lastDateStr) {
            
            // 計算該日總合
            const dailyTotal = records
                .filter(item => getFormattedDate(item.id) === dateStr)
                .reduce((sum, item) => sum + item.amount, 0);

            // 建立日期標題
            const header = document.createElement('div');
            header.className = 'history-date-header';
            header.innerHTML = `
                <span>📅 ${dateStr}</span>
                <span class="daily-total">$${dailyTotal.toLocaleString()}</span>
            `;
            container.appendChild(header);

            // 建立該日的清單容器
            currentUl = document.createElement('ul');
            currentUl.className = 'log-list';
            currentUl.style.background = 'white';
            container.appendChild(currentUl);

            lastDateStr = dateStr;
        }

        // 加入單筆紀錄
        if (currentUl) {
            currentUl.appendChild(createLogItem(r));
        }
    });
}

// 輔助：建立列表項目 UI
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
            id: Date.now(), // 這是核心，使用當下時間戳記
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
    // 根據當前頁面刷新
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
    link.download = `money_log_${getFormattedDate(Date.now()).replace(/\//g, '')}.csv`;
    document.body.appendChild(link); 
    link.click();
}

// 點擊背景關閉 Modal
window.onclick = function(e) {
    if (e.target === document.getElementById('inputModal')) {
        closeModal();
    }
}
