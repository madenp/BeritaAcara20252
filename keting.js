/**
 * JAVASCRIPT UNTUK HALAMAN KETUA TINGKAT
 * File ini menangani logika untuk mengelola data ketua tingkat
 */

// GANTI URL INI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzlRtNU3P1yiV-Y3u2xLKeXqw28tyPP988gsWQ0EgjTkRXpcXiyDhs6d049zM6lWXeXLA/exec';

// State management
let allJadwalData = [];
let selectedMatakuliah = null;
let currentSearchTerm = '';

/**
 * Initialize aplikasi saat halaman dimuat
 */
document.addEventListener('DOMContentLoaded', function () {
    loadAllJadwal();
    setupSearchListener();
});

/**
 * Setup search listener
 */
function setupSearchListener() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            currentSearchTerm = e.target.value.toLowerCase();
            displayJadwalData();
        });
    }
}

/**
 * Load semua data jadwal
 */
async function loadAllJadwal() {
    const loadingEl = document.getElementById('mainLoading');
    const statsContainer = document.getElementById('statsContainer');
    const filledSection = document.getElementById('filledSection');
    const emptySection = document.getElementById('emptySection');
    const emptyState = document.getElementById('emptyState');

    loadingEl.style.display = 'block';
    statsContainer.style.display = 'none';
    filledSection.style.display = 'none';
    emptySection.style.display = 'none';
    emptyState.style.display = 'none';

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getAllJadwal`);
        const result = await response.json();

        if (result.success) {
            allJadwalData = result.data;
            displayJadwalData();
        } else {
            showError('Error: ' + result.error);
        }
    } catch (error) {
        showError('Gagal memuat data: ' + error.message);
    } finally {
        loadingEl.style.display = 'none';
    }
}

/**
 * Display data jadwal yang sudah dikelompokkan
 */
function displayJadwalData() {
    if (allJadwalData.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }

    // Group by Matakuliah-Kelas
    const groupedData = {};
    allJadwalData.forEach(item => {
        const matkul = item.Matakuliah;
        if (!groupedData[matkul]) {
            groupedData[matkul] = {
                matakuliah: matkul,
                ketua: item.Ketua || '',
                nim: item.NIM || '',
                noWa: item.NoWA || '',
                hasKetua: !!(item.Ketua && item.Ketua.trim() !== '')
            };
        }
    });

    // Convert to array
    let dataArray = Object.values(groupedData);

    // Sort A-Z by matakuliah
    dataArray.sort((a, b) => a.matakuliah.localeCompare(b.matakuliah));

    // Filter by search term
    if (currentSearchTerm) {
        dataArray = dataArray.filter(item =>
            item.matakuliah.toLowerCase().includes(currentSearchTerm) ||
            (item.ketua && item.ketua.toLowerCase().includes(currentSearchTerm)) ||
            (item.nim && item.nim.toLowerCase().includes(currentSearchTerm))
        );
    }

    // Separate filled and empty
    const filledData = dataArray.filter(item => item.hasKetua);
    const emptyData = dataArray.filter(item => !item.hasKetua);

    // Update statistics (use original count, not filtered)
    const originalData = Object.values(groupedData);
    const originalFilled = originalData.filter(item => item.hasKetua).length;
    const originalEmpty = originalData.filter(item => !item.hasKetua).length;
    updateStatistics(originalData.length, originalFilled, originalEmpty);

    // Hide all sections first
    document.getElementById('emptySection').style.display = 'none';
    document.getElementById('filledSection').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';

    // Display sections based on filtered data
    if (emptyData.length === 0 && filledData.length === 0) {
        // No results found
        const emptyState = document.getElementById('emptyState');
        emptyState.innerHTML = `
            <div class="empty-state-icon">🔍</div>
            <p>Tidak ada hasil untuk "${currentSearchTerm}"</p>
        `;
        emptyState.style.display = 'block';
    } else {
        // Display empty section first (priority)
        if (emptyData.length > 0) {
            displayEmptySection(emptyData);
        }

        // Then display filled section
        if (filledData.length > 0) {
            displayFilledSection(filledData);
        }
    }
}

/**
 * Update statistics
 */
function updateStatistics(total, filled, empty) {
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statFilled').textContent = filled;
    document.getElementById('statEmpty').textContent = empty;
    document.getElementById('statsContainer').style.display = 'grid';
}

/**
 * Display section untuk mata kuliah yang sudah ada ketua tingkat
 */
function displayFilledSection(data) {
    const section = document.getElementById('filledSection');
    const grid = document.getElementById('filledGrid');

    grid.innerHTML = data.map(item => `
        <div class="keting-card locked">
            <div class="lock-icon">🔒</div>
            <div class="matkul-name">${escapeHtml(item.matakuliah)}</div>
            <div class="keting-info">
                <div class="info-row">
                    <span class="info-label">Ketua:</span>
                    <span class="info-value">${escapeHtml(item.ketua)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">NIM:</span>
                    <span class="info-value">${escapeHtml(item.nim)}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">No WA:</span>
                    <span class="info-value">${escapeHtml(item.noWa)}</span>
                </div>
            </div>
        </div>
    `).join('');

    section.style.display = 'block';
}

/**
 * Display section untuk mata kuliah yang belum ada ketua tingkat
 */
function displayEmptySection(data) {
    const section = document.getElementById('emptySection');
    const grid = document.getElementById('emptyGrid');

    grid.innerHTML = data.map(item => `
        <div class="keting-card available" onclick='openModal(${JSON.stringify(item.matakuliah).replace(/'/g, "&#39;")})'>
            <div class="matkul-name">${escapeHtml(item.matakuliah)}</div>
            <div class="keting-info">
                <div class="info-row">
                    <span class="info-label">Status:</span>
                    <span class="info-value" style="color: #f5576c; font-weight: 600;">Belum ada ketua tingkat</span>
                </div>
                <div class="info-row" style="margin-top: 1rem; color: #667eea; font-weight: 600;">
                    <span>📝 Klik untuk mendaftar</span>
                </div>
            </div>
        </div>
    `).join('');

    section.style.display = 'block';
}

/**
 * Open modal untuk mendaftar sebagai ketua tingkat
 */
function openModal(matakuliah) {
    selectedMatakuliah = matakuliah;
    document.getElementById('modalMatkul').textContent = matakuliah;
    document.getElementById('ketingModal').classList.add('active');

    // Reset form
    document.getElementById('ketingForm').reset();

    // Reset to first tab
    switchTab('existing');

    // Load existing ketua
    loadExistingKetua();

    // Hide messages
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('ketingModal').classList.remove('active');
    selectedMatakuliah = null;
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`content${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
}

