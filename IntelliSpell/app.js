(function(){"use strict";
var $=function(i){return document.getElementById(i)};
var E=IntelliSpellEngine.create(window.DICTIONARY);
var store={get:function(k){try{return localStorage.getItem(k)}catch(_){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(_){}}};
var custom=[];try{custom=JSON.parse(store.get("is.custom")||"[]")}catch(_){}
custom.forEach(E.addWord);
$("names").checked=store.get("is.names")!=="0";
if(store.get("is.theme"))document.documentElement.dataset.theme=store.get("is.theme");

/* ---- state ---- */
var text=$("ta").value,history=[],ignored=Object.create(null),fixed=0,current=null,fileName="",reviewing=false,job=0;
function scan(){return E.scan(text,{ignored:ignored,skipNames:$("names").checked})}
function esc(s){return s.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function status(m,err){var s=$("status");s.textContent=m;s.classList.toggle("err",!!err)}

/* ---- render ---- */
function render(){
 var r=scan(),html="",pos=0;$("fixpanel").hidden=true;
 r.bad.forEach(function(b,k){html+=esc(text.slice(pos,b.s))+'<mark class="bad" role="button" tabindex="0" aria-haspopup="dialog" data-k="'+k+'">'+esc(b.w)+"</mark>";pos=b.e});
 $("doc").innerHTML=html+esc(text.slice(pos));$("doc").__bad=r.bad;
 $("s-w").textContent=r.total;$("s-m").textContent=r.bad.length;$("s-f").textContent=fixed;
 $("fixall").hidden=!r.bad.length;$("undo").hidden=!history.length;$("copy").disabled=$("dl").disabled=!text.trim();
 status(r.bad.length?r.bad.length+" misspelled word"+(r.bad.length>1?"s":"")+" left – click one to fix it.":(r.total?"✓ No misspellings"+(fixed?" – "+fixed+" fixed":"")+". Your text is clean.":"Nothing to check yet."))}
function showReview(){reviewing=true;$("v-edit").hidden=true;$("v-review").hidden=false;$("edit").hidden=false;$("check").textContent="Re-check";$("stats").hidden=false}
function showEdit(){reviewing=false;closePop();job++;$("fixpanel").hidden=true;$("ta").value=text;$("v-edit").hidden=false;$("v-review").hidden=true;$("edit").hidden=true;$("fixall").hidden=true;$("undo").hidden=true;$("check").textContent="Check spelling";$("stats").hidden=true;$("ta").focus()}
function check(){
 if(!reviewing){text=$("ta").value;ignored=Object.create(null);history=[];fixed=0}
 if(!text.trim()){status("Type or open some text first.",true);return}
 if(text.length>1e6){status("That is over 1,000,000 characters – please check it in parts.",true);return}
 showReview();render()}
$("names").onchange=function(){store.set("is.names",this.checked?"1":"0");if(reviewing)render()};

/* ---- replacing text (single word, all occurrences, or a reviewed batch) ---- */
function replace(list,rep){
 if(!list.length)return;history.push({t:text,f:fixed});
 list.slice().sort(function(a,b){return b.s-a.s}).forEach(function(b){text=text.slice(0,b.s)+(typeof rep==="function"?rep(b):rep)+text.slice(b.e)});
 fixed+=list.length;closePop();render()}

/* ---- popover ---- */
var pop=$("pop"),anchor=null;
function closePop(){pop.hidden=true;if(anchor){anchor.removeAttribute("aria-expanded");anchor=null}current=null}
function openPop(el){var bad=$("doc").__bad,b=bad[+el.dataset.k];if(!b)return;closePop();anchor=el;current=b;el.setAttribute("aria-expanded","true");
 var sg=E.suggest(b.w),n=bad.filter(function(x){return x.w===b.w}).length,h='<h3>Fix <s>'+esc(b.w)+'</s></h3>';
 sg.forEach(function(s,i){h+='<button class="sug" data-r="'+esc(s)+'"><span><kbd>'+(i+1)+"</kbd> "+esc(s)+"</span></button>"});
 if(!sg.length)h+='<p class="empty">No close match.</p>';
 if(n>1)h+='<label class="rall"><input type="checkbox" id="rall"> Replace all '+n+" occurrences</label>";
 h+='<div class="pop2"><button data-a="ign">Ignore</button><button data-a="add">Add to dictionary</button></div>';
 pop.innerHTML=h;pop.hidden=false;
 var r=el.getBoundingClientRect(),w=pop.offsetWidth,hh=pop.offsetHeight,top=r.bottom+8;
 if(top+hh>innerHeight-8)top=Math.max(8,r.top-hh-8);
 pop.style.top=top+"px";pop.style.left=Math.min(Math.max(8,r.left),innerWidth-w-8)+"px";
 var f=pop.querySelector("button");if(f)f.focus({preventScroll:true})}
pop.addEventListener("click",function(e){var t=e.target.closest("button");if(!t||!current)return;var b=current;
 if(t.dataset.r!==undefined){var all=$("rall")&&$("rall").checked;replace($("doc").__bad.filter(function(x){return all?x.w===b.w:x===b}),t.dataset.r);return}
 var lw=b.w.toLowerCase().replace(/’/g,"'");
 if(t.dataset.a==="add"){E.addWord(lw);if(custom.indexOf(lw)<0){custom.push(lw);store.set("is.custom",JSON.stringify(custom))}}else ignored[lw]=1;
 closePop();render()});
$("doc").addEventListener("click",function(e){var m=e.target.closest("mark.bad");if(m)openPop(m)});
$("doc").addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.matches("mark.bad")){e.preventDefault();openPop(e.target)}});
document.addEventListener("keydown",function(e){if(pop.hidden)return;
 if(e.key==="Escape"){var a=anchor;closePop();a&&a.focus()}else if(/^[1-3]$/.test(e.key)&&!e.target.matches("input")){var s=pop.querySelectorAll(".sug")[+e.key-1];if(s)s.click()}});
document.addEventListener("mousedown",function(e){if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest("mark.bad"))closePop()});
window.addEventListener("scroll",closePop,true);window.addEventListener("resize",closePop);

