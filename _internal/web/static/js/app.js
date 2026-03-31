/* ========================================================================== */
/* 📁 FILE   : app.js                                                         */
/* ⚙️ VERSI  = "3.9 (Feat: Auto-Updater Logic & Terminal Sync)"                                */
/* ========================================================================== */

let HISTORY_MODE = "clips";
let lastTasksHash = ""; 

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast-notification');
    const msgEl = document.getElementById('toast-msg');
    if(!toast || !msgEl) return;
    
    msgEl.innerText = msg;
    toast.className = isError 
        ? 'absolute top-6 right-6 z-50 shadow-2xl rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300 transform translate-y-0 opacity-100 bg-red-900/90 border border-red-700 text-white'
        : 'absolute top-6 right-6 z-50 shadow-2xl rounded-lg px-6 py-3 text-sm font-medium transition-all duration-300 transform translate-y-0 opacity-100 bg-slate-800 border border-slate-700 text-slate-200';
    
    setTimeout(() => { toast.classList.remove('translate-y-0', 'opacity-100'); toast.classList.add('translate-y-[-100%]', 'opacity-0'); }, 3000);
}

function switchPage(pageId, btnElement) {
    document.querySelectorAll('.page').forEach(p => { p.classList.add('hidden'); p.classList.remove('block', 'flex'); });
    const targetPage = document.getElementById('page-' + pageId);
    if(!targetPage) return;
    
    targetPage.classList.remove('hidden');
    if(['history', 'studio'].includes(pageId)) targetPage.classList.add('flex', 'flex-col'); else targetPage.classList.add('block');

    if(btnElement) {
        document.querySelectorAll('.nav-btn').forEach(btn => { btn.className = 'nav-btn hover:bg-slate-800 text-slate-400 hover:text-slate-200 w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-base font-semibold tracking-wide'; });
        btnElement.classList.remove('text-slate-400', 'hover:bg-slate-800', 'hover:text-slate-200'); btnElement.classList.add('text-white', 'shadow-lg');
        
        if (pageId === 'welcome') btnElement.classList.add('bg-indigo-600', 'shadow-indigo-900/20');
        else if (pageId === 'sosmed') btnElement.classList.add('bg-emerald-600', 'shadow-emerald-900/20');
        else if (pageId === 'hook') btnElement.classList.add('bg-purple-600', 'shadow-purple-900/20');
        else btnElement.classList.add('bg-blue-600', 'shadow-blue-900/20');
    }

    if(['dashboard', 'history', 'welcome', 'hook'].includes(pageId)) loadStats();
    if(pageId === 'settings') { loadGlobalSettings(); checkWhisperStatus(); }
    if(pageId === 'presets') loadPresetsUI();
}

async function openInExplorer(path) {
    try {
        if (!path || path === 'undefined') { let res = await fetch('/api/settings/get?_cb=' + new Date().getTime(), {cache:'no-store'}); let data = await res.json(); path = data.yt_path; }
        if (!path) return showToast("⚠️ Path folder tidak ditemukan.", true);
        if (path.toLowerCase().endsWith('.mp4')) { let lastSlash = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/')); if (lastSlash > -1) path = path.substring(0, lastSlash); }
        showToast("📂 Membuka folder penyimpanan...");
        await fetch(`/api/open-folder?path=${encodeURIComponent(path)}&_cb=` + new Date().getTime(), {cache:'no-store'});
    } catch (err) { showToast("❌ Gagal membuka folder: " + err.message, true); }
}

// -----------------------------
// CINEMATIC MODAL LOGIC
// -----------------------------
function openVideoModal(filepath) {
    if (!filepath || filepath === 'undefined') return showToast("⚠️ File belum tersedia.", true);
    
    const modal = document.getElementById('video-modal-overlay');
    const container = document.getElementById('modal-video-container');
    let player = document.getElementById('global-clip-player');
    
    if (!modal || !container || !player) return;

    // Pindahkan player ke dalam modal
    container.appendChild(player);
    player.classList.remove('hidden', 'absolute');
    player.className = "w-full h-full object-contain outline-none bg-black"; 
    
    let targetSrc = `/api/play-file?file=${encodeURIComponent(filepath)}`;
    if (player.src !== new URL(targetSrc, document.baseURI).href) { 
        player.src = targetSrc; 
        player.load(); 
    }
    
    modal.classList.remove('hidden');
    // Efek Transisi Masuk
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        container.classList.remove('scale-95');
        container.classList.add('scale-100');
    }, 10);

    player.play().catch(e => console.log("Autoplay ditahan browser"));
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal-overlay');
    const container = document.getElementById('modal-video-container');
    let player = document.getElementById('global-clip-player');
    
    if (player) player.pause();

    if (modal && container) {
        modal.classList.add('opacity-0');
        container.classList.remove('scale-100');
        container.classList.add('scale-95');
        
        // Efek Transisi Keluar
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
}

