// --- script.js (V7.7 修復版) ---

let records = [];
let categories = []; 
let bgStyle = "linear-gradient(135deg, #e0f7fa 0%, #80cbc4 100%)"; 

// 16色 色票庫
const THEME_COLORS = [
    { val: "white", label: "簡約白" },
    { val: "#fff9c4", label: "奶油黃" },
    { val: "#e1bee7", label: "淡紫" },
    { val: "#b2dfdb", label: "薄荷" },
    { val: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)", label: "櫻花粉" },
    { val: "linear-gradient(135deg, #f8bbd0 0%, #f48fb1 100%)", label: "甜心粉" },
    { val: "linear-gradient(135deg, #ffcdd2 0%, #ef9a9a 100%)", label: "珊瑚紅" },
    { val: "linear-gradient(135deg, #ff80ab 0%, #ff4081 100%)", label: "亮桃紅" },
    { val: "linear-gradient(135deg, #ffe0b2 0%, #ffb74d 100%)", label: "暖橘" },
    { val: "linear-gradient(135deg, #d7ccc8 0%, #a1887f 100%)", label: "可可" },
    { val: "#ff5252", label: "警示紅" },
    { val: "#333333", label: "酷黑" },
    { val: "linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%)", label: "天空藍" },
    { val: "linear-gradient(135deg, #9fa8da 0%, #5c6bc0 100%)", label: "靛青" },
    { val: "linear-gradient(135deg, #80cbc4 0%, #009688 100%)", label: "湖水綠" },
    { val: "linear-gradient(135deg, #b39ddb 0%, #7e57c2 100%)", label: "深紫" }
];

const AUTO_COLORS = [
    "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF", 
    "#FF9F40", "#8D6E63", "#EC407A", "#7E57C2", "#26A69A"
];

let currentAmountStr = '0'; 
let editingRecordId = null; 
let currentCategoryName = ''; 
let isEditMode = false;
let editingCatIndex = null; 
let isNewCategory = false;
let trashSortable = null;
let expenseChart = null;

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
	initChartPage();
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

function getChartColor(catName, index) {
    const cat = categories.find(c => c.name === catName);
    let color = cat ? cat.color : "white";

    // 處理漸層色：取第一個顏色
    if (color.includes("linear-gradient")) {
        const match = color.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
        if (match) color = match[0];
    }

    // 【關鍵修正】如果顏色是白色 (或是太淺的顏色)，就改用自動色票
    if (color === 'white' || color === '#ffffff' || color === '#fff') {
        // 使用 index 取餘數，確保顏色會循環使用
        color = AUTO_COLORS[index % AUTO_COLORS.length];
    }

    return color;
}

// --- 渲染與拖曳設定 ---
const categoryGrid = document.getElementById('categoryGrid');
let sortableInstance = null;

