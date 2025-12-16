// --- 資料結構 ---
let records = [];
let categories = []; 
let bgStyle = "linear-gradient(135deg, #e0f7fa 0%, #80cbc4 100%)"; // 預設漸層綠

// --- 顏色庫 (粉色系與漸層) ---
const BTN_COLORS = [
    { val: "white", label: "簡約白" },
    { val: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)", label: "櫻花粉" },
    { val: "linear-gradient(135deg, #f8bbd0 0%, #f48fb1 100%)", label: "甜心粉" },
    { val: "linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%)", label: "珊瑚紅" },
    { val: "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", label: "奶油橘" },
    { val: "linear-gradient(135deg, #e1bee7 0%, #ce93d8 100%)", label: "粉紫色" },
    { val: "linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)", label: "天空藍" },
    { val: "linear-gradient(135deg, #e0f2f1 0%, #80cbc4 100%)", label: "薄荷綠" }
];

const BG_STYLES = [
    "linear-gradient(135deg, #e0f7fa 0%, #80cbc4 100%)", // 漸層綠
    "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)", // 漸層粉
    "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)", // 漸層橘
    "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)", // 漸層藍
    "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)", // 漸層紫
    "#f0f2f5" // 簡約灰
];

// --- 狀態變數 ---
let currentAmountStr = '0'; 
let editingRecordId = null; 
let currentCategoryName = ''; 
let isEditMode = false;
let editingCatIndex = null; 

// --- 初始化 ---
window.onload = function() {
    // 1. 讀取紀錄
    const savedData = localStorage.getItem('myMoneyRecordsV4'); 
    if (savedData) records = JSON.parse(savedData);

    // 2. 讀取背景
    const savedBg = localStorage.getItem('myBgStyle');
    if (savedBg) bgStyle = savedBg;
    document.body.style.background = bgStyle;

    // 3. 讀取按鈕 (舊版轉新版相容)
    const savedCats = localStorage.getItem('myCategoriesV2'); 
    if (savedCats) {
        categories = JSON.parse(savedCats);
    } else {
        const oldCats = localStorage.getItem('myCategoriesV1');
        if (oldCats) {
            const oldArr = JSON.parse(oldCats);
            categories = oldArr.map(name => ({ name: name, color: "white" }));
        } else {
            const defaults = ["早餐", "午餐", "晚餐", "咖啡", "飲料", "點心", "交通", "雜支", "其他"];
            categories = defaults.map(name => ({ name: name, color: "white" }));
        }
    }

    initElements();
    renderCategories();
    renderHome();
};

let modal, displayEl, noteInput, btnConfirmRecord, btnDeleteRecord;

function initElements() {
    modal = document.getElementById('inputModal');
    displayEl = document.getElementById('displayNum');
    noteInput = document.getElementById('noteInput');
    btnConfirmRecord = document.getElementById('btnConfirmRecord');
    btnDeleteRecord = document.getElementById('btnDeleteRecord');
}

// --- 渲染按鈕區 ---
const categoryGrid = document.getElementById('categoryGrid');
let sortableInstance = null;

function renderCategories() {
    categoryGrid.innerHTML = '';

    categories.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.textContent = cat.name;
        btn.style.background = cat.color;
        
        btn.onclick = () => handleCategoryClick(index);
        categoryGrid.appendChild(btn);
    });

    if (isEditMode) {
        const addBtn = document.createElement('button');
        addBtn.className = 'cat-btn btn-add-cat';
        addBtn.textContent = '+';
        addBtn.onclick = addNewCategory;
        categoryGrid.appendChild(addBtn);
    }

    setupSortable();
}

function handleCategoryClick(index) {
    if (isEditMode) {
        openSettingsModal(index);
    } else {
        openInputModal(categories[index].name);
    }
}

function setupSortable() {
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    sortableInstance = new Sortable(categoryGrid, {
        animation: 150,
        disabled: !isEditMode,
        filter: '.btn-add-cat',
        onEnd: function (evt) {
            const item = categories.splice(evt.oldIndex, 1)[0];
            categories.splice(evt.newIndex, 0, item);
            saveCategories(false);
        }
    });
}