// -----------------------------
// COMMAND CENTER LIVE ENGINE
// -----------------------------
function renderDashboardTasks(tasks) {
    const container = document.querySelector('#page-studio #dashboard-tasks-container');
    if (!container) return; 

    const currentHash = JSON.stringify(tasks);
    if (currentHash === lastTasksHash) return;
    lastTasksHash = currentHash;

    // >>> INTISARI_UPDATE_BLOCK: SOSMED LIVE TRACKER SYNC <<<
    if (typeof activeSosmedTaskId !== 'undefined' && activeSosmedTaskId) {
        let sTask = tasks.find(t => t.id === activeSosmedTaskId);
        if (sTask) {
            const sStatus = document.getElementById('sosmed-tracker-status');
            const sBar = document.getElementById('sosmed-tracker-bar');
            const sPct = document.getElementById('sosmed-tracker-pct');
            const sAction = document.getElementById('sosmed-tracker-action');
            const sPath = document.getElementById('sosmed-tracker-path');
            const sBtn = document.getElementById('sosmed-btn-open');
            
            if (sStatus && !document.getElementById('sosmed-dynamic-thumb')) {
                let html = `<div id="sosmed-dynamic-thumb" class="flex items-center gap-4 mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700 shadow-md">
                    <img src="${sTask.thumbnail || '/static/assets/Thumbnail.png'}" class="w-16 h-16 object-cover rounded-lg border border-slate-600">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-bold text-slate-100 truncate">${sTask.judul || 'Mengekstrak Metadata...'}</h4>
                        <p class="text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-wider"><i class="fa-solid fa-hashtag"></i> ${sTask.project || 'Auto_Detect'}</p>
                    </div>
                </div>`;
                sStatus.parentNode.insertAdjacentHTML('afterbegin', html);
            } else if (document.getElementById('sosmed-dynamic-thumb')) {
                let thumbEl = document.getElementById('sosmed-dynamic-thumb');
                let img = thumbEl.querySelector('img');
                if(sTask.thumbnail && img.src.includes('Thumbnail.png')) img.src = sTask.thumbnail;
                thumbEl.querySelector('h4').innerText = sTask.judul || 'Mengekstrak Metadata...';
            }

            let isError = sTask.status === 'error';
            let isDone = sTask.status === 'done';
            let prog = sTask.overallProgress || 0;
            
            if (sBar) sBar.style.width = prog + '%';
            if (sPct) sPct.innerText = prog + '%';
            
            if (isDone) {
                if (sStatus) { sStatus.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i>Berhasil Diunduh!`; sStatus.className = 'font-bold text-emerald-400'; }
                if (sBar) sBar.className = 'bg-emerald-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]';
                if (sAction) sAction.classList.remove('hidden');
                
                let fPath = sTask.full_path || "";
                if (sPath) sPath.innerText = fPath;
                
                // Regex aman untuk escape backslash Windows sebelum dimasukkan ke onclick
                let safeClickPath = fPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                if (sBtn) sBtn.setAttribute('onclick', "openInExplorer('" + safeClickPath + "')");
                
                activeSosmedTaskId = null; // Lepas radar
            } else if (isError) {
                if (sStatus) { sStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-2"></i>Gagal Memproses`; sStatus.className = 'font-bold text-red-400'; }
                if (sBar) sBar.className = 'bg-red-500 h-2 rounded-full transition-all duration-300';
                activeSosmedTaskId = null;
            } else {
                if (sStatus && sStatus.innerText.includes('Mengekstrak')) { 
                    sStatus.innerHTML = `<i class="fa-solid fa-cloud-arrow-down fa-bounce mr-2"></i>Sedang Mengunduh & Memproses...`; 
                }
                if (sBar) sBar.className = 'bg-gradient-to-r from-blue-600 to-emerald-500 h-2 rounded-full transition-all duration-300';
            }
        }
    }
    // >>> END OF UPDATE BLOCK <<<

    // >>> INTISARI_UPDATE_BLOCK: SMART NOTIFICATION <<<
    if (typeof window.notifiedTracker === 'undefined') {
        window.notifiedTracker = new Set();
        // Minta Izin Notifikasi Desktop Windows/Mac
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }

    // Pindai tugas yang baru saja selesai
    tasks.forEach((t) => {
        // Notifikasi Master Video
        if (t.status === 'done' && !window.notifiedTracker.has(t.id)) {
            window.notifiedTracker.add(t.id);
            showToast("🎉 TUGAS SELESAI: " + (t.judul || "Video"));
            
            // Tembakkan Notifikasi Desktop jika diizinkan
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Intisari Clips Engine", { 
                    body: "Tugas selesai: " + (t.judul || "Video"),
                    icon: "/static/assets/Thumbnail.png"
                });
            }
        }
        
        // Notifikasi Sub-Klip
        (t.klip || []).forEach((c, cIdx) => {
            let cid = t.id + "_clip_" + cIdx;
            if (c.status === 'done' && !window.notifiedTracker.has(cid)) {
                window.notifiedTracker.add(cid);
                showToast("✅ Klip #" + (cIdx + 1) + " siap diputar!");
            }
            // >>> INTISARI_UPDATE_BLOCK_START (v3.5 - Desktop Error Notification) <<<
            else if (c.status === 'error' && !window.notifiedTracker.has(cid + "_err")) {
                window.notifiedTracker.add(cid + "_err");
                let errMsg = c.error || c.message || c.error_msg || "Render Gagal (Timeout/FFmpeg).";
                showToast("❌ Klip #" + (cIdx + 1) + " Gagal: " + errMsg, true);
                
                // Tembakkan Notifikasi Desktop Windows/Mac
                if ("Notification" in window && Notification.permission === "granted") {
                    let notif = new Notification("⚠️ Intisari Clips - Peringatan Engine", { 
                        body: "Klip #" + (cIdx + 1) + " Gagal!\nAlasan: " + errMsg,
                        icon: "/static/assets/error.gif",
                        requireInteraction: true // Notifikasi tidak akan hilang sampai di-klik/ditutup user
                    });
                    
                    notif.onclick = function() {
                        window.focus(); // Bawa user kembali ke tab Intisari Clips jika notifikasi diklik
                        this.close();
                    };
                }
            }
            // >>> INTISARI_UPDATE_BLOCK_END <<<
        });
    });
    // >>> END OF UPDATE BLOCK <<<

    const commandCenterTasks = tasks ? tasks.filter(t => !t.is_sosmed) : [];

    if (commandCenterTasks.length === 0) {
        if (!container.innerHTML.includes('Menunggu Transmisi')) {
            container.innerHTML = `<div class="bg-slate-900 border border-slate-800 p-10 rounded-2xl text-center shadow-xl animate-fade-in"><i class="fa-solid fa-satellite-dish text-4xl text-slate-600 mb-4 animate-pulse"></i><h4 class="font-bold text-slate-300">Menunggu Transmisi</h4><p class="text-sm text-slate-500 mt-2">Daftar tugas dari Ekstensi Chrome akan muncul di sini secara real-time.</p></div>`;
        }
        return;
    }

    let html = '';
    const sortedTasks = [...commandCenterTasks].reverse();

    sortedTasks.forEach((task, tIdx) => {
        let overallProg = task.overallProgress || 0;
        let clipsHtml = '';
        let safeThumb = task.thumbnail || '/static/assets/Thumbnail.png';
        let safeTaskTitle = (task.judul || 'Task').replace(/\s/g,'');

        (task.klip || []).forEach((subclip, idx) => {
            let isDone = subclip.status === 'done'; 
            let isProc = subclip.status === 'processing';
            let isErr = subclip.status === 'error';
            
            let rawPath = subclip.full_path || subclip.path || subclip.file || task.full_path || "";
            let safePath = rawPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
// >>> INTISARI_UPDATE_BLOCK_START (v3.4 - Error Text Propagation) <<<
            let statusColor = isDone ? 'text-emerald-400' : (isProc ? 'text-blue-400' : (isErr ? 'text-red-400' : 'text-slate-500'));
            let barColor = isDone ? 'bg-emerald-500' : (isProc ? 'bg-gradient-to-r from-blue-600 to-blue-400' : (isErr ? 'bg-red-500' : 'bg-slate-600'));
            let prog = isDone ? 100 : (isProc ? (subclip.progress || 0) : (isErr ? 100 : 0));
            
            let errMsg = subclip.error || subclip.message || subclip.error_msg || "Render Gagal (FFmpeg Error / Out of Bounds)";
            let iconText = isDone ? '<i class="fa-solid fa-check-circle mr-1"></i> Render Selesai' : (isProc ? '<span class="live-render-text"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Memproses FFmpeg...</span>' : (isErr ? `<i class="fa-solid fa-triangle-exclamation mr-1"></i> ${errMsg}` : '<i class="fa-solid fa-hourglass-start mr-1"></i> Menunggu...'));
// >>> INTISARI_UPDATE_BLOCK_END <<<

            let thumbHtml = '';
            if (isDone) {
                thumbHtml = `<div class="relative w-32 md:w-28 shrink-0 mx-auto md:mx-0 aspect-[9/16] bg-black rounded-lg flex items-center justify-center group cursor-pointer border border-slate-800 overflow-hidden shadow-lg" onclick="openVideoModal('${safePath}')">
                    <img src="${safeThumb}" onerror="this.onerror=null; this.src='/static/assets/Thumbnail.png';" class="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 transition duration-300 transform group-hover:scale-105 thumb-img">
                    <i class="fa-solid fa-circle-play text-4xl text-white/80 group-hover:text-emerald-400 transition relative z-10 drop-shadow-lg play-icon"></i>
                </div>`;
            } else if (isProc) {
                thumbHtml = `<div class="relative w-32 md:w-28 shrink-0 mx-auto md:mx-0 aspect-[9/16] bg-black rounded-lg flex items-center justify-center border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.2)] overflow-hidden">
                    <img src="/static/assets/waiting.gif" class="absolute inset-0 w-full h-full object-cover opacity-80">
                    <div class="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
                </div>`;
            } else if (isErr) {
                thumbHtml = `<div class="relative w-32 md:w-28 shrink-0 mx-auto md:mx-0 aspect-[9/16] bg-black rounded-lg flex items-center justify-center border border-red-500/50 overflow-hidden">
                    <img src="/static/assets/error.gif" class="absolute inset-0 w-full h-full object-cover opacity-80">
                </div>`;
            } else {
                thumbHtml = `<div class="relative w-32 md:w-28 shrink-0 mx-auto md:mx-0 aspect-[9/16] bg-slate-950 rounded-lg flex items-center justify-center border border-slate-800 overflow-hidden">
                    <img src="/static/assets/waiting.gif" class="absolute inset-0 w-full h-full object-cover opacity-30 grayscale">
                </div>`;
            }

            let btnHtml = isDone ? `<button onclick="openInExplorer('${safePath}')" class="bg-slate-800 hover:bg-slate-700 text-white px-4 md:px-3 py-2 md:py-1.5 rounded text-xs font-bold transition w-full md:w-auto border border-slate-700 hover:border-emerald-500"><i class="fa-solid fa-folder-open mr-1"></i> Buka Folder</button>` : '';
            // >>> INTISARI_UPDATE_BLOCK_START (v3.4 - Error Wrapper Style) <<<
            let wrapperClass = isProc ? "flex flex-col md:flex-row gap-4 bg-slate-800/80 p-3 rounded-xl border border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)] relative overflow-hidden" : (isDone ? "flex flex-col md:flex-row gap-4 bg-slate-950/50 p-3 rounded-xl border border-emerald-900/30 hover:bg-slate-800 transition" : (isErr ? "flex flex-col md:flex-row gap-4 bg-red-950/20 p-3 rounded-xl border border-red-900/50 transition" : "flex flex-col md:flex-row gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800 opacity-60"));
// >>> INTISARI_UPDATE_BLOCK_END <<<

            clipsHtml += `<div class="${wrapperClass}">${isProc ? `<div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>` : ''}${thumbHtml}<div class="flex-1 flex flex-col justify-center text-center md:text-left"><h4 class="font-bold text-slate-200">Klip #${idx+1}: ${subclip.title || 'Video'}</h4><p class="text-xs text-slate-400 font-mono mt-1"><i class="fa-regular fa-clock"></i> ${subclip.time || '--'}</p><div class="mt-4"><div class="flex justify-between text-[11px] mb-1"><span class="${statusColor} font-bold ${isProc?'animate-pulse':''}">${iconText}</span><span class="${statusColor} font-bold">${prog}%</span></div><div class="w-full bg-slate-800 rounded-full h-1.5"><div class="${barColor} h-1.5 rounded-full relative transition-all duration-300" style="width: ${prog}%"></div></div></div></div><div class="flex flex-col justify-center gap-2 md:border-l border-slate-800 md:pl-4 mt-2 md:mt-0 items-center md:items-stretch">${btnHtml}</div></div>`;
        });

        // >>> INTISARI_UPDATE_BLOCK_START (v3.3) <<<
        let ccTaskID = task.id || `cc-task-${tIdx}`;
        html += `<div class="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl mb-6 hover:border-slate-600 transition-colors animate-fade-in overflow-hidden">
            <button onclick="document.getElementById('task-clips-${ccTaskID}').classList.toggle('hidden'); document.getElementById('icon-task-${ccTaskID}').classList.toggle('rotate-180')" class="w-full text-left p-6 bg-slate-900 hover:bg-slate-800 transition-colors group focus:outline-none">
                <div class="flex flex-col md:flex-row gap-5">
                    <div class="w-full md:w-48 aspect-video bg-black rounded-lg overflow-hidden relative shadow-md shrink-0 border border-slate-800 group-hover:border-slate-600 transition-colors">
                        <img src="${safeThumb}" onerror="this.onerror=null; this.src='/static/assets/Thumbnail.png';" class="w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity">
                        <div class="absolute inset-0 flex items-center justify-center"><i class="fa-brands fa-youtube text-4xl text-red-600/80 group-hover:text-red-500 transition-colors drop-shadow-lg"></i></div>
                    </div>
                    <div class="flex-1 min-w-0 flex flex-col justify-center">
                        <div class="flex justify-between items-start gap-4">
                            <h4 class="text-xl font-bold text-white truncate flex-1 group-hover:text-blue-400 transition-colors">${task.judul || 'Task Platform'}</h4>
                            <div class="flex items-center gap-3 bg-slate-950/50 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                                <span class="text-[10px] font-bold text-slate-400"><span class="text-blue-400">${(task.klip || []).length}</span> Klip</span>
                                <i id="icon-task-${ccTaskID}" class="fa-solid fa-chevron-up text-slate-500 text-sm transition-transform duration-300"></i>
                            </div>
                        </div>
                        <div class="mt-5">
                            <div class="flex justify-between text-xs mb-1.5">
                                <span class="text-slate-400 font-medium group-hover:text-slate-300 transition-colors">Progress Keseluruhan Master</span>
                                <span class="text-blue-400 font-bold">${overallProg}%</span>
                            </div>
                            <div class="w-full bg-slate-800 rounded-full h-2.5 shadow-inner">
                                <div class="bg-gradient-to-r from-blue-600 to-blue-400 h-2.5 rounded-full relative transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style="width: ${overallProg}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </button>
            
            <div id="task-clips-${ccTaskID}" class="p-6 bg-[#0B1120] border-t border-slate-800 space-y-4">
                ${clipsHtml}
            </div>
        </div>`;
        // >>> INTISARI_UPDATE_BLOCK_END <<<
    });

    // Menahan player jika berada di tempat lain (bukan di dalam modal)
    let player = document.getElementById('global-clip-player');
    let modal = document.getElementById('video-modal-overlay');
    // Jangan hide player jika modal sedang terbuka
    if (player && modal && modal.classList.contains('hidden')) { 
        document.body.appendChild(player); 
        player.classList.add('hidden'); 
    }
    
    container.innerHTML = html;
}

