
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // pour héberger le HTML

// === Route pour traiter le texte direct ===
app.post('/ask', async (req, res) => {
  const { message } = req.body;

  try {
    const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [
        { role: "system", content: "Tu es un assistant marocain. Tu comprends le darija. Extrais la marque, le modèle, l'année et la pièce de rechange demandée depuis ce message client." },
        { role: "user", content: message }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ result: gptRes.data.choices[0].message.content });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Erreur GPT");
  }
});

// === Route pour le traitement du fichier vocal ===
app.post('/audio', upload.single('audio'), async (req, res) => {
  const audioPath = req.file.path;

  try {
    const audioFile = fs.createReadStream(audioPath);
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", "whisper-1");

    const whisperRes = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      }
    });

    const transcription = whisperRes.data.text;

    const gptRes = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: "gpt-4",
      messages: [
        { role: "system", content: "Tu es un assistant marocain. Tu comprends le darija. Extrais la marque, le modèle, l'année et la pièce de rechange demandée depuis ce message client." },
        { role: "user", content: transcription }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ result: gptRes.data.choices[0].message.content });
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).send("Erreur traitement audio");
  } finally {
    fs.unlinkSync(audioPath); // Supprimer le fichier après usage
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🟢 Serveur IA prêt sur http://localhost:${PORT}`));
