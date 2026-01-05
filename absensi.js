/**
 * JAVASCRIPT UNTUK FORM ABSENSI
 * File ini menangani logika untuk form absensi dosen
 */

// GANTI URL INI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzlRtNU3P1yiV-Y3u2xLKeXqw28tyPP988gsWQ0EgjTkRXpcXiyDhs6d049zM6lWXeXLA/exec';

// State management
let selectedDosen = null;
let selectedJadwal = null;
let dosenData = [];
let jadwalData = [];
let existingAbsensiData = []; // Data absensi yang sudah ada

/**
 * Initialize aplikasi saat halaman dimuat
 */
document.addEventListener('DOMContentLoaded', function () {
    loadDosen();
    setTodayDate();
    setupFormListeners();
    generatePertemuanCards();
});

/**
 * Set tanggal hari ini sebagai default
 */
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;
}

/**
 * Setup event listeners untuk form
 */
function setupFormListeners() {
    // Search dosen
    document.getElementById('searchDosen').addEventListener('input', function (e) {
        filterDosen(e.target.value);
    });

    // Auto-update summary saat form berubah
    const formInputs = ['pertemuan', 'status', 'tanggal', 'jamMulai'];
    formInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('change', updateSummary);
            element.addEventListener('input', updateSummary);
        }
    });
}

/**
 * Generate card pertemuan 1-16
 */
function generatePertemuanCards() {
    const container = document.getElementById('pertemuanCards');
    if (!container) return;

    container.innerHTML = '';

    for (let i = 1; i <= 16; i++) {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.setAttribute('data-value', i);
        card.onclick = () => selectPertemuan(i);

        card.innerHTML = `
            <div class="card-content">
                <div class="card-label">${i}</div>
            </div>
        `;

        container.appendChild(card);
    }
}

/**
 * Load daftar dosen dari Google Sheets
 */
async function loadDosen() {
    const loadingEl = document.getElementById('loading1');
    const dosenListEl = document.getElementById('dosenList');

    loadingEl.style.display = 'block';
    dosenListEl.innerHTML = '';

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getDosen`);
        const result = await response.json();

        if (result.success) {
            dosenData = result.data;
            displayDosen(dosenData);
        } else {
            dosenListEl.innerHTML = `<div class="error-message">Error: ${result.error}</div>`;
        }
    } catch (error) {
        dosenListEl.innerHTML = `<div class="error-message">Gagal memuat data dosen: ${error.message}</div>`;
    } finally {
        loadingEl.style.display = 'none';
    }
}

/**
 * Display daftar dosen
 */
function displayDosen(data) {
    const dosenListEl = document.getElementById('dosenList');

    if (data.length === 0) {
        dosenListEl.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Tidak ada data dosen ditemukan</p>';
        return;
    }

    dosenListEl.innerHTML = data.map(dosen => {
        const safeId = escapeHtml(dosen.ID);
        const safeNama = escapeHtml(dosen.Nama);
        return `
            <div class="dosen-item" onclick="selectDosen('${safeId.replace(/'/g, "\\'")}', '${safeNama.replace(/'/g, "\\'")}')">
                <strong>${safeNama}</strong>
            </div>
        `;
    }).join('');
}

/**
 * Filter dosen berdasarkan pencarian
 */
function filterDosen(searchTerm) {
    const filtered = dosenData.filter(dosen =>
        dosen.Nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dosen.ID.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayDosen(filtered);
}

/**
 * Select dosen dan lanjut ke step 2
 */
async function selectDosen(id, nama) {
    selectedDosen = { ID: id, Nama: nama };

    // Show loading di step 1
    const loading1 = document.getElementById('loading1');
    const dosenList = document.getElementById('dosenList');

    loading1.style.display = 'flex';
    loading1.textContent = '⏳ Memproses pemilihan dosen...';
    dosenList.style.opacity = '0.5';
    dosenList.style.pointerEvents = 'none';
    dosenList.style.transition = 'opacity 0.3s ease';

    // Update UI
    document.getElementById('selectedDosenName').textContent = nama;
    document.getElementById('formDosenName').textContent = nama;
    document.getElementById('namaDosen').value = nama;

    // Pindah ke step 2 terlebih dahulu
    goToStep2();

    // Load jadwal - kirim ID dan nama untuk matching yang lebih akurat
    await loadJadwal(id, nama);
}

/**
 * Load jadwal berdasarkan dosen
 */
async function loadJadwal(dosenId, dosenNama) {
    const loadingEl = document.getElementById('loading2');
    const jadwalListEl = document.getElementById('jadwalList');

    // Show loading dengan text yang lebih jelas
    loadingEl.style.display = 'flex';
    loadingEl.textContent = '📚 Memuat data Matakuliah - Kelas...';
    jadwalListEl.innerHTML = '';

    // Reset step 1 loading
    const loading1 = document.getElementById('loading1');
    const dosenList = document.getElementById('dosenList');
    if (loading1) {
        loading1.style.display = 'none';
    }
    if (dosenList) {
        dosenList.style.opacity = '1';
        dosenList.style.pointerEvents = 'auto';
    }

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getJadwal&dosenId=${encodeURIComponent(dosenId)}&dosenNama=${encodeURIComponent(dosenNama)}`);
        const result = await response.json();

        if (result.success) {
            jadwalData = result.data;
            displayJadwal(jadwalData);
        } else {
            jadwalListEl.innerHTML = `<div class="error-message">Error: ${result.error}</div>`;
        }
    } catch (error) {
        jadwalListEl.innerHTML = `<div class="error-message">Gagal memuat jadwal: ${error.message}</div>`;
    } finally {
        loadingEl.style.display = 'none';
    }
}