/**
 * Load existing ketua tingkat
 */
function loadExistingKetua() {
    const existingKetuaList = document.getElementById('existingKetuaList');
    const noExistingKetua = document.getElementById('noExistingKetua');

    // Get unique ketua from allJadwalData
    const ketuaMap = {};
    allJadwalData.forEach(item => {
        if (item.Ketua && item.Ketua.trim() !== '') {
            const key = item.Ketua.trim();
            if (!ketuaMap[key]) {
                ketuaMap[key] = {
                    nama: item.Ketua.trim(),
                    nim: item.NIM || '',
                    noWa: item.NoWA || '',
                    matakuliah: []
                };
            }
            if (!ketuaMap[key].matakuliah.includes(item.Matakuliah)) {
                ketuaMap[key].matakuliah.push(item.Matakuliah);
            }
        }
    });

    const existingKetua = Object.values(ketuaMap);

    if (existingKetua.length === 0) {
        existingKetuaList.style.display = 'none';
        noExistingKetua.style.display = 'block';
        return;
    }

    // Sort A-Z by nama
    existingKetua.sort((a, b) => a.nama.localeCompare(b.nama));

    // Display existing ketua
    displayExistingKetua(existingKetua);

    // Setup search for existing ketua
    setupExistingKetuaSearch(existingKetua);
}

/**
 * Display existing ketua list
 */
function displayExistingKetua(ketuaList) {
    const existingKetuaList = document.getElementById('existingKetuaList');
    const noExistingKetua = document.getElementById('noExistingKetua');

    if (ketuaList.length === 0) {
        existingKetuaList.style.display = 'none';
        noExistingKetua.style.display = 'block';
        return;
    }

    existingKetuaList.style.display = 'flex';
    noExistingKetua.style.display = 'none';

    existingKetuaList.innerHTML = ketuaList.map(ketua => `
        <div class="existing-ketua-item" onclick='selectExistingKetua(${JSON.stringify(ketua).replace(/'/g, "&#39;")})'>
            <div class="existing-ketua-name">${escapeHtml(ketua.nama)}</div>
            <div class="existing-ketua-details">
                <div class="existing-ketua-detail">
                    <strong>NIM:</strong> ${escapeHtml(ketua.nim)}
                </div>
                <div class="existing-ketua-detail">
                    <strong>No WA:</strong> ${escapeHtml(ketua.noWa)}
                </div>
            </div>
            <div class="existing-ketua-matkul">
                📚 ${ketua.matakuliah.length} mata kuliah
            </div>
        </div>
    `).join('');
}

