// --- script.js ---
let records = [];
let categories = []; 
let bgStyle = "linear-gradient(135deg, #e0f7fa 0%, #80cbc4 100%)"; 

// --- 精選 16 色 (粉色系為主，按鈕與背景共用) ---
const THEME_COLORS = [
    // 1. 基礎淺色
    { val: "white", label: "簡約白" },
    { val: "#fff9c4", label: "奶油黃" },
    { val: "#e1bee7", label: "淡紫" },
    { val: "#b2dfdb", label: "薄荷" },

    // 2. 主打粉色系
    { val: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)", label: "櫻花粉" },
    { val: "linear-gradient(135deg, #f8bbd0 0%, #f48fb1 100%)", label: "甜心粉" },
    { val: "linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%)", label: "珊瑚紅" },
    { val: "linear-gradient(135deg, #ff80ab 0%, #ff4081 100%)", label: "亮桃紅" },

    // 3. 暖色與對比
    { val: "linear-gradient(135deg, #ffe0b2 0%, #ffb74d 100%)", label: "暖橘" },
    { val: "linear-gradient(135deg, #d7ccc8 0%, #a1887f 100%)", label: "可可" },
    { val: "#ff5252", label: "警示紅" },
    { val: "#333333", label: "酷黑" },

    // 4. 冷色系
    { val: "linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)", label: "天空藍" },
    { val: "linear-gradient(135deg, #9fa8da 0%, #5c6bc0 100%)", label: "靛青" },
    { val: "linear-gradient(135deg, #80cbc4 0%, #009688 100%)", label: "湖水綠" },
    { val: "linear-gradient(135deg, #b39ddb 0%, #7e57c2 100%)", label: "深紫" }
];

let currentAmountStr = '0'; 
let editingRecordId = null; 
let currentCategoryName = ''; 
let isEditMode = false;
let editingCatIndex = null; 

// --- 初始化 ---
window.onload = function() {
    initElements(); 

    const savedData = localStorage.getItem('myMoneyRecordsV4'); 
    if (savedData) records = JSON.parse(savedData);

    const savedBg = localStorage.getItem('myBgStyle');
    if (savedBg) {
        bgStyle = savedBg;
        document.body.style.background = bgStyle;
    }

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

    renderCategories();
    renderHome();
};

let modal, displayEl, noteInput, btnConfirmRecord, btnDeleteRecord;
let settingsModal, settingNameInput, colorGrid, bgModal;

function initElements() {
    modal = document.getElementById('inputModal');
    displayEl = document.getElementById('displayNum');
    noteInput = document.getElementById('noteInput');
    btnConfirmRecord = document.getElementById('btnConfirmRecord');
    btnDeleteRecord = document.getElementById('btnDeleteRecord');
    
    settingsModal = document.getElementById('settingsModal');
    settingNameInput = document.getElementById('settingNameInput');
    colorGrid = document.getElementById('colorGrid');
    bgModal = document.getElementById('bgModal');
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
        
        // 文字顏色對比
        if (cat.color.includes("#333") || cat.color.includes("linear") || cat.color === "#ff5252") {
            if (cat.color.includes("linear") || cat.color === "#ff5252") {
                 btn.style.color = "#444"; 
                 btn.style.fontWeight = "bold";
                 btn.style.textShadow = "0 1px 0 rgba(255,255,255,0.4)";
            }
            if (cat.color === "#333333") {
                btn.style.color = "white"; btn.style.textShadow = "none";
            }
        }

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
    if (isEditMode) openSettingsModal(index);
    else openInputModal(categories[index].name);
}

function setupSortable() {
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    sortableInstance = new Sortable(categoryGrid, {
        animation: 150, disabled: !isEditMode, filter: '.btn-add-cat',
        onEnd: function (evt) {
            const item = categories.splice(evt.oldIndex, 1)[0];
            categories.splice(evt.newIndex, 0, item);
            saveCategories(false);
        }
    });
}

// --- 設定邏輯 (16色共用) ---
let tempColor = "white";