function fetchTasksSilently() { fetch('/api/dashboard/tasks?_cb=' + new Date().getTime(), { cache: 'no-store' }).then(res => res.json()).then(data => { if (data && data.tasks) renderDashboardTasks(data.tasks); }).catch(e=>{}); }
setInterval(fetchTasksSilently, 2500); 

// >>> INTISARI_UPDATE: FUNGSI CLEAR TRACKER <<<
async function clearAllTasks() {
    if(!confirm("⚠️ Yakin ingin membersihkan semua riwayat radar? (File yang sudah diunduh TIDAK akan terhapus).")) return;
    try {
        const res = await fetch('/api/tasks/clear', { method: 'POST' });
        if(res.ok) {
            showToast("🧹 Tracker berhasil dibersihkan!");
            
            // Reset Paksa UI Sosmed Tracker jika sedang terbuka
            const sTracker = document.getElementById('sosmed-live-tracker');
            const sDesc = document.getElementById('sosmed-engine-desc');
            const sBar = document.getElementById('sosmed-tracker-bar');
            if(sTracker) sTracker.classList.add('hidden');
            if(sDesc) sDesc.classList.remove('hidden');
            if(sBar) { sBar.style.width = '0%'; sBar.className = 'bg-slate-600 h-2 rounded-full'; }
            activeSosmedTaskId = null; 
            
            // Reset UI Command Center
            const ccContainer = document.querySelector('#page-studio #dashboard-tasks-container');
            if(ccContainer) ccContainer.innerHTML = `<div class="bg-slate-900 border border-slate-800 p-10 rounded-2xl text-center shadow-xl animate-fade-in"><i class="fa-solid fa-satellite-dish text-4xl text-slate-600 mb-4 animate-pulse"></i><h4 class="font-bold text-slate-300">Menunggu Transmisi</h4><p class="text-sm text-slate-500 mt-2">Daftar tugas akan muncul di sini secara real-time.</p></div>`;
            lastTasksHash = ""; 
        }
    } catch(e) {
        showToast("❌ Gagal membersihkan tracker.", true);
    }
}
// >>> END OF UPDATE <<<

