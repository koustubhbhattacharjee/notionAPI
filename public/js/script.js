import('./timer.js')

document.addEventListener('DOMContentLoaded', async () => {
  let questions = [];
  let doNowQuestions=[];
  let exitTicketQuestions=[];
  let currentQuestion = null;
  let score = 0;
  let attempted = 0;
  let type=null;
  

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
    score=0
    attempted=0
    const res= await fetch('/api/doNow')
    doNowQuestions= await res.json()

    //startSidebarTimer(60*10,"Do Now")
    questions=[...doNowQuestions]       //shallow copy

    document.getElementById('total').textContent = questions.length;
    type='Do Now'
    nextQuestion()
  }

  async function loadExitTicketQuestions() {
    score=0
    attempted=0
    document.getElementById('total').textContent = questions.length;
    const res = await fetch('/api/exitTicket')
    exitTicketQuestions= await res.json()
   
    //startSidebarTimer(60*10,"Exit ticket")
    questions=[...exitTicketQuestions]       //shallow copy
    
    type='Exit Ticket'
    nextQuestion()
  }

  function nextQuestion() {
    // exits if questions are done
    if (questions.length === 0){
        if(type=== 'Do Now') {
      document.getElementById('question-container').innerHTML = `<h2> ${type} completed!</h2>`;
        document.getElementById('answer').style.display='none';
        document.getElementById('submit').style.display='none';
        document.getElementById('start-exit').style.display='block';
       
      return;
    }
     else{
         document.getElementById('question-container').innerHTML = `<h2> ${type} completed!, see you next class</h2>`;
        document.getElementById('answer').style.display='none';
        document.getElementById('submit').style.display='none';
        document.getElementById('start-exit').style.display='none'

     
    
      return;
     }
    }

    document.getElementById('start-exit').style.display='none'
    document.getElementById('answer').style.display='inline-block'
    document.getElementById('submit').style.display='inline-block'
    //pick a random question 
    const idx = Math.floor(Math.random() * questions.length);
    currentQuestion = questions[idx];
    questions.splice(idx, 1); // remove so not repeated

    //gets all the elements of the webpage and sets them to state values
    document.getElementById('current').textContent = attempted + 1;
    document.getElementById('question-container').innerHTML = `
      <h2 style="color:#d44; font-size:2.2em; margin-bottom:20px;">${type}</h2>
      <img src="${currentQuestion.questionImage}" alt="Question" style="max-width:95%; border:2px solid #333; border-radius:12px;">`;
    document.getElementById('answer').value = '';
    document.getElementById('feedback').textContent = '';
    document.getElementById('answer').focus();
  }
    

    document.getElementById('start-exit').addEventListener('click', async () =>{

       await loadExitTicketQuestions();
   })


    

  document.getElementById('submit').addEventListener('click', async () => {
    const userAnswer = document.getElementById('answer').value;
    //if there is no answer, then do the following
    if (!userAnswer.trim()) return;


    attempted++;
   
    document.getElementById('attempted').textContent = attempted;
    const data=await sendQuestions({userAnswer,
                            correctAnswer:currentQuestion.answer,
                            type:type
                        })
    
    if (data.correct)
    {
      score++;
      document.getElementById('correct').textContent = score;
      document.getElementById('feedback').innerHTML = '<strong style="color:green">Correct!</strong>';
      console.log("is here")
      

    } else {
      document.getElementById('feedback').innerHTML = `<strong style="color:red">Wrong!</strong> Correct answer: ${currentQuestion.answer}`;
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
  document.getElementById('answer').addEventListener('keypress', e => {
    if (e.key === 'Enter') document.getElementById('submit').click();
  });

  await loadDoNowQuestions();
  
});