function renderCategories() {
    categoryGrid.innerHTML = '';
    categories.forEach((cat, index) => {
        const btn = document.createElement('button');
        btn.className = 'cat-btn';
        btn.textContent = cat.name;
        btn.style.background = cat.color;
        
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

        // 綁定點擊事件
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
        isCreatingNew = false; // 這是舊的，不是新增
        openSettingsModal(index);
    } else {
        openInputModal(categories[index].name);
    }
}

// --- script.js 修改區 ---

function setupSortable() {
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    if (trashSortable) { trashSortable.destroy(); trashSortable = null; }
    
    if (!isEditMode) return;

    const delZone = document.getElementById('deleteZone');

    // A. 設定「按鈕列表」 (來源)
    sortableInstance = new Sortable(categoryGrid, {
        group: 'shared',
        animation: 150, 
        disabled: false,
        filter: '.btn-add-cat',
        delay: 200, 
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        
        onEnd: function (evt) {
            if (evt.to === categoryGrid) {
                const item = categories.splice(evt.oldIndex, 1)[0];
                categories.splice(evt.newIndex, 0, item);
                saveCategories(false); 
            }
        }
    });

    // B. 設定「刪除區」 (目的地)
    trashSortable = new Sortable(delZone, {
        group: 'shared',
        ghostClass: 'delete-zone-hover',
        
        // --- 這裡有重大修改 ---
        onAdd: function (evt) {
            const oldIndex = evt.oldIndex;
            const item = categories[oldIndex];

            // 【關鍵修正】
            // 立即把被拖進來的那個按鈕元素從紅色框框中移除！
            // 這樣它就不會「卡」在裡面了。
            evt.item.remove(); 

            // 接著執行刪除確認邏輯
            if (confirm(`確定要刪除「${item.name}」嗎？`)) {
                categories.splice(oldIndex, 1);
                saveCategories(true); // 存檔並重繪 (按鈕真正消失)
            } else {
                // 如果取消，因為我們剛剛把 DOM 刪了，
                // 必須呼叫重繪，讓按鈕在原本的列表中「復活」
                renderCategories();
            }
        }
    });
}

// --- 設定邏輯 ---
let tempColor = "white";

function renderColorGrid(targetGrid, onClickCallback, selectedColor) {
    targetGrid.innerHTML = '';
    THEME_COLORS.forEach(c => {
        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.background = c.val;
        if (c.val === selectedColor) swatch.classList.add('selected');
        swatch.onclick = () => {
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
    
    renderColorGrid(colorGrid, (val) => { tempColor = val; }, tempColor);
    settingsModal.style.display = 'flex';
}

function saveCategorySettings() {
    const newName = settingNameInput.value.trim();
    
    // 狀況一：沒輸入名字 -> 警告
    if (!newName) return alert("請輸入名稱");

    // 狀況二：是新增模式，且名字完全沒變 ("新項目") -> 視為取消新增，刪除之
    if (isCreatingNew && newName === "新項目") {
        categories.splice(editingCatIndex, 1);
        saveCategories();
        
        isCreatingNew = false; // 重置標記，避免 closeSettingsModal 重複刪除
        closeSettingsModal(); // 這裡會正常關閉
        return;
    }

    // 狀況三：正常儲存
    categories[editingCatIndex].name = newName;
    categories[editingCatIndex].color = tempColor;
    
    isCreatingNew = false; // 成功儲存，解除新增鎖定
    saveCategories();
    closeSettingsModal();
}

function addNewCategory() {
    categories.push({ name: "新項目", color: "white" });
    saveCategories(); 
    
    isCreatingNew = true; // 鎖定：這是新增模式
    
    // 開啟最後一個 (即剛新增的那個)
    setTimeout(() => openSettingsModal(categories.length - 1), 100);
}

function closeSettingsModal() {
    // 如果還在「新增模式」就按了關閉 (代表使用者反悔了，或者沒按儲存)
    if (isCreatingNew) {
        categories.splice(editingCatIndex, 1); // 刪除那個暫存的「新項目」
        saveCategories();
        isCreatingNew = false; // 重置
    }
    
    settingsModal.style.display = 'none';
}

function saveCategories(render = true) {
    localStorage.setItem('myCategoriesV2', JSON.stringify(categories));
    if(render) renderCategories();
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('btnToggleEdit');
    const delZone = document.getElementById('deleteZone'); // 取得刪除區元素
    
    if (isEditMode) {
        btn.style.background = "#fff9c4"; 
        categoryGrid.classList.add('edit-mode');
        delZone.style.display = 'flex'; // 顯示刪除區
    } else {
        btn.style.background = "white";
        categoryGrid.classList.remove('edit-mode');
        delZone.style.display = 'none'; // 隱藏刪除區
    }
    // 重新渲染以套用新的 Sortable 設定
    renderCategories();
}

// --- 背景設定 ---
function openBgSettings() {
    const bgGrid = document.getElementById('bgGrid');
    renderColorGrid(bgGrid, (val) => {
        bgStyle = val;
        document.body.style.background = bgStyle;
        localStorage.setItem('myBgStyle', bgStyle);
        closeBgModal();
    }, bgStyle);
    document.getElementById('bgModal').style.display = 'flex';
}
function closeBgModal() { document.getElementById('bgModal').style.display = 'none'; }

// --- 記帳輸入 ---
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

// --- 系統 ---
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

function initChartPage() {
    // 預設選擇「近一周」
    setDateRange('week');
    
    // 綁定日期改變事件，當用戶手動改日期時，重新畫圖
    document.getElementById('startDate').addEventListener('change', updateChart);
    document.getElementById('endDate').addEventListener('change', updateChart);
}

function setDateRange(type) {
    const today = new Date();
    let start = new Date();
    let end = new Date(); // 預設就是今天

    if (type === 'week') {
        // 近一周 (包含今天往前推6天，共7天)
        start.setDate(today.getDate() - 6);
    } else if (type === 'month') {
        // 近一月 (30天)
        start.setDate(today.getDate() - 29);
    } else if (type === 'thisMonth') {
        // 本月份 (1號 ~ 今天)
        start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (type === 'thisWeek') {
        // 本周 (周一 ~ 今天)
        // getDay(): 0是周日, 1是周一...
        // 如果今天是周日(0)，要往前推6天到上周一
        // 如果今天是周一(1)，往前推0天
        let day = today.getDay(); 
        let diff = day === 0 ? 6 : day - 1; 
        start.setDate(today.getDate() - diff);
    }

    // 將日期格式化為 YYYY-MM-DD 填入 input
    document.getElementById('startDate').value = formatDateInput(start);
    document.getElementById('endDate').value = formatDateInput(end);

    // 更新圖表
    updateChart();
}

function formatDateInput(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function updateChart() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    
    if (!startStr || !endStr) return;

    // 將字串轉為時間戳記進行比較 (00:00:00 ~ 23:59:59)
    const startTime = new Date(startStr).setHours(0,0,0,0);
    const endTime = new Date(endStr).setHours(23,59,59,999);

    // 1. 篩選範圍內的資料
    const filteredRecords = records.filter(r => {
        return r.id >= startTime && r.id <= endTime;
    });

    // 2. 統計各分類金額 (合併備註)
    const stats = {};
    let totalSum = 0;

    filteredRecords.forEach(r => {
        // 使用 pureCategory (已在之前的程式碼中儲存，去除了括號備註)
        // 如果舊資料沒有 pureCategory，則用 split 處理
        const catName = r.pureCategory || r.category.split(' (')[0];
        
        if (!stats[catName]) stats[catName] = 0;
        stats[catName] += r.amount;
        totalSum += r.amount;
    });

    // 3. 轉為陣列並排序 (金額大到小)
    const sortedStats = Object.keys(stats)
        .map(key => ({ name: key, amount: stats[key] }))
        .sort((a, b) => b.amount - a.amount);

    // 4. 準備繪圖
    renderChart(sortedStats, totalSum);
    renderLegend(sortedStats, totalSum);
}

function renderChart(data, totalSum) {
    const ctx = document.getElementById('expenseChart').getContext('2d');

    // 使用新的輔助函式來產生顏色陣列
    const bgColors = data.map((item, index) => getChartColor(item.name, index));

    if (expenseChart) expenseChart.destroy();

    if (data.length === 0) return; 

    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                data: data.map(d => d.amount),
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            let value = context.raw;
                            let percent = Math.round((value / totalSum) * 100) + '%';
                            return `${label}: $${value.toLocaleString()} (${percent})`;
                        }
                    }
                }
            }
        }
    });
}

