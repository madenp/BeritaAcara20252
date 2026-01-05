// Konfigurasi - GANTI URL INI dengan URL Google Apps Script Anda setelah deploy
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzlRtNU3P1yiV-Y3u2xLKeXqw28tyPP988gsWQ0EgjTkRXpcXiyDhs6d049zM6lWXeXLA/exec';

// State aplikasi
let currentStep = 1;
let dosenList = [];
let jadwalList = [];
let selectedDosen = null;
let selectedJadwal = null;
let existingData = []; // Data yang sudah ada di sheet Berita Acara
let selectedPertemuan = null;
let selectedKeterangan = null;

// Inisialisasi aplikasi saat halaman dimuat
document.addEventListener('DOMContentLoaded', function () {
    // Set tanggal hari ini sebagai default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('tanggal').value = today;

    // Load daftar dosen
    loadDosen();

    // Event listener untuk search dosen
    document.getElementById('searchDosen').addEventListener('input', function (e) {
        filterDosen(e.target.value);
    });
});

// Fungsi untuk memuat daftar dosen
async function loadDosen() {
    const loadingEl = document.getElementById('loading1');
    const dosenListEl = document.getElementById('dosenList');

    loadingEl.style.display = 'block';
    dosenListEl.innerHTML = '';

    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getDosen`);
        const data = await response.json();

        if (data.success) {
            dosenList = data.data;
            displayDosen(dosenList);
        } else {
            showError('step1', 'Gagal memuat data dosen: ' + data.error);
        }
    } catch (error) {
        showError('step1', 'Error: ' + error.message);
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Fungsi untuk escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Fungsi untuk menampilkan daftar dosen
function displayDosen(dosen) {
    const dosenListEl = document.getElementById('dosenList');

    if (dosen.length === 0) {
        dosenListEl.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Tidak ada dosen ditemukan</p>';
        return;
    }

    dosenListEl.innerHTML = dosen.map(dosen => {
        const safeId = escapeHtml(dosen.ID);
        const safeNama = escapeHtml(dosen.Nama);
        return `
            <div class="dosen-item" onclick="selectDosen('${safeId.replace(/'/g, "\\'")}', '${safeNama.replace(/'/g, "\\'")}')">
                <strong>${safeNama}</strong>
            </div>
        `;
    }).join('');
}

// Fungsi untuk filter dosen berdasarkan pencarian
function filterDosen(searchTerm) {
    const filtered = dosenList.filter(dosen =>
        dosen.Nama.toLowerCase().includes(searchTerm.toLowerCase())
    );
    displayDosen(filtered);
}

// Fungsi untuk memilih dosen
async function selectDosen(id, nama) {
    selectedDosen = { id, nama };

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
    document.getElementById('idDosen').value = id;
    document.getElementById('namaDosen').value = nama;

    // Pindah ke step 2 terlebih dahulu
    goToStep(2);

    // Load jadwal dosen - kirim ID dan nama untuk matching yang lebih akurat
    await loadJadwal(id, nama);
}

// Fungsi untuk memuat jadwal dosen
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
        // Kirim ID dan nama dosen untuk matching yang lebih akurat
        const encodedId = encodeURIComponent(dosenId);
        const encodedNama = encodeURIComponent(dosenNama);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getJadwal&dosenId=${encodedId}&dosenNama=${encodedNama}`);
        const data = await response.json();

        if (data.success) {
            jadwalList = data.data;

            // Debug log
            console.log('=== DEBUG JADWAL ===');
            console.log('Dosen yang dicari:', dosenNama);
            console.log('Jadwal ditemukan:', jadwalList.length, 'item');
            if (data.debug) {
                console.log('Normalized name:', data.debug.normalizedSearchedName);
            }
            console.log('List jadwal:');
            jadwalList.forEach((item, index) => {
                console.log(`  ${index + 1}. ${item.NamaDosen} - ${item.Matakuliah}`);
            });
            console.log('===================');

            displayJadwal(jadwalList);
        } else {
            showError('step2', 'Gagal memuat jadwal: ' + data.error);
        }
    } catch (error) {
        showError('step2', 'Error: ' + error.message);
    } finally {
        loadingEl.style.display = 'none';
    }
}

