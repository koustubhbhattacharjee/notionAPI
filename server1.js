// server.js
require('dotenv').config();
const { APIcalls } =require('./notionApi.js')

const express = require('express');
const app = express();
const api= new APIcalls()

app.use(express.static('public'));
app.use(express.json());

app.get('/api/doNow', (req, res) => {
  res.json(api._doNowQuestions);
});

app.get('/api/exitTicket', (req, res) => {
  res.json(api._todaysExitQuestions);
});



app.post('/api/check', async (req, res) => {
  
  const response=api.doNoWExitTicketStatusAndSubstitution(req)
  
res.json({ correct: response });
});





 
  api.runQuestions();
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
