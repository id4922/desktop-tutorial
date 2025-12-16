// --- 全局變數 ---
let records = [];
let categories = []; // 存放按鈕列表
let currentAmountStr = '0'; 
let editingId = null; 
let currentCategory = '';
let isEditMode = false; // 是否在自定義模式
let sortableInstance = null; // Sortable 實例

// 預設按鈕 (第一次使用時)
const DEFAULT_CATEGORIES = ["早餐", "午餐", "晚餐", "咖啡", "飲料", "點心", "交通", "雜支", "其他"];

// --- 初始化 ---
window.onload = function() {
    // 1. 讀取記帳資料
    const savedData = localStorage.getItem('myMoneyRecordsV4'); 
    if (savedData) records = JSON.parse(savedData);

    // 2. 讀取按鈕設定
    const savedCats = localStorage.getItem('myCategoriesV1');
    if (savedCats) {
        categories = JSON.parse(savedCats);
    } else {
        categories = [...DEFAULT_CATEGORIES]; // 複製預設值
    }

    initElements();
    
    // 3. 渲染按鈕與畫面
    renderCategories();
    renderHome();
};

let modal, displayEl, noteEl, modalTitle, btnConfirm, btnDelete, categoryGrid, btnToggleEdit;

function initElements() {
    modal = document.getElementById('inputModal');
    displayEl = document.getElementById('displayNum');
    noteEl = document.getElementById('noteInput');
    modalTitle = document.getElementById('modalTitle');
    btnConfirm = document.getElementById('btnConfirm');
    btnDelete = document.getElementById('btnDelete');
    categoryGrid = document.getElementById('categoryGrid');
    btnToggleEdit = document.getElementById('btnToggleEdit');
}

// --- 核心工具：統一日期格式 ---
function getFormattedDate(timestamp) {
    const d = new Date(timestamp);
    return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
}

// --- 按鈕管理 (CRUD + 拖曳) ---

// 渲染所有按鈕
function renderCategories() {
    categoryGrid.innerHTML = '';
    
    // 1. 渲染現有的類別按鈕
    categories.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.textContent = cat;
        
        // 點擊事件：依據模式不同而行為不同
        btn.onclick = () => handleCategoryClick(cat, index);
        
        categoryGrid.appendChild(btn);
    });

    // 2. 如果是編輯模式，最後多加一個「新增」按鈕
    if (isEditMode) {
        const addBtn = document.createElement('button');
        addBtn.className = 'cat-btn btn-add-cat';
        addBtn.textContent = '+';
        addBtn.onclick = addNewCategory;
        categoryGrid.appendChild(addBtn);
    }

    // 3. 重新綁定/更新 Sortable 狀態
    setupSortable();
}

// 點擊按鈕處理
function handleCategoryClick(cat, index) {
    if (isEditMode) {
        // 編輯模式：修改或刪除
        const action = prompt(`編輯類別：「${cat}」\n\n1. 修改名稱\n2. 刪除此類別\n\n請輸入 1 或 2，或按取消`, "1");
        if (action === "1") {
            const newName = prompt("請輸入新名稱：", cat);
            if (newName && newName.trim()) {
                categories[index] = newName.trim();
                saveCategories();
            }
        } else if (action === "2") {
            if (confirm(`確定要刪除「${cat}」嗎？`)) {
                categories.splice(index, 1);
                saveCategories();
            }
        }
    } else {
        // 正常模式：記帳
        openModal(cat);
    }
}

// 新增類別
function addNewCategory() {
    const name = prompt("請輸入新類別名稱：");
    if (name && name.trim()) {
        categories.push(name.trim());
        saveCategories();
    }
}

// 切換編輯模式
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    if (isEditMode) {
        btnToggleEdit.textContent = "✅ 完成設定";
        btnToggleEdit.style.background = "#fff8e1";
        btnToggleEdit.style.borderColor = "#ffb74d";
        categoryGrid.classList.add('edit-mode');
    } else {
        btnToggleEdit.textContent = "⚙️ 自定義按鈕";
        btnToggleEdit.style.background = "";
        btnToggleEdit.style.borderColor = "";
        categoryGrid.classList.remove('edit-mode');
    }
    renderCategories();
}

// 設定拖曳功能 (使用 SortableJS)
function setupSortable() {
    // 如果已經有實例，先銷毀避免重複
    if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
    }

    // 只有在編輯模式下才允許拖曳
    sortableInstance = new Sortable(categoryGrid, {
        animation: 150,
        disabled: !isEditMode, // 非編輯模式禁止拖曳
        filter: '.btn-add-cat', // 新增按鈕不可拖曳
        ghostClass: 'sortable-ghost', // 拖曳時的殘影樣式
        onEnd: function (evt) {
            // 拖曳結束後，同步更新 JS 陣列順序
            // 這裡有點技巧：因為 DOM 已經變了，我們只需把 "被拖曳的項目" 移動到新索引
            // 但 Sortable 會包含 '+', 所以要小心計算
            
            const item = categories.splice(evt.oldIndex, 1)[0];
            categories.splice(evt.newIndex, 0, item);
            saveCategories(false); // 儲存但不需重新渲染 (因為 DOM 已經換位了)
        }
    });
}