// --- 按鈕設定邏輯 (新功能) ---
const settingsModal = document.getElementById('settingsModal');
const settingNameInput = document.getElementById('settingNameInput');
const colorGrid = document.getElementById('colorGrid');
let tempColor = "white";

function openSettingsModal(index) {
    editingCatIndex = index;
    const cat = categories[index];
    settingNameInput.value = cat.name;
    tempColor = cat.color || "white";
    
    colorGrid.innerHTML = '';
    BTN_COLORS.forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = c.val;
        if (c.val === tempColor) swatch.classList.add('selected');
        
        swatch.onclick = () => {
            tempColor = c.val;
            document.querySelectorAll('.color-swatch').forEach(el => el.classList.remove('selected'));
            swatch.classList.add('selected');
        };
        colorGrid.appendChild(swatch);
    });

    settingsModal.style.display = 'flex';
}

function saveCategorySettings() {
    const newName = settingNameInput.value.trim();
    if (!newName) return alert("請輸入名稱");
    
    categories[editingCatIndex].name = newName;
    categories[editingCatIndex].color = tempColor;
    saveCategories();
    closeSettingsModal();
}

function deleteCategory() {
    if(confirm(`確定刪除「${categories[editingCatIndex].name}」嗎？`)) {
        categories.splice(editingCatIndex, 1);
        saveCategories();
        closeSettingsModal();
    }
}

function addNewCategory() {
    categories.push({ name: "新項目", color: "white" });
    saveCategories();
    setTimeout(() => openSettingsModal(categories.length - 1), 100);
}

function closeSettingsModal() { settingsModal.style.display = 'none'; }

function saveCategories(render = true) {
    localStorage.setItem('myCategoriesV2', JSON.stringify(categories));
    if(render) renderCategories();
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('btnToggleEdit');
    if (isEditMode) {
        btn.style.background = "#fff9c4"; 
        categoryGrid.classList.add('edit-mode');
    } else {
        btn.style.background = "white";
        categoryGrid.classList.remove('edit-mode');
    }
    renderCategories();
}

// --- 背景設定邏輯 ---
function openBgSettings() {
    const bgGrid = document.getElementById('bgGrid');
    bgGrid.innerHTML = '';
    BG_STYLES.forEach(style => {
        const div = document.createElement('div');
        div.className = 'color-swatch';
        div.style.background = style;
        div.onclick = () => {
            bgStyle = style;
            document.body.style.background = bgStyle;
            localStorage.setItem('myBgStyle', bgStyle);
            closeBgModal();
        };
        bgGrid.appendChild(div);
    });
    document.getElementById('bgModal').style.display = 'flex';
}
function closeBgModal() { document.getElementById('bgModal').style.display = 'none'; }


// --- 記帳輸入與歷史顯示 ---
function openInputModal(catName) {
    editingRecordId = null;
    currentCategoryName = catName;
    currentAmountStr = '0';
    noteInput.value = '';
    document.getElementById('modalTitle').textContent = catName;
    btnConfirmRecord.textContent = "確認";
    btnDeleteRecord.style.display = 'none';
    btnConfirmRecord.style.gridColumn = "span 2"; 
    updateDisplay();
    modal.style.display = 'flex';
}

function openEditRecord(id) {
    const r = records.find(x => x.id === id);
    if (!r) return;
    editingRecordId = id;
    currentCategoryName = r.pureCategory || r.category.split(' (')[0];
    currentAmountStr = r.amount.toString();
    const match = r.category.match(/\((.*)\)/);
    noteInput.value = match ? match[1] : '';
    document.getElementById('modalTitle').textContent = "修改紀錄";
    
    btnConfirmRecord.textContent = "儲存";
    btnDeleteRecord.style.display = 'block'; 
    btnConfirmRecord.style.gridColumn = "span 1"; 
    
    updateDisplay();
    modal.style.display = 'flex';
}

function closeModal() { modal.style.display = 'none'; }

