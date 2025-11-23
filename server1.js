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
let arr={
  doNowQuestions:[],
  todaysExitQuestions:[],
  ExitTicketDict:{},
  DoNowDict:{}
}

// function below calls the notion database, and gets datasources from them with multiple fetch commands. this is because
//notion databases cannot be accessed directly. we get the datasource id using fetch and then use that id to fetch contents 
//of the datasource

async function dataSources(){
  try{
   const database= await notion.databases.retrieve(
        {database_id: DATABASE_ID}
    );
    const datasourceid= database.data_sources[0].id;

  return datasourceid
  }
  catch(error)
    {
      console.error("failed to load database",error)
    }
  }
async function loadBlocks(resp){
      try{
      
      const extracted = [];

      for (const page of resp.results) {
        console.log(page.id)
        const blocks = await notion.blocks.children.list({ block_id: page.id });
        let questionImage = null;
        let answerText = null;

        for (const block of blocks.results) {

        
          if (!questionImage && block.type === 'image') {
            const url = block.image.type === 'external'
              ? block.image.external.url
              : block.image.file.url;
            questionImage = url;
          }

          if (questionImage && !answerText) {
            const type = block.type;
            if (['paragraph', 'heading_1', 'heading_2', 'heading_3'].includes(type)) {
              answerText = (block[block.type]?.rich_text||[])
              .map(t=>t.plain_text)
              .join('')
              
            // if (/^[A-Za-z]$/.test(text)) {
            //   answerText = text.toLowerCase();
            // }
          }  
            }
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
     
      return extracted
      
      }
      catch(error){
          console.log("loading questions from pages failed",error)

      }
}

async function loadDoNowQuestions() {
    try{
      const data_sources= await dataSources()
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
 
      
      arr.doNowQuestions = await loadBlocks(response);
      console.log(`Loaded ${arr.doNowQuestions.length} do Now questions`);
      arr.DoNowDict= arr.doNowQuestions.reduce((dict,e)=> {
            dict[e.pageId]=e
            return dict 
        },{})
    }
    catch(error){
        console.error('doNow load failed',error);
    }
}

async function loadTodaysExitTicket() {
  try {
    const datasources= await dataSources()
    const response = await notion.dataSources.query({
      data_source_id: datasources, // your original Do Now database
      filter: {
        property: "Status",
        status: {
          equals: "Not started"
        }
      },
     
    });


    arr.todaysExitQuestions = await loadBlocks(response);
    arr.ExitTicketDict= arr.todaysExitQuestions.reduce((dict,e)=> {
        dict[e.pageId]=e
        return dict 
    },{})
    console.log(`Exit Ticket: Loaded ${arr.todaysExitQuestions.length} exit ticket question(s)`);

  } catch (error) {
    console.error("Failed to load today's exit ticket:", error.message);
    arr.todaysExitQuestions = [];
  }
}



app.get('/api/doNow', (req, res) => {
  res.json(arr.doNowQuestions);
});

app.get('/api/exitTicket', (req, res) => {
  res.json(arr.todaysExitQuestions);
});



app.post('/api/check', async (req, res) => {
  const { userAnswer, correctAnswer,type,pageId } = req.body;
  const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  try{
  if (pageId){
    const response= await notion.pages.retrieve({
          page_id: pageId,
        })
    const value=response.properties["Weakness Score"].number
  
  if (type==="Do Now"){
       
    const resp= await notion.pages.update(
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

      if(!(isCorrect)){
      arr.todaysExitQuestions.pop();
      arr.todaysExitQuestions.push(arr.DoNowDict[pageId])
      }  
  }
  
  if(type==="Exit Ticket"){

      const respo= await notion.pages.update(
        {
          page_id: pageId, 
          properties:{
          "Weakness Score":{
              number: isCorrect? 0 : value+1
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
}
catch(error){
  console.error("failed to load Do Now Questions",error)
}
res.json({ correct: isCorrect });
});


async function runQuestions(){
  try{
const doNowResponse= await loadDoNowQuestions()
const exiTTicketResponse= await loadTodaysExitTicket()
  
  }
  catch(error)
  {
    console.error("error at retrieving questons",error)
  }
  
}

runQuestions()

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