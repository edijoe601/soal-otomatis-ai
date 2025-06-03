const fetch = require('node-fetch'); // Pastikan 'node-fetch' terinstal di proyek Anda (lihat package.json di bawah)

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    // Pastikan event.body ada dan bisa di-parse
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
        menjodohkanJumlah, // Tambahan
        bsJumlah           // Tambahan
    } = JSON.parse(event.body);

    if (!materi || (pgJumlah == 0 && uraianJumlah == 0 && isianJumlah == 0 && menjodohkanJumlah == 0 && bsJumlah == 0)) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Materi tidak boleh kosong dan setidaknya satu jenis soal harus dipilih dengan jumlahnya.' })
        };
    }

    let promptText = `Sebagai pembuat soal profesional, buatkan soal-soal ujian dengan detail berikut:\n\n`;
    promptText += `Mata Pelajaran: ${mapel || 'Umum'}\n`;
    promptText += `Kelas: ${kelas || 'Tidak disebutkan'}\n`;
    promptText += `Materi/Capaian Pembelajaran: ${materi}\n`;
    promptText += `Durasi Ujian: ${durasiWaktu || 'Tidak disebutkan'} menit\n\n`;
    promptText += `Jenis dan Jumlah Soal:\n`;
    if (pgJumlah > 0) promptText += `- ${pgJumlah} soal Pilihan Ganda (dengan 4 opsi dan kunci jawaban di akhir setiap soal, contoh: A. Pilihan A, B. Pilihan B, C. Pilihan C, D. Pilihan D. Kunci: [Huruf Kunci])\n`;
    if (uraianJumlah > 0) promptText += `- ${uraianJumlah} soal Uraian\n`;
    if (isianJumlah > 0) promptText += `- ${isianJumlah} soal Isian Singkat\n`;
    if (menjodohkanJumlah > 0) promptText += `- ${menjodohkanJumlah} soal Menjodohkan\n`; // Tambahan
    if (bsJumlah > 0) promptText += `- ${bsJumlah} soal Benar/Salah\n\n`; // Tambahan
    promptText += `Format output harus jelas, dimulai dengan nomor soal, teks soal, opsi (untuk PG), dan kunci jawaban/indikasi jawaban.`;


    let apiUrl = '';
    let apiKey = '';
    let model = '';

    switch (apiSource) {
        case 'openai':
            apiUrl = 'https://api.openai.com/v1/chat/completions';
            apiKey = process.env.OPENAI_API_KEY;
            model = 'gpt-3.5-turbo';
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
            <p style="text-align: center; font-weight: bold;">
                <span style="font-size: 1.2em;">${(namaSekolah || 'NAMA SEKOLAH ANDA').toUpperCase()}</span><br>
                Ujian Mata Pelajaran ${(mapel || 'MATA PELAJARAN').toUpperCase()}
            </p>
            <p>Tahun Pelajaran: ${tahunPelajaran || '-'}</p>
            <p>Kelas: ${kelas || '-'}</p>
            <p>Waktu: ${durasiWaktu || '-'} menit</p>
            <hr>
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
