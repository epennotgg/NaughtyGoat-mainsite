let currentEngine = 'Google';
let userShortcuts = [];
const defaultWallpapers = 'desk/bg.jpg';

// Initialize the dashboard app
function initApp() {
    // Check if name exists in localStorage
    const storedName = localStorage.getItem('crod_user_name');

    if (!storedName) {
        document.getElementById('onboarding-overlay').classList.add('active');
    } else {
        loadSettings();
        renderDashboard();
    }

    // Initialize search engine icon
    const storedEngine = localStorage.getItem('crod_search_engine');
    if (storedEngine) {
        currentEngine = storedEngine;
    }
    updateEngineUI();

    // Start clock ticking
    startTime();
}

// IndexedDB Helper Functions
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('crod_db', 1);
        request.onupgradeneeded = function (e) {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('wallpapers')) {
                db.createObjectStore('wallpapers');
            }
        };
        request.onsuccess = function (e) {
            resolve(e.target.result);
        };
        request.onerror = function (e) {
            reject(e.target.error);
        };
    });
}

function saveFileToIDB(file) {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('wallpapers', 'readwrite');
            const store = tx.objectStore('wallpapers');
            const req = store.put(file, 'custom_wallpaper');
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    });
}

function getFileFromIDB() {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('wallpapers', 'readonly');
            const store = tx.objectStore('wallpapers');
            const req = store.get('custom_wallpaper');
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    });
}

