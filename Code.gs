/**
 * GOOGLE APPS SCRIPT - BACKEND UNTUK APLIKASI BERITA ACARA
 * 
 * INSTRUKSI:
 * 1. Buka Google Sheet Anda
 * 2. Klik Extensions > Apps Script
 * 3. Hapus semua kode default
 * 4. Copy-paste kode ini
 * 5. Ganti SPREADSHEET_ID dengan ID dari URL Google Sheet Anda
 * 6. Klik Deploy > New Deployment
 * 7. Pilih type: Web app
 * 8. Execute as: Me
 * 9. Who has access: Anyone
 * 10. Klik Deploy
 * 11. Copy URL yang muncul dan paste ke file app.js (variabel GOOGLE_SCRIPT_URL)
 */

// GANTI INI DENGAN ID SPREADSHEET ANDA
// ID ada di URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
const SPREADSHEET_ID = '1j_kPn7sJNFI6NwZ2Ro2Hgz8x06bfvC3NBP0xAntxgjg';

// Nama sheet
const SHEET_DOSEN = 'Dosen';
const SHEET_JADWAL = 'Jadwal';
const SHEET_BERITA_ACARA = 'Berita Acara';

/**
 * Helper function untuk mencari index kolom header (case-insensitive)
 * @param {Array} headerArray - Array header dari sheet
 * @param {String} searchText - Teks yang dicari
 * @param {Boolean} returnOneBased - True untuk return 1-based index (untuk setValue), false untuk 0-based (untuk array)
 * @return {Number} Index kolom, atau -1/0 jika tidak ditemukan
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
 * Fungsi utama untuk handle HTTP requests
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
 * Fungsi untuk handle POST requests
 */
