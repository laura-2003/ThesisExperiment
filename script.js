// ================= SETTINGS =================
const SAFE_MIN = 295;
const SAFE_MAX = 315;

const INTERVAL_MS = 2000; // 2 seconds per step
const TOTAL_STEPS = 450;  // 15 minutes total

let timeline = [];
let index = 0;
let interval;
let dataLog = [];
let triggeredFreezes = [];

let experimentStartTime;
const TOTAL_DURATION_MS = 15 * 60 * 1000; // 15 minutes total

let freezeMoments = [];

let isPaused = false;
let confidenceLevel = "";
let userFlowAdjustment = 0; 
let dangerIndices = [100, 200, 360, 420, 590]; 

const tempEl = document.getElementById("temp");
const pressureEl = document.getElementById("pressure");
const flowEl = document.getElementById("flow");
const actionEl = document.getElementById("action");
const phaseText = document.getElementById("phaseText");
const confidenceText = document.getElementById("confidenceText");
const interfaceEl = document.getElementById("interface");
const startBtn = document.getElementById("startBtn");
const increaseBtn = document.getElementById("increaseBtn");
const decreaseBtn = document.getElementById("decreaseBtn");
const percentageEl = document.getElementById("percentage");

confidenceLevel =Math.random() < 0.5 ? "99%" : "75%";
percentageEl.innerText = confidenceLevel;  // Show immediately
confidenceText.innerText = "Safe temperature range: 295-315";
function seededRandom(seed) {
  return function() { seed = (seed * 9301 + 49297) % 233280; return seed/233280; }
}
let random = seededRandom(12345); 

function getRandomStep(minMinutes, maxMinutes) {
  let minMs = minMinutes * 60 * 1000;
  let maxMs = maxMinutes * 60 * 1000;
  let randomMs = minMs + Math.random() * (maxMs - minMs);
  return Math.floor(randomMs / INTERVAL_MS);
}


function makeTimeline() {
  let t=[]; 
  let temp=305; 
  let pressure=5; 
  let flow=50;

  for(let i=0;i<TOTAL_STEPS;i++){
    let action="Stable"; 
    let correct="none";

    // small drift
    temp += (random()-0.5)*1.2;
    pressure += (random()-0.5)*0.05;
    flow += (random()-0.5)*0.5;

    // scripted danger moments
    if(dangerIndices.includes(i)){
      temp += 10; 
      action="Stable";

      if(temp >= SAFE_MAX - 2) correct = "decrease";
      else if(temp <= SAFE_MIN + 2) correct = "increase";
      else correct = "none";
    }

    // recovery
    if(dangerIndices.includes(i-1) || dangerIndices.includes(i-2)){
        temp -= 2;
    }

    t.push({
      temp:Math.round(temp),
      pressure:Number(pressure.toFixed(2)),
      flow:Math.round(flow),
      action:action,
      correctAction:correct
    });
  }
  return t;
}

function startExperiment(){
  timeline = makeTimeline();

  // Random freeze moments (3–6 min and 9–12 min)
  let first = getRandomStep(3, 6);
  let second;
  do {
    second = getRandomStep(9, 12);
  } while (Math.abs(second - first) < 20);

  freezeMoments = [first, second];

  startBtn.style.display="none";

  // confidence is already displayed at start
  experimentStartTime = Date.now();
  startRun();
}

function startRun(){
  clearInterval(interval);
  index=0; 
  isPaused=false; 
  userFlowAdjustment=0;
  interfaceEl.classList.remove("hidden");
  interval=setInterval(updateSystem, INTERVAL_MS);
}

function updateSystem(){
  if(isPaused) return;
  if(index >= timeline.length){
    endExperiment(); 
    return;
  }

  if(freezeMoments.includes(index) && !triggeredFreezes.includes(index)){
    triggeredFreezes.push(index);
    isPaused = true;
    freezeProbe(triggeredFreezes.length);
    return;
  }

  let step = timeline[index];

  let temp = step.temp;
  temp -= userFlowAdjustment * 0.8;
  temp += Math.max(0, -userFlowAdjustment) * 0.8;

  if(dangerIndices.includes(index)) temp +=5;

  let previousTemp = dataLog.length > 0 ? dataLog[dataLog.length - 1].temp : temp;
  let actionText = "Stable";
  if(temp > previousTemp) actionText = "Decreasing";
  else if(temp < previousTemp) actionText = "Increasing";

  tempEl.innerText = Math.round(temp);
  pressureEl.innerText = step.pressure;
  flowEl.innerText = step.flow + userFlowAdjustment;
  actionEl.innerText = actionText;

  dataLog.push({
    time: Date.now(),
    step: index,
    temp: Math.round(temp),
    pressure: step.pressure,
    flow: step.flow + userFlowAdjustment,
    action: actionText,
    correctAction: step.correctAction
  });

  index++;
}

