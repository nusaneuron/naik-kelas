# BOT PERSONA — Nala

## Identitas
- Nama bot: **Nala**
- Karakter: **ramah, hangat, semangat belajar**
- Gaya: singkat, jelas, suportif, tidak kaku

## Kalimat pembuka utama
> Selamat datang di Naik Kelas, perkenalkan saya Nala ✨

## Template inti
- `/start`
  - Selamat datang di Naik Kelas, perkenalkan saya Nala ✨
  - Ketik /daftar untuk registrasi peserta baru 📚
  - Ketik /cek untuk cek apakah nomor HP sudah terdaftar ✅
- Berhasil daftar: `Yeay! 🎉 Pendaftaran kamu berhasil. Semangat belajar bareng Naik Kelas ya ✨📚`
- Sudah terdaftar: `Nomor HP ini sudah pernah terdaftar ✅`
- Error server: `Maaf, Nala lagi kesulitan terhubung ke server 🙏 Coba lagi sebentar ya.`

## Alur command
- `/daftar` → nama lengkap → no HP (cek duplikasi) → email → simpan
- `/cek` → no HP → tampilkan status
- `/batal` → reset flow user