/**
 * Setup search for existing ketua
 */
function setupExistingKetuaSearch(allKetua) {
    const searchInput = document.getElementById('searchExistingKetua');
    if (searchInput) {
        searchInput.value = ''; // Reset search
        searchInput.oninput = function (e) {
            const searchTerm = e.target.value.toLowerCase();
            const filtered = allKetua.filter(ketua =>
                ketua.nama.toLowerCase().includes(searchTerm) ||
                ketua.nim.toLowerCase().includes(searchTerm) ||
                ketua.noWa.toLowerCase().includes(searchTerm)
            );
            displayExistingKetua(filtered);
        };
    }
}

/**
 * Select existing ketua
 */
let pendingKetuaData = null;

function selectExistingKetua(ketua) {
    if (!selectedMatakuliah) {
        showError('Mata kuliah tidak valid');
        return;
    }

    // Store pending data
    pendingKetuaData = {
        matakuliah: selectedMatakuliah,
        nama: ketua.nama,
        nim: ketua.nim,
        noWa: ketua.noWa
    };

    // Show confirmation modal
    showConfirmation(ketua.nama, selectedMatakuliah);
}

/**
 * Show confirmation modal
 */
function showConfirmation(namaKetua, matakuliah) {
    const overlay = document.getElementById('confirmationOverlay');
    const message = document.getElementById('confirmationMessage');

    message.innerHTML = `
        Pilih <strong>${escapeHtml(namaKetua)}</strong> sebagai ketua tingkat untuk<br>
        <strong>${escapeHtml(matakuliah)}</strong>?
    `;

    overlay.classList.add('active');

    // Reset loading state
    document.getElementById('confirmationLoading').classList.remove('active');
    document.getElementById('confirmBtn').disabled = false;
}

/**
 * Close confirmation modal
 */
function closeConfirmation() {
    document.getElementById('confirmationOverlay').classList.remove('active');
    pendingKetuaData = null;
}

/**
 * Confirm selection and submit
 */
async function confirmSelection() {
    if (!pendingKetuaData) return;

    const confirmBtn = document.getElementById('confirmBtn');
    const loadingEl = document.getElementById('confirmationLoading');

    // Show loading
    confirmBtn.disabled = true;
    loadingEl.classList.add('active');

    try {
        await submitKetingData(pendingKetuaData);

        // Close confirmation modal after success
        setTimeout(() => {
            closeConfirmation();
        }, 500);
    } catch (error) {
        // Re-enable button on error
        confirmBtn.disabled = false;
        loadingEl.classList.remove('active');
    }
}

/**
 * Submit form ketua tingkat
 */
async function submitKeting(event) {
    event.preventDefault();

    // Get form data
    const formData = {
        matakuliah: selectedMatakuliah,
        nama: document.getElementById('nama').value.trim(),
        nim: document.getElementById('nim').value.trim(),
        noWa: document.getElementById('noWa').value.trim()
    };

    // Validate
    if (!formData.nama || !formData.nim || !formData.noWa) {
        showError('Semua field harus diisi');
        return;
    }

    await submitKetingData(formData);
}

/**
 * Shared function to submit ketua tingkat data
 */