function renderLegend(data, totalSum) {
    const container = document.getElementById('chartLegend');
    container.innerHTML = '';

    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#999;">此區間無支出資料</div>';
        return;
    }

    data.forEach((item, index) => {
        const percent = Math.round((item.amount / totalSum) * 100);
        
        // 使用同一個邏輯取得顏色，確保圖例跟圓餅圖顏色一致
        const color = getChartColor(item.name, index);

        const div = document.createElement('div');
        div.className = 'legend-item';
        div.innerHTML = `
            <div class="legend-info">
                <span class="legend-color" style="background:${color}"></span>
                <span class="legend-name">${item.name}</span>
            </div>
            <div>
                <span class="legend-amount">$${item.amount.toLocaleString()}</span>
                <span class="legend-percent">${percent}%</span>
            </div>
        `;
        container.appendChild(div);
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

window.onclick = function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        // 判斷目前點到的是哪個視窗的背景
        if (e.target.id === 'settingsModal') {
            // 關鍵！必須呼叫這個函式，才會執行「新增未存檔則刪除」的邏輯
            closeSettingsModal(); 
        } else if (e.target.id === 'bgModal') {
            closeBgModal();
        } else {
            // 預設關閉記帳輸入視窗
            closeModal(); 
        }
    }
}

// --- script.js 最下面新增 ---

