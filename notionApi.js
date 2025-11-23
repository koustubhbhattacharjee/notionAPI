require('dotenv').config();
const { Client } = require('@notionhq/client');


class APIcalls{

    constructor(){
        this._doNowQuestions=[],
        this._todaysExitQuestions=[],
        this._exitTicketDict={},
        this._doNowDict={}
        this._notion=new Client({ auth: process.env.NOTION_TOKEN });
        this._databaseId=process.env.NOTION_DATABASE_ID;
    }

    async doNoWExitTicketStatusAndSubstitution(req){
        const { userAnswer, correctAnswer,type,pageId } = req.body;
        const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
        try{
            if (pageId){
                const response= await this._notion.pages.retrieve({
                    page_id: pageId,
                    })
                const value=response.properties["Weakness Score"].number
            
            if (type==="Do Now"){
                
                const resp= await this._notion.pages.update(
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
                this._todaysExitQuestions.pop();
                this._todaysExitQuestions.push(this._doNowDict[pageId])
                }  
            }
            
            if(type==="Exit Ticket"){

                const respo= await this._notion.pages.update(
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
            return isCorrect
            }
            catch(error){
            console.error("failed to load Do Now Questions",error)
            }
    }

    async #loadDoNowQuestions() {
        try{
            const data_sources= await this.#dataSources()
            const response = await this._notion.dataSources.query({
                data_source_id: data_sources,
                filter: {
                    property:"Status",
                    status:{
                        equals:"To be reviewed"
                        }
                    }    
                });
    
        
            this._doNowQuestions=await this.#loadBlocks(response);
            console.log(`Loaded ${this._doNowQuestions.length} do Now questions`);
            this._doNowDict= this._doNowQuestions.reduce((dict,e)=> {
                    dict[e.pageId]=e
                    return dict 
                },{})
            }
        catch(error){
            console.error('doNow load failed',error);
        }
    }

    async  #loadTodaysExitTicket() {
        try {
            const datasources= await this.#dataSources()
            const response = await this._notion.dataSources.query({
            data_source_id: datasources, // your original Do Now database
            filter: {
                property: "Status",
                status: {
                equals: "Not started"
                    }
                },
     
            });


            this._todaysExitQuestions = await this.#loadBlocks(response);
            this._exitTicketDict= this._todaysExitQuestions.reduce((dict,e)=> {
                dict[e.pageId]=e
                return dict 
                },{})
            console.log(`Exit Ticket: Loaded ${this._todaysExitQuestions.length} exit ticket question(s)`);

            } catch (error) {
                console.error("Failed to load today's exit ticket:", error.message);
                this._todaysExitQuestions = [];
            }
        }


    async #dataSources(){
         try{
            const database= await this._notion.databases.retrieve(
                    {database_id: this._databaseId}
                );
                const datasourceid= database.data_sources[0].id;

            return datasourceid
            }
            catch(error)
                {
                console.error("failed to load database",error)
                }
            }
    
    async #loadBlocks(resp){
          try{
      
                const extracted = [];

                for (const page of resp.results) {
                    console.log(page.id)
                    const blocks = await this._notion.blocks.children.list({ block_id: page.id });
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
async runQuestions(){
  try{
const doNowResponse= await this.#loadDoNowQuestions()
const exiTTicketResponse= await this.#loadTodaysExitTicket()
  
  }
  catch(error)
  {
    console.error("error at retrieving questons",error)
  }
  
}

    }

module.exports={ APIcalls };