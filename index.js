
const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

async function getDNIData(dni) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu'
    ]
  });

  try {
    const page = await browser.newPage();
    
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await page.goto('https://www.consultadni.com', { waitUntil: 'networkidle2', timeout: 30000 });

    // Escribir DNI
    await page.waitForSelector('input[name="dni"]', { timeout: 10000 });
    await page.type('input[name="dni"]', dni, { delay: 100 });

    // Click en el checkbox de reCAPTCHA (dentro del iframe)
    const frames = page.frames();
    const recaptchaFrame = frames.find(f => f.url().includes('recaptcha'));
    
    if (recaptchaFrame) {
      await recaptchaFrame.waitForSelector('#recaptcha-anchor', { timeout: 10000 });
      await recaptchaFrame.click('#recaptcha-anchor');
      await new Promise(r => setTimeout(r, 3000)); // esperar resolución
    }

    // Interceptar la respuesta de la API
    let apiResponse = null;
    page.on('response', async (response) => {
      if (response.url().includes('notaria_api_proxy.php')) {
        try {
          apiResponse = await response.json();
        } catch (e) {}
      }
    });

    // Enviar formulario
    await page.click('button[type="submit"]');
    await new Promise(r => setTimeout(r, 5000));

    return apiResponse;

  } finally {
    await browser.close();
  }
}

app.get('/api/sir/:dni', async (req, res) => {
  const { dni } = req.params;
  
  if (!/^\d{8}$/.test(dni)) {
    return res.json({ estado: false, mensaje: 'DNI inválido. Debe contener exactamente 8 dígitos numéricos.' });
  }

  try {
    const data = await getDNIData(dni);
    
    if (!data) {
      return res.json({ estado: false, mensaje: 'No se pudo obtener respuesta del servidor.' });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ estado: false, mensaje: 'Error interno: ' + error.message });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