// 1. 備份功能 (存檔)
async function backupData() {
    // 把目前的 紀錄(records)、分類(categories)、背景(bgStyle) 全部打包起來
    const backupObj = {
        version: "1.0", 
        exportDate: new Date().toLocaleString(),
        records: records,
        categories: categories,
        bgStyle: bgStyle
    };

    // 轉成文字檔內容
    const jsonString = JSON.stringify(backupObj, null, 2);
    const fileName = `記帳備份_${new Date().toISOString().slice(0,10)}.json`;
    const file = new File([jsonString], fileName, { type: "application/json" });

    // 判斷是用手機還是電腦
    // 如果是手機，嘗試呼叫系統的「分享」選單 (可以傳到 Line 或存到檔案)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: '記帳備份',
                text: '這是我的記帳備份檔'
            });
        } catch (err) {
            // 如果使用者按取消，就不做任何事
            console.log("分享取消");
        }
    } else {
        // 如果是電腦，或手機不支援分享，就直接下載檔案
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// 2. 還原功能 (讀檔) - 觸發選檔案的視窗
function triggerRestore() {
    document.getElementById('restoreInput').click();
}

// 3. 實際執行還原
function restoreData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    // 當檔案讀取完成後，執行以下動作
    reader.onload = function(e) {
        try {
            // 把文字轉回資料
            const data = JSON.parse(e.target.result);

            // 簡單檢查一下是不是正確的備份檔
            if (!data.records || !data.categories) {
                return alert("這不是正確的備份檔案！");
            }

            if (!confirm(`確定要還原備份嗎？\n(備份日期: ${data.exportDate || '未知'})\n\n⚠️ 這將會覆蓋現有的所有資料！`)) {
                inputElement.value = ''; // 如果取消，清空選擇
                return;
            }

            // 開始覆蓋資料
            records = data.records;
            categories = data.categories;
            if (data.bgStyle) bgStyle = data.bgStyle;

            // 儲存到手機記憶體 (localStorage)
            saveRecords();
            saveCategories(); 
            localStorage.setItem('myBgStyle', bgStyle);
            
            alert("還原成功！頁面將重新整理。");
            
            // 重新整理頁面，讓資料生效
            location.reload();

        } catch (err) {
            alert("檔案讀取失敗，格式可能錯誤。");
        }
    };
    // 開始讀取文字檔
    reader.readAsText(file);
}
// --- script.js 最尾端新增 ---

// 🧪 測試用：生成假資料
function generateFakeData() {
    if (!confirm("確定要生成 50 筆隨機測試資料嗎？")) return;

    const now = new Date();
    // 產生 50 筆
    for (let i = 0; i < 50; i++) {
        // 隨機天數 (0 ~ 30 天前)
        const daysBack = Math.floor(Math.random() * 30);
        const date = new Date(now);
        date.setDate(now.getDate() - daysBack);
        
        // 隨機小時與分鐘
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));

        // 隨機分類
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        
        // 隨機金額 (10 ~ 500 元)
        const randomAmount = Math.floor(Math.random() * 49) * 10 + 10;

        const newRecord = {
            id: date.getTime() + i, // 加上 i 避免 ID 重複
            timestamp: date.toLocaleString(),
            timeDisplay: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
            category: randomCat.name,
            pureCategory: randomCat.name, // 確保圖表統計抓得到
            amount: randomAmount
        };
        
        records.push(newRecord);
    }

    saveRecords();
    alert("已成功生成 50 筆測試資料！請去圖表頁面查看。");
}