function saveCategories(shouldRender = true) {
    localStorage.setItem('myCategoriesV1', JSON.stringify(categories));
    if (shouldRender) renderCategories();
}


// --- Tab 與 記帳邏輯 (同 V5.2) ---
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tabName}`).classList.add('active');
    if (tabName === 'home') renderHome();
    else renderHistory();
}

function renderHome() {
    const homeList = document.getElementById('homeList');
    const todayTotalEl = document.getElementById('todayTotal');
    const todayStr = getFormattedDate(Date.now());
    
    homeList.innerHTML = '';
    let todaySum = 0;
    const todayRecords = records.filter(r => getFormattedDate(r.id) === todayStr);

    todayRecords.forEach(r => {
        todaySum += r.amount;
        homeList.appendChild(createLogItem(r));
    });
    todayTotalEl.textContent = todaySum.toLocaleString();
}

function renderHistory() {
    const container = document.getElementById('historyListContainer');
    container.innerHTML = '';
    if (records.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; margin-top:20px;">尚無紀錄</div>';
        return;
    }
    records.sort((a, b) => b.id - a.id);

    let lastDateStr = '';
    let currentUl = null;
    records.forEach(r => {
        const dateStr = getFormattedDate(r.id);
        if (dateStr !== lastDateStr) {
            const dailyTotal = records.filter(item => getFormattedDate(item.id) === dateStr).reduce((sum, item) => sum + item.amount, 0);
            const header = document.createElement('div');
            header.className = 'history-date-header';
            header.innerHTML = `<span>📅 ${dateStr}</span><span class="daily-total">$${dailyTotal.toLocaleString()}</span>`;
            container.appendChild(header);
            currentUl = document.createElement('ul');
            currentUl.className = 'log-list';
            currentUl.style.background = 'white';
            container.appendChild(currentUl);
            lastDateStr = dateStr;
        }
        if (currentUl) currentUl.appendChild(createLogItem(r));
    });
}

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

// --- Modal 邏輯 ---
function openModal(category) {
    editingId = null; currentCategory = category; currentAmountStr = '0'; noteEl.value = '';
    modalTitle.textContent = `記一筆：${category}`; btnConfirm.textContent = "確認記錄"; btnDelete.style.display = 'none';
    updateDisplay(); modal.style.display = 'flex';
}

function openEditModal(id) {
    const r = records.find(item => item.id === id);
    if (!r) return;
    editingId = id; currentCategory = r.pureCategory || r.category.split(' (')[0]; currentAmountStr = r.amount.toString();
    const match = r.category.match(/\((.*)\)/); noteEl.value = match ? match[1] : '';
    modalTitle.textContent = `修改：${r.pureCategory || r.category}`; btnConfirm.textContent = "保存修改"; btnDelete.style.display = 'block';
    updateDisplay(); modal.style.display = 'flex';
}

function closeModal() { modal.style.display = 'none'; }
function pressNum(key) {
    if (key === 'DEL') currentAmountStr = currentAmountStr.length > 1 ? currentAmountStr.slice(0, -1) : '0';
    else if (key === '00') { if (currentAmountStr !== '0' && currentAmountStr.length < 8) currentAmountStr += '00'; }
    else { if (currentAmountStr.length >= 9) return; currentAmountStr = currentAmountStr === '0' ? key : currentAmountStr + key; }
    updateDisplay();
}
function updateDisplay() { displayEl.textContent = parseInt(currentAmountStr).toLocaleString(); }

function confirmRecord() {
    const amount = parseInt(currentAmountStr);
    if (amount === 0) return alert("金額不能為 0");
    const note = noteEl.value.trim();
    const displayCategory = note ? `${currentCategory} (${note})` : currentCategory;
    
    if (editingId) {
        const idx = records.findIndex(r => r.id === editingId);
        if (idx !== -1) { records[idx].amount = amount; records[idx].category = displayCategory; }
    } else {
        const now = new Date();
        records.unshift({
            id: Date.now(), timestamp: now.toLocaleString(), timeDisplay: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
            category: displayCategory, pureCategory: currentCategory, amount: amount
        });
    }
    saveAndRefresh(); closeModal();
}

function deleteCurrentRecord() {
    if (!editingId) return;
    if (confirm("確定刪除？")) { records = records.filter(r => r.id !== editingId); saveAndRefresh(); closeModal(); }
}

function saveAndRefresh() {
    localStorage.setItem('myMoneyRecordsV4', JSON.stringify(records));
    if (document.getElementById('tab-home').classList.contains('active')) renderHome();
    else renderHistory();
}

function clearAllData() { if(confirm("確定清空所有資料？")) { records = []; saveAndRefresh(); } }
function exportCSV() {
    if(records.length === 0) return alert("無資料");
    let csv = "data:text/csv;charset=utf-8,\uFEFF時間,項目,金額\n";
    records.forEach(r => csv += `${r.timestamp},${r.category},${r.amount}\n`);
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `money_log_${getFormattedDate(Date.now()).replace(/\//g,'')}.csv`;
    document.body.appendChild(link); link.click();
}
window.onclick = function(e) { if (e.target === document.getElementById('inputModal')) closeModal(); }