function clearIDB() {
    return initDB().then(db => {
        return new Promise((resolve, reject) => {
            const tx = db.transaction('wallpapers', 'readwrite');
            const store = tx.objectStore('wallpapers');
            const req = store.delete('custom_wallpaper');
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    });
}

// Save first meet details
async function saveFirstMeet(event) {
    event.preventDefault();
    const nameInput = document.getElementById('ob-name').value.trim();
    if (!nameInput) return;

    localStorage.setItem('crod_user_name', nameInput);

    // Wallpaper selection
    const wpUrl = document.getElementById('ob-wallpaper').value.trim();
    const wpFile = document.getElementById('ob-wallpaper-file').files[0];

    if (wpFile) {
        const type = wpFile.type.startsWith('video') ? 'video' : 'image';
        try {
            await saveFileToIDB(wpFile);
            localStorage.setItem('crod_wallpaper', 'indexeddb');
            localStorage.setItem('crod_wallpaper_type', type);
            const blobUrl = URL.createObjectURL(wpFile);
            applyWallpaper(blobUrl, type);
        } catch (err) {
            console.error('Failed to save to IndexedDB:', err);
        }
    } else if (wpUrl) {
        localStorage.setItem('crod_wallpaper', wpUrl);
        const type = wpUrl.match(/\.(mp4|webm|ogg)/i) ? 'video' : 'image';
        localStorage.setItem('crod_wallpaper_type', type);
        applyWallpaper(wpUrl, type);
    } else {
        localStorage.setItem('crod_wallpaper', defaultWallpapers);
        localStorage.setItem('crod_wallpaper_type', 'image');
        applyWallpaper(defaultWallpapers, 'image');
    }

    // Handle shortcuts setup
    const useDefault = document.getElementById('ob-default-shortcuts').checked;
    if (useDefault) {
        userShortcuts = [
            { id: generateId(), name: 'Spotify', url: 'https://open.spotify.com', line: 1 },
            { id: generateId(), name: 'YouTube', url: 'https://youtube.com', line: 1 },
            { id: generateId(), name: 'Discord', url: 'https://discord.com', line: 1 },
            { id: generateId(), name: 'Gmail', url: 'https://mail.google.com', line: 2 },
            { id: generateId(), name: 'WhatsApp', url: 'https://web.whatsapp.com', line: 2 }
        ];
    } else {
        userShortcuts = [];
    }
    localStorage.setItem('crod_shortcuts', JSON.stringify(userShortcuts));

    // Finish onboarding
    document.getElementById('onboarding-overlay').classList.remove('active');
    loadSettings();
    renderDashboard();
}

// Load and apply all settings
async function loadSettings() {
    const storedName = localStorage.getItem('crod_user_name');
    if (storedName) {
        document.getElementById('settings-name').value = storedName;
    }

    // Load custom wallpaper
    const storedWp = localStorage.getItem('crod_wallpaper') || defaultWallpapers;
    const storedWpType = localStorage.getItem('crod_wallpaper_type') || 'image';

    if (storedWp === 'indexeddb') {
        try {
            const file = await getFileFromIDB();
            if (file) {
                const blobUrl = URL.createObjectURL(file);
                applyWallpaper(blobUrl, storedWpType);
            } else {
                applyWallpaper(defaultWallpapers, 'image');
            }
        } catch (err) {
            console.error('Failed to load from IDB:', err);
            applyWallpaper(defaultWallpapers, 'image');
        }
    } else {
        applyWallpaper(storedWp, storedWpType);
    }

    // Load shortcuts
    const storedShortcuts = localStorage.getItem('crod_shortcuts');
    if (storedShortcuts) {
        userShortcuts = JSON.parse(storedShortcuts);
    } else {
        userShortcuts = [];
    }
}

// Apply wallpaper dynamically (Image/GIF or Video)
function applyWallpaper(url, type) {
    const bgContainer = document.getElementById('bg-container');
    if (!bgContainer) return;

    bgContainer.innerHTML = '';

    if (type === 'video') {
        const video = document.createElement('video');
        video.src = url;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        bgContainer.appendChild(video);
    } else {
        const img = document.createElement('img');
        img.src = url;
        bgContainer.appendChild(img);
    }
}

// Render widgets and greeting on homepage
function renderDashboard() {
    const storedName = localStorage.getItem('crod_user_name') || 'Friend';

    // Compute greeting based on local hour
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 18) {
        greeting = 'Good Afternoon';
    } else if (hour >= 18 || hour < 4) {
        greeting = 'Good Evening';
    }

    document.getElementById('greeting-text').innerHTML = `${greeting}, ${storedName}`;
    renderShortcuts();
}

// Render shortcuts line-by-line
function renderShortcuts() {
    const line1 = document.getElementById('shortcut-line-1');
    const line2 = document.getElementById('shortcut-line-2');
    const line3 = document.getElementById('shortcut-line-3');

    if (!line1 || !line2 || !line3) return;

    line1.innerHTML = '';
    line2.innerHTML = '';
    line3.innerHTML = '';

    // Sort or filter shortcuts by lines
    userShortcuts.forEach(sc => {
        const domain = new URL(sc.url).hostname;
        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        const a = document.createElement('a');
        a.href = sc.url;
        a.className = 'shortcut-card';
        a.target = '_blank';
        a.title = sc.name;
        a.innerHTML = `
            <img src="${iconUrl}" alt="${sc.name}" onerror="this.src='https://www.google.com/s2/favicons?domain=example.com&sz=64'">
            <span class="shortcut-name">${sc.name}</span>
        `;

        if (sc.line === 1) line1.appendChild(a);
        else if (sc.line === 2) line2.appendChild(a);
        else if (sc.line === 3) line3.appendChild(a);
    });

    renderSettingsShortcuts();
}

// Render shortcut editing list inside right settings panel
function renderSettingsShortcuts() {
    const smList1 = document.getElementById('sm-line-1-list');
    const smList2 = document.getElementById('sm-line-2-list');
    const smList3 = document.getElementById('sm-line-3-list');

    if (!smList1 || !smList2 || !smList3) return;

    smList1.innerHTML = '';
    smList2.innerHTML = '';
    smList3.innerHTML = '';

    userShortcuts.forEach(sc => {
        const domain = new URL(sc.url).hostname;
        const iconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

        const div = document.createElement('div');
        div.className = 'sm-shortcut-item';
        div.innerHTML = `
            <div class="sm-info">
                <img src="${iconUrl}" alt="">
                <span class="sm-name" title="${sc.name}">${sc.name}</span>
            </div>
            <div class="sm-actions">
                <button onclick="removeShortcut('${sc.id}')" class="sm-delete-btn" title="Remove">&times;</button>
            </div>
        `;

        if (sc.line === 1) smList1.appendChild(div);
        else if (sc.line === 2) smList2.appendChild(div);
        else if (sc.line === 3) smList3.appendChild(div);
    });
}

// Add shortcut popup modal
function openAddShortcutModal(lineId) {
    document.getElementById('as-line-id').value = lineId;
    document.getElementById('as-name').value = '';
    document.getElementById('as-url').value = '';
    document.getElementById('add-shortcut-modal').classList.add('active');
}

function closeAddShortcutModal() {
    document.getElementById('add-shortcut-modal').classList.remove('active');
}

function saveNewShortcut(event) {
    event.preventDefault();
    const lineId = parseInt(document.getElementById('as-line-id').value);
    const nameInput = document.getElementById('as-name').value.trim();
    const urlInput = document.getElementById('as-url').value.trim();

    if (!nameInput || !urlInput) return;

    userShortcuts.push({
        id: generateId(),
        name: nameInput,
        url: urlInput,
        line: lineId
    });

    localStorage.setItem('crod_shortcuts', JSON.stringify(userShortcuts));
    closeAddShortcutModal();
    renderDashboard();
}

function removeShortcut(id) {
    userShortcuts = userShortcuts.filter(sc => sc.id !== id);
    localStorage.setItem('crod_shortcuts', JSON.stringify(userShortcuts));
    renderDashboard();
}

// Clock tick and Battery logic
function startTime() {
    const today = new Date();

    // YY/MM/DD
    let yy = today.getFullYear().toString().slice(-2);
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let dd = String(today.getDate()).padStart(2, '0');

    // HH:MM:SS
    let h = String(today.getHours()).padStart(2, '0');
    let m = String(today.getMinutes()).padStart(2, '0');
    let s = String(today.getSeconds()).padStart(2, '0');

    if (document.getElementById('date-part')) {
        document.getElementById('date-part').textContent = `${yy}/${mm}/${dd}`;
    }
    if (document.getElementById('time-part')) {
        document.getElementById('time-part').textContent = `${h}:${m}:${s}`;
    }

    setTimeout(startTime, 1000);
}

// Battery percentage API
document.addEventListener("DOMContentLoaded", function () {
    const batteryPart = document.getElementById("battery-part");
    if (!batteryPart) return;

    if (navigator.getBattery) {
        navigator.getBattery().then(function (battery) {
            updateBatteryLevel(battery.level);
            battery.addEventListener("levelchange", function () {
                updateBatteryLevel(battery.level);
            });
        });
    } else {
        batteryPart.textContent = "100%";
    }

    function updateBatteryLevel(level) {
        batteryPart.textContent = Math.round(level * 100) + "%";
    }
});

// Search Engine Toggle menu
function toggleEngineMenu() {
    const dropdown = document.getElementById('engine-dropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function setSearchEngine(engine) {
    currentEngine = engine;
    localStorage.setItem('crod_search_engine', engine);
    updateEngineUI();
    const dropdown = document.getElementById('engine-dropdown');
    if (dropdown) dropdown.classList.remove('active');
}

function updateEngineUI() {
    const iconSpan = document.getElementById('current-engine-icon');
    if (iconSpan) {
        if (currentEngine === 'Google') {
            iconSpan.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=google.com&sz=32" style="width: 18px; vertical-align: middle;" alt="G">`;
        } else if (currentEngine === 'Bing') {
            iconSpan.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=bing.com&sz=32" style="width: 18px; vertical-align: middle;" alt="B">`;
        } else if (currentEngine === 'DuckDuckGo') {
            iconSpan.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=duckduckgo.com&sz=32" style="width: 18px; vertical-align: middle;" alt="D">`;
        } else if (currentEngine === 'Brave') {
            iconSpan.innerHTML = `<img src="https://www.google.com/s2/favicons?domain=search.brave.com&sz=32" style="width: 18px; vertical-align: middle;" alt="Br">`;
        }
    }
}

function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        const query = document.getElementById('search-input').value.trim();
        if (!query) return;

        if (currentEngine === 'Google') {
            window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
        } else if (currentEngine === 'Bing') {
            const gotRaped = Math.random().toString().slice(2, 18).padEnd(16, '0');
            window.location.href = `https://www.bing.com/search?q=${encodeURIComponent(query)}&form=QBLH&sp=-1&lq=0&sc=12-8&cvid=${gotRaped}`;
        } else if (currentEngine === 'DuckDuckGo') {
            window.location.href = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
        } else if (currentEngine === 'Brave') {
            window.location.href = `https://search.brave.com/search?q=${encodeURIComponent(query)}`;
        }
    }
}