function connectWS() {
    let ws = new WebSocket("ws://" + location.host + "/ws");
    ws.onopen = () => {
        try {
            document.getElementById('ws-status').className = 'text-[10px] font-bold text-emerald-400 font-mono mt-0.5';
            document.getElementById('ws-status').innerText = '127.0.0.1:8588 (Active)';
            document.getElementById('ws-ping').className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
            document.getElementById('ws-dot').className = 'relative inline-flex rounded-full h-3 w-3 bg-emerald-500';
            let apiIcon = document.getElementById('api-status-icon'); let apiText = document.getElementById('api-status-text');
            if(apiIcon) apiIcon.className = "fa-solid fa-satellite-dish text-emerald-500 text-lg animate-pulse";
            if(apiText) apiText.innerText = "Terkoneksi ke Socket";
        } catch(e) {}
        fetchTasksSilently();
    };
    ws.onmessage = (event) => {
        let data = JSON.parse(event.data);
        if (data.type === 'dashboard_sync' && data.tasks) renderDashboardTasks(data.tasks);
        
        // >>> INTISARI_UPDATE_BLOCK_START (v2.9_SOCKET) <<<
        if (data.type === 'plugin_download_progress') {
            const progBar = document.getElementById('progress-bar-whisper');
            const progText = document.getElementById('progress-text-whisper');
            if (progBar) progBar.style.width = data.progress + '%';
            if (progText) progText.innerText = `Mengunduh ${data.file}... ${data.progress}%`;
        }
        if (data.type === 'plugin_download_complete') {
            const progContainer = document.getElementById('progress-container-whisper');
            const btn = document.getElementById('btn-install-whisper');
            if (data.success) {
                showToast("✅ Plugin Whisper berhasil diinstal!");
                checkWhisperStatus();
                if (progContainer) setTimeout(() => progContainer.classList.add('hidden'), 2000);
            } else {
                showToast("❌ Gagal mengunduh plugin. Cek koneksi atau log terminal.", true);
                if (progContainer) progContainer.classList.add('hidden');
                if (btn) {
                    btn.innerHTML = '<i class="fa-solid fa-download"></i> Coba Lagi';
                    btn.disabled = false;
                }
            }
        }
        // >>> INTISARI_UPDATE_BLOCK_END <<<
                // >>> INTISARI_UPDATE_BLOCK_START (v3.9 - Updater WS) <<<
        if (data.type === 'update_log' && data.message) {
            const logViewer = document.getElementById('update-log-viewer');
            if (logViewer) {
                logViewer.innerHTML += data.message + '\n';
                logViewer.scrollTop = logViewer.scrollHeight; // Auto-scroll ke bawah
            }
            if (data.message.includes('[UPDATER] Pembaruan struktur proyek selesai!')) {
                const btn = document.getElementById('btn-check-update');
                if (btn) { btn.innerHTML = '<i class="fa-solid fa-check"></i> Selesai'; }
                showToast("✅ Pembaruan selesai! Muat ulang halaman (F5) untuk menerapkan UI baru.");
            }
        }
        // >>> INTISARI_UPDATE_BLOCK_END <<<
        if (data.type === 'terminal_log' && data.message) {
            let msg = data.message;
            let targetEls = document.querySelectorAll('.live-render-text');
            if (msg.includes('[RENDERING]')) {
                let match = msg.match(/Waktu:\s*([\d:]+)/);
                if (match) targetEls.forEach(el => { el.innerHTML = `<i class="fa-solid fa-gear fa-spin mr-1 text-blue-400"></i> Render: ${match[1]}`; });
            } 
            else if (msg.includes('Phase 2') || msg.includes('Mendengarkan') || msg.includes('[AI]')) {
                targetEls.forEach(el => { el.innerHTML = `<i class="fa-solid fa-robot fa-bounce mr-1 text-purple-400"></i> AI Transkripsi...`; });
            } 
            else if (msg.includes('Phase 3') || msg.includes('Membakar Teks')) {
                targetEls.forEach(el => { el.innerHTML = `<i class="fa-solid fa-fire fa-beat mr-1 text-orange-500"></i> Membakar Subtitle...`; });
            }
        }
    };
    ws.onclose = () => {
        document.getElementById('ws-status').className = 'text-[10px] font-bold text-red-400 font-mono mt-0.5'; document.getElementById('ws-status').innerText = 'Disconnected...';
        document.getElementById('ws-ping').className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75'; document.getElementById('ws-dot').className = 'relative inline-flex rounded-full h-3 w-3 bg-red-500';
        setTimeout(connectWS, 3000);
    };
}
connectWS();
document.addEventListener('DOMContentLoaded', fetchSystemHealth);