// 產生色票的通用函式
function renderColorGrid(targetGrid, onClickCallback, selectedColor) {
    targetGrid.innerHTML = '';
    THEME_COLORS.forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = c.val;
        if (c.val === selectedColor) swatch.classList.add('selected');
        swatch.onclick = () => {
            // 清除選取樣式
            Array.from(targetGrid.children).forEach(child => child.classList.remove('selected'));
            swatch.classList.add('selected');
            onClickCallback(c.val);
        };
        targetGrid.appendChild(swatch);
    });
}

function openSettingsModal(index) {
    editingCatIndex = index;
    const cat = categories[index];
    settingNameInput.value = cat.name;
    tempColor = cat.color || "white";
    
    // 渲染按鈕色票
    renderColorGrid(colorGrid, (val) => { tempColor = val; }, tempColor);
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
    if(confirm(`確定要刪除「${categories[editingCatIndex].name}」嗎？`)) {
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

// --- 背景設定 ---
function openBgSettings() {
    const bgGrid = document.getElementById('bgGrid');
    // 使用相同的 16 色渲染背景選單
    renderColorGrid(bgGrid, (val) => {
        bgStyle = val;
        document.body.style.background = bgStyle;
        localStorage.setItem('myBgStyle', bgStyle);
        closeBgModal();
    }, bgStyle);
    
    document.getElementById('bgModal').style.display = 'flex';
}
function closeBgModal() { document.getElementById('bgModal').style.display = 'none'; }

// --- 記帳輸入邏輯 ---
function openInputModal(catName) {
    editingRecordId = null; currentCategoryName = catName; currentAmountStr = '0'; noteInput.value = '';
    document.getElementById('modalTitle').textContent = catName;
    btnConfirmRecord.textContent = "確認"; btnDeleteRecord.style.display = 'none'; btnConfirmRecord.style.gridColumn = "span 2"; 
    updateDisplay(); modal.style.display = 'flex';
}

function openEditRecord(id) {
    const r = records.find(x => x.id === id); if (!r) return;
    editingRecordId = id; currentCategoryName = r.pureCategory || r.category.split(' (')[0]; currentAmountStr = r.amount.toString();
    const match = r.category.match(/\((.*)\)/); noteInput.value = match ? match[1] : '';
    document.getElementById('modalTitle').textContent = "修改紀錄";
    btnConfirmRecord.textContent = "儲存"; btnDeleteRecord.style.display = 'block'; btnConfirmRecord.style.gridColumn = "span 1"; 
    updateDisplay(); modal.style.display = 'flex';
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
        records.unshift({ id: Date.now(), timestamp: now.toLocaleString(), timeDisplay: `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`, category: finalCat, pureCategory: currentCategoryName, amount: amount });
    }
    saveRecords(); closeModal();
}

function deleteCurrentRecord() {
    if(confirm("刪除此筆紀錄？")) { records = records.filter(x => x.id !== editingRecordId); saveRecords(); closeModal(); }
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
    let lastDate = ''; let ul = null;
    records.forEach(r => {
        const dStr = getFormattedDate(r.id);
        if (dStr !== lastDate) {
            const daySum = records.filter(x => getFormattedDate(x.id) === dStr).reduce((a,b)=>a+b.amount,0);
            const header = document.createElement('div');
            header.className = 'history-date-header';
            header.innerHTML = `<span>📅 ${dStr}</span><span class="daily-total">$${daySum.toLocaleString()}</span>`;
            container.appendChild(header);
            ul = document.createElement('ul'); ul.className = 'log-list'; ul.style.background = 'white'; container.appendChild(ul);
            lastDate = dStr;
        }
        if (ul) ul.appendChild(createLogItem(r));
    });
}

function createLogItem(r) {
    const li = document.createElement('li'); li.className = 'log-item'; li.onclick = () => openEditRecord(r.id);
    li.innerHTML = `<div class="log-info"><span class="log-time">${r.timeDisplay}</span><span class="log-cat">${r.category}</span></div><span class="log-money">$${r.amount}</span>`;
    return li;
}

function saveRecords() {
    localStorage.setItem('myMoneyRecordsV4', JSON.stringify(records));
    if(document.getElementById('tab-home').style.display !== 'none') renderHome(); else renderHistory();
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

window.onclick = function(e) { if(e.target.classList.contains('modal-overlay')) e.target.style.display = 'none'; }
