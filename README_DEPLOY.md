# MEMBER WINNER — Cloudflare Pages

Project ini menggunakan:
- Cloudflare Pages untuk frontend + Pages Functions
- Cloudflare D1 untuk database
- Cloudflare R2 untuk gambar
- Environment secrets untuk login admin

## Credential admin yang disiapkan

**Admin ID:** `adminwinner`  
**Admin Password:** `sqgMSAcDN%fNu9Ck$h`

Simpan password ini. Saat deploy, masukkan nilai tersebut ke Environment Variables Cloudflare.

---

## 1. Upload source ke GitHub

1. Extract ZIP project ini.
2. Buat repository GitHub baru, misalnya `member-winner`.
3. Upload semua isi folder project ke root repository.
4. Pastikan folder `functions`, `admin`, `assets`, file `index.html`, `schema.sql`, dan `_redirects` ada di root.

## 2. Buat project Cloudflare Pages

1. Login Cloudflare.
2. Buka **Workers & Pages**.
3. Pilih **Create application / Pages** lalu hubungkan GitHub repository.
4. Framework preset: **None**.
5. Build command: kosongkan.
6. Build output directory: `/` atau root sesuai UI Pages.
7. Deploy.

## 3. Buat D1 Database

1. Cloudflare Dashboard → **Storage & Databases → D1**.
2. Create database: `member-winner-db`.
3. Buka database tersebut → Console.
4. Copy seluruh isi `schema.sql`.
5. Paste ke Console dan jalankan.

## 4. Hubungkan D1 ke Pages

Pages project → **Settings → Bindings → Add binding → D1 database**.

- Variable name / binding: `DB`
- Database: `member-winner-db`

Simpan.

## 5. Buat R2 bucket

Cloudflare Dashboard → **R2 Object Storage → Create bucket**.

Bucket name:
`member-winner-media`

Tidak perlu menjadikan bucket public karena gambar dibaca lewat Pages Function `/media/...`.

## 6. Hubungkan R2 ke Pages

Pages project → **Settings → Bindings → Add binding → R2 bucket**.

- Variable name / binding: `MEDIA`
- Bucket: `member-winner-media`

Simpan.

## 7. Buat Admin ID, Password, dan Session Secret

Pages project → **Settings → Variables and Secrets**.

Tambahkan:

`ADMIN_ID`
```
adminwinner
```

`ADMIN_PASSWORD`
```
sqgMSAcDN%fNu9Ck$h
```

`SESSION_SECRET`
```
H9zk_34dnDD-ptZRKdgya80IZzZ9wDowmJpFR41BdEsT_12rtOZ_rdvfCo9d_sog
```

Sebaiknya tandai password dan session secret sebagai **Secret** jika UI menyediakan pilihan tersebut.

## 8. Redeploy

Setelah D1, R2, dan variables selesai dipasang, lakukan deployment baru / Retry deployment agar Functions menerima binding terbaru.

Website:
`https://NAMA-PROJECT.pages.dev/`

Admin:
`https://NAMA-PROJECT.pages.dev/admin/`

## 9. Ganti Logo, Background, dan Favicon

Edit file `config.js`:

```js
window.SITE_CONFIG = {
  siteName: "WINNER MEMBER",
  tagline: "Galeri Bukti Kemenangan Member",
  logoUrl: "URL_LOGO_KAMU",
  faviconUrl: "URL_FAVICON_KAMU",
  backgroundUrl: "URL_BACKGROUND_KAMU",
  currencyPrefix: "Rp",
  postsPerPage: 12
};
```

Push perubahan ke GitHub. Cloudflare Pages akan deploy ulang.

## Cara posting

1. Masuk ke `/admin/`.
2. Klik **+ Tambah Post**.
3. Isi judul, username, nominal, game, badge, deskripsi.
4. Upload:
   - 1 Banner utama
   - beberapa Bukti Kemenangan
   - beberapa Bukti Transfer
5. Pilih Draft atau Publish.
6. Klik Simpan.

Posting Published langsung tampil di halaman publik.

## Catatan keamanan

- Jangan masukkan `ADMIN_PASSWORD` atau `SESSION_SECRET` ke `config.js`.
- `config.js` bersifat publik dan hanya untuk pengaturan tampilan.
- Admin menggunakan cookie HttpOnly + Secure + SameSite Strict.
- Upload dibatasi file image dan maksimal 10 MB per file.
