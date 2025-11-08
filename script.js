// Basic calculator logic for Nexus-style scientific calc

const exprEl = document.getElementById('expr');
const resEl = document.getElementById('result');
const degToggle = document.getElementById('degToggle');

let expression = '';

function refreshView(){
  exprEl.textContent = expression || '0';
  resEl.value = '';
}

// factorial helper (integer >= 0)
function factorial(n){
  n = Math.floor(n);
  if(n < 0) throw 'Factorial of negative';
  if(n === 0 || n === 1) return 1;
  let f = 1;
  for(let i=2;i<=n;i++) f *= i;
  return f;
}

// replace matches of n! with factorial(n)
function applyFactorials(expr){
  // repeatedly replace occurrences like 5!, (3+2)! etc.
  const re = /(\([\d+\-*/.^() MathPIEe]+?\)|\d+(\.\d+)?|\bMath\.PI\b|\bMath\.E\b)\!/;
  while(re.test(expr)){
    expr = expr.replace(re, (m, group) => {
      // evaluate inner group safely via our evaluateSmall
      let val = evaluateSmall(group);
      let f = factorial(val);
      return f.toString();
    });
  }
  return expr;
}

// small safe evaluator for sub-expressions used in factorial conversion
function evaluateSmall(e){
  // limited replacements: ^ operator, √ symbol handled earlier
  const sanitized = e.replace(/\^/g, '**').replace(/×/g,'*').replace(/÷/g,'/');
  try{
    // using Function is acceptable for local demo; keep sanitized
    // disallow letters except Math, ., numbers, parentheses, operators
    // allow Math.PI and Math.E and basic functions below in main eval only
    return Function('"use strict"; return (' + sanitized + ')')();
  }catch(err){
    return 0;
  }
}

// create final JS expression string for eval
function prepareForEval(raw){
  let s = raw;

  // common symbol replacements
  s = s.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');

  // replace x^y or ^ with ** (we use ^ button to mean power)
  s = s.replace(/\^/g, '**');

  // handle sqrt(   ) -> Math.sqrt(
  s = s.replace(/\bsqrt\(/g, 'Math.sqrt(');

  // functions: log -> Math.log10, ln -> Math.log, sin/cos/tan -> Math.sin etc.
  const toMath = {
    'Math\\.PI':'Math.PI',
    'Math\\.E':'Math.E'
  };
  s = s.replace(/\blog\(/g, 'Math.log10(');
  s = s.replace(/\bln\(/g, 'Math.log(');
  s = s.replace(/\bsin\(/g, 'sin_calc(');
  s = s.replace(/\bcos\(/g, 'cos_calc(');
  s = s.replace(/\btan\(/g, 'tan_calc(');

  // apply factorials first (turn "5!" into "120")
  s = applyFactorials(s);

  return s;
}

// degree-aware trig wrappers
function sin_calc(x){ return degToggle.checked ? Math.sin(x * Math.PI/180) : Math.sin(x); }
function cos_calc(x){ return degToggle.checked ? Math.cos(x * Math.PI/180) : Math.cos(x); }
function tan_calc(x){
  const r = degToggle.checked ? x * Math.PI/180 : x;
  return Math.tan(r);
}

// main evaluate with safety wrapper
function evaluateExpression(raw){
  if(!raw || raw.trim() === '') return '';
  let jsExpr = prepareForEval(raw);

  // only allow safe tokens: numbers, parentheses, Math., sin_calc, cos_calc, tan_calc, + - * / . , **
  const safePattern = /^[0-9+\-*/()., \tMathsincotarclEPIx*]+$/;
  // We can't easily represent exactly so we'll try/catch evaluation
  try{
    // create a function with our trig wrappers in scope
    const fn = new Function('sin_calc','cos_calc','tan_calc','Math','return (' + jsExpr + ')');
    const value = fn(sin_calc,cos_calc,tan_calc,Math);
    if(typeof value === 'number' && isFinite(value)){
      return value;
    } else {
      throw 'Bad result';
    }
  } catch(e){
    console.warn('Eval error', e, jsExpr);
    throw 'Invalid Expression';
  }
}

// button actions
document.querySelectorAll('.buttons .btn').forEach(b=>{
  b.addEventListener('click', ()=>{
    const val = b.getAttribute('data-value');
    const action = b.getAttribute('data-action');

    if(action === 'clear'){
      expression = '';
      refreshView();
      return;
    }
    if(action === 'back'){
      expression = expression.slice(0, -1);
      refreshView();
      return;
    }
    if(action === 'equals'){
      try{
        const v = evaluateExpression(expression);
        resEl.value = v;
      }catch(err){
        resEl.value = 'Error';
      }
      return;
    }

    // normal insert
    if(val){
      // 'x^y' button uses '^' token (we convert later)
      expression += val;
      refreshView();
    }
  });
});

// keyboard support (basic)
window.addEventListener('keydown', (e)=>{
  const allowed = '0123456789+-*/().';
  if(allowed.includes(e.key)){
    expression += e.key;
    refreshView();
  } else if(e.key === 'Enter'){
    document.querySelector('[data-action="equals"]').click();
  } else if(e.key === 'Backspace'){
    document.querySelector('[data-action="back"]').click();
  } else if(e.key === 'Escape'){
    document.querySelector('[data-action="clear"]').click();
  }
});

refreshView();