// Fungsi untuk menampilkan daftar jadwal
function displayJadwal(jadwal) {
    const jadwalListEl = document.getElementById('jadwalList');

    if (jadwal.length === 0) {
        jadwalListEl.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">Tidak ada jadwal ditemukan untuk dosen ini</p>';
        return;
    }

    jadwalListEl.innerHTML = jadwal.map(item => {
        const safeId = escapeHtml(item.ID);
        const safeMatkul = escapeHtml(item.Matakuliah);
        const safeKetua = item.Ketua ? escapeHtml(item.Ketua) : '';
        return `
            <div class="jadwal-item" onclick="selectJadwal('${safeId.replace(/'/g, "\\'")}', '${safeMatkul.replace(/'/g, "\\'")}', '${safeKetua.replace(/'/g, "\\'")}')">
                <div class="matkul">${safeMatkul}</div>
                ${safeKetua ? `<div class="ketua">Ketua Tingkat: ${safeKetua}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Fungsi untuk memilih jadwal
async function selectJadwal(id, matakuliah, ketua) {
    selectedJadwal = { id, matakuliah, ketua };

    // Update UI
    document.getElementById('formMatakuliah').textContent = matakuliah;
    document.getElementById('mataKuliah').value = matakuliah;

    // Pindah ke step 3
    goToStep(3);

    // Show loading untuk pertemuan
    const loadingPertemuan = document.getElementById('loadingPertemuan');
    const pertemuanContainer = document.getElementById('pertemuanContainer');

    loadingPertemuan.style.display = 'flex';
    pertemuanContainer.style.display = 'none';

    // Generate card pertemuan
    generatePertemuanCards();

    // Load data yang sudah ada untuk cek duplikasi
    await loadExistingData(matakuliah);

    // Hide loading dan show container
    loadingPertemuan.style.display = 'none';
    pertemuanContainer.style.display = 'block';
}

// Fungsi untuk generate card pertemuan 1-16
function generatePertemuanCards() {
    const container = document.getElementById('pertemuanCards');
    container.innerHTML = '';

    for (let i = 1; i <= 16; i++) {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.setAttribute('data-value', i);
        card.setAttribute('data-pertemuan', i);
        card.onclick = () => selectPertemuan(i);

        card.innerHTML = `
            <div class="card-content">
                <div class="card-label">${i}</div>
            </div>
        `;

        container.appendChild(card);
    }
}

// Fungsi untuk memilih pertemuan
function selectPertemuan(pertemuan) {
    // Cek apakah pertemuan sudah terisi
    const isAlreadyFilled = existingData.some(item =>
        item.mataKuliah === selectedJadwal.matakuliah &&
        item.pertemuanKe === pertemuan
    );

    if (isAlreadyFilled) {
        showError('step3', 'Pertemuan ' + pertemuan + ' sudah terisi untuk mata kuliah ini');
        return;
    }

    // Remove selected class dari semua card
    document.querySelectorAll('#pertemuanCards .selection-card').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selected class ke card yang dipilih
    const selectedCard = document.querySelector(`#pertemuanCards .selection-card[data-pertemuan="${pertemuan}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedPertemuan = pertemuan;
        document.getElementById('pertemuanKe').value = pertemuan;
    }
}

// Fungsi untuk memilih keterangan
function selectKeterangan(keterangan) {
    // Remove selected class dari semua card
    document.querySelectorAll('.selection-card[data-value="Offline"], .selection-card[data-value="Online"]').forEach(card => {
        card.classList.remove('selected');
    });

    // Add selected class ke card yang dipilih
    const selectedCard = document.querySelector(`.selection-card[data-value="${keterangan}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedKeterangan = keterangan;
        document.getElementById('keterangan').value = keterangan;
    }
}

// Fungsi untuk load data yang sudah ada
async function loadExistingData(mataKuliah) {
    try {
        const encodedMatkul = encodeURIComponent(mataKuliah);
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getExistingData&mataKuliah=${encodedMatkul}`);
        const data = await response.json();

        if (data.success) {
            existingData = data.data;
            updatePertemuanCardsStatus();

            console.log('Data yang sudah ada:', existingData);
        } else {
            console.error('Error loading existing data:', data.error);
            existingData = [];
        }
    } catch (error) {
        console.error('Error loading existing data:', error);
        existingData = [];
    }
}

// Fungsi untuk update status card pertemuan
function updatePertemuanCardsStatus() {
    const cards = document.querySelectorAll('#pertemuanCards .selection-card');

    cards.forEach(card => {
        const pertemuan = parseInt(card.getAttribute('data-pertemuan'));
        const isAlreadyFilled = existingData.some(item =>
            item.mataKuliah === selectedJadwal.matakuliah &&
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
    const filledCount = existingData.filter(item =>
        item.mataKuliah === selectedJadwal.matakuliah
    ).length;

    if (filledCount > 0) {
        const statusEl = document.getElementById('pertemuanStatus');
        statusEl.textContent = `⚠️ ${filledCount} pertemuan sudah terisi untuk mata kuliah ini`;
        statusEl.style.display = 'block';
    } else {
        document.getElementById('pertemuanStatus').style.display = 'none';
    }
}

// Fungsi untuk navigasi antar step
function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-container').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });

    // Hide all step indicators
    document.querySelectorAll('.step').forEach(el => {
        el.classList.remove('active');
    });

    // Show selected step
    document.getElementById(`step${step}`).classList.add('active');
    document.getElementById(`step${step}`).style.display = 'block';
    document.getElementById(`step${step}-indicator`).classList.add('active');

    currentStep = step;

    // Clear messages
    clearMessages();
}

// Fungsi untuk kembali ke step 1
function goToStep1() {
    goToStep(1);
    // Reset search
    document.getElementById('searchDosen').value = '';
    displayDosen(dosenList);
    // Reset selections
    selectedPertemuan = null;
    selectedKeterangan = null;
    existingData = [];
}

// Fungsi untuk kembali ke step 2
function goToStep2() {
    goToStep(2);
    clearMessages();
    // Reset selections
    selectedPertemuan = null;
    selectedKeterangan = null;
    existingData = [];
}

// Fungsi untuk submit form
async function submitForm(event) {
    event.preventDefault();

    // Validasi
    if (!selectedDosen || !selectedJadwal) {
        showError('step3', 'Mohon lengkapi pilihan dosen dan mata kuliah');
        return;
    }

    const submitBtn = document.getElementById('submitBtn');
    const loadingEl = document.getElementById('loading3');
    const form = document.getElementById('beritaAcaraForm');

    // Disable button
    submitBtn.disabled = true;
    loadingEl.style.display = 'block';
    clearMessages();

    // Prepare data - pastikan semua field diambil dengan benar
    const pertemuanKe = selectedPertemuan || document.getElementById('pertemuanKe').value.trim();
    const keterangan = selectedKeterangan || document.getElementById('keterangan').value.trim();
    const lamaPerkuliahan = document.getElementById('lamaPerkuliahan').value.trim();

    // Validasi client-side
    if (!pertemuanKe || pertemuanKe === '') {
        showError('step3', 'Pertemuan Ke harus dipilih');
        submitBtn.disabled = false;
        loadingEl.style.display = 'none';
        return;
    }

    if (!keterangan || keterangan === '') {
        showError('step3', 'Keterangan harus dipilih (Offline atau Online)');
        submitBtn.disabled = false;
        loadingEl.style.display = 'none';
        return;
    }

    if (!lamaPerkuliahan || lamaPerkuliahan === '') {
        showError('step3', 'Lama Perkuliahan harus diisi');
        submitBtn.disabled = false;
        loadingEl.style.display = 'none';
        return;
    }

    // Cek duplikasi lagi sebelum submit
    const isDuplicate = existingData.some(item =>
        item.mataKuliah === selectedJadwal.matakuliah &&
        item.pertemuanKe === parseInt(pertemuanKe)
    );

    if (isDuplicate) {
        showError('step3', 'Pertemuan ' + pertemuanKe + ' sudah terisi untuk mata kuliah ini. Silakan pilih pertemuan lain.');
        submitBtn.disabled = false;
        loadingEl.style.display = 'none';
        return;
    }

    const formData = {
        idDosen: selectedDosen.id,
        namaDosen: selectedDosen.nama,
        mataKuliah: selectedJadwal.matakuliah,
        pertemuanKe: pertemuanKe,
        tanggal: document.getElementById('tanggal').value,
        keterangan: keterangan,
        lamaPerkuliahan: lamaPerkuliahan,
        materi: document.getElementById('materi').value.trim()
    };

    // Debug log
    console.log('Data yang akan dikirim:', formData);

    try {
        // Menggunakan URLSearchParams untuk aplikasi/x-www-form-urlencoded (Standard API)
        const params = new URLSearchParams();
        params.append('action', 'submitBeritaAcara');
        params.append('data', JSON.stringify(formData));

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: params
            // Content-Type otomatis diset
        });

        const result = await response.json();

        // Debug log
        console.log('Response dari server:', result);

        if (result.success) {
            showSuccess('step3', '✅ Data berhasil dikirim! Form akan direset...');

            // Reset form setelah 2 detik
            setTimeout(() => {
                form.reset();
                document.getElementById('tanggal').value = new Date().toISOString().split('T')[0];
                // Reset card selections
                document.querySelectorAll('.selection-card').forEach(card => {
                    card.classList.remove('selected', 'disabled');
                    const pertemuan = card.getAttribute('data-pertemuan');
                    if (pertemuan) {
                        card.onclick = () => selectPertemuan(parseInt(pertemuan));
                    }
                });
                // Reset hidden inputs
                document.getElementById('pertemuanKe').value = '';
                document.getElementById('keterangan').value = '';
                selectedPertemuan = null;
                selectedKeterangan = null;
                existingData = [];
                goToStep1();
            }, 2000);
        } else {
            let errorMsg = 'Gagal mengirim data: ' + result.error;
            if (result.debug) {
                console.error('Debug info:', result.debug);
                errorMsg += '\n\nCek console untuk detail (F12)';
            }
            showError('step3', errorMsg);
        }

    } catch (error) {
        showError('step3', 'Error: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        loadingEl.style.display = 'none';
    }
}

// Fungsi untuk menampilkan error
function showError(step, message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

// Fungsi untuk menampilkan success
function showSuccess(step, message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
}

// Fungsi untuk clear messages
function clearMessages() {
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
}