async function loadStats() {
    try {
        let res = await fetch('/api/stats?_cb=' + new Date().getTime(), { cache: 'no-store' }); let data = await res.json();
        const statTotal = document.getElementById('stat-total-clips'); const statStorage = document.getElementById('stat-storage');
        if(statTotal) statTotal.innerText = data.total_clips || data.total || 0; if(statStorage) statStorage.innerText = data.storage_used || data.storage || "0 MB";
        const hContainer = document.getElementById('history-container'); if(!hContainer) return;
        if(!data.history || data.history.length === 0) { hContainer.innerHTML = '<p class="text-slate-500 italic text-sm text-center mt-10">Belum ada riwayat Vault.</p>'; } else {
            const groupedData = { "YouTube": {}, "TikTok": {}, "Instagram": {}, "Batch / Local": {} };
            data.history.forEach(log => {
                let platform = "Batch / Local"; const urlStr = (log.url || "").toLowerCase();
                if (urlStr.includes("youtube.com") || urlStr.includes("youtu.be")) platform = "YouTube"; else if (urlStr.includes("tiktok.com")) platform = "TikTok"; else if (urlStr.includes("instagram.com")) platform = "Instagram"; else if (log.platform && log.platform.toLowerCase().includes("youtube")) platform = "YouTube";
                let projectName = "Uncategorized"; if (log.full_path) { const pathParts = log.full_path.replace(/\\/g, '/').split('/'); if (pathParts.length > 1) projectName = pathParts[pathParts.length - 2]; }
                if (!groupedData[platform][projectName]) groupedData[platform][projectName] = []; groupedData[platform][projectName].push(log);
            });
            let vaultHTML = '';
            // >>> INTISARI_UPDATE: MODERN HISTORY VAULT UI <<<
            Object.keys(groupedData).forEach(platKey => {
                const projects = groupedData[platKey]; const projectKeys = Object.keys(projects); if (projectKeys.length === 0) return;
                
                let pIcon = "fa-file-video text-slate-400"; let pBg = "bg-slate-800 border-slate-700";
                if (platKey === "YouTube") { pIcon = "fa-youtube text-red-500"; pBg = "bg-red-500/10 border-red-500/20"; }
                if (platKey === "TikTok") { pIcon = "fa-tiktok text-slate-200"; pBg = "bg-slate-700/30 border-slate-600"; }
                if (platKey === "Instagram") { pIcon = "fa-instagram text-pink-500"; pBg = "bg-pink-500/10 border-pink-500/20"; }
                
                vaultHTML += `<div class="mb-8"><div class="flex items-center gap-3 mb-5"><div class="w-10 h-10 rounded-xl ${pBg} border flex items-center justify-center shadow-lg"><i class="fa-brands ${pIcon} text-xl"></i></div><h3 class="text-xl font-black text-white tracking-wide">${platKey}</h3></div><div class="space-y-4">`;
                
                projectKeys.forEach((projName, pIdx) => {
                    const clips = projects[projName]; const projId = `acc-${platKey.replace(/\s/g,'')}-${pIdx}`; const totalClips = clips.filter(c => !(c.title||"").startsWith("MASTER_")).length;
                    
                    vaultHTML += `<div class="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md hover:border-slate-700 transition-all duration-300"><button onclick="document.getElementById('${projId}-vault').classList.toggle('hidden'); document.getElementById('${projId}-icon').classList.toggle('rotate-180')" class="w-full bg-slate-900 hover:bg-slate-800 p-5 flex justify-between items-center transition-colors group"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors"><i class="fa-solid fa-folder-open text-blue-400 text-lg"></i></div><h4 class="text-base font-bold text-slate-200 text-left tracking-wide">${projName}</h4></div><div class="flex items-center gap-4 shrink-0"><span class="bg-slate-950 border border-slate-800 text-slate-400 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-inner">${totalClips} Klip</span><i id="${projId}-icon" class="fa-solid fa-chevron-down text-slate-500 text-sm transition-transform duration-300"></i></div></button><div id="${projId}-vault" class="hidden p-5 bg-[#0B1120] border-t border-slate-800 space-y-3">`;
                    
                    clips.forEach(log => {
                        const isMaster = log.title && log.title.startsWith("MASTER_"); 
                        const badgeBg = log.status === 'Success' ? 'bg-emerald-900/30 border-emerald-800 text-emerald-400' : 'bg-red-900/30 border-red-800 text-red-400';
                        const safePathVault = (log.full_path || "").replace(/\\/g, '\\\\').replace(/'/g, "\\'"); 
                        let actionBtn = '';
                        
                        if (log.full_path && log.status === 'Success') actionBtn = `<button onclick="openInExplorer('${safePathVault}')" class="bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white text-[10px] font-bold px-3 py-1.5 rounded-lg border border-blue-500/30 hover:border-blue-500 transition-all shadow-sm flex items-center gap-2 w-full sm:w-auto justify-center"><i class="fa-solid fa-folder-open"></i> Buka Folder</button>`;
                        
                        vaultHTML += `<div class="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:bg-slate-800 hover:border-slate-600 transition-all duration-300"><div class="flex-1 min-w-0 pr-0 sm:pr-4"><div class="flex items-center gap-3 mb-2.5"><div class="w-8 h-8 rounded-lg ${isMaster ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-700/50 border-slate-600'} border flex items-center justify-center shrink-0"><i class="${isMaster ? 'fa-solid fa-crown text-amber-400' : 'fa-solid fa-film text-slate-400'} text-xs"></i></div><h3 class="text-sm font-bold ${isMaster ? 'text-amber-400' : 'text-slate-200'} truncate">${log.title || 'Task'}</h3></div><div class="bg-slate-950 px-3 py-2 rounded-lg border border-slate-800/80 flex items-center gap-2"><i class="fa-solid fa-hard-drive text-slate-600 text-[10px]"></i><p class="text-[10px] font-mono text-slate-400 truncate">${log.full_path || log.url || ''}</p></div></div><div class="shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 sm:gap-2 border-t sm:border-t-0 border-slate-700/50 pt-3 sm:pt-0"><span class="px-2.5 py-1 text-[9px] font-black uppercase rounded border ${badgeBg} shadow-sm tracking-wider">${log.status}</span>${actionBtn}</div></div>`;
                    }); vaultHTML += `</div></div>`;
                }); vaultHTML += `</div></div>`;
            });
            // >>> END OF UPDATE <<<
            hContainer.innerHTML = vaultHTML;
        }
    } catch(e) { console.error("Stats Error:", e); }
}

async function clearHistory() { if (!confirm("⚠️ PERINGATAN!\nAnda yakin ingin menghapus histori?")) return; try { let res = await fetch('/api/history/clear', { method: 'POST' }); if(res.ok) { showToast("✅ Histori dibersihkan!"); loadStats(); } } catch(e) {} }
async function fetchSystemHealth() { try { await fetch('/api/health/system?_cb=' + new Date().getTime(), {cache:'no-store'}); loadStats(); } catch(e) {} }

let activeSosmedTaskId = null; // Variabel Global Tracker
async function grabSosmedVideo() {
    const url = document.getElementById('sosmed-url').value; const platform = document.getElementById('sosmed-platform').value;
    if(!url.trim()) return showToast("⚠️ Masukkan URL Video!", true);
    const btn = document.getElementById('btn-sosmed-download'); const origHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-xl"></i> MENGHUBUNGKAN ENGINE...`; btn.disabled = true;
    
    // UI Switcher
    const tracker = document.getElementById('sosmed-live-tracker');
    const trackerDesc = document.getElementById('sosmed-engine-desc');
    if(tracker) {
        tracker.classList.remove('hidden');
        let oldThumb = document.getElementById('sosmed-dynamic-thumb');
        if (oldThumb) oldThumb.remove();
        document.getElementById('sosmed-tracker-status').innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i>Mengekstrak Metadata...`;
        document.getElementById('sosmed-tracker-status').className = 'font-bold text-blue-400 animate-pulse';
        document.getElementById('sosmed-tracker-bar').style.width = '0%';
        document.getElementById('sosmed-tracker-pct').innerText = '0%';
        document.getElementById('sosmed-tracker-action').classList.add('hidden');
    }
    if(trackerDesc) trackerDesc.classList.add('hidden');

    try {
        // [INTISARI V3.1: CLIPPER BYPASS] Mengosongkan timestamps agar Engine berhenti di Tahap 2 (Muxing)
        const res = await fetch('/api/viral/start', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url: url, project: `Sosmed_${platform}`, output: "", timestamps: "", ratio: "Original", speed: 1.0, pad_start: 0, pad_end: 0 }) });
        if(!res.ok) throw new Error("Gagal mengunduh file.");
        const data = await res.json();
        
        showToast("🚀 Engine mengambil alih tugas! Pantau indikator di bawah."); 
        document.getElementById('sosmed-url').value = '';
        if(data.task_id) activeSosmedTaskId = data.task_id; // Mengunci radar ke task ini
        
    } catch(e) { 
        showToast("❌ Error: " + e.message, true); 
        if(tracker) tracker.classList.add('hidden');
        if(trackerDesc) trackerDesc.classList.remove('hidden');
    } finally { 
        btn.innerHTML = origHtml; btn.disabled = false; 
        // Penghapusan switchPage agar tetap di halaman Sosmed
    }
}

  // >>> INTISARI_UPDATE_BLOCK_START (v2.9) <<<
// --- PLUGIN MANAGER LOGIC ---
async function checkWhisperStatus() {
    try {
        let res = await fetch('/api/system/plugin/whisper/status?_cb=' + new Date().getTime(), { cache: 'no-store' });
        let data = await res.json();
        
        const badge = document.getElementById('status-whisper');
        const btn = document.getElementById('btn-install-whisper');
        
        if (data.installed) {
            if (badge) {
                badge.className = "px-3 py-1 rounded-full bg-emerald-900/50 text-emerald-400 text-xs font-bold border border-emerald-800 flex items-center gap-2";
                badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Installed & Ready';
            }
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Update Plugin';
                btn.className = "bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 border border-slate-600";
            }
        } else {
            if (badge) {
                badge.className = "px-3 py-1 rounded-full bg-red-900/50 text-red-400 text-xs font-bold border border-red-800 flex items-center gap-2";
                badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Not Installed';
            }
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-download"></i> Install Plugin';
                btn.className = "bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2";
            }
        }
    } catch (error) {
        console.error("Gagal mengecek status plugin:", error);
    }
}

async function installWhisperPlugin() {
    const btn = document.getElementById('btn-install-whisper');
    const progContainer = document.getElementById('progress-container-whisper');
    const progBar = document.getElementById('progress-bar-whisper');
    const progText = document.getElementById('progress-text-whisper');
    
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan...';
        btn.disabled = true;
    }
    
    if (progContainer) progContainer.classList.remove('hidden');
    if (progBar) progBar.style.width = '0%';
    if (progText) progText.innerText = 'Memulai unduhan...';

    try {
        let res = await fetch('/api/system/plugin/whisper/install', { method: 'POST' });
        if (!res.ok) throw new Error("Gagal memulai proses instalasi.");
        showToast("🚀 Proses instalasi dimulai di background!");
    } catch (error) {
        showToast("❌ " + error.message, true);
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-download"></i> Install Ulang';
            btn.disabled = false;
        }
        if (progContainer) progContainer.classList.add('hidden');
    }
}
// >>> INTISARI_UPDATE_BLOCK_END <<<

// >>> INTISARI_UPDATE_BLOCK: SETTINGS LOGIC <<<
async function loadGlobalSettings() {
    try {
        let resPresets = await fetch('/api/presets/list?_cb=' + new Date().getTime(), { cache: 'no-store' });
        let dataPresets = await resPresets.json();
        
        let resSettings = await fetch('/api/settings/get?_cb=' + new Date().getTime(), { cache: 'no-store' });
        let dataSettings = await resSettings.json();

        const selectEl = document.getElementById('setting-default-preset');
        if (selectEl) {
            let optionsHtml = '<option value="">-- Tanpa Preset (Bawaan Engine) --</option>';
            if (dataPresets.presets && dataPresets.presets.length > 0) {
                dataPresets.presets.forEach(p => {
                    optionsHtml += `<option value="${p.name}">${p.name}</option>`;
                });
            } else {
                optionsHtml = '<option value="">-- Belum ada preset dibuat --</option>';
            }
            selectEl.innerHTML = optionsHtml;
            
            if (dataSettings.default_preset) {
                selectEl.value = dataSettings.default_preset;
            }
        }

        if(document.getElementById('set-yt-path')) document.getElementById('set-yt-path').value = dataSettings.yt_path || "";
        if(document.getElementById('set-hk-path')) document.getElementById('set-hk-path').value = dataSettings.hk_path || "";
        if(document.getElementById('set-txt-path')) document.getElementById('set-txt-path').value = dataSettings.txt_path || "";
    } catch (error) {
        console.error("Gagal memuat pengaturan:", error);
    }
}

async function saveGlobalSettings() {
    const btn = document.querySelector('button[onclick="saveGlobalSettings()"]');
    const originalHtml = btn ? btn.innerHTML : "Simpan";
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> MENYIMPAN...'; btn.disabled = true; }

    try {
        const payload = {
            yt_path: document.getElementById('set-yt-path') ? document.getElementById('set-yt-path').value : "",
            hk_path: document.getElementById('set-hk-path') ? document.getElementById('set-hk-path').value : "",
            txt_path: document.getElementById('set-txt-path') ? document.getElementById('set-txt-path').value : "",
            default_preset: document.getElementById('setting-default-preset') ? document.getElementById('setting-default-preset').value : ""
        };

        const res = await fetch('/api/settings/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            showToast("✅ " + (data.message || "Pengaturan berhasil disimpan!"));
        } else {
            throw new Error(data.message || "Gagal menyimpan pengaturan");
        }
    } catch (error) {
        showToast("❌ " + error.message, true);
    } finally {
        if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; }
    }
}
// >>> INTISARI_UPDATE_BLOCK: DELETE PRESET LOGIC <<<
async function deletePreset() {
    const selectEl = document.getElementById('setting-default-preset');
    if (!selectEl) return;
    
    const presetName = selectEl.value;
    if (!presetName) {
        return showToast("⚠️ Pilih preset yang ingin dihapus terlebih dahulu!", true);
    }
    
    if (!confirm(`⚠️ Yakin ingin menghapus preset '${presetName}' secara permanen?`)) return;
    
    try {
        const res = await fetch('/api/presets/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: presetName })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast("✅ " + (data.message || "Preset berhasil dihapus!"));
            loadGlobalSettings(); // Refresh dropdown
        } else {
            throw new Error(data.message || "Gagal menghapus preset");
        }
    } catch (error) {
        showToast("❌ " + error.message, true);
    }
}
// >>> END OF UPDATE BLOCK <<<   // >>> INTISARI_UPDATE_BLOCK_START (v3.6 - CLIPPER ENGINE LOGIC) <<<
async function browseFile(id) {
    try { 
        let res = await fetch('/api/browse-file'); 
        let data = await res.json(); 
        if(data.path) document.getElementById(id).value = data.path; 
    } catch(e) { showToast("Gagal membuka dialog file", true); }
}

async function browseFolder(id) {
    try { 
        let res = await fetch('/api/browse-folder'); 
        let data = await res.json(); 
        if(data.path) document.getElementById(id).value = data.path; 
    } catch(e) { showToast("Gagal membuka dialog folder", true); }
}

function importTxt(event, id) {
    const file = event.target.files[0]; 
    if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) { document.getElementById(id).value = e.target.result; };
    reader.readAsText(file);
}

async function startClipper() {
    const src = document.getElementById('c-src').value;
    if(!src) return showToast("⚠️ Source video belum dipilih!", true);
    
    const out = document.getElementById('c-out').value;
    const proj = document.getElementById('c-proj').value;
    const ts = document.getElementById('c-ts').value;
    const ratio = document.getElementById('c-ratio').value;
    const speed = document.getElementById('c-speed').value;
    const padStart = document.getElementById('c-pad-start').value;
    const padEnd = document.getElementById('c-pad-end').value;
    
    // Tangkap status Toggle Preset Global
    const usePreset = document.getElementById('c-use-preset') ? document.getElementById('c-use-preset').checked : false;

    const btn = document.getElementById('c-btn');
    const progArea = document.getElementById('c-prog-area');
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> MEMULAI ENGINE...'; 
    btn.disabled = true;
    if(progArea) progArea.classList.remove('hidden');

    try {
        const payload = {
            source: src, 
            output: out, 
            project: proj, 
            timestamps: ts, 
            ratio: ratio, 
            speed: parseFloat(speed), 
            pad_start: parseFloat(padStart), 
            pad_end: parseFloat(padEnd), 
            use_global_preset: usePreset // <--- Injeksi ke API
        };
        
        // Ganti '/api/clipper/start' sesuai endpoint API aktual Anda jika berbeda
        const res = await fetch('/api/clipper/start', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify(payload) 
        });
        
        const data = await res.json();
        if(res.ok) {
            showToast("🚀 Batch Clipper berhasil dijalankan! Pantau di Command Center.");
            
            // >>> INTISARI_UPDATE_BLOCK_START (v3.8 - Form Reset) <<<
            if(document.getElementById('c-ts')) document.getElementById('c-ts').value = '';
            if(document.getElementById('c-proj')) document.getElementById('c-proj').value = '';
            // >>> INTISARI_UPDATE_BLOCK_END <<<
            
            // Otomatis pindah ke halaman Command Center
            let studioBtn = document.querySelector('[onclick="switchPage(\'studio\', this)"]');
            if (studioBtn) switchPage('studio', studioBtn);
        } else {
            throw new Error(data.message || "Gagal memulai clipper dari Engine");
        }
    } catch(e) {
        showToast("❌ " + e.message, true);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-rocket"></i> START ENGINE'; 
        btn.disabled = false;
        if(progArea) progArea.classList.add('hidden'); // Sembunyikan pseudo-progress area
    }
}
// >>> INTISARI_UPDATE_BLOCK_END <<<

async function triggerHookUpload() {} async function handleHookUpload() {} function removeHookFile() {} function updateHookPreview() {} async function renderHookMerge() {}

// >>> INTISARI_UPDATE_BLOCK_START (v3.9 - Updater Function) <<<
async function checkSystemUpdate() {
    const btn = document.getElementById('btn-check-update');
    const logViewer = document.getElementById('update-log-viewer');
    
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...'; btn.disabled = true; }
    if(logViewer) logViewer.innerHTML = '> Menginisiasi Intisari Auto-Updater Engine...\n';

    try {
        let res = await fetch('/api/system/update', { method: 'POST' });
        let data = await res.json();
        if(!res.ok) throw new Error(data.message || "Gagal memicu pembaruan");
        
        showToast("🚀 Proses update ditarik ke background. Pantau log terminal!");
    } catch (error) {
        showToast("❌ " + error.message, true);
        if(logViewer) logViewer.innerHTML += `> [ERROR] ${error.message}\n`;
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Coba Lagi'; btn.disabled = false; }
    }
}
// >>> INTISARI_UPDATE_BLOCK_END <<<

// >>> INTISARI_UPDATE_BLOCK: STUDIO PRESETS LOGIC <<<
async function loadFontsUI() {
    try {
        let res = await fetch('/api/fonts?_cb=' + new Date().getTime(), { cache: 'no-store' });
        let data = await res.json();
        const fontSelect = document.getElementById('preset-font');
        if(fontSelect) {
            let html = '';
            if(data.fonts && data.fonts.length > 0) {
                data.fonts.forEach(f => { html += `<option value="${f}">${f}</option>`; });
            } else {
                html = '<option value="Arial">Arial (Default OS)</option>';
            }
            fontSelect.innerHTML = html;
        }
    } catch(e) { console.error("Gagal memuat font:", e); }
}

function updatePresetPreview() {
    const ratio = document.getElementById('preset-ratio') ? document.getElementById('preset-ratio').value : '9:16';
    const font = document.getElementById('preset-font') ? document.getElementById('preset-font').value : 'Arial';
    const size = document.getElementById('preset-size') ? document.getElementById('preset-size').value : 28;
    const color = document.getElementById('preset-color') ? document.getElementById('preset-color').value : '#ffffff';
    const outlineColor = document.getElementById('preset-outline-color') ? document.getElementById('preset-outline-color').value : '#000000';
    const outlineWidth = document.getElementById('preset-outline-width') ? document.getElementById('preset-outline-width').value : 3;
    const marginV = document.getElementById('preset-margin-v') ? document.getElementById('preset-margin-v').value : 80;

    // Update Label UI (Hybrid Input System)
    if(document.getElementById('preset-margin-v-input')) document.getElementById('preset-margin-v-input').value = marginV;
    if(document.getElementById('preset-size-input')) document.getElementById('preset-size-input').value = size;
    if(document.getElementById('preset-outline-width-input')) document.getElementById('preset-outline-width-input').value = outlineWidth;
    if(document.getElementById('lbl-preset-color')) document.getElementById('lbl-preset-color').innerText = color;
    if(document.getElementById('lbl-preview-ratio')) document.getElementById('lbl-preview-ratio').innerText = ratio;

    // Suntik Gaya Teks
    const pText = document.getElementById('preset-preview-text');
    if(pText) {
        // Dynamic Font Loading API (INTISARI PATCH)
    if (font !== 'Arial') {
        const fontUrl = '/api/fonts/serve?name=' + encodeURIComponent(font);
        const customFont = new FontFace(font, `url("${fontUrl}")`);
        
        customFont.load().then((loadedFont) => {
            document.fonts.add(loadedFont);
            pText.style.fontFamily = `"${font}", Arial`;
        }).catch(e => {
            console.error("Gagal meload font preview:", e);
            pText.style.fontFamily = "Arial";
        });
    } else {
        pText.style.fontFamily = font;
    }
        pText.style.fontSize = size + 'px';
        pText.style.color = color;
        pText.style.webkitTextStroke = outlineWidth + 'px ' + outlineColor;
        
        // Atur posisi Margin Bawah
        if (pText.parentElement) {
            pText.parentElement.classList.remove('bottom-20');
            pText.parentElement.style.bottom = marginV + 'px';
        }
    }

    // Suntik Rasio Box Preview
    const pBox = document.getElementById('preset-preview-box');
    if(pBox) {
        pBox.classList.remove('aspect-[9/16]', 'aspect-[16/9]', 'aspect-[1/1]', 'max-w-[280px]', 'max-w-[500px]', 'max-w-[350px]');
        if(ratio === '9:16') { pBox.classList.add('aspect-[9/16]', 'max-w-[280px]'); }
        else if(ratio === '16:9') { pBox.classList.add('aspect-[16/9]', 'max-w-[500px]'); }
        else if(ratio === '1:1') { pBox.classList.add('aspect-[1/1]', 'max-w-[350px]'); }
    }
}

async function loadPresetsUI() {
    await loadFontsUI();
    
    // >>> INTISARI_UPDATE: FORCED DEFAULT PRESET <<<
    const sizeInput = document.getElementById('preset-size');
    if(sizeInput) sizeInput.value = 16;
    
    const fontSelect = document.getElementById('preset-font');
    if(fontSelect && Array.from(fontSelect.options).some(o => o.value.includes('ARIALBD'))) {
        fontSelect.value = 'ARIALBD';
    }
    // >>> END OF FORCED DEFAULT <<<
    // Pasang Sensor DOM (Event Listeners)
    const inputs = ['preset-ratio', 'preset-font', 'preset-size', 'preset-color', 'preset-outline-color', 'preset-outline-width', 'preset-margin-v'];
    inputs.forEach(id => {
        let el = document.getElementById(id);
        if(el) { 
            el.addEventListener('input', updatePresetPreview); 
            el.addEventListener('change', updatePresetPreview); 
        }
    });

    // >>> INTISARI_UPDATE: TWO-WAY DATA BINDING (HYBRID INPUT) <<<
    const syncPairs = [
        { slider: 'preset-size', input: 'preset-size-input' },
        { slider: 'preset-outline-width', input: 'preset-outline-width-input' },
        { slider: 'preset-margin-v', input: 'preset-margin-v-input' }
    ];
    
    syncPairs.forEach(pair => {
        let s = document.getElementById(pair.slider);
        let i = document.getElementById(pair.input);
        if(s && i) {
            // Slider mendikte Input
            s.addEventListener('input', () => { i.value = s.value; updatePresetPreview(); });
            // Input mendikte Slider (dengan pembatasan nilai min/max)
            i.addEventListener('input', () => { 
                let val = Math.max(i.min, Math.min(i.max, i.value)); 
                s.value = val; 
                updatePresetPreview(); 
            });
            // Koreksi otomatis jika user menghapus angka dan mengklik ke luar
            i.addEventListener('blur', () => { 
                let val = Math.max(i.min, Math.min(i.max, i.value || i.min));
                i.value = val;
                s.value = val;
                updatePresetPreview();
            });
        }
    });
    // >>> END OF UPDATE <<<
    // Trigger sekali saat pertama buka
    updatePresetPreview();
}

async function savePresetSettings() {
    const btn = document.querySelector('button[onclick="savePresetSettings()"]');
    const originalHtml = btn ? btn.innerHTML : "Simpan";
    if(btn) { btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> MENYIMPAN...'; btn.disabled = true; }
    
    try {
        const payload = {
            name: document.getElementById('preset-name') ? document.getElementById('preset-name').value : 'Preset AI',
            ratio: document.getElementById('preset-ratio') ? document.getElementById('preset-ratio').value : '9:16',
            smartcrop: document.getElementById('preset-smartcrop') ? document.getElementById('preset-smartcrop').checked : false,
            autosub: document.getElementById('preset-autosub') ? document.getElementById('preset-autosub').checked : true,
            font: document.getElementById('preset-font') ? document.getElementById('preset-font').value : 'Arial',
            size: parseInt(document.getElementById('preset-size') ? document.getElementById('preset-size').value : 28),
            color: document.getElementById('preset-color') ? document.getElementById('preset-color').value : '#ffffff',
            outline_color: document.getElementById('preset-outline-color') ? document.getElementById('preset-outline-color').value : '#000000',
            outline_width: parseInt(document.getElementById('preset-outline-width') ? document.getElementById('preset-outline-width').value : 3),
            margin_v: parseInt(document.getElementById('preset-margin-v') ? document.getElementById('preset-margin-v').value : 80)
        };
        
        const res = await fetch('/api/presets/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if(res.ok) {
            showToast("✅ " + (data.message || "Preset disimpan!"));
            // Auto-Refresh dropdown di Global Settings jika fungsinya ada
            if(typeof loadGlobalSettings === 'function') loadGlobalSettings(); 
        } else { 
            throw new Error(data.message || "Gagal menyimpan preset"); 
        }
    } catch(error) { 
        showToast("❌ " + error.message, true); 
    } finally { 
        if(btn) { btn.innerHTML = originalHtml; btn.disabled = false; } 
    }
}
// >>> END OF STUDIO PRESETS LOGIC <<<