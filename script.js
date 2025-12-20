/* --- 全域變數與設定 --- */
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

// 狀態變數
let currentAmountStr = '0'; 
let editingRecordId = null; 
let currentCategoryName = ''; 
let isEditMode = false;
let editingCatIndex = null; 
let isCreatingNew = false; // 追蹤是否正在新增分類
let sortableInstance = null;
let trashSortable = null;
let expenseChart = null;

// DOM 元素快取
let modal, displayEl, noteInput, btnConfirmRecord, btnHeaderTrash;
let recordDateInput, btnDateTrigger, dateDisplayText;
let settingsModal, settingNameInput, colorGrid, bgModal;
let categoryGrid;

/* --- 初始化 --- */
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

function initElements() {
    modal = document.getElementById('inputModal');
    displayEl = document.getElementById('displayNum');
    noteInput = document.getElementById('noteInput');
    btnConfirmRecord = document.getElementById('btnConfirmRecord');
    btnHeaderTrash = document.getElementById('btnHeaderTrash'); 
    
    recordDateInput = document.getElementById('recordDateInput');
    btnDateTrigger = document.getElementById('btnDateTrigger');
    dateDisplayText = document.getElementById('dateDisplayText');
    
    settingsModal = document.getElementById('settingsModal');
    settingNameInput = document.getElementById('settingNameInput');
    colorGrid = document.getElementById('colorGrid');
    bgModal = document.getElementById('bgModal');
    categoryGrid = document.getElementById('categoryGrid');
}

/* --- 工具函式 --- */
function getLocalTodayString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function getFormattedDate(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getDate().toString().padStart(2,'0')}`;
}

function formatDateInput(date) {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getChartColor(catName, index) {
    const cat = categories.find(c => c.name === catName);
    let color = cat ? cat.color : "white";

    if (color.includes("linear-gradient")) {
        const match = color.match(/#(?:[0-9a-fA-F]{3}){1,2}/);
        if (match) color = match[0];
    }

    if (color === 'white' || color === '#ffffff' || color === '#fff') {
        color = AUTO_COLORS[index % AUTO_COLORS.length];
    }
    return color;
}

/* --- 分類與拖曳功能 --- */
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
        isCreatingNew = false; 
        openSettingsModal(index);
    } else {
        openInputModal(categories[index].name);
    }
}

function setupSortable() {
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null; }
    if (trashSortable) { trashSortable.destroy(); trashSortable = null; }
    
    if (!isEditMode) return;

    const delZone = document.getElementById('deleteZone');

    // 1. 按鈕列表 (來源)
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

    // 2. 刪除區 (目的地)
    trashSortable = new Sortable(delZone, {
        group: 'shared',
        ghostClass: 'delete-zone-hover',
        onAdd: function (evt) {
            const oldIndex = evt.oldIndex;
            const item = categories[oldIndex];
            evt.item.remove(); // 立即移除 DOM
            
            if (confirm(`確定要刪除「${item.name}」嗎？`)) {
                categories.splice(oldIndex, 1);
                saveCategories(true); 
            } else {
                renderCategories(); // 取消則重繪
            }
        }
    });
}

function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('btnToggleEdit');
    const delZone = document.getElementById('deleteZone');
    
    if (isEditMode) {
        btn.style.background = "#fff9c4"; 
        categoryGrid.classList.add('edit-mode');
        delZone.style.display = 'flex';
    } else {
        btn.style.background = "white";
        categoryGrid.classList.remove('edit-mode');
        delZone.style.display = 'none';
    }
    renderCategories();
}

function saveCategories(render = true) {
    localStorage.setItem('myCategoriesV2', JSON.stringify(categories));
    if(render) renderCategories();
}

/* --- 設定與背景 --- */
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
    if (!newName) return alert("請輸入名稱");

    if (isCreatingNew && newName === "新項目") {
        categories.splice(editingCatIndex, 1);
        saveCategories();
        isCreatingNew = false;
        closeSettingsModal(); 
        return;
    }

    categories[editingCatIndex].name = newName;
    categories[editingCatIndex].color = tempColor;
    isCreatingNew = false;
    saveCategories();
    closeSettingsModal();
}

function addNewCategory() {
    categories.push({ name: "新項目", color: "white" });
    saveCategories(); 
    isCreatingNew = true; 
    setTimeout(() => openSettingsModal(categories.length - 1), 100);
}

function closeSettingsModal() {
    if (isCreatingNew) {
        categories.splice(editingCatIndex, 1);
        saveCategories();
        isCreatingNew = false;
    }
    settingsModal.style.display = 'none';
}

function openBgSettings() {
    const bgGrid = document.getElementById('bgGrid');
    renderColorGrid(bgGrid, (val) => {
        bgStyle = val;
        document.body.style.background = bgStyle;
        localStorage.setItem('myBgStyle', bgStyle);
        closeBgModal();
    }, bgStyle);
    bgModal.style.display = 'flex';
}
function closeBgModal() { bgModal.style.display = 'none'; }

/* --- 記帳輸入邏輯 --- */
function openInputModal(catName) {
    editingRecordId = null; 
    currentCategoryName = catName; 
    currentAmountStr = '0'; 
    noteInput.value = '';
    
    recordDateInput.value = getLocalTodayString();
    updateDateDisplay(); 

    document.getElementById('modalTitle').textContent = catName;
    btnConfirmRecord.textContent = "確認"; 
    btnHeaderTrash.style.display = 'none'; 
    
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

    const d = new Date(id);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    recordDateInput.value = `${yyyy}-${mm}-${dd}`;
    updateDateDisplay(); 

    document.getElementById('modalTitle').textContent = "修改紀錄";
    btnConfirmRecord.textContent = "儲存"; 
    btnHeaderTrash.style.display = 'block'; 
    
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

function openDatePicker() {
    if (recordDateInput.showPicker) recordDateInput.showPicker();
    else recordDateInput.click();
}

function updateDateDisplay() {
    const today = getLocalTodayString();
    const selected = recordDateInput.value;
    dateDisplayText.textContent = selected;
    
    if (selected !== today) {
        btnDateTrigger.style.background = "#fff9c4"; 
        btnDateTrigger.style.border = "1px solid #fbc02d";
        dateDisplayText.style.color = "#E65100";
    } else {
        btnDateTrigger.style.background = "#fff";
        btnDateTrigger.style.border = "1px solid #eee";
        dateDisplayText.style.color = "#555";
    }
}

function confirmRecord() {
    const amount = parseInt(currentAmountStr);
    if (amount === 0) return alert("金額不能為 0");
    const note = noteInput.value.trim();
    const finalCat = note ? `${currentCategoryName} (${note})` : currentCategoryName;
    
    const dateStr = recordDateInput.value;
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d); 
    
    let finalTime;
    
    if (editingRecordId) {
        const oldDate = new Date(editingRecordId);
        dateObj.setHours(oldDate.getHours(), oldDate.getMinutes(), oldDate.getSeconds());
        finalTime = dateObj.getTime();
    } else {
        const now = new Date();
        dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
        finalTime = dateObj.getTime();
    }
    
    const timeDisplay = `${dateObj.getHours()}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    const timestampStr = dateObj.toLocaleString(); 

    if (editingRecordId) {
        const idx = records.findIndex(x => x.id === editingRecordId);
        if (idx !== -1) { 
            records[idx].id = finalTime;
            records[idx].amount = amount; 
            records[idx].category = finalCat;
            records[idx].timestamp = timestampStr;
            records[idx].timeDisplay = timeDisplay;
        }
    } else {
        records.unshift({ 
            id: finalTime, 
            timestamp: timestampStr, 
            timeDisplay: timeDisplay, 
            category: finalCat, 
            pureCategory: currentCategoryName, 
            amount: amount 
        });
    }
    
    saveRecords(); 
    closeModal();
}