/**
 * Display jadwal
 */
function displayJadwal(data) {
    const jadwalListEl = document.getElementById('jadwalList');

    if (data.length === 0) {
        jadwalListEl.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Tidak ada jadwal ditemukan untuk dosen ini</p>';
        return;
    }

    jadwalListEl.innerHTML = data.map(jadwal => {
        const safeMatkul = escapeHtml(jadwal.Matakuliah);
        const safeKetua = jadwal.Ketua ? escapeHtml(jadwal.Ketua) : '';
        return `
            <div class="jadwal-item" onclick='selectJadwal(${JSON.stringify(jadwal).replace(/'/g, "&#39;")})'>
                <div class="matkul">${safeMatkul}</div>
                ${safeKetua ? `<div class="ketua">Ketua Tingkat: ${safeKetua}</div>` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Select jadwal dan lanjut ke step 3
 */
async function selectJadwal(jadwal) {
    selectedJadwal = jadwal;

    // Reset summary section sebelum load data baru
    const summarySection = document.getElementById('summarySection');
    if (summarySection) {
        summarySection.style.display = 'none';
    }

    // Reset form inputs
    const formInputs = ['pertemuan', 'status', 'jamMulai'];
    formInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.value = '';
        }
    });

    // Remove selected class from all cards
    document.querySelectorAll('.selection-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Update form
    document.getElementById('formDosenName').textContent = selectedDosen.Nama;
    document.getElementById('formMatakuliah').textContent = jadwal.Matakuliah;
    document.getElementById('namaDosen').value = selectedDosen.Nama;
    document.getElementById('matakuliahKelas').value = jadwal.Matakuliah;

    // Pindah ke step 3
    goToStep3();

    // Show loading indicator untuk pertemuan
    const loadingPertemuan = document.getElementById('loadingPertemuan');
    const pertemuanContainer = document.getElementById('pertemuanContainer');

    if (loadingPertemuan) {
        loadingPertemuan.style.display = 'flex';
    }
    if (pertemuanContainer) {
        pertemuanContainer.style.display = 'none';
    }

    // Load data absensi yang sudah ada
    await loadExistingAbsensi(jadwal.Matakuliah);

    // Hide loading dan show container
    if (loadingPertemuan) {
        loadingPertemuan.style.display = 'none';
    }
    if (pertemuanContainer) {
        pertemuanContainer.style.display = 'block';
    }

    // Update summary
    updateSummary();
}

/**
 * Select pertemuan
 */
function selectPertemuan(pertemuan) {
    // Cek apakah pertemuan sudah terisi
    const isAlreadyFilled = existingAbsensiData.some(item =>
        item.mataKuliah === selectedJadwal.Matakuliah &&
        item.pertemuanKe === pertemuan
    );

    if (isAlreadyFilled) {
        const errorEl = document.getElementById('errorMessage');
        errorEl.textContent = `⚠️ Pertemuan ${pertemuan} sudah terisi untuk mata kuliah ini`;
        errorEl.style.display = 'block';
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 3000);
        return;
    }

    // Remove selected class dari semua card
    document.querySelectorAll('#pertemuanCards .selection-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selected class ke card yang dipilih
    const selectedCard = document.querySelector(`#pertemuanCards .selection-card[data-value="${pertemuan}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        document.getElementById('pertemuan').value = pertemuan;
    }

    // Update summary
    updateSummary();
}

/**
 * Load data absensi yang sudah ada
 */
async function loadExistingAbsensi(mataKuliah) {
    try {
        const encodedMatkul = encodeURIComponent(mataKuliah);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getExistingAbsensi&mataKuliah=${encodedMatkul}`);
        const data = await response.json();

        if (data.success) {
            existingAbsensiData = data.data;
            updatePertemuanCardsStatus();

            console.log('Data absensi yang sudah ada:', existingAbsensiData);
        } else {
            console.error('Error loading existing absensi:', data.error);
            existingAbsensiData = [];
        }
    } catch (error) {
        console.error('Error loading existing absensi:', error);
        existingAbsensiData = [];
    }
}

/**
 * Update status card pertemuan yang sudah terisi
 */
function updatePertemuanCardsStatus() {
    const cards = document.querySelectorAll('#pertemuanCards .selection-card');

    cards.forEach(card => {
        const pertemuan = parseInt(card.getAttribute('data-value'));
        const isAlreadyFilled = existingAbsensiData.some(item =>
            item.mataKuliah === selectedJadwal.Matakuliah &&
            item.pertemuanKe === pertemuan
        );

        if (isAlreadyFilled) {
            card.classList.add('disabled');
            card.onclick = null; // Disable click
        } else {
            card.classList.remove('disabled');
            card.onclick = () => selectPertemuan(pertemuan);
        }
    });

    // Update status message
    const filledCount = existingAbsensiData.filter(item =>
        item.mataKuliah === selectedJadwal.Matakuliah
    ).length;

    if (filledCount > 0) {
        const statusEl = document.getElementById('pertemuanStatus');
        if (statusEl) {
            statusEl.textContent = `⚠️ ${filledCount} pertemuan sudah terisi untuk mata kuliah ini`;
            statusEl.style.display = 'block';
        }
    } else {
        const statusEl = document.getElementById('pertemuanStatus');
        if (statusEl) {
            statusEl.style.display = 'none';
        }
    }
}

/**
 * Select status kehadiran
 */
function selectStatus(status) {
    // Remove selected class from all cards
    document.querySelectorAll('.selection-card[data-value="Offline"], .selection-card[data-value="Online"]').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selected class to clicked card
    const selectedCard = document.querySelector(`.selection-card[data-value="${status}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }

    // Set hidden input value
    document.getElementById('status').value = status;

    // Update summary
    updateSummary();
}

/**
 * Select jam perkuliahan
 */
function selectJam(jam) {
    // Remove selected class dari semua card
    document.querySelectorAll('#jamCards .selection-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selected class ke card yang dipilih
    const selectedCard = document.querySelector(`#jamCards .selection-card[data-value="${jam}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        document.getElementById('jamMulai').value = jam;
    }

    // Update summary
    updateSummary();
}

/**
 * Update summary section
 */
function updateSummary() {
    const summarySection = document.getElementById('summarySection');
    const pertemuan = document.getElementById('pertemuan').value;
    const status = document.getElementById('status').value;
    const tanggal = document.getElementById('tanggal').value;
    const jamMulai = document.getElementById('jamMulai').value;

    // Show summary if at least some fields are filled
    if (pertemuan || status || tanggal || jamMulai) {
        summarySection.style.display = 'block';

        document.getElementById('summaryDosen').textContent = selectedDosen ? selectedDosen.Nama : '-';
        document.getElementById('summaryMatkul').textContent = selectedJadwal ? selectedJadwal.Matakuliah : '-';
        document.getElementById('summaryPertemuan').textContent = pertemuan ? `Pertemuan ke-${pertemuan}` : '-';
        document.getElementById('summaryStatus').textContent = status || '-';

        if (tanggal) {
            const date = new Date(tanggal);
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('summaryTanggal').textContent = date.toLocaleDateString('id-ID', options);
        } else {
            document.getElementById('summaryTanggal').textContent = '-';
        }

        if (jamMulai) {
            document.getElementById('summaryJam').textContent = jamMulai;
        } else {
            document.getElementById('summaryJam').textContent = '-';
        }
    } else {
        summarySection.style.display = 'none';
    }
}

/**
 * Submit form absensi
 */
async function submitForm(event) {
    event.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const loadingEl = document.getElementById('loading3');
    const successEl = document.getElementById('successMessage');
    const errorEl = document.getElementById('errorMessage');

    // Hide messages
    successEl.style.display = 'none';
    errorEl.style.display = 'none';

    // Validate
    if (!selectedDosen || !selectedJadwal) {
        errorEl.textContent = 'Data dosen atau mata kuliah tidak valid';
        errorEl.style.display = 'block';
        return;
    }

    // Get form data
    const formData = {
        namaDosen: document.getElementById('namaDosen').value,
        matakuliahKelas: document.getElementById('matakuliahKelas').value,
        pertemuan: document.getElementById('pertemuan').value,
        status: document.getElementById('status').value,
        tanggal: document.getElementById('tanggal').value,
        jam: document.getElementById('jamMulai').value
    };

    // Validate pertemuan
    if (!formData.pertemuan) {
        errorEl.textContent = 'Silakan pilih pertemuan';
        errorEl.style.display = 'block';
        return;
    }

    // Validate status
    if (!formData.status) {
        errorEl.textContent = 'Silakan pilih status kehadiran';
        errorEl.style.display = 'block';
        return;
    }

    // Validate jam
    if (!formData.jam) {
        errorEl.textContent = 'Silakan pilih jam perkuliahan';
        errorEl.style.display = 'block';
        return;
    }

    // Cek duplikasi lagi sebelum submit
    const isDuplicate = existingAbsensiData.some(item =>
        item.mataKuliah === selectedJadwal.Matakuliah &&
        item.pertemuanKe === parseInt(formData.pertemuan)
    );

    if (isDuplicate) {
        errorEl.textContent = `⚠️ Pertemuan ${formData.pertemuan} sudah terisi untuk mata kuliah ini. Silakan pilih pertemuan lain.`;
        errorEl.style.display = 'block';
        return;
    }

    // Show loading
    submitBtn.disabled = true;
    loadingEl.style.display = 'block';

    try {
        // Menggunakan URLSearchParams untuk aplikasi/x-www-form-urlencoded agar menghindari masalah CORS/Preflight di GAS
        const params = new URLSearchParams();
        params.append('action', 'submitAbsensi');
        params.append('data', JSON.stringify(formData));

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: params
            // Content-Type otomatis diset
        });

        const result = await response.json();

        if (result.success) {
            successEl.innerHTML = `
                <strong>✅ Absensi berhasil disimpan!</strong><br>
                <small>Data telah tersimpan di Google Sheets</small>
            `;
            successEl.style.display = 'block';

            // Reset form after 2 seconds
            setTimeout(() => {
                resetForm();
            }, 2000);
        } else {
            errorEl.textContent = `Error: ${result.error}`;
            errorEl.style.display = 'block';
        }
    } catch (error) {
        errorEl.textContent = `Gagal mengirim data: ${error.message}`;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        loadingEl.style.display = 'none';
    }
}

/**
 * Reset form dan kembali ke step 1
 */
function resetForm() {
    document.getElementById('absensiForm').reset();
    selectedDosen = null;
    selectedJadwal = null;
    existingAbsensiData = [];

    // Remove selected class from all cards
    document.querySelectorAll('.selection-card').forEach(card => {
        card.classList.remove('selected', 'disabled');
    });

    // Hide summary
    document.getElementById('summarySection').style.display = 'none';

    // Back to step 1
    goToStep1();
}

/**
 * Navigation functions
 */
function goToStep1() {
    existingAbsensiData = [];

    // Reset summary section
    const summarySection = document.getElementById('summarySection');
    if (summarySection) {
        summarySection.style.display = 'none';
    }

    // Reset all form inputs
    const formInputs = ['pertemuan', 'status', 'jamMulai', 'tanggal'];
    formInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.value = '';
        }
    });

    // Remove selected class from all cards
    document.querySelectorAll('.selection-card').forEach(card => {
        card.classList.remove('selected');
    });

    showStep(1);
}

function goToStep2() {
    if (!selectedDosen) {
        alert('Silakan pilih dosen terlebih dahulu');
        return;
    }
    existingAbsensiData = [];

    // Reset summary section
    const summarySection = document.getElementById('summarySection');
    if (summarySection) {
        summarySection.style.display = 'none';
    }

    // Reset form inputs
    const formInputs = ['pertemuan', 'status', 'jamMulai'];
    formInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.value = '';
        }
    });

    // Remove selected class from all cards
    document.querySelectorAll('.selection-card').forEach(card => {
        card.classList.remove('selected');
    });

    showStep(2);
}

function goToStep3() {
    if (!selectedDosen || !selectedJadwal) {
        alert('Silakan pilih dosen dan mata kuliah terlebih dahulu');
        return;
    }
    showStep(3);

    // Show pertemuan container saat pertama kali masuk step 3
    const pertemuanContainer = document.getElementById('pertemuanContainer');
    if (pertemuanContainer) {
        pertemuanContainer.style.display = 'block';
    }
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.step-container').forEach(step => {
        step.classList.remove('active');
        step.style.display = 'none';
    });

    // Remove active class from all indicators
    document.querySelectorAll('.step').forEach(indicator => {
        indicator.classList.remove('active');
    });

    // Show selected step
    const stepEl = document.getElementById(`step${stepNumber}`);
    const indicatorEl = document.getElementById(`step${stepNumber}-indicator`);

    if (stepEl) {
        stepEl.classList.add('active');
        stepEl.style.display = 'block';
    }

    if (indicatorEl) {
        indicatorEl.classList.add('active');
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Utility function to escape HTML
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
