/* Home: cinematic opening (gold DR monogram), name reveal, doctor spotlight and slow reveals. */
(function(){
  gsap.registerPlugin(ScrollTrigger);

  /* gold DR monogram: extruded from the logo's own glyphs (D, R and the dot) */
  var L=window.LOGO_PATHS, mono=document.getElementById("mono"), NS="http://www.w3.org/2000/svg";
  var ids=[9,12,13], box=[130,0,288,106], VB=box.join(" ").replace(/^(\S+) (\S+) (\S+) (\S+)$/,function(m,a,b,c,d){return a+" "+b+" "+(c-a)+" "+(d-b)});
  var defs='<defs><linearGradient id="gF" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e2b0"/><stop offset=".35" stop-color="#d7b06c"/><stop offset=".7" stop-color="#a77b3a"/><stop offset="1" stop-color="#6d4c1e"/></linearGradient>'+
           '<linearGradient id="gS" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="120" y2="40"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff8e6" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>';
  var pieces=ids.map(function(i){
    var g=L.glyphs[i], p=document.createElement("div"); p.className="p"; var h="";
    for(var l=0;l<14;l++){ h+='<svg viewBox="'+VB+'" style="transform:translateZ('+((l-14)*2.2)+'px)"><path fill="'+(l<13?'hsl(36,45%,'+(10+l*1.3)+'%)':'#3d2a12')+'" d="'+g.d+'"/></svg>'; }
    h+='<svg viewBox="'+VB+'" style="transform:translateZ(.6px)">'+defs+'<path fill="url(#gF)" d="'+g.d+'"/><path class="sheen" fill="url(#gS)" d="'+g.d+'"/></svg>';
    p.innerHTML=h; mono.appendChild(p); return p;
  });
  var grad=mono.querySelector("#gS");
  gsap.set(pieces,{opacity:0}); gsap.set(pieces[0],{z:-600,rotationY:-60}); gsap.set(pieces[1],{x:160,rotationY:80,z:-200}); gsap.set(pieces[2],{y:-320});
  var tl=gsap.timeline({delay:.4});
  tl.to(pieces,{opacity:1,duration:.6,stagger:.25},0)
    .to(pieces[0],{z:0,rotationY:0,duration:2.2,ease:"expo.out"},0)
    .to(pieces[1],{x:0,z:0,rotationY:0,duration:2.2,ease:"expo.out"},.3)
    .to(pieces[2],{y:0,duration:1.4,ease:"bounce.out"},.9)
    .from(".hc-hero .hc-beam",{opacity:0,duration:2.4,ease:"power2.out"},.2)
    .from(".hc-hero .hc-spot,.hc-plinth,.hc-under",{opacity:0,duration:2},.4)
    .fromTo(".hc-hero .hc-reveal",{opacity:0,y:30,filter:"blur(8px)"},{opacity:1,y:0,filter:"blur(0px)",duration:1.6,stagger:.14,ease:"expo.out"},.6)
    .fromTo(grad,{attr:{x1:-60,x2:0}},{attr:{x1:300,x2:360},duration:2.2,ease:"power2.inOut"},1.8);
  gsap.to(mono,{rotationY:12,y:-10,duration:4,yoyo:true,repeat:-1,ease:"sine.inOut",delay:2.4});
  gsap.timeline({repeat:-1,repeatDelay:5,delay:5}).fromTo(grad,{attr:{x1:-60,x2:0}},{attr:{x1:300,x2:360},duration:2.2,ease:"power2.inOut"});
  window.addEventListener("pointermove",function(e){var nx=e.clientX/innerWidth-.5,ny=e.clientY/innerHeight-.5;gsap.to(".hc-stage",{rotationY:nx*14,rotationX:-ny*8,duration:1.2,ease:"power3.out"})});
  var dust=document.getElementById("dust"); for(var k=0;k<26;k++){var d=document.createElement("i");d.style.left=(30+Math.random()*45)+"%";d.style.top=(Math.random()*80)+"%";dust.appendChild(d);
    gsap.to(d,{y:-60-Math.random()*80,x:-20+Math.random()*40,opacity:0,duration:5+Math.random()*6,repeat:-1,delay:Math.random()*5,ease:"none"});}
  gsap.to(".hc-hero .hc-copy",{y:-80,opacity:0,ease:"none",scrollTrigger:{trigger:".hc-hero",start:"top top",end:"bottom top",scrub:true}});
  gsap.to(".hc-stage",{y:120,scale:.9,opacity:.3,ease:"none",scrollTrigger:{trigger:".hc-hero",start:"top top",end:"bottom top",scrub:true}});

  /* full-bleed name: letters spread as the photo drifts */
  gsap.fromTo("#bleed .hc-img",{scale:1.25},{scale:1,ease:"none",scrollTrigger:{trigger:"#bleed",start:"top bottom",end:"bottom top",scrub:true}});
  gsap.fromTo("#word",{letterSpacing:"0.05em",opacity:0},{letterSpacing:innerWidth<820?"0.2em":"0.32em",opacity:1,ease:"none",scrollTrigger:{trigger:"#bleed",start:"top 70%",end:"center center",scrub:true}});
  gsap.from("#bleed .hc-sub",{opacity:0,y:20,scrollTrigger:{trigger:"#bleed",start:"center 70%",toggleActions:"play none none reverse"}});

  /* doctor: steps into the light */
  gsap.fromTo("#doc .hc-fig img",{opacity:0,x:-60,filter:"brightness(.2) blur(6px)"},{opacity:1,x:0,filter:"brightness(.78) sepia(.18) blur(0px)",ease:"none",scrollTrigger:{trigger:"#doc",start:"top 85%",end:"top 20%",scrub:true}});
  gsap.fromTo("#doc .hc-light",{opacity:0},{opacity:1,scrollTrigger:{trigger:"#doc",start:"top 60%",end:"top 10%",scrub:true}});

  /* everything else: slow fade + de-blur as it enters */
  gsap.utils.toArray(".hc-reveal").forEach(function(el){ if(el.closest(".hc-hero"))return;
    gsap.fromTo(el,{opacity:0,y:40,filter:"blur(6px)"},{opacity:1,y:0,filter:"blur(0px)",duration:1.5,ease:"expo.out",scrollTrigger:{trigger:el,start:"top 88%"}}); });
  ScrollTrigger.create({trigger:"#steps",start:"top 75%",onEnter:function(){document.querySelectorAll(".hc-step").forEach(function(s,i){setTimeout(function(){s.classList.add("on")},i*250)})}});
  gsap.fromTo(".hc-fin .hc-img",{scale:1.2},{scale:1,ease:"none",scrollTrigger:{trigger:".hc-fin",start:"top bottom",end:"bottom bottom",scrub:true}});
})();