function pressNum(k) {
    if(k==='DEL') currentAmountStr = currentAmountStr.length>1 ? currentAmountStr.slice(0,-1) : '0';
    else if(k==='00') { if(currentAmountStr!=='0' && currentAmountStr.length<8) currentAmountStr+='00'; }
    else { if(currentAmountStr.length<9) currentAmountStr = currentAmountStr==='0' ? k : currentAmountStr+k; }
    updateDisplay();
}
function updateDisplay() { displayEl.textContent = parseInt(currentAmountStr).toLocaleString(); }

function confirmRecord() {
    const amount = parseInt(currentAmountStr);
    if (amount === 0) return alert("金額不能為 0");
    const note = noteInput.value.trim();
    const finalCat = note ? `${currentCategoryName} (${note})` : currentCategoryName;
    
    if (editingRecordId) {
        const idx = records.findIndex(x => x.id === editingRecordId);
        if (idx !== -1) { records[idx].amount = amount; records[idx].category = finalCat; }
    } else {
        const now = new Date();
        records.unshift({
            id: Date.now(),
            timestamp: now.toLocaleString(),
            timeDisplay: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`,
            category: finalCat,
            pureCategory: currentCategoryName,
            amount: amount
        });
    }
    saveRecords();
    closeModal();
}

function deleteCurrentRecord() {
    if(confirm("刪除此筆紀錄？")) {
        records = records.filter(x => x.id !== editingRecordId);
        saveRecords();
        closeModal();
    }
}

// --- 系統功能 ---
function getFormattedDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
}

function renderHome() {
    const list = document.getElementById('homeList');
    const totalEl = document.getElementById('todayTotal');
    const todayStr = getFormattedDate(Date.now());
    list.innerHTML = '';
    let sum = 0;
    records.filter(r => getFormattedDate(r.id) === todayStr).forEach(r => {
        sum += r.amount;
        list.appendChild(createLogItem(r));
    });
    totalEl.textContent = sum.toLocaleString();
}

function renderHistory() {
    const container = document.getElementById('historyListContainer');
    container.innerHTML = '';
    if (records.length === 0) { container.innerHTML = '<div style="text-align:center;color:#999;margin-top:20px;">無資料</div>'; return; }
    
    records.sort((a,b) => b.id - a.id);
    let lastDate = '';
    let ul = null;
    
    records.forEach(r => {
        const dStr = getFormattedDate(r.id);
        if (dStr !== lastDate) {
            const daySum = records.filter(x => getFormattedDate(x.id) === dStr).reduce((a,b)=>a+b.amount,0);
            const header = document.createElement('div');
            header.className = 'history-date-header';
            header.innerHTML = `<span>📅 ${dStr}</span><span class="daily-total">$${daySum.toLocaleString()}</span>`;
            container.appendChild(header);
            ul = document.createElement('ul');
            ul.className = 'log-list';
            ul.style.background = 'white';
            container.appendChild(ul);
            lastDate = dStr;
        }
        if (ul) ul.appendChild(createLogItem(r));
    });
}

function createLogItem(r) {
    const li = document.createElement('li');
    li.className = 'log-item';
    li.onclick = () => openEditRecord(r.id);
    li.innerHTML = `
        <div class="log-info">
            <span class="log-time">${r.timeDisplay}</span>
            <span class="log-cat">${r.category}</span>
        </div>
        <span class="log-money">$${r.amount}</span>
    `;
    return li;
}

function saveRecords() {
    localStorage.setItem('myMoneyRecordsV4', JSON.stringify(records));
    if(document.getElementById('tab-home').style.display !== 'none') renderHome();
    else renderHistory();
}

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    document.getElementById(`tab-${t}`).style.display = 'block';
    document.getElementById(`nav-${t}`).classList.add('active');
    if(t==='home') renderHome(); else renderHistory();
}

function exportCSV() {
    if(records.length===0) return alert("無資料");
    let csv = "data:text/csv;charset=utf-8,\uFEFF時間,項目,金額\n";
    records.forEach(r => csv += `${r.timestamp},${r.category},${r.amount}\n`);
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `money_log_${Date.now()}.csv`;
    document.body.appendChild(link); link.click();
}

function clearAllData() { if(confirm("清空所有資料？")) { records=[]; saveRecords(); } }

window.onclick = function(e) {
    if(e.target.classList.contains('modal-overlay')) e.target.style.display = 'none';
}