/* ---- buttons ---- */
$("check").onclick=check;$("edit").onclick=showEdit;
$("undo").onclick=function(){if(history.length){var h=history.pop();text=h.t;fixed=h.f;render()}};
// Fix all: collect suggestions in small time slices (page stays responsive), then let the user review them
$("fixall").onclick=function(){var seen=Object.create(null),ws=[],items=[],i=0,tk=++job;
 scan().bad.forEach(function(b){if(!seen[b.w]){seen[b.w]=1;ws.push(b.w)}});
 (function step(){if(tk!==job)return;var t0=performance.now();
  while(i<ws.length&&performance.now()-t0<12){items.push({w:ws[i],s:E.suggest(ws[i])[0]});i++}
  if(i<ws.length){status("Finding suggestions… "+i+"/"+ws.length);setTimeout(step,0)}else review(items)})()};
function review(items){var p=$("fixpanel"),ok=items.filter(function(x){return x.s});
 if(!ok.length){status("No close matches found – review the words manually.");return}
 var h="<b>Review before fixing</b>";
 ok.forEach(function(x,i){h+='<label><input type="checkbox" data-i="'+i+'"'+(/^[A-Z]/.test(x.w)?"":" checked")+"> <s>"+esc(x.w)+"</s> → "+esc(x.s)+"</label>"});
 if(ok.length<items.length)h+='<p class="empty">'+(items.length-ok.length)+" word(s) have no close match and will be left alone.</p>";
 p.innerHTML=h+'<div class="row"><button class="primary" id="fxgo">Apply selected</button><button id="fxno">Cancel</button></div>';p.hidden=false;
 status("Tick the corrections you want, then apply. Capitalized words (possible names) start unticked.");
 $("fxno").onclick=function(){p.hidden=true;render()};
 $("fxgo").onclick=function(){var map=Object.create(null);p.querySelectorAll("input:checked").forEach(function(c){var x=ok[+c.dataset.i];map[x.w]=x.s});
  var list=scan().bad.filter(function(b){return map[b.w]!==undefined});replace(list,function(b){return map[b.w]});
  status(list.length+" word"+(list.length===1?"":"s")+" fixed.")}}
$("copy").onclick=function(){var t=reviewing?text:$("ta").value;
 (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){status("Corrected text copied.")},function(){var x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();try{document.execCommand("copy");status("Corrected text copied.")}catch(_){status("Copy failed – select the text manually.",true)}x.remove()})};
