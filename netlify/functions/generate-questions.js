const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    if (!event.body) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Request body is empty.' })
        };
    }

    const {
        namaSekolah,
        tahunPelajaran,
        durasiWaktu,
        kelas,
        mapel,
        materi,
        apiSource,
        pgJumlah,
        uraianJumlah,
        isianJumlah,
        menjodohkanJumlah,
        bsJumlah
    } = JSON.parse(event.body);

    if (!materi || (pgJumlah === 0 && uraianJumlah === 0 && isianJumlah === 0 && menjodohkanJumlah === 0 && bsJumlah === 0)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Materi tidak boleh kosong dan setidaknya satu jenis soal harus dipilih dengan jumlahnya.' })
        };
    }

    let promptText = `Sebagai pembuat soal profesional dan berpengalaman, buatkan soal-soal ujian dengan detail dan format yang SANGAT SPESIFIK berikut:\n\n`;
    promptText += `Mata Pelajaran: ${mapel || 'Umum'}\n`;
    promptText += `Kelas: ${kelas || 'Tidak disebutkan'}\n`;
    promptText += `Materi/Capaian Pembelajaran/Tujuan Pembelajaran: ${materi}\n`;
    promptText += `Durasi Ujian: ${durasiWaktu || 'Tidak disebutkan'} menit\n\n`;

    promptText += `--- INSTRUKSI PENTING UNTUK PEMBUATAN SOAL ---\n`;
    promptText += `- **PATUHI JUMLAH SOAL DENGAN SANGAT KETAT** untuk setiap jenis yang diminta. Jika diminta 5 soal, berikan TEPAT 5 soal.\n`;
    promptText += `- **Fokuskan konten soal pada materi yang diberikan.** Jangan menyimpang dari materi.\n`;
    promptText += `- Gunakan bahasa Indonesia yang baku, jelas, dan sesuai untuk konteks ujian sekolah.\n`;
    promptText += `- Berikan nomor urut pada setiap soal dengan format "1.", "2.", dst. Dimulai dari 1 untuk setiap bagian jenis soal baru.\n`;
    promptText += `- Untuk soal pilihan ganda, pastikan ada 4 opsi (A, B, C, D) dan kunci jawaban di baris baru setelah opsi, contoh: "Kunci: [Huruf Kunci]".\n`;
    promptText += `- Untuk soal benar/salah, pastikan ada pernyataan dan kunci jawaban di baris baru setelah pernyataan, contoh: "Kunci: [Benar/Salah]".\n`;
    promptText += `- Untuk soal menjodohkan, berikan dua daftar (misal: "Kolom A" dan "Kolom B") dan instruksi yang jelas. Pastikan jumlah item di Kolom A dan B sesuai dengan jumlah soal yang diminta.\n\n`;

    promptText += `--- JENIS DAN JUMLAH SOAL YANG DIMINTA ---\n`;
    if (pgJumlah > 0) promptText += `- Pilihan Ganda (PG): ${pgJumlah} soal\n`;
    if (uraianJumlah > 0) promptText += `- Uraian: ${uraianJumlah} soal\n`;
    if (isianJumlah > 0) promptText += `- Isian Singkat: ${isianJumlah} soal\n`;
    if (menjodohkanJumlah > 0) promptText += `- Menjodohkan: ${menjodohkanJumlah} soal\n`;
    if (bsJumlah > 0) promptText += `- Benar/Salah: ${bsJumlah} soal\n\n`;

    promptText += `--- FORMAT OUTPUT AKHIR (WAJIB DIIKUTI) ---\n`;
    promptText += `Hanya berikan output soal. Jangan ada teks pengantar seperti "Berikut adalah soal ujian Anda" atau teks penutup. Gunakan heading Markdown untuk setiap bagian jenis soal.\n\n`;

    if (pgJumlah > 0) promptText += `## A. Pilihan Ganda\n`;
    if (uraianJumlah > 0) promptText += `## B. Uraian\n`;
    if (isianJumlah > 0) promptText += `## C. Isian Singkat\n`;
    if (menjodohkanJumlah > 0) promptText += `## D. Menjodohkan\n`;
    if (bsJumlah > 0) promptText += `## E. Benar/Salah\n`;

    promptText += `\n(Mulai daftar soal di sini, ikuti format yang diminta untuk setiap jenis soal)\n`;


    let apiUrl = '';
    let apiKey = '';
    let model = '';

    switch (apiSource) {
        case 'openai':
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            apiKey = process.env.OPENAI_API_KEY;
            model = 'gpt-3.5-turbo'; // Atau 'gpt-4o' jika Anda punya akses
            break;
        case 'groq':
            apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
            apiKey = process.env.GROQ_API_KEY;
            model = 'llama3-8b-8192';
            break;
        case 'iask':
            apiUrl = 'https://api.iask.ai/v1/chat/completions';
            apiKey = process.env.IASK_AI_KEY;
            model = 'YOUR_IASK_MODEL'; // Ganti dengan model iAsk Anda
            break;
        default:
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'AI Engine tidak dikenal.' })
            };
    }

    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `API Key untuk ${apiSource} tidak ditemukan di lingkungan fungsi Netlify. Pastikan sudah diatur di Environment Variables.` })
        };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: "user", content: promptText }],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('API Error Response:', errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `API Error from ${apiSource}: ${response.status} - ${errorData.message || response.statusText}` })
            };
        }

        const data = await response.json();
        const generatedText = data.choices[0].message.content;

        const headerSoal = `
            <div style="text-align: center; margin-bottom: 20px; font-family: 'Poppins', sans-serif;">
                <p style="margin: 0; font-size: 0.9em;">PEMERINTAH KABUPATEN PURWAKARTA</p>
                <p style="margin: 0; font-size: 0.9em;">DINAS PENDIDIKAN</p>
                <p style="margin: 0; font-size: 1.1em; font-weight: bold;">UPTD ${namaSekolah.toUpperCase() || 'SDN 1 BOJONG TIMUR'}</p>
                <p style="margin: 0; font-size: 0.7em;">Alamat : Kp. Cileuweung RT 14/07 Ds Bojong Timur - Bojong - Purwakarta Kode Pos 41164</p>
                <hr style="border-top: 2px solid #333; margin: 10px 0;">
                <h2 style="margin: 15px 0; font-size: 1.5em; font-weight: bold;">ASESMEN SUMATIF AKHIR JENJANG (ASAJ)</h2>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 0.9em;">
                    <tr>
                        <td style="width: 50%; padding: 2px 0;">Nama : .................................................................................................</td>
                        <td style="width: 50%; padding: 2px 0;">Muatan Pelajaran : ${mapel || '................................................................................................'}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; padding: 2px 0;">Waktu : ${durasiWaktu || '90'} Menit</td>
                        <td style="width: 50%; padding: 2px 0;">Kelas : ${kelas || '................................................................................................'}</td>
                    </tr>
                </table>
                <hr style="border-top: 1px solid #333; margin: 10px 0;">
                <div style="text-align: left; margin-top: 15px;">
                    <p style="font-weight: bold; margin-bottom: 5px;">PETUNJUK :</p>
                    <ol style="margin-left: 20px; padding-left: 0; font-size: 0.9em;">
                        <li>Berdoalah terlebih dahulu sebelum mengerjakan soal !</li>
                        <li>Tulislah namamu pada kolom yang telah disediakan !</li>
                        <li>Bacalah soal dengan teliti dan kerjakan lebih dahulu soal yang kamu anggap mudah !</li>
                        <li>Periksalah kembali jawabanmu sebelum diserahkan kepada pengawas !</li>
                        <li>Bacalah hamdalah setelah selesai mengerjakan</li>
                    </ol>
                </div>
                <hr style="border-top: 1px solid #333; margin: 20px 0;">
            </div>
        `;

        return {
            statusCode: 200,
            body: JSON.stringify({
                header: headerSoal,
                questions: generatedText
            })
        };

    } catch (error) {
        console.error('Error calling AI API:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Terjadi kesalahan saat membuat soal: ${error.message}.` })
        };
    }
};
