import('./timer.js')

document.addEventListener('DOMContentLoaded', async () => {
  let state={
  questions : [],
  doNowQuestions:[],
  exitTicketQuestions:[],
  currentQuestion :null,
  score :0,
  attempted: 0,
  type: null
  }
const est={
  qContainer:document.getElementById('question-container'),
  answer:document.getElementById('answer'),
  submit:document.getElementById('submit'),
  eTbutton:document.getElementById('start-exit'),
  current:document.getElementById('current'),
  feedback:document.getElementById('feedback'),
  attempted:document.getElementById('attempted'),
  correct: document.getElementById('correct'),
  total:document.getElementById('total')


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
    const res= await fetch('/api/doNow')
    state.doNowQuestions= await res.json()

    //startSidebarTimer(60*10,"Do Now")
    state.questions=[...state.doNowQuestions]       //shallow copy
    est.total.textContent = state.questions.length;
    state.type='Do Now'
    nextQuestion()
  }

  async function loadExitTicketQuestions() {
    state.score=0
    state.attempted=0
    est.total.textContent = state.questions.length;
    const res = await fetch('/api/exitTicket')
    state.exitTicketQuestions= await res.json()
   
    //startSidebarTimer(60*10,"Exit ticket")
    state.questions=[...state.exitTicketQuestions]       //shallow copy
    
    state.type='Exit Ticket'
    nextQuestion()
  }

  function nextQuestion() {
    // exits if questions are done
    if (state.questions.length === 0){
        if(state.type=== 'Do Now') {
      est.qContainer.innerHTML = `<h2> ${state.type} completed!</h2>`;
      est.answer.style.display='none';
      est.submit.style.display='none';
      est.eTbutton.style.display='block';
      return;
    }
     else{
        est.qContainer.innerHTML = `<h2> ${state.type} completed!, see you next class</h2>`;
        est.answer.style.display='none';
        est.submit.style.display='none';
        est.eTbutton.style.display='none'
      return;
     }
    }

    est.eTbutton.style.display='none'
    est.answer.style.display='inline-block'
    est.submit.style.display='inline-block'
    //pick a random question 
    const idx = Math.floor(Math.random() * state.questions.length);
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
    

    est.eTbutton.addEventListener('click', async () =>{

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


    // const res = await fetch('/api/check', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({
    //     userAnswer,
    //     correctAnswer: currentQuestion.answer
    //   })
    // });
    // const data = await res.json();

    // if (data.correct) {
    //   score++;
    //   document.getElementById('correct').textContent = score;
    //   document.getElementById('feedback').innerHTML = '<strong style="color:green">Correct!</strong>';
    // } else {
    //   document.getElementById('feedback').innerHTML = `<strong style="color:red">Wrong!</strong> Correct answer: ${currentQuestion.answer}`;
    // }

    setTimeout(nextQuestion, data?.correct ? 1000 : 3000);
  });

  // Allow Enter key
  est.answer.addEventListener('keypress', e => {
    if (e.key === 'Enter') est.submit.click();
  });

  await loadDoNowQuestions();
  
});