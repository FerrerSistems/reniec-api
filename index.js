// index.js
const express = require('express');
const fetch = require('node-fetch');

const app = express();

app.get('/api/sir/:dni', async (req, res) => {
    const { dni } = req.params;

    // Validación estricta: solo 8 dígitos numéricos
    if (!/^\d{8}$/.test(dni)) {
        return res.status(400).json({
            estado: false,
            mensaje: "DNI inválido. Debe contener exactamente 8 dígitos numéricos."
        });
    }

    try {
        const response = await fetch('https://www.consultadni.com/php/notaria_api_proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Origin': 'https://www.consultadni.com',
                'Referer': 'https://www.consultadni.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: new URLSearchParams({
                dni: dni,
                recaptcha_token: 'bypass' // Ver nota abajo
            })
        });

        if (!response.ok) {
            return res.status(502).json({
                estado: false,
                mensaje: `Error al contactar la fuente: ${response.status}`
            });
        }

        const data = await response.json();
        return res.json(data);

    } catch (err) {
        console.error('Error:', err.message);
        return res.status(500).json({
            estado: false,
            mensaje: "Error interno del servidor.",
            detalle: err.message
        });
    }
});

// Ruta base
app.get('/', (req, res) => {
    res.json({ mensaje: 'API RENIEC activa. Usar: /api/sir/XXXXXXXX' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
