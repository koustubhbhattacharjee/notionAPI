

import('./timer.js')
const est={
  myChart:document.getElementById('myChart').getContext('2d'),
  qContainer:document.getElementById('question-container'),
  answer:document.getElementById('answer'),
  submit:document.getElementById('submit'),
  eTbutton:document.getElementById('start-exit'),
  current:document.getElementById('current'),
  feedback:document.getElementById('feedback'),
  attempted:document.getElementById('attempted'),
  correct: document.getElementById('correct'),
  total:document.getElementById('total'),
  chart:document.getElementById('myChart'),
  

}

document.addEventListener('DOMContentLoaded', async () => {
  let state={
  questions : [],
  doNowQuestions:[],
  exitTicketQuestions:[],
  currentQuestion :null,
  score :0,
  attempted: 0,
  type: null,

  }

  async function sendQuestions(data){
    const url='/api/check'
    const res= await fetch(url, {
        method: 'POST', 
        headers:{
            'Content-Type': 'application/json',           
        },
    body:JSON.stringify(data)
    
    })
    if (!res.ok) {
        const errorText = await res.text();   // or response.json() if server sends JSON error
        throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
    }

    return await res.json();
}



  async function loadDoNowQuestions() {
    state.score=state.attempted=0
    try{
        const res= await fetch('/api/doNow')
        if (!res.ok) {
            const errorText = await res.text();   
            throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
        }
        state.doNowQuestions= await res.json()

        //startSidebarTimer(60*10,"Do Now")
        state.questions=[...state.doNowQuestions]       //shallow copy
        est.total.textContent = state.questions.length;
        state.type='Do Now'
        nextQuestion()
    }
    catch(error){
      console.error("failed to load Do Now Questions",error)
    }
  }

  async function loadExitTicketQuestions() {
    state.score=state.attempted=0;
    
    
    try{
        const res = await fetch('/api/exitTicket')
        if (!res.ok) {
          const errorText = await res.text();   
          throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
          }
        state.exitTicketQuestions= await res.json()
    
        //startSidebarTimer(60*10,"Exit ticket")
        state.questions=[...state.exitTicketQuestions]       //shallow copy
        est.total.textContent = state.questions.length;
        est.correct.textContent = state.score;
        if (state.questions.length === 0){
          est.current.textContent=0;
        }
        else{
          est.current.textContent=1;
        }
      
        state.type='Exit Ticket'
        nextQuestion()
    }
    catch(error){
        console.error("failed to load Do Now Questions",error)
    }
  }

  function afterDoNowHTML(){
          est.qContainer.innerHTML = `<h2> ${state.type} completed!</h2>`;
          est.answer.style.display='none';
          est.submit.style.display='none';
          est.eTbutton.style.display='block';
          est.feedback.style.display='none';
          est.chart.style.display='block';
          pie();

  }

  function afterExitTicketHTML(){
        est.qContainer.innerHTML = `<h2> ${state.type} completed! </h2>`;
        est.answer.style.display='none';
        est.submit.style.display='none';
        est.eTbutton.style.display='none';
        est.chart.style.display='block';
        pie();
  }

  function duringQuestionsHTML(idx){
      est.eTbutton.style.display='none'
      est.answer.style.display='inline-block'
      est.submit.style.display='inline-block',
      est.chart.style.display='none'
    //pick a random question 
      
      state.currentQuestion = state.questions[idx];
      state.questions.splice(idx, 1); // remove so not repeated

    //gets all the elements of the webpage and sets them to state values
      est.current.textContent = state.attempted + 1;
      est.qContainer.innerHTML = `
        <h2 style="color:#d44; font-size:2.2em; margin-bottom:20px;">${state.type}</h2>
        <img src="${state.currentQuestion.questionImage}" alt="Question" style="max-width:95%; border:2px solid #333; border-radius:12px;">`;
      est.answer.value = '';
      est.feedback.textContent = '';
      est.answer.focus();

  }

  function nextQuestion() {
    // exits if questions are done
    if (state.questions.length === 0 && state.type!== null){
        if(state.type=== 'Do Now') {
          afterDoNowHTML()
          return 
    }
     else{
          afterExitTicketHTML()
      return;
     }
    }
    const idx = Math.floor(Math.random() * state.questions.length);
    duringQuestionsHTML(idx)
    console.log(state.score,)
   
  }
  
  let pieChart= new Chart(est.chart,{
      type:'pie', 
      data:{
        labels:['correct','incorrect'],
        datasets:[
          {
            label:'Score',
            data:[
              state.score,
              state.doNowQuestions.length-state.score
            ]
          }
        ]
      },
      options:{
        responsive: true,
        maintainAspectRatio: true, // respect aspectRatio
        aspectRatio: 16 / 9,       // optional: forces width/height ratio
      }
    })

  function pie(){
        pieChart.destroy();
        let remainder=0;
        if(state.type=="Do Now")
          {remainder=state.doNowQuestions.length-state.score}
        else{
          remainder=state.exitTicketQuestions.length-state.score
        }
        console.log("Existing chart instance destroyed successfully.");
        pieChart= new Chart(est.chart,{
              type:'pie', 
                data:{
                  labels:['correct','incorrect'],
                  datasets:[
                    {
                      label:'Score',
                      data:[
                        state.score,
                        remainder
                      ]
                    }
                  ]
                },
                options:{
                  responsive: true,
                  maintainAspectRatio: true, // respect aspectRatio
                  aspectRatio: 16 / 9,       // optional: forces width/height ratio
                }
              })

        
       
    
    
    

  }
  
  est.eTbutton.addEventListener('click', async () =>{
       state.score=0;
       
       await loadExitTicketQuestions();
   })


    

  est.submit.addEventListener('click', async () => {
    const userAnswer = est.answer.value;
    //if there is no answer, then do the following
    if (!userAnswer.trim()) return;


    state.attempted++;
    console.log(state.currentQuestion.pageId)
    est.attempted.textContent = state.attempted;
    const data=await sendQuestions({userAnswer,
                            correctAnswer:state.currentQuestion.answer,
                            type:state.type,
                            pageId:state.currentQuestion.pageId
                        })
    
    if (data.correct)
    {
      state.score++;
    
      est.correct.textContent = state.score;
      est.feedback.innerHTML = '<strong style="color:green">Correct!</strong>';
      

    } else {
      est.feedback.innerHTML = `<strong style="color:red">Wrong!</strong> Correct answer: ${state.currentQuestion.answer}`;
    }
    console.log(state.score)
    setTimeout(nextQuestion, data?.correct ? 1000 : 3000);
  });

  // Allow Enter key
  est.answer.addEventListener('keypress', e => {
    if (e.key === 'Enter') est.submit.click();
  });

  await loadDoNowQuestions();
  
});