function doPost(e) {
  try {
    // Handle both JSON and URL-encoded formats
    let action, data;
    
    if (e.postData.type === 'application/json') {
      const parsed = JSON.parse(e.postData.contents);
      action = parsed.action;
      data = parsed.data;
    } else {
      // URL-encoded format
      action = e.parameter.action;
      if (e.parameter.data) {
        data = JSON.parse(e.parameter.data);
      }
    }
    
    if (action === 'submitBeritaAcara') {
      const result = submitBeritaAcara(data);
      return ContentService.createTextOutput(JSON.stringify(result))
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
 * Fungsi untuk mendapatkan daftar dosen
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
    
    // Skip header (row 1)
    const dosenList = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] && data[i][1]) { // Pastikan ID dan Nama tidak kosong
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
 * Fungsi untuk mendapatkan jadwal berdasarkan ID atau nama dosen
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
    
    // Cari kolom index
    // Header: ID, Nama Dosen, Matakuliah - Kelas, Ketua Tingkat
    const header = data[0];
    
    const idIndex = findHeaderIndex(header, 'ID', false);
    const namaIndex = findHeaderIndex(header, 'Nama Dosen', false);
    const matkulIndex = findHeaderIndex(header, 'Matakuliah - Kelas', false);
    const ketuaIndex = findHeaderIndex(header, 'Ketua Tingkat', false);
    
    // Validasi kolom ditemukan
    if (namaIndex === -1) {
      return {
        success: false,
        error: 'Kolom "Nama Dosen" tidak ditemukan di sheet Jadwal'
      };
    }
    
    if (matkulIndex === -1) {
      return {
        success: false,
        error: 'Kolom "Matakuliah - Kelas" tidak ditemukan di sheet Jadwal'
      };
    }
    
    const jadwalList = [];
    
    // Validasi: pastikan nama dosen ada
    if (!dosenNama || dosenNama.toString().trim() === '') {
      return {
        success: false,
        error: 'Nama dosen tidak valid'
      };
    }
    
    // Helper function untuk normalize nama (remove semua whitespace tidak terlihat, normalize spasi)
    function normalizeNama(nama) {
      if (!nama) return '';
      return nama.toString()
        .trim()
        .replace(/\s+/g, ' ')  // Replace multiple spaces dengan single space
        .replace(/[\u200B-\u200D\uFEFF]/g, '')  // Remove zero-width characters
        .toLowerCase()
        .trim();
    }
    
    // Normalize nama dosen untuk comparison
    const normalizedDosenNama = normalizeNama(dosenNama);
    
    // Loop dari row 2 (skip header) - cari semua baris yang sesuai
    for (let i = 1; i < data.length; i++) {
      const rowNamaDosen = data[i][namaIndex] ? data[i][namaIndex].toString() : '';
      const rowMatkul = data[i][matkulIndex] ? data[i][matkulIndex].toString() : '';
      
      // Skip jika matakuliah kosong
      if (!rowMatkul || rowMatkul.trim() === '') {
        continue;
      }
      
      // Skip jika nama dosen kosong
      if (!rowNamaDosen || rowNamaDosen.trim() === '') {
        continue;
      }
      
      // Normalize nama dari sheet untuk comparison
      const normalizedRowNama = normalizeNama(rowNamaDosen);
      
      // HANYA gunakan exact match nama dosen (case-insensitive, spasi dinormalisasi)
      // Jangan gunakan ID matching karena ID di sheet Jadwal mungkin berbeda dengan ID di sheet Dosen
      // Pastikan matching benar-benar exact (tidak partial match)
      if (normalizedRowNama === normalizedDosenNama) {
        const rowId = data[i][idIndex] ? data[i][idIndex].toString().trim() : '';
        const originalNama = rowNamaDosen.trim();
        const originalMatkul = rowMatkul.trim();
        const ketua = (data[i][ketuaIndex] && ketuaIndex !== -1) ? data[i][ketuaIndex].toString().trim() : '';
        
        jadwalList.push({
          ID: rowId,
          NamaDosen: originalNama,
          Matakuliah: originalMatkul,
          Ketua: ketua
        });
      }
    }
    
    // Return hasil dengan informasi debug (untuk development)
    return {
      success: true,
      data: jadwalList,
      debug: {
        searchedName: dosenNama,
        normalizedSearchedName: normalizedDosenNama,
        foundCount: jadwalList.length
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Fungsi untuk mendapatkan data yang sudah ada berdasarkan mata kuliah
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
      // Hanya header, tidak ada data
      return {
        success: true,
        data: []
      };
    }
    
    // Cari kolom index
    const header = data[0];
    const matkulIndex = findHeaderIndex(header, 'Mata Kuliah', false);
    const pertemuanIndex = findHeaderIndex(header, 'Pertemuan Ke', false);
    
    if (matkulIndex === -1 || pertemuanIndex === -1) {
      return {
        success: false,
        error: 'Kolom "Mata Kuliah" atau "Pertemuan Ke" tidak ditemukan'
      };
    }
    
    const existingList = [];
    
    // Normalize mata kuliah untuk comparison
    const normalizedMatkul = mataKuliah ? mataKuliah.toString().trim().toLowerCase() : '';
    
    // Loop dari row 2 (skip header)
    for (let i = 1; i < data.length; i++) {
      const rowMatkul = data[i][matkulIndex] ? data[i][matkulIndex].toString().trim() : '';
      const rowPertemuan = data[i][pertemuanIndex] ? data[i][pertemuanIndex].toString().trim() : '';
      
      if (!rowMatkul || !rowPertemuan) {
        continue;
      }
      
      // Normalize untuk comparison
      const normalizedRowMatkul = rowMatkul.toLowerCase();
      
      // Jika mata kuliah cocok (atau jika mataKuliah kosong, ambil semua)
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
 * Fungsi untuk submit berita acara
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
    
    // Get header untuk menentukan kolom
    const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Map header ke index kolom (1-based untuk setValue)
    const idIndex = findHeaderIndex(header, 'ID', true);
    const namaDosenIndex = findHeaderIndex(header, 'Pilih Nama Dosen', true);
    const matkulIndex = findHeaderIndex(header, 'Mata Kuliah', true);
    const pertemuanIndex = findHeaderIndex(header, 'Pertemuan Ke', true);
    const tanggalIndex = findHeaderIndex(header, 'Tanggal', true);
    const keteranganIndex = findHeaderIndex(header, 'Keterangan', true);
    const lamaIndex = findHeaderIndex(header, 'Lama Perkuliahan', true);
    const materiIndex = findHeaderIndex(header, 'Materi yang diberikan', true);
    
    // Debug: Log semua header yang ditemukan
    const debugInfo = {
      headers: header,
      indexes: {
        id: idIndex,
        namaDosen: namaDosenIndex,
        matkul: matkulIndex,
        pertemuan: pertemuanIndex,
        tanggal: tanggalIndex,
        keterangan: keteranganIndex,
        lama: lamaIndex,
        materi: materiIndex
      },
      formData: formData
    };
    
    // Validasi index penting
    const missingColumns = [];
    if (pertemuanIndex === 0) missingColumns.push('Pertemuan Ke');
    if (lamaIndex === 0) missingColumns.push('Lama Perkuliahan');
    
    if (missingColumns.length > 0) {
      return {
        success: false,
        error: 'Kolom tidak ditemukan: ' + missingColumns.join(', ') + '. Header yang ditemukan: ' + header.join(', '),
        debug: debugInfo
      };
    }
    
    // Generate ID baru (bisa berupa timestamp atau auto-increment)
    const newId = generateId(sheet);
    
    // Find next empty row
    const lastRow = sheet.getLastRow();
    const newRow = lastRow + 1;
    
    // Insert data dengan validasi
    if (idIndex > 0) sheet.getRange(newRow, idIndex).setValue(newId);
    if (namaDosenIndex > 0 && formData.namaDosen) {
      sheet.getRange(newRow, namaDosenIndex).setValue(formData.namaDosen.toString().trim());
    }
    if (matkulIndex > 0 && formData.mataKuliah) {
      sheet.getRange(newRow, matkulIndex).setValue(formData.mataKuliah.toString().trim());
    }
    
    // Pertemuan Ke - pastikan ada nilai dan valid
    if (pertemuanIndex > 0) {
      const pertemuanValue = formData.pertemuanKe ? parseInt(formData.pertemuanKe) : null;
      if (pertemuanValue && !isNaN(pertemuanValue)) {
        sheet.getRange(newRow, pertemuanIndex).setValue(pertemuanValue);
      } else {
        return {
          success: false,
          error: 'Pertemuan Ke tidak valid atau kosong',
          debug: { pertemuanValue: formData.pertemuanKe, pertemuanIndex: pertemuanIndex }
        };
      }
    }
    
    // Tanggal
    if (tanggalIndex > 0 && formData.tanggal) {
      try {
        const dateParts = formData.tanggal.split('-');
        const date = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
        sheet.getRange(newRow, tanggalIndex).setValue(date);
      } catch (e) {
        sheet.getRange(newRow, tanggalIndex).setValue(formData.tanggal);
      }
    }
    
    // Keterangan
    if (keteranganIndex > 0) {
      sheet.getRange(newRow, keteranganIndex).setValue(formData.keterangan ? formData.keterangan.toString().trim() : '');
    }
    
    // Lama Perkuliahan - pastikan ada nilai
    if (lamaIndex > 0) {
      if (formData.lamaPerkuliahan && formData.lamaPerkuliahan.toString().trim() !== '') {
        sheet.getRange(newRow, lamaIndex).setValue(formData.lamaPerkuliahan.toString().trim());
      } else {
        return {
          success: false,
          error: 'Lama Perkuliahan tidak boleh kosong',
          debug: { lamaValue: formData.lamaPerkuliahan, lamaIndex: lamaIndex }
        };
      }
    }
    
    // Materi
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
 * Fungsi untuk generate ID baru
 */
function generateId(sheet) {
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1) {
    // Jika hanya ada header, mulai dari 1
    return 1;
  }
  
  // Cari ID maksimum
  const idColumn = 1; // Kolom A
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

