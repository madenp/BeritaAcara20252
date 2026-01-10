/**
 * ============================================
 * GOOGLE APPS SCRIPT - BACKEND LENGKAP
 * Untuk: Form Berita Acara + Form Absensi
 * ============================================
 * 
 * INSTRUKSI DEPLOYMENT:
 * 1. Copy SEMUA kode ini
 * 2. Paste ke Apps Script Editor (Extensions > Apps Script)
 * 3. Ganti SPREADSHEET_ID dengan ID Google Sheet Anda
 * 4. Save (Ctrl+S)
 * 5. Deploy > Manage deployments > Edit > New version > Deploy
 * 6. Copy URL deployment ke file absensi.js
 */

// ============================================
// KONFIGURASI
// ============================================

// GANTI INI DENGAN ID SPREADSHEET ANDA
const SPREADSHEET_ID = '1j_kPn7sJNFI6NwZ2Ro2Hgz8x06bfvC3NBP0xAntxgjg';

// Nama sheet
const SHEET_DOSEN = 'Dosen';
const SHEET_JADWAL = 'Jadwal';
const SHEET_BERITA_ACARA = 'Berita Acara';
const SHEET_ABSENSI = 'Absensi';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Helper function untuk mencari index kolom header (case-insensitive)
 */
function findHeaderIndex(headerArray, searchText, returnOneBased = false) {
  const base = returnOneBased ? 1 : 0;
  
  // Exact match (case-insensitive, trim)
  for (let i = 0; i < headerArray.length; i++) {
    if (headerArray[i] && headerArray[i].toString().trim().toLowerCase() === searchText.toLowerCase()) {
      return i + base;
    }
  }
  
  // Partial match jika exact match tidak ditemukan
  for (let i = 0; i < headerArray.length; i++) {
    if (headerArray[i] && headerArray[i].toString().trim().toLowerCase().includes(searchText.toLowerCase())) {
      return i + base;
    }
  }
  
  return returnOneBased ? 0 : -1;
}

/**
 * Fungsi untuk generate ID baru
 */
function generateId(sheet) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    return 1;
  }
  
  const idColumn = 1;
  const ids = sheet.getRange(2, idColumn, lastRow - 1, 1).getValues();
  let maxId = 0;
  
  for (let i = 0; i < ids.length; i++) {
    const id = parseInt(ids[i][0]);
    if (!isNaN(id) && id > maxId) {
      maxId = id;
    }
  }
  
  return maxId + 1;
}

// ============================================
// HTTP REQUEST HANDLERS
// ============================================

/**
 * Handle GET requests
 */
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'getDosen') {
      return ContentService.createTextOutput(JSON.stringify(getDosen()))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'getJadwal') {
      const dosenId = e.parameter.dosenId || '';
      const dosenNama = e.parameter.dosenNama || '';
      return ContentService.createTextOutput(JSON.stringify(getJadwal(dosenId, dosenNama)))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'getExistingData') {
      const mataKuliah = e.parameter.mataKuliah || '';
      return ContentService.createTextOutput(JSON.stringify(getExistingData(mataKuliah)))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'getExistingAbsensi') {
      const mataKuliah = e.parameter.mataKuliah || '';
      return ContentService.createTextOutput(JSON.stringify(getExistingAbsensi(mataKuliah)))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'getAllJadwal') {
      return ContentService.createTextOutput(JSON.stringify(getAllJadwal()))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Action tidak dikenali'
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Handle POST requests
 */
function doPost(e) {
  try {
    let action, data;
    
    if (e.postData.type === 'application/json') {
      const parsed = JSON.parse(e.postData.contents);
      action = parsed.action;
      data = parsed.data;
    } else {
      action = e.parameter.action;
      if (e.parameter.data) {
        data = JSON.parse(e.parameter.data);
      }
    }
    
    if (action === 'submitBeritaAcara') {
      const result = submitBeritaAcara(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'submitAbsensi') {
      const result = submitAbsensi(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else if (action === 'submitKeting') {
      const result = submitKeting(data);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Action tidak dikenali: ' + action
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// DATA RETRIEVAL FUNCTIONS
// ============================================

/**
 * Get daftar dosen
 */
function getDosen() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_DOSEN);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Dosen" tidak ditemukan'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const dosenList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) {
        dosenList.push({
          ID: data[i][0].toString(),
          Nama: data[i][1].toString()
        });
      }
    }
    
    return {
      success: true,
      data: dosenList
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get jadwal berdasarkan dosen
 */
function getJadwal(dosenId, dosenNama) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_JADWAL);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Jadwal" tidak ditemukan'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    const idIndex = findHeaderIndex(header, 'ID', false);
    const namaIndex = findHeaderIndex(header, 'Nama Dosen', false);
    const matkulIndex = findHeaderIndex(header, 'Matakuliah - Kelas', false);
    const ketuaIndex = findHeaderIndex(header, 'Ketua Tingkat', false);
    
    if (namaIndex === -1 || matkulIndex === -1) {
      return {
        success: false,
        error: 'Kolom tidak ditemukan di sheet Jadwal'
      };
    }
    
    if (!dosenNama || dosenNama.toString().trim() === '') {
      return {
        success: false,
        error: 'Nama dosen tidak valid'
      };
    }
    
    function normalizeNama(nama) {
      if (!nama) return '';
      return nama.toString()
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .toLowerCase()
        .trim();
    }
    
    const normalizedDosenNama = normalizeNama(dosenNama);
    const jadwalList = [];
    
    for (let i = 1; i < data.length; i++) {
      const rowNamaDosen = data[i][namaIndex] ? data[i][namaIndex].toString() : '';
      const rowMatkul = data[i][matkulIndex] ? data[i][matkulIndex].toString() : '';
      
      if (!rowMatkul || rowMatkul.trim() === '' || !rowNamaDosen || rowNamaDosen.trim() === '') {
        continue;
      }
      
      const normalizedRowNama = normalizeNama(rowNamaDosen);
      
      if (normalizedRowNama === normalizedDosenNama) {
        const rowId = data[i][idIndex] ? data[i][idIndex].toString().trim() : '';
        const ketua = (data[i][ketuaIndex] && ketuaIndex !== -1) ? data[i][ketuaIndex].toString().trim() : '';
        
        jadwalList.push({
          ID: rowId,
          NamaDosen: rowNamaDosen.trim(),
          Matakuliah: rowMatkul.trim(),
          Ketua: ketua
        });
      }
    }
    
    return {
      success: true,
      data: jadwalList
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get existing data dari Berita Acara
 */
function getExistingData(mataKuliah) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BERITA_ACARA);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Berita Acara" tidak ditemukan'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: []
      };
    }
    
    const header = data[0];
    const matkulIndex = findHeaderIndex(header, 'Mata Kuliah', false);
    const pertemuanIndex = findHeaderIndex(header, 'Pertemuan Ke', false);
    
    if (matkulIndex === -1 || pertemuanIndex === -1) {
      return {
        success: false,
        error: 'Kolom tidak ditemukan'
      };
    }
    
    const existingList = [];
    const normalizedMatkul = mataKuliah ? mataKuliah.toString().trim().toLowerCase() : '';
    
    for (let i = 1; i < data.length; i++) {
      const rowMatkul = data[i][matkulIndex] ? data[i][matkulIndex].toString().trim() : '';
      const rowPertemuan = data[i][pertemuanIndex] ? data[i][pertemuanIndex].toString().trim() : '';
      
      if (!rowMatkul || !rowPertemuan) continue;
      
      const normalizedRowMatkul = rowMatkul.toLowerCase();
      
      if (!normalizedMatkul || normalizedRowMatkul === normalizedMatkul) {
        const pertemuanValue = parseInt(rowPertemuan);
        if (!isNaN(pertemuanValue)) {
          existingList.push({
            mataKuliah: rowMatkul,
            pertemuanKe: pertemuanValue
          });
        }
      }
    }
    
    return {
      success: true,
      data: existingList
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Get existing data dari Absensi
 */
function getExistingAbsensi(mataKuliah) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_ABSENSI);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Absensi" tidak ditemukan'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: []
      };
    }
    
    const header = data[0];
    const matkulIndex = findHeaderIndex(header, 'Matakuliah-Kelas', false);
    const pertemuanIndex = findHeaderIndex(header, 'Pertemuan', false);
    
    if (matkulIndex === -1 || pertemuanIndex === -1) {
      return {
        success: false,
        error: 'Kolom tidak ditemukan. Pastikan ada kolom "Matakuliah-Kelas" dan "Pertemuan"'
      };
    }
    
    const existingList = [];
    const normalizedMatkul = mataKuliah ? mataKuliah.toString().trim().toLowerCase() : '';
    
    for (let i = 1; i < data.length; i++) {
      const rowMatkul = data[i][matkulIndex] ? data[i][matkulIndex].toString().trim() : '';
      const rowPertemuan = data[i][pertemuanIndex] ? data[i][pertemuanIndex].toString().trim() : '';
      
      if (!rowMatkul || !rowPertemuan) continue;
      
      const normalizedRowMatkul = rowMatkul.toLowerCase();
      
      if (!normalizedMatkul || normalizedRowMatkul === normalizedMatkul) {
        const pertemuanValue = parseInt(rowPertemuan);
        if (!isNaN(pertemuanValue)) {
          existingList.push({
            mataKuliah: rowMatkul,
            pertemuanKe: pertemuanValue
          });
        }
      }
    }
    
    return {
      success: true,
      data: existingList
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// DATA SUBMISSION FUNCTIONS
// ============================================

/**
 * Submit Berita Acara
 */
function submitBeritaAcara(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_BERITA_ACARA);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Berita Acara" tidak ditemukan'
      };
    }
    
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const idIndex = findHeaderIndex(header, 'ID', true);
    const namaDosenIndex = findHeaderIndex(header, 'Pilih Nama Dosen', true);
    const matkulIndex = findHeaderIndex(header, 'Mata Kuliah', true);
    const pertemuanIndex = findHeaderIndex(header, 'Pertemuan Ke', true);
    const tanggalIndex = findHeaderIndex(header, 'Tanggal', true);
    const keteranganIndex = findHeaderIndex(header, 'Keterangan', true);
    const lamaIndex = findHeaderIndex(header, 'Lama Perkuliahan', true);
    const materiIndex = findHeaderIndex(header, 'Materi yang diberikan', true);
    
    const missingColumns = [];
    if (pertemuanIndex === 0) missingColumns.push('Pertemuan Ke');
    if (lamaIndex === 0) missingColumns.push('Lama Perkuliahan');
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        error: 'Kolom tidak ditemukan: ' + missingColumns.join(', ')
      };
    }
    
    const newId = generateId(sheet);
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;
    
    if (idIndex > 0) sheet.getRange(newRow, idIndex).setValue(newId);
    if (namaDosenIndex > 0 && formData.namaDosen) {
      sheet.getRange(newRow, namaDosenIndex).setValue(formData.namaDosen.toString().trim());
    }
    if (matkulIndex > 0 && formData.mataKuliah) {
      sheet.getRange(newRow, matkulIndex).setValue(formData.mataKuliah.toString().trim());
    }
    
    if (pertemuanIndex > 0) {
      const pertemuanValue = formData.pertemuanKe ? parseInt(formData.pertemuanKe) : null;
      if (pertemuanValue && !isNaN(pertemuanValue)) {
        sheet.getRange(newRow, pertemuanIndex).setValue(pertemuanValue);
      } else {
        return {
          success: false,
          error: 'Pertemuan Ke tidak valid'
        };
      }
    }
    
    if (tanggalIndex > 0 && formData.tanggal) {
      try {
        const dateParts = formData.tanggal.split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        sheet.getRange(newRow, tanggalIndex).setValue(date);
      } catch (e) {
        sheet.getRange(newRow, tanggalIndex).setValue(formData.tanggal);
      }
    }
    
    if (keteranganIndex > 0) {
      sheet.getRange(newRow, keteranganIndex).setValue(formData.keterangan ? formData.keterangan.toString().trim() : '');
    }
    
    if (lamaIndex > 0) {
      if (formData.lamaPerkuliahan && formData.lamaPerkuliahan.toString().trim() !== '') {
        sheet.getRange(newRow, lamaIndex).setValue(formData.lamaPerkuliahan.toString().trim());
      } else {
        return {
          success: false,
          error: 'Lama Perkuliahan tidak boleh kosong'
        };
      }
    }
    
    if (materiIndex > 0 && formData.materi) {
      sheet.getRange(newRow, materiIndex).setValue(formData.materi.toString().trim());
    }
    
    return {
      success: true,
      message: 'Data berhasil disimpan',
      id: newId
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Submit Absensi
 */
function submitAbsensi(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_ABSENSI);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Absensi" tidak ditemukan. Pastikan sheet sudah dibuat dengan nama "Absensi"'
      };
    }
    
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    const noIndex = findHeaderIndex(header, 'No', true);
    const namaDosenIndex = findHeaderIndex(header, 'Nama Dosen', true);
    const matkulKelasIndex = findHeaderIndex(header, 'Matakuliah-Kelas', true);
    const pertemuanIndex = findHeaderIndex(header, 'Pertemuan', true);
    const statusIndex = findHeaderIndex(header, 'Status', true);
    const tanggalIndex = findHeaderIndex(header, 'Tanggal', true);
    const jamIndex = findHeaderIndex(header, 'Jam', true);
    
    const missingColumns = [];
    if (namaDosenIndex === 0) missingColumns.push('Nama Dosen');
    if (matkulKelasIndex === 0) missingColumns.push('Matakuliah-Kelas');
    if (pertemuanIndex === 0) missingColumns.push('Pertemuan');
    if (statusIndex === 0) missingColumns.push('Status');
    if (tanggalIndex === 0) missingColumns.push('Tanggal');
    if (jamIndex === 0) missingColumns.push('Jam');
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        error: 'Kolom tidak ditemukan: ' + missingColumns.join(', ') + '. Pastikan header sheet sesuai dengan: No, Nama Dosen, Matakuliah-Kelas, Pertemuan, Status, Tanggal, Jam'
      };
    }
    
    const newNo = generateId(sheet);
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;
    
    if (noIndex > 0) sheet.getRange(newRow, noIndex).setValue(newNo);
    
    if (namaDosenIndex > 0 && formData.namaDosen) {
      sheet.getRange(newRow, namaDosenIndex).setValue(formData.namaDosen.toString().trim());
    }
    
    if (matkulKelasIndex > 0 && formData.matakuliahKelas) {
      sheet.getRange(newRow, matkulKelasIndex).setValue(formData.matakuliahKelas.toString().trim());
    }
    
    if (pertemuanIndex > 0) {
      const pertemuanValue = formData.pertemuan ? parseInt(formData.pertemuan) : null;
      if (pertemuanValue && !isNaN(pertemuanValue)) {
        sheet.getRange(newRow, pertemuanIndex).setValue(pertemuanValue);
      } else {
        return {
          success: false,
          error: 'Pertemuan tidak valid atau kosong'
        };
      }
    }
    
    if (statusIndex > 0 && formData.status) {
      sheet.getRange(newRow, statusIndex).setValue(formData.status.toString().trim());
    } else {
      return {
        success: false,
        error: 'Status tidak boleh kosong'
      };
    }
    
    if (tanggalIndex > 0 && formData.tanggal) {
      try {
        const dateParts = formData.tanggal.split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        sheet.getRange(newRow, tanggalIndex).setValue(date);
      } catch (e) {
        sheet.getRange(newRow, tanggalIndex).setValue(formData.tanggal);
      }
    }
    
    if (jamIndex > 0 && formData.jam) {
      sheet.getRange(newRow, jamIndex).setValue(formData.jam.toString().trim());
    }
    
    return {
      success: true,
      message: 'Data absensi berhasil disimpan',
      id: newNo
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

// ============================================
// KETUA TINGKAT FUNCTIONS
// ============================================

/**
 * Get all jadwal data untuk halaman Ketua Tingkat
 */
function getAllJadwal() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_JADWAL);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Jadwal" tidak ditemukan'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return {
        success: true,
        data: []
      };
    }
    
    const header = data[0];
    
    const matkulIndex = findHeaderIndex(header, 'Matakuliah - Kelas', false);
    const ketuaIndex = findHeaderIndex(header, 'Ketua Tingkat', false);
    const nimIndex = findHeaderIndex(header, 'NIM', false);
    const noWaIndex = findHeaderIndex(header, 'No WA', false);
    
    if (matkulIndex === -1) {
      return {
        success: false,
        error: 'Kolom "Matakuliah - Kelas" tidak ditemukan'
      };
    }
    
    const jadwalList = [];
    
    for (let i = 1; i < data.length; i++) {
      const matkul = data[i][matkulIndex] ? data[i][matkulIndex].toString().trim() : '';
      
      if (!matkul || matkul === '') {
        continue;
      }
      
      const ketua = (ketuaIndex !== -1 && data[i][ketuaIndex]) ? data[i][ketuaIndex].toString().trim() : '';
      const nim = (nimIndex !== -1 && data[i][nimIndex]) ? data[i][nimIndex].toString().trim() : '';
      const noWa = (noWaIndex !== -1 && data[i][noWaIndex]) ? data[i][noWaIndex].toString().trim() : '';
      
      jadwalList.push({
        Matakuliah: matkul,
        Ketua: ketua,
        NIM: nim,
        NoWA: noWa
      });
    }
    
    return {
      success: true,
      data: jadwalList
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Submit Ketua Tingkat
 * Update semua baris dengan Matakuliah-Kelas yang sama
 */
function submitKeting(formData) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEET_JADWAL);
    
    if (!sheet) {
      return {
        success: false,
        error: 'Sheet "Jadwal" tidak ditemukan'
      };
    }
    
    const data = sheet.getDataRange().getValues();
    const header = data[0];
    
    const matkulIndex = findHeaderIndex(header, 'Matakuliah - Kelas', false);
    const ketuaIndex = findHeaderIndex(header, 'Ketua Tingkat', false);
    const nimIndex = findHeaderIndex(header, 'NIM', false);
    const noWaIndex = findHeaderIndex(header, 'No WA', false);
    
    if (matkulIndex === -1) {
      return {
        success: false,
        error: 'Kolom "Matakuliah - Kelas" tidak ditemukan'
      };
    }
    
    if (ketuaIndex === -1 || nimIndex === -1 || noWaIndex === -1) {
      return {
        success: false,
        error: 'Kolom "Ketua Tingkat", "NIM", atau "No WA" tidak ditemukan'
      };
    }
    
    // Validate form data
    if (!formData.matakuliah || !formData.nama || !formData.nim || !formData.noWa) {
      return {
        success: false,
        error: 'Data tidak lengkap'
      };
    }
    
    const targetMatkul = formData.matakuliah.toString().trim().toLowerCase();
    let updatedCount = 0;
    
    // Update semua baris yang memiliki Matakuliah-Kelas yang sama
    for (let i = 1; i < data.length; i++) {
      const rowMatkul = data[i][matkulIndex] ? data[i][matkulIndex].toString().trim() : '';
      
      if (rowMatkul.toLowerCase() === targetMatkul) {
        const rowNumber = i + 1; // 1-based index
        
        // Update kolom D (Ketua Tingkat)
        sheet.getRange(rowNumber, ketuaIndex + 1).setValue(formData.nama.toString().trim());
        
        // Update kolom E (NIM)
        sheet.getRange(rowNumber, nimIndex + 1).setValue(formData.nim.toString().trim());
        
        // Update kolom F (No WA)
        sheet.getRange(rowNumber, noWaIndex + 1).setValue(formData.noWa.toString().trim());
        
        updatedCount++;
      }
    }
    
    if (updatedCount === 0) {
      return {
        success: false,
        error: 'Tidak ada data yang diupdate. Mata kuliah tidak ditemukan.'
      };
    }
    
    return {
      success: true,
      message: 'Data ketua tingkat berhasil disimpan',
      updatedRows: updatedCount
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