function increaseFlow(){ 
  userFlowAdjustment += 1; 
  logClick("increase"); 

  const displayedFlow = parseInt(flowEl.innerText);
  flowEl.innerText = displayedFlow + 1;

  const displayedTemp = parseInt(tempEl.innerText);
  tempEl.innerText = Math.round(displayedTemp - 0.8);
}

function decreaseFlow(){ 
  userFlowAdjustment -= 1; 
  logClick("decrease"); 

  const displayedFlow = parseInt(flowEl.innerText);
  flowEl.innerText = displayedFlow - 1;

  const displayedTemp = parseInt(tempEl.innerText);
  tempEl.innerText = Math.round(displayedTemp + 0.8);
}

function logClick(type){
  let step = timeline[index] || {};

  let displayedTemp = step.temp 
    - userFlowAdjustment * 0.8 
    + Math.max(0, -userFlowAdjustment) * 0.8;

  const BUFFER = 2;

  let expectedAction;
  if(displayedTemp >= SAFE_MAX - BUFFER) expectedAction = "decrease";
  else if(displayedTemp <= SAFE_MIN + BUFFER) expectedAction = "increase";
  else expectedAction = "none";

  dataLog.push({
    time: Date.now(),
    click: type,
    correct: type === expectedAction,
    step: index,
    displayedTemp: Math.round(displayedTemp)
  });
}

let firstFreezeQuestions = [
  "What is the current temperature?",
  "What is the current coolant flow?",
  "Is the system currently increasing, decreasing, or stable?",
  "What will the core temperature do in 10 seconds: be higher, lower, or the same?"
];

let secondFreezeQuestions = [
  "What is the current temperature?",
  "What is the current pressure?",
  "Is the system currently increasing, decreasing, or stable?",
  "What will the core temperature do in 10 seconds: be higher, lower, or the same?"
];


function freezeProbe(freezeNumber) {
  clearInterval(interval);
  interfaceEl.classList.add("hidden");

  let questions = [];
  if (freezeNumber === 1) {
    questions = firstFreezeQuestions;
  } else if (freezeNumber === 2) {
    questions = secondFreezeQuestions;
  }

  let html = `<h2>PAUSE</h2>
  <p>Please answer the following questions:</p>
  <form id="freezeForm" autocomplete="off">`;
  questions.forEach((q, i) => {
    html += `
      <label for="answer${i}">${q}</label><br>
      <input type="text" id="answer${i}" name="answer${i}" style="width: 100%; margin-bottom: 10px;"><br>`;
  });
  html += `<button type="submit">Submit Answers</button></form>`;
  phaseText.innerHTML = html;

  dataLog.push({ 
    time: Date.now(), 
    event: "freeze", 
    step: index, 
    freezeNumber: freezeNumber
  });

  document.getElementById("freezeForm").addEventListener("submit", function(e) {
    e.preventDefault();

    let answers = [];
    questions.forEach((q, i) => {
      let value = document.getElementById(`answer${i}`).value;
      answers.push({ question: q, answer: value });
    });

    dataLog.push({ 
      time: Date.now(), 
      event: "freeze_answers", 
      step: index, 
      freezeNumber: freezeNumber, 
      answers: answers 
    });

    resumeAfterPause();
  });
}

function resumeAfterPause(){
  dataLog.push({time: Date.now(), event:"resume", step:index});
  clearInterval(interval);
  isPaused = false;
  phaseText.innerText = "";
  interfaceEl.classList.remove("hidden");
  interval = setInterval(updateSystem, INTERVAL_MS);
}

function endExperiment(){
  clearInterval(interval);
  interfaceEl.classList.add("hidden");
  phaseText.innerHTML="Finished <br><button id='downloadBtn'>Download Data</button>";
  document.getElementById("downloadBtn").addEventListener("click", downloadData);
}

function downloadData(){
  let blob = new Blob([JSON.stringify(dataLog,null,2)],{type:"application/json"});
  let url = URL.createObjectURL(blob);
  let a=document.createElement("a");
  a.href=url; 
  a.download="data.json"; 
  a.click();
}

startBtn.addEventListener("click", startExperiment);
increaseBtn.addEventListener("click", increaseFlow);
decreaseBtn.addEventListener("click", decreaseFlow);
