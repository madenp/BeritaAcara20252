# Halaman Ketua Tingkat (keting.html)

## Deskripsi
Halaman ini digunakan untuk mengelola data Ketua Tingkat untuk setiap mata kuliah. Halaman ini menampilkan daftar mata kuliah yang sudah memiliki ketua tingkat dan yang belum memiliki ketua tingkat.

## Fitur Utama

### 1. **Statistik Dashboard**
- Total Mata Kuliah
- Jumlah Mata Kuliah yang Sudah Ada Ketua Tingkat
- Jumlah Mata Kuliah yang Belum Ada Ketua Tingkat

### 2. **Dua Section Utama**

#### Section 1: Mata Kuliah dengan Ketua Tingkat (🔒)
- Menampilkan card list mata kuliah yang sudah memiliki ketua tingkat
- Card ditampilkan dengan ikon lock (🔒)
- Informasi yang ditampilkan:
  - Nama Mata Kuliah - Kelas
  - Nama Ketua Tingkat
  - NIM
  - No WhatsApp
- Card tidak bisa diklik (locked)

#### Section 2: Mata Kuliah Belum Ada Ketua Tingkat (📝)
- Menampilkan card list mata kuliah yang belum memiliki ketua tingkat
- Card bisa diklik untuk mendaftar sebagai ketua tingkat
- Hover effect untuk menunjukkan card bisa diklik

### 3. **Form Pendaftaran Ketua Tingkat**
Ketika user mengklik card mata kuliah yang belum ada ketua tingkat, akan muncul modal form dengan field:
- **Nama Lengkap** (required)
- **NIM** (required)
- **No WhatsApp** (required)

### 4. **Update Data ke Google Sheets**
Setelah form disubmit, sistem akan:
- Update kolom D (Ketua Tingkat) dengan Nama
- Update kolom E (NIM) dengan NIM
- Update kolom F (No WA) dengan No WhatsApp
- **Update SEMUA baris** yang memiliki nilai "Matakuliah - Kelas" yang sama (karena duplikat)

## File yang Terlibat

### 1. **keting.html**
- Struktur HTML halaman
- Styling khusus untuk card list dan modal
- Responsive design

### 2. **keting.js**
- Logic untuk load data jadwal
- Grouping data berdasarkan Matakuliah - Kelas
- Handling modal form
- Submit data ke backend
- Update UI setelah submit

### 3. **Code.gs** (Backend)
Fungsi yang ditambahkan:
- `getAllJadwal()` - Mengambil semua data dari sheet "Jadwal"
- `submitKeting(formData)` - Update data ketua tingkat untuk semua baris dengan Matakuliah-Kelas yang sama

## Cara Penggunaan

### Untuk Mahasiswa (User):
1. Buka halaman `keting.html`
2. Lihat daftar mata kuliah yang belum ada ketua tingkat
3. Klik card mata kuliah yang ingin didaftarkan
4. Isi form dengan data lengkap
5. Klik tombol "Daftar"
6. Data akan tersimpan dan card akan pindah ke section "Sudah Ada Ketua Tingkat"

### Untuk Developer:
1. Pastikan Google Apps Script sudah di-deploy dengan versi terbaru
2. URL deployment sudah diupdate di `keting.js` (variabel `GOOGLE_SCRIPT_URL`)
3. Sheet "Jadwal" memiliki kolom:
   - Matakuliah - Kelas (Kolom C)
   - Ketua Tingkat (Kolom D)
   - NIM (Kolom E)
   - No WA (Kolom F)

## Deployment

### 1. Update Google Apps Script
```
1. Buka Google Sheets
2. Extensions > Apps Script
3. Copy semua kode dari Code.gs
4. Save (Ctrl+S)
5. Deploy > Manage deployments
6. Click Edit (ikon pensil)
7. New version
8. Deploy
9. Copy URL deployment
```

### 2. Update keting.js
```javascript
const GOOGLE_SCRIPT_URL = 'PASTE_URL_DEPLOYMENT_DISINI';
```

## Catatan Penting

⚠️ **Duplikasi Data**: Karena mata kuliah - kelas merupakan nilai duplikat di sheet "Jadwal", ketika data diinput akan **update 2 atau lebih data sekaligus** (semua baris dengan Matakuliah-Kelas yang sama).

✅ **Validasi**: Form memiliki validasi untuk memastikan semua field terisi sebelum submit.

🔒 **Lock Mechanism**: Setelah mata kuliah memiliki ketua tingkat, card akan otomatis terkunci dan tidak bisa diubah dari halaman ini.

## Testing
Anda dapat menguji halaman ini di localhost sesuai permintaan. Pastikan:
- Google Apps Script sudah di-deploy
- URL deployment sudah benar di keting.js
- Sheet "Jadwal" memiliki struktur kolom yang sesuai