$("dl").onclick=function(){var t=reviewing?text:$("ta").value,n=(fileName||"text").replace(/\.[^.]+$/,"")+"-corrected.txt";
 var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain;charset=utf-8"}));a.download=n;document.body.appendChild(a);a.click();a.remove();status("Downloaded "+n)};
$("ta").addEventListener("input",function(){$("copy").disabled=$("dl").disabled=!$("ta").value.trim()});
$("ta").addEventListener("keydown",function(e){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();check()}});

/* ---- tabs + files (PDF/DOCX readers load from cdnjs on first use) ---- */
function tab(f){$("t-type").setAttribute("aria-selected",!f);$("t-file").setAttribute("aria-selected",f);$("p-file").hidden=!f}
$("t-type").onclick=function(){tab(false)};$("t-file").onclick=function(){tab(true)};
function load(src,name){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.crossOrigin="anonymous";s.referrerPolicy="no-referrer";s.onload=res;s.onerror=function(){rej(new Error("Could not load the "+name+" reader – check your connection."))};document.head.appendChild(s)})}
var readers={
 txt:function(f){return f.text()},
 docx:function(f){return(window.mammoth?Promise.resolve():load("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js","DOCX")).then(function(){return f.arrayBuffer()}).then(function(b){return mammoth.extractRawText({arrayBuffer:b})}).then(function(r){return r.value})},
 pdf:function(f){return(window.pdfjsLib?Promise.resolve():load("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","PDF")).then(function(){pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";return f.arrayBuffer()})
  .then(function(b){return pdfjsLib.getDocument({data:b}).promise}).then(function(pdf){var ps=[];for(var i=1;i<=pdf.numPages;i++)ps.push(pdf.getPage(i).then(function(p){return p.getTextContent().then(function(tc){var o="",y=null;tc.items.forEach(function(it){if(y!==null&&Math.abs(it.transform[5]-y)>4)o+="\n";else if(o&&!/\s$/.test(o))o+=" ";o+=it.str;y=it.transform[5]});return o})}));return Promise.all(ps)})
  .then(function(p){return p.join("\n\n").normalize("NFKC").replace(/(\p{L})-\n(?=\p{Ll})/gu,"$1")})}};   // ligatures (ﬁ) and hyphenated line breaks
function handle(files){var f=files&&files[0];if(!f)return;var ext=(f.name.split(".").pop()||"").toLowerCase(),more=files.length>1?"Only the first of "+files.length+" files was opened. ":"";
 if(!readers[ext]){status("Unsupported file type. Please use .txt, .pdf or .docx.",true);return}
 if(f.size>10485760){status("That file is over 10 MB – try a smaller one.",true);return}
 status("Reading "+f.name+"…");
 readers[ext](f).then(function(t){t=(t||"").replace(/\r\n?/g,"\n").trim();
  if(!t){status("No readable text in "+f.name+" (scanned or image-only PDFs can't be read – there is no OCR).",true);return}
  if(t.length>1e6){status(f.name+" has over 1,000,000 characters – please split it.",true);return}
  fileName=f.name;text=t;$("ta").value=t;history=[];fixed=0;ignored=Object.create(null);tab(false);showReview();var r=scan();render();
  status(more+"Loaded "+f.name+" – "+r.total.toLocaleString()+" words. "+(r.bad.length?r.bad.length+" misspelled; click the red words to fix them, then download.":"No misspellings found."));
  $("workspace").scrollIntoView({behavior:"smooth"})})
 .catch(function(err){console.error(err);status(err&&err.message&&/load the/.test(err.message)?err.message:"Couldn't read "+f.name+". It may be corrupted or password-protected.",true)})
 .then(function(){$("file").value=""})}
$("file").addEventListener("change",function(){handle($("file").files)});
var dz=$("drop");["dragenter","dragover"].forEach(function(n){dz.addEventListener(n,function(e){e.preventDefault();dz.classList.add("over")})});
["dragleave","drop"].forEach(function(n){dz.addEventListener(n,function(e){e.preventDefault();dz.classList.remove("over")})});
dz.addEventListener("drop",function(e){handle(e.dataTransfer.files)});
window.addEventListener("dragover",function(e){e.preventDefault()});window.addEventListener("drop",function(e){e.preventDefault()});

$("theme").onclick=function(){var r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=dark?"light":"dark";store.set("is.theme",r.dataset.theme)};
check();
})();