function deleteCurrentRecord() {
    if(confirm("確定要刪除此筆紀錄嗎？")) { 
        records = records.filter(x => x.id !== editingRecordId); 
        saveRecords(); 
        closeModal(); 
    }
}

function saveRecords() {
    localStorage.setItem('myMoneyRecordsV4', JSON.stringify(records));
    if(document.getElementById('tab-home').style.display !== 'none') renderHome(); else renderHistory();
}

/* --- 首頁與歷史列表 --- */
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

function switchTab(t) {
    document.querySelectorAll('.tab-content').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    
    document.getElementById(`tab-${t}`).style.display = 'block';
    document.getElementById(`nav-${t}`).classList.add('active');
    
    if (t === 'home') renderHome();
    else if (t === 'history') renderHistory();
    else if (t === 'chart') setDateRange('week');
}

/* --- 圖表邏輯 --- */
function initChartPage() {
    setDateRange('week');
    document.getElementById('startDate').addEventListener('change', updateChart);
    document.getElementById('endDate').addEventListener('change', updateChart);
}

function setDateRange(type) {
    const today = new Date();
    let start = new Date();
    let end = new Date(); 

    if (type === 'week') start.setDate(today.getDate() - 6);
    else if (type === 'month') start.setDate(today.getDate() - 29);
    else if (type === 'thisMonth') start = new Date(today.getFullYear(), today.getMonth(), 1);
    else if (type === 'thisWeek') {
        let day = today.getDay(); 
        let diff = day === 0 ? 6 : day - 1; 
        start.setDate(today.getDate() - diff);
    }

    document.getElementById('startDate').value = formatDateInput(start);
    document.getElementById('endDate').value = formatDateInput(end);
    updateChart();
}

function updateChart() {
    const startStr = document.getElementById('startDate').value;
    const endStr = document.getElementById('endDate').value;
    if (!startStr || !endStr) return;

    const startTime = new Date(startStr).setHours(0,0,0,0);
    const endTime = new Date(endStr).setHours(23,59,59,999);

    const filteredRecords = records.filter(r => r.id >= startTime && r.id <= endTime);
    const stats = {};
    let totalSum = 0;

    filteredRecords.forEach(r => {
        const catName = r.pureCategory || r.category.split(' (')[0];
        if (!stats[catName]) stats[catName] = 0;
        stats[catName] += r.amount;
        totalSum += r.amount;
    });

    const sortedStats = Object.keys(stats)
        .map(key => ({ name: key, amount: stats[key] }))
        .sort((a, b) => b.amount - a.amount);

    renderChart(sortedStats, totalSum);
    renderLegend(sortedStats, totalSum);
}

function renderChart(data, totalSum) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const bgColors = data.map((item, index) => getChartColor(item.name, index));

    if (expenseChart) expenseChart.destroy();
    if (data.length === 0) return; 

    const centerTextPlugin = {
        id: 'centerText',
        beforeDraw: function(chart) {
            const { width, height, ctx } = chart;
            ctx.restore();
            
            const fontFamily = '-apple-system, BlinkMacSystemFont, "Microsoft JhengHei", "Helvetica Neue", Arial, sans-serif';
            ctx.textAlign = "center"; 
            ctx.textBaseline = "middle";

            const fontSizeAmt = (height / 100).toFixed(2); 
            ctx.font = `bold ${fontSizeAmt}em ${fontFamily}`;
            ctx.fillStyle = "#333"; 
            const text = "$" + totalSum.toLocaleString();
            const textY = height / 2 + (height * 0.02); 
            ctx.fillText(text, width / 2, textY);

            const fontSizeLabel = (height / 240).toFixed(2);
            ctx.font = `${fontSizeLabel}em ${fontFamily}`;
            ctx.fillStyle = "#999"; 
            const label = "總支出";
            const labelY = height / 2 - (height * 0.15);
            ctx.fillText(label, width / 2, labelY);

            ctx.save();
        }
    };

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
        plugins: [centerTextPlugin], 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%', 
            layout: { padding: 10 },
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

/* --- 系統與備份 --- */
function exportCSV() {
    if(records.length===0) return alert("無資料");
    let csv = "data:text/csv;charset=utf-8,\uFEFF時間,項目,金額\n";
    records.forEach(r => csv += `${r.timestamp},${r.category},${r.amount}\n`);
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = `money_log_${Date.now()}.csv`;
    document.body.appendChild(link); link.click();
}

function clearAllData() { if(confirm("清空所有資料？")) { records=[]; saveRecords(); } }

async function backupData() {
    const backupObj = {
        version: "1.0", 
        exportDate: new Date().toLocaleString(),
        records: records,
        categories: categories,
        bgStyle: bgStyle
    };

    const jsonString = JSON.stringify(backupObj, null, 2);
    const fileName = `記帳備份_${new Date().toISOString().slice(0,10)}.json`;
    const file = new File([jsonString], fileName, { type: "application/json" });
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                files: [file],
                title: '記帳備份',
                text: '這是我的記帳備份檔'
            });
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.warn("分享失敗，改為直接下載", err);
                downloadFile(file, fileName);
            }
        }
    } else {
        downloadFile(file, fileName);
    }
}

function downloadFile(fileBlob, fileName) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(fileBlob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click(); 
    document.body.removeChild(link);
}

function triggerRestore() {
    document.getElementById('restoreInput').click();
}

function restoreData(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.records || !data.categories) return alert("這不是正確的備份檔案！");

            if (!confirm(`確定要還原備份嗎？\n(備份日期: ${data.exportDate || '未知'})\n\n⚠️ 這將會覆蓋現有的所有資料！`)) {
                inputElement.value = ''; 
                return;
            }

            records = data.records;
            categories = data.categories;
            if (data.bgStyle) bgStyle = data.bgStyle;

            saveRecords();
            saveCategories(); 
            localStorage.setItem('myBgStyle', bgStyle);
            document.body.style.background = bgStyle;
            
            alert("還原成功！頁面將重新整理。");
            location.reload();

        } catch (err) {
            alert("檔案讀取失敗，格式可能錯誤。");
        }
    };
    reader.readAsText(file);
}

/* --- 事件監聽 --- */
window.onclick = function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        if (e.target.id === 'settingsModal') closeSettingsModal(); 
        else if (e.target.id === 'bgModal') closeBgModal();
        else closeModal(); 
    }
}

// 測試用 (可自行移除)
function generateFakeData() {
    if (!confirm("確定要生成 50 筆隨機測試資料嗎？")) return;
    const now = new Date();
    for (let i = 0; i < 50; i++) {
        const daysBack = Math.floor(Math.random() * 30);
        const date = new Date(now);
        date.setDate(now.getDate() - daysBack);
        date.setHours(Math.floor(Math.random() * 24));
        date.setMinutes(Math.floor(Math.random() * 60));
        const randomCat = categories[Math.floor(Math.random() * categories.length)];
        const randomAmount = Math.floor(Math.random() * 49) * 10 + 10;
        records.push({
            id: date.getTime() + i, 
            timestamp: date.toLocaleString(),
            timeDisplay: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
            category: randomCat.name,
            pureCategory: randomCat.name, 
            amount: randomAmount
        });
    }
    saveRecords();
    alert("已成功生成 50 筆測試資料！請去圖表頁面查看。");
}