// Open/Close settings drawer
function toggleSettings() {
    const drawer = document.getElementById('settings-drawer');
    const toggleBtn = document.getElementById('drawer-toggle');
    const toggleIcon = document.getElementById('drawer-toggle-icon');
    if (!drawer || !toggleBtn || !toggleIcon) return;

    drawer.classList.toggle('open');
    toggleBtn.classList.toggle('open');
    if (drawer.classList.contains('open')) {
        toggleIcon.innerHTML = '&gt;';
    } else {
        toggleIcon.innerHTML = '&lt;';
    }
}

// Settings changes handlers
function updateNameSetting() {
    const val = document.getElementById('settings-name').value.trim();
    if (!val) return;

    localStorage.setItem('crod_user_name', val);
    renderDashboard();
}

function updateWallpaperURL() {
    const val = document.getElementById('settings-wp-url').value.trim();
    if (!val) return;

    const type = val.match(/\.(mp4|webm|ogg)/i) ? 'video' : 'image';
    localStorage.setItem('crod_wallpaper', val);
    localStorage.setItem('crod_wallpaper_type', type);
    applyWallpaper(val, type);
}

async function handleWallpaperUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const type = file.type.startsWith('video') ? 'video' : 'image';
    try {
        await saveFileToIDB(file);
        localStorage.setItem('crod_wallpaper', 'indexeddb');
        localStorage.setItem('crod_wallpaper_type', type);
        const blobUrl = URL.createObjectURL(file);
        applyWallpaper(blobUrl, type);
    } catch (err) {
        console.error('Failed to save to IndexedDB:', err);
    }
}

async function resetWallpaper() {
    localStorage.setItem('crod_wallpaper', defaultWallpapers);
    localStorage.setItem('crod_wallpaper_type', 'image');
    document.getElementById('settings-wp-url').value = '';
    document.getElementById('settings-wp-file').value = '';
    try {
        await clearIDB();
    } catch (err) {
        console.error('Failed to clear IDB:', err);
    }
    applyWallpaper(defaultWallpapers, 'image');
}

// Generate unique id
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}
