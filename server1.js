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




api.runQuestions()

//   setInterval(async () => {
//   try {
//     await loadQuestions();
//     await loadTodaysExitTicket();
//     console.log('Refreshed question caches');
//   } catch (err) {
//     console.error('Periodic refresh failed:', err);
//   }
// }, 5 * 60 * 1000);
// Load questions on startup and every 5 minutes
//loadQuestions();
// setTimeout(() => {
//   document.body.innerHTML = `
//     <div style="text-align:center; margin-top:100px; font-size:2em; color:#555; font-family:system-ui;">
//       ⏰ Do Now is closed<br><br>
//       <small>Time's up!</small>
//     </div>`;
// }, 10 * 60 * 1000); // exactly 10 minutes
//loadTodaysExitTicket();

app.listen(process.env.PORT||8000, () => console.log('Server running on http://localhost:8000'));