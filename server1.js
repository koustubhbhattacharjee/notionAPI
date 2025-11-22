// server.js
require('dotenv').config();
const { Client } = require('@notionhq/client');
const express = require('express');
const app = express();
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

app.use(express.static('public'));
app.use(express.json());

// Cache the questions so we don't hit Notion on every request
let doNowQuestions = [];
let todaysExitQuestions = [];
let ExitTicketDict={};
let DoNowDict={};

async function dataSources(){
   const database= await notion.databases.retrieve(
        {database_id: DATABASE_ID}
    );
    const datasourceid= database.data_sources[0].id;

  return datasourceid

}

async function loadQuestions() {
try{
  const sevenDaysAgo = new Date();
  const currentDate= sevenDaysAgo.toISOString().split('T')[0];
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const data_sources= await dataSources()
  
 
  const targetDate = sevenDaysAgo.toISOString().split('T')[0];

    
   
  const response = await notion.dataSources.query({
    data_source_id: data_sources,
    filter: {
        property:"Status",
        status:{
            equals:"To be reviewed"
          }
        }    
    },
  );



  const extracted = [];

  for (const page of response.results) {
    const blocks = await notion.blocks.children.list({ block_id: page.id });
   

    let questionImage = null;
    let answerText = null;

    for (let i = 0; i < blocks.results.length; i++) {
      const block = blocks.results[i];

      // First image = question
      if (!questionImage && block.type === 'image') {
        const url = block.image.type === 'external'
          ? block.image.external.url
          : block.image.file.url;
        questionImage = url;
      }
      

      // Next non-empty paragraph/heading after image = answer
      if (questionImage && !answerText) {
        const type = block.type;
        if (['paragraph', 'heading_1', 'heading_2', 'heading_3'].includes(type)) {
          const richText = block[type].rich_text;
          if (richText.length > 0) {
            answerText = richText.map(t => t.plain_text).join('');
        
          }
        }
      }

      //looks like it only gets one image and one text 

      if (questionImage && answerText) break;
    }

    if (questionImage && answerText) {
      extracted.push({
        pageId: page.id,
        questionImage,
        answer: answerText.trim().toLowerCase(), // normalize
      });
    }
  }

  doNowQuestions = extracted;
  console.log(`Loaded ${doNowQuestions.length} do Now questions`);
    DoNowDict= doNowQuestions.reduce((dict,e)=> {
        
        dict[e.pageId]=e
        return dict 
    },{})
}
catch(error){
    console.error('doNow load failed',error);
}
}

async function loadTodaysExitTicket() {
  //const today = new Date().toISOString().split('T')[0]; // "2025-11-18"
  const datasources= await dataSources()

  try {
    const response = await notion.dataSources.query({
      data_source_id: datasources, // your original Do Now database
      filter: {
        property: "Status",
        status: {
          equals: "Not started"
        }
      },
     
    });

    const extracted = [];

    for (const page of response.results) {
      const blocks = await notion.blocks.children.list({
        block_id: page.id
      });

      let questionImage = null;
      let answerLetter = null;

      for (const block of blocks.results) {
        // 1. First image = question
        if (!questionImage && block.type === "image") {
          questionImage = block.image.external?.url || block.image.file?.url;
          continue;
        }

        // 2. After image, first single letter (A–Z) in any text block = answer
        if (questionImage && !answerLetter) {
          const allowedTypes = ['paragraph', 'callout', 'toggle', 'heading_1', 'heading_2', 'heading_3'];
          if (allowedTypes.includes(block.type)) {
            const text = (block[block.type]?.rich_text || [])
              .map(t => t.plain_text)
              .join('')
              .trim();

            if (/^[A-Za-z]$/.test(text)) {
              answerLetter = text.toUpperCase();
            }
          }
        }

        if (questionImage && answerLetter) break;
      }

      // Only add if we at least have an image
      if (questionImage) {
        extracted.push({
          pageId: page.id,
          questionImage,
          answer: answerLetter || null  // null if no letter found (still show question)
        });
      }
    }

    todaysExitQuestions = extracted;
    ExitTicketDict= todaysExitQuestions.reduce((dict,e)=> {
        dict[e.pageId]=e
        return dict 
    },{})
    console.log(`Exit Ticket: Loaded ${extracted.length} exit ticket question(s)`);

  } catch (error) {
    console.error("Failed to load today's exit ticket:", error.message);
    todaysExitQuestions = [];
  }
}



app.get('/api/doNow', (req, res) => {
  res.json(doNowQuestions);
});

app.get('/api/exitTicket', (req, res) => {
  res.json(todaysExitQuestions);
});



app.post('/api/check', async (req, res) => {
  const { userAnswer, correctAnswer,type,pageId } = req.body;
  const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer;
  if (pageId){
    const response= await notion.pages.retrieve({
          page_id: pageId,
        })
    const value=response.properties["Weakness Score"].number
  
  if (type==="Do Now"){
       
    const res= await notion.pages.update(
          {
            page_id: pageId,
            properties:{
              "Weakness Score":{
                number: isCorrect? 0: value+1
              }, 
              "Status":{
                status: {
                  name:isCorrect? "Done": "To be reviewed"
                }
              }
            }

          }
        )
      todaysExitQuestions.pop();
      todaysExitQuestions.push(DoNowDict[pageId])  
  }
  
  if(type==="Exit Ticket"){

      const res2= await notion.pages.update(
        {
          page_id: pageId, 
          properties:{
          "Weakness Score":{
              number: isCorrect? 0:value+1
          },
          "Status":{
            status: 
            {
              name:"To be reviewed"
            }
          }
        }
      }
      )
    }
  }
res.json({ correct: isCorrect });
});


loadQuestions()
  .then(() => loadTodaysExitTicket())
  .catch(err => {
    console.error('Initial data load failed:', err);
    // still attempt exit-ticket load as a fallback
    return loadTodaysExitTicket().catch(err2 => console.error('Fallback exit ticket load failed:', err2));
  });

  setInterval(async () => {
  try {
    await loadQuestions();
    await loadTodaysExitTicket();
    console.log('Refreshed question caches');
  } catch (err) {
    console.error('Periodic refresh failed:', err);
  }
}, 5 * 60 * 1000);
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