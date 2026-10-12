(function(){"use strict";
var $=function(i){return document.getElementById(i)};
var WORDS=window.DICTIONARY;
var SET=Object.create(null),BYLEN=[],RANK=Object.create(null);
WORDS.forEach(function(w,i){SET[w]=1;RANK[w]=i;(BYLEN[w.length]=BYLEN[w.length]||[]).push(w)});
var CONTR=["s","t","re","ve","ll","d","m"];

/* ---- engine ---- */
function dist(a,b){var n=a.length,m=b.length,p2=null,p1=[],c,i,j,x,t;for(j=0;j<=m;j++)p1[j]=j;
 for(i=1;i<=n;i++){c=[i];for(j=1;j<=m;j++){x=a[i-1]===b[j-1]?0:1;t=Math.min(p1[j]+1,c[j-1]+1,p1[j-1]+x);if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])t=Math.min(t,p2[j-2]+1);c[j]=t}p2=p1;p1=c}return p1[m]}
var BADF=/^(occur(ed|ing)|refer(ed|ing)|prefer(ed|ing)|transfer(ed|ing)|begining|comit(ed|ing)|admited|permited)$/;
function known(w){
 if(SET[w])return true;
 if(w.indexOf("'")>-1){var p=w.split("'"),st=p[0],sf=p[1];if(p.length===2&&CONTR.indexOf(sf)>-1&&(SET[st]||(sf==="t"&&/n$/.test(st)&&SET[st.slice(0,-1)])))return true;return false}
 if(w.length<4||BADF.test(w))return false;
 var c=[[/ies$/,"y"],[/(es|s)$/,""],[/(ed|d)$/,""],[/ing$/,""],[/ing$/,"e"],[/ly$/,""],[/(er|est)$/,""],[/(.)\1(ed|ing|er|est)$/,"$1"]],k,b;
 for(k=0;k<c.length;k++){b=w.replace(c[k][0],c[k][1]);if(b!==w&&b.length>=3&&SET[b])return true}
 return false}
var cache=Object.create(null);
function suggest(word){var lw=word.toLowerCase().replace(/’/g,"'");if(cache[lw])return cache[lw];
 var out=[],L=lw.length,l,c,i,d;
 for(l=Math.max(1,L-2);l<=L+2;l++){c=BYLEN[l];if(!c)continue;for(i=0;i<c.length;i++){d=dist(lw,c[i]);if(d<=2)out.push({w:c[i],o:d})}}
 out.sort(function(x,y){return x.o-y.o||RANK[x.w]-RANK[y.w]});return cache[lw]=out.slice(0,3)}
function matchCase(src,w){if(src.length>1&&src===src.toUpperCase())return w.toUpperCase();if(src[0]!==src[0].toLowerCase())return w[0].toUpperCase()+w.slice(1);return w}

/* ---- state ---- */
var text=$("ta").value,history=[],ignored=Object.create(null),fixed=0,current=null,fileName="",reviewing=false,lastFixedAt=-1;
var RE=/[A-Za-z0-9]+(?:['’][A-Za-z]+)*/g;
function scan(t){var out=[],m,tw=0;RE.lastIndex=0;
 while((m=RE.exec(t))){tw++;var w=m[0];if(/\d/.test(w))continue;var lw=w.toLowerCase().replace(/’/g,"'");
  if(ignored[lw]||known(lw))continue;out.push({w:w,s:m.index,e:m.index+w.length})}
 return{bad:out,total:tw}}
function esc(s){return s.replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

/* ---- render ---- */
function render(t0){
 var r=scan(text),html="",pos=0,i;
 r.bad.forEach(function(b,k){html+=esc(text.slice(pos,b.s));
  html+='<mark class="bad" role="button" tabindex="0" aria-haspopup="dialog" data-k="'+k+'">'+esc(b.w)+"</mark>";pos=b.e});
 html+=esc(text.slice(pos));$("doc").innerHTML=html;$("doc").__bad=r.bad;
 $("s-w").textContent=r.total;$("s-m").textContent=r.bad.length;$("s-f").textContent=fixed;

 $("fixall").hidden=!r.bad.length;$("undo").hidden=!history.length;
 $("copy").disabled=$("dl").disabled=!text.trim();
 status(r.bad.length?r.bad.length+" misspelled word"+(r.bad.length>1?"s":"")+" left – click one to fix it.":(r.total?"✓ No misspellings"+(fixed?" – "+fixed+" fixed":"")+". Your text is clean.":"Nothing to check yet."));
 return r}
function status(m,err){var s=$("status");s.textContent=m;s.classList.toggle("err",!!err)}
function showReview(){reviewing=true;$("v-edit").hidden=true;$("v-review").hidden=false;$("edit").hidden=false;$("check").textContent="Re-check";$("stats").hidden=false}
function showEdit(){reviewing=false;closePop();$("ta").value=text;$("v-edit").hidden=false;$("v-review").hidden=true;$("edit").hidden=true;$("fixall").hidden=true;$("undo").hidden=true;$("check").textContent="Check spelling";$("stats").hidden=true;$("ta").focus()}
function check(){if(!reviewing)text=$("ta").value;if(!text.trim()){status("Type or open some text first.",true);return}
 var t0=performance.now();history=reviewing?history:[];if(!reviewing)fixed=0;showReview();render(t0)}

/* ---- popover: click a word → replaced in place ---- */
var pop=$("pop"),anchor=null;
function closePop(){pop.hidden=true;if(anchor){anchor.removeAttribute("aria-expanded");anchor=null}current=null}
function openPop(el){var b=$("doc").__bad[+el.dataset.k];if(!b)return;closePop();anchor=el;current=b;el.setAttribute("aria-expanded","true");
 var sg=suggest(b.w),h='<h3>Fix <s>'+esc(b.w)+'</s></h3>';
 if(sg.length)sg.forEach(function(s,i){h+='<button class="sug" data-r="'+esc(matchCase(b.w,s.w))+'"><span><kbd>'+(i+1)+'</kbd> '+esc(matchCase(b.w,s.w))+'</span></button>'});
 else h+='<p class="empty">No close match within 2 edits.</p>';
 h+='<div class="pop2"><button data-a="all">Fix every "'+esc(b.w)+'"</button><button data-a="ign">Ignore</button><button data-a="add">Add to dictionary</button></div>';
 pop.innerHTML=h;pop.hidden=false;
 var r=el.getBoundingClientRect(),w=pop.offsetWidth,hh=pop.offsetHeight,top=r.bottom+8;
 if(top+hh>innerHeight-8)top=Math.max(8,r.top-hh-8);
 pop.style.top=top+"px";pop.style.left=Math.min(Math.max(8,r.left),innerWidth-w-8)+"px";
 var f=pop.querySelector("button");if(f)f.focus();}
function replaceAt(b,rep,all){history.push({t:text,f:fixed});
 if(all){var lw=b.w.toLowerCase(),n=0;text=text.replace(RE,function(m){if(m.toLowerCase()===lw){n++;return matchCase(m,rep.toLowerCase())}return m});fixed+=n}
 else{text=text.slice(0,b.s)+rep+text.slice(b.e);fixed++}
 closePop();render();
 var first=$("doc").querySelector("mark.bad");status($("status").textContent)}
pop.addEventListener("click",function(e){var t=e.target.closest("button");if(!t||!current)return;var b=current;
 if(t.dataset.r)replaceAt(b,t.dataset.r,false);
 else if(t.dataset.a==="all"){var sg=suggest(b.w);if(sg[0])replaceAt(b,sg[0].w,true)}
 else{ignored[b.w.toLowerCase()]=1;if(t.dataset.a==="add")SET[b.w.toLowerCase()]=1;closePop();render()}});
$("doc").addEventListener("click",function(e){var m=e.target.closest("mark.bad");if(m)openPop(m)});
$("doc").addEventListener("keydown",function(e){if((e.key==="Enter"||e.key===" ")&&e.target.matches("mark.bad")){e.preventDefault();openPop(e.target)}});
document.addEventListener("keydown",function(e){if(pop.hidden)return;
 if(e.key==="Escape"){var a=anchor;closePop();a&&a.focus()}
 else if(/^[1-3]$/.test(e.key)){var s=pop.querySelectorAll(".sug")[+e.key-1];if(s)s.click()}});
document.addEventListener("mousedown",function(e){if(!pop.hidden&&!pop.contains(e.target)&&!e.target.closest("mark.bad"))closePop()});
$("doc").addEventListener("scroll",closePop);
$("check").onclick=check;$("edit").onclick=showEdit;
$("undo").onclick=function(){if(history.length){var h=history.pop();text=h.t;fixed=h.f;render()}};
$("fixall").onclick=function(){var r=scan(text),n=0;if(!r.bad.length)return;history.push({t:text,f:fixed});
 for(var i=r.bad.length-1;i>=0;i--){var b=r.bad[i],s=suggest(b.w)[0];if(s){text=text.slice(0,b.s)+matchCase(b.w,s.w)+text.slice(b.e);n++}}
 fixed+=n;render();if(!n)history.pop();var left=scan(text).bad.length;status(n+" fixed automatically."+(left?" "+left+" had no close match – review them manually.":" Text is clean."))};
$("copy").onclick=function(){var t=reviewing?text:$("ta").value;
 (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){status("Corrected text copied.")},function(){var x=document.createElement("textarea");x.value=t;document.body.appendChild(x);x.select();try{document.execCommand("copy");status("Corrected text copied.")}catch(_){status("Copy failed – select the text manually.",true)}x.remove()})};
$("dl").onclick=function(){var t=reviewing?text:$("ta").value,n=(fileName||"text").replace(/\.[^.]+$/,"")+"-corrected.txt";
 var a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/plain;charset=utf-8"}));a.download=n;document.body.appendChild(a);a.click();a.remove();status("Downloaded "+n)};
$("ta").addEventListener("input",function(){var v=$("ta").value.trim().length>0;$("copy").disabled=$("dl").disabled=!v});
$("ta").addEventListener("keydown",function(e){if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();check()}});

/* ---- tabs + files ---- */
function tab(f){$("t-type").setAttribute("aria-selected",!f);$("t-file").setAttribute("aria-selected",f);$("p-file").hidden=!f}
$("t-type").onclick=function(){tab(false)};$("t-file").onclick=function(){tab(true)};
function load(src,name){return new Promise(function(res,rej){var s=document.createElement("script");s.src=src;s.onload=res;s.onerror=function(){rej(new Error("Could not load the "+name+" reader – check your connection."))};document.head.appendChild(s)})}
var readers={
 txt:function(f){return f.text()},
 docx:function(f){return(window.mammoth?Promise.resolve():load("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js","DOCX")).then(function(){return f.arrayBuffer()}).then(function(b){return mammoth.extractRawText({arrayBuffer:b})}).then(function(r){return r.value})},
 pdf:function(f){return(window.pdfjsLib?Promise.resolve():load("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js","PDF")).then(function(){pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";return f.arrayBuffer()})
  .then(function(b){return pdfjsLib.getDocument({data:b}).promise}).then(function(pdf){var ps=[];for(var i=1;i<=pdf.numPages;i++)ps.push(pdf.getPage(i).then(function(p){return p.getTextContent().then(function(tc){var o="",y=null;tc.items.forEach(function(it){if(y!==null&&Math.abs(it.transform[5]-y)>4)o+="\n";else if(o&&!/\s$/.test(o))o+=" ";o+=it.str;y=it.transform[5]});return o})}));return Promise.all(ps)}).then(function(p){return p.join("\n\n")})}};
function handle(f){if(!f)return;var ext=(f.name.split(".").pop()||"").toLowerCase();
 if(!readers[ext]){status("Unsupported file type. Please use .txt, .pdf or .docx.",true);return}
 if(f.size>10485760){status("That file is over 10 MB – try a smaller one.",true);return}
 status("Reading "+f.name+"…");
 readers[ext](f).then(function(t){t=(t||"").replace(/\r\n?/g,"\n").trim();
  if(!t){status("No readable text in "+f.name+" (scanned/image-only PDFs can't be read).",true);return}
  fileName=f.name;text=t;$("ta").value=t;history=[];fixed=0;ignored=Object.create(null);tab(false);
  var t0=performance.now();showReview();var r=render(t0);
  status("Loaded "+f.name+" – "+r.total.toLocaleString()+" words. "+(r.bad.length?r.bad.length+" misspelled; click the red words to fix them, then download.":"No misspellings found."));
  $("workspace").scrollIntoView({behavior:"smooth"})})
 .catch(function(err){console.error(err);status(err&&err.message&&/load the/.test(err.message)?err.message:"Couldn't read "+f.name+". It may be corrupted or password-protected.",true)})
 .then(function(){$("file").value=""})}
$("file").addEventListener("change",function(){handle($("file").files[0])});
var dz=$("drop");["dragenter","dragover"].forEach(function(n){dz.addEventListener(n,function(e){e.preventDefault();dz.classList.add("over")})});
["dragleave","drop"].forEach(function(n){dz.addEventListener(n,function(e){e.preventDefault();dz.classList.remove("over")})});
dz.addEventListener("drop",function(e){handle(e.dataTransfer.files[0])});
window.addEventListener("dragover",function(e){e.preventDefault()});window.addEventListener("drop",function(e){e.preventDefault()});


$("theme").onclick=function(){var r=document.documentElement,dark=r.dataset.theme?r.dataset.theme==="dark":matchMedia("(prefers-color-scheme:dark)").matches;r.dataset.theme=dark?"light":"dark"};
check();
})();