async function submitKetingData(formData) {
    const submitBtn = document.getElementById('submitBtn');
    const loadingEl = document.getElementById('formLoading');
    const successEl = document.getElementById('successMessage');
    const errorEl = document.getElementById('errorMessage');

    // Hide messages
    successEl.style.display = 'none';
    errorEl.style.display = 'none';

    // Show loading
    if (submitBtn) submitBtn.disabled = true;
    loadingEl.style.display = 'block';

    try {
        const params = new URLSearchParams();
        params.append('action', 'submitKeting');
        params.append('data', JSON.stringify(formData));

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: params
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('✅ Data ketua tingkat berhasil disimpan!');

            // Close modal after 1 second
            setTimeout(() => {
                closeModal();
                // Reload data
                loadAllJadwal();
            }, 1000);
        } else {
            showError('Error: ' + result.error);
        }
    } catch (error) {
        showError('Gagal mengirim data: ' + error.message);
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        loadingEl.style.display = 'none';
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.innerHTML = message;
    successEl.style.display = 'block';

    // Auto hide after 3 seconds
    setTimeout(() => {
        successEl.style.display = 'none';
    }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';

    // Auto hide after 5 seconds
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Show ketua tingkat list modal
 */
function showKetuaList() {
    const modal = document.getElementById('ketuaListModal');
    const itemsContainer = document.getElementById('ketuaListItems');

    // Get unique ketua from allJadwalData
    const ketuaMap = {};
    allJadwalData.forEach(item => {
        if (item.Ketua && item.Ketua.trim() !== '') {
            const key = item.Ketua.trim();
            if (!ketuaMap[key]) {
                ketuaMap[key] = {
                    nama: item.Ketua.trim(),
                    nim: item.NIM || '',
                    noWa: item.NoWA || '',
                    matakuliah: []
                };
            }
            if (!ketuaMap[key].matakuliah.includes(item.Matakuliah)) {
                ketuaMap[key].matakuliah.push(item.Matakuliah);
            }
        }
    });

    const ketuaList = Object.values(ketuaMap);

    if (ketuaList.length === 0) {
        itemsContainer.innerHTML = `
            <div class="ketua-list-empty">
                <div class="ketua-list-empty-icon">👥</div>
                <p>Belum ada ketua tingkat yang terdaftar</p>
            </div>
        `;
    } else {
        // Sort A-Z by nama
        ketuaList.sort((a, b) => a.nama.localeCompare(b.nama));

        itemsContainer.innerHTML = ketuaList.map((ketua, index) => `
            <div class="ketua-list-item">
                <div class="ketua-item-header" onclick="toggleCourses(${index})">
                    <div class="ketua-item-info">
                        <div class="ketua-item-name">${escapeHtml(ketua.nama)}</div>
                        <div class="ketua-item-details">
                            <div class="ketua-item-detail">
                                <span>🎓 NIM:</span>
                                <span>${escapeHtml(ketua.nim)}</span>
                            </div>
                            <div class="ketua-item-detail">
                                <span>📱 WA:</span>
                                <span>${escapeHtml(ketua.noWa)}</span>
                            </div>
                            <div class="ketua-item-detail">
                                <span>📚</span>
                                <span>${ketua.matakuliah.length} Mata Kuliah</span>
                            </div>
                        </div>
                    </div>
                    <div class="ketua-item-toggle" id="toggle-${index}">▼</div>
                </div>
                <div class="ketua-item-courses" id="courses-${index}">
                    <div class="courses-list">
                        <div class="courses-title">Mata Kuliah yang Diketuai:</div>
                        ${ketua.matakuliah.sort().map(matkul => `
                            <div class="course-item">
                                <span class="course-icon">📖</span>
                                <span>${escapeHtml(matkul)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `).join('');
    }

    modal.classList.add('active');
}

/**
 * Close ketua list modal
 */
function closeKetuaList() {
    document.getElementById('ketuaListModal').classList.remove('active');
}

/**
 * Toggle course list for a ketua
 */
function toggleCourses(index) {
    const coursesDiv = document.getElementById(`courses-${index}`);
    const toggleIcon = document.getElementById(`toggle-${index}`);

    if (coursesDiv.classList.contains('expanded')) {
        coursesDiv.classList.remove('expanded');
        toggleIcon.classList.remove('expanded');
    } else {
        coursesDiv.classList.add('expanded');
        toggleIcon.classList.add('expanded');
    }
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('ketingModal');
    const confirmationOverlay = document.getElementById('confirmationOverlay');
    const ketuaListModal = document.getElementById('ketuaListModal');

    if (event.target === modal) {
        closeModal();
    }

    if (event.target === confirmationOverlay) {
        closeConfirmation();
    }

    if (event.target === ketuaListModal) {
        closeKetuaList();
    }
}

/**
 * Scroll to top functionality
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

/**
 * Show/hide scroll to top button based on scroll position
 */
window.addEventListener('scroll', function () {
    const scrollBtn = document.getElementById('scrollToTopBtn');
    if (scrollBtn) {
        if (window.pageYOffset > 300) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }
    }
});
