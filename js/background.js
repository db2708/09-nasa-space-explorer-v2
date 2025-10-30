// Background starfield + milky way + shooting stars
// Adapted from user-provided code and augmented with resize handling
(function(){
  // To ensure we use native resolution of screen
  var dpr = window.devicePixelRatio || 1;

  // canvases
  const canvas = document.getElementById("starsCanvas");
  const ctx = canvas.getContext('2d');
  const canvasMw = document.getElementById("milkyWayCanvas");
  const ctxMw = canvasMw.getContext('2d');
  const canvasBg = document.getElementById("backgroundCanvas");
  const ctxBg = canvasBg.getContext('2d');

  // constants for the behavior of the model
  // Reduced counts for better performance on low-end devices
  const sNumber = 300;              // number of Stars (reduced from 600)
  const sSize = .3;                 // minimum size of Star
  const sSizeR = .6;                // randomness of the size of Stars
  const sAlphaR = .5;               // randomness of alpha for stars
  const sMaxHueProportion = .6;     // max proportion of displayed base hue
  // Shooting stars parameters
  // Increase this value to make shooting stars appear more frequently (originally 0.01)
  // Lowered shooting star density to reduce rendering load and visual noise
  const shootingStarDensity = 0.02;
  const shootingStarBaseXspeed = 30;
  const shootingStarBaseYspeed = 15;
  const shootingStarBaseLength = 8;
  const shootingStarBaseLifespan = 60;
  // Shooting star colors
  const shootingStarsColors = [
    "#a1ffba", // greenish
    "#a1d2ff", // blueish
    "#fffaa1", // yellowish
    "#ffa1a1"  // redish
  ];
  // milky way constants
  // Reduce milky-way/static star counts — these were expensive on some devices
  const mwStarCount = 20000;     // amount of static stars not clustered in the milky way (reduced from 100000)
  const mwRandomStarProp = .2;    // proportion of stars completely random in the milky way
  const mwClusterCount = 80;     // amount of clusters in the milky way (reduced from 300)
  const mwClusterStarCount = 800;// amount of stars per cluster (reduced from 1500)
  const mwClusterSize = 120;      // minimum size of a cluster
  const mwClusterSizeR = 80;      // randomness of the size of a cluster
  const mwClusterLayers = 10;     // amount of layers per cluster to draw
  const mwAngle = 0.6;            // to incline the milky way (0 is horizontal, tend to infinite to get vertical)
  const mwHueMin = 150;           // min hue for a cluster (150 is green)
  const mwHueMax = 300;           // max hue for a cluster (300 is pink)
  const mwWhiteProportionMin = 50;// minimum base percentage of white in cluster hue
  const mwWhiteProportionMax = 65;// maximum base percentage of white in cluster hue

  // array containing random numbers
  let randomArray;
  const randomArrayLength = 1000;
  let randomArrayIterator = 0;
  // array containing random hues
  let hueArray;
  const hueArrayLength = 1000;
  // arrays containing all Stars
  let StarsArray;
  let ShootingStarsArray;

  // sizing helper
  function setCanvasSize() {
    dpr = window.devicePixelRatio || 1;
    const w = Math.max(window.innerWidth, 1);
    const h = Math.max(window.innerHeight, 1);
    [canvas, canvasMw, canvasBg].forEach(c => {
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = w + 'px';
      c.style.height = h + 'px';
      const cctx = c.getContext('2d');
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  // Star creation
  class Star{
    constructor(x,y,size){
      this.x = x;
      this.y = y;
      this.size = size;
      this.alpha = size / (sSize + sSizeR);
      this.baseHue =  hueArray[Math.floor(Math.random()*hueArrayLength)];
      this.baseHueProportion = Math.random();
      this.randomIndexa = Math.floor(Math.random()*randomArrayLength);
      this.randomIndexh = this.randomIndexa;
      this.randomValue = randomArray[this.randomIndexa];
    }
    // method to draw each Star
    draw(){
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2, false);
      let rAlpha = this.alpha + Math.min((this.randomValue - 0.5) * sAlphaR, 1);    // random alpha for the shimmering
      let rHue = randomArray[this.randomIndexh] > this.baseHueProportion ? hueArray[this.randomIndexa] : this.baseHue; // random hue or base hue
      this.color = "hsla("+ rHue + ",100%,85%," + rAlpha + ")";
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    // method to check position of Star
    update(){
      this.randomIndexh = this.randomIndexa;
      this.randomIndexa = (this.randomIndexa >= randomArrayLength-1) ? 0 : this.randomIndexa + 1 ;
      this.randomValue = randomArray[this.randomIndexa];
      // draw Star
      this.draw();
    }
  }

  // Shooting Star creation
  class ShootingStar{
    constructor(x,y,speedX,speedY,color){
      this.x = x;
      this.y = y;
      this.speedX = speedX;
      this.speedY = speedY;
      this.framesLeft = shootingStarBaseLifespan;
      this.color = color;
    }

    // method to know if the star will be dead on next draw
    goingOut(){
      return this.framesLeft <= 0 ;
    }
    // method to get the modifier based on the age of the shooting star
    ageModifier(){
      let halfLife = shootingStarBaseLifespan/2.0;
      return Math.pow(1.0-Math.abs(this.framesLeft-halfLife)/halfLife,2);
    }

    // method to draw each Star
    draw(){
      let am = this.ageModifier();
      let endX = this.x - this.speedX*shootingStarBaseLength*am;
      let endY = this.y - this.speedY*shootingStarBaseLength*am;
      // linear gradient for the color of the shooting star
      let gradient = ctx.createLinearGradient(this.x,this.y,endX,endY);
      gradient.addColorStop(0, "#fff");
      gradient.addColorStop(Math.min(am,.7), this.color);
      gradient.addColorStop(1, "rgba(0,0,0,0)");

      // drawing
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(this.x,this.y);
      ctx.lineTo(endX,endY);
      ctx.stroke();
    }
    // method to check position of Star
    update(){
      this.framesLeft--;
      this.x += this.speedX;
      this.y += this.speedY;
      // draw Star
      this.draw();
    }
  }

  // star cluster in the milky way
  class MwStarCluster{
    constructor(x, y, size, hue, baseWhiteProportion, brigthnessModifier){
      this.x = x;
      this.y = y;
      this.size = size;
      this.hue = hue;
      this.baseWhiteProportion = baseWhiteProportion;
      this.brigthnessModifier = brigthnessModifier;
    }

    draw(){
      let starsPerLayer = Math.floor(mwClusterStarCount/mwClusterLayers);
      for(let layer = 1; layer < mwClusterLayers; layer++){
        let layerRadius = this.size*layer/mwClusterLayers;
        for(let i = 1; i < starsPerLayer; i++){
          let posX = this.x + 2*layerRadius*(Math.random()-.5);
          let posY = this.y + 2*Math.sqrt(Math.pow(layerRadius,2)-Math.pow(this.x-posX,2))*(Math.random()-.5);
          let size = .05 + Math.random()*.15;
          let alpha = .3 + Math.random()*.4;
          let whitePercentage = this.baseWhiteProportion + 15 + 15*this.brigthnessModifier + Math.floor(Math.random()*10);
          ctxMw.beginPath();
          ctxMw.arc(posX, posY, size, 0, Math.PI*2, false);
          ctxMw.fillStyle = "hsla(" + this.hue +  ",100%," + whitePercentage + "%," + alpha + ")";
          ctxMw.fill();
        }
      }
      // adding an extra gradient
      let gradient = ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,this.size);
      gradient.addColorStop(0, "hsla(" + this.hue +  ",100%," + this.baseWhiteProportion + "%,0.002)");
      gradient.addColorStop(0.25, "hsla(" + this.hue +  ",100%," + (this.baseWhiteProportion + 30) + "%,"+ (0.01+0.01*this.brigthnessModifier) + ")");
      gradient.addColorStop(0.4, "hsla(" + this.hue +  ",100%," + (this.baseWhiteProportion + 15) + "%,0.005)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      ctxMw.beginPath();
      ctxMw.arc(this.x,this.y,this.size, 0, Math.PI*2, false);
      ctxMw.fillStyle = gradient;
      ctxMw.fill();
    }

  }

  // create Star array, positions are randomized
  function init(){
    // init random array
    randomArray = [];
    for(let i = 0; i < randomArrayLength ; i++){
      randomArray[i] = Math.random();
    }
    // init hueArray
    hueArray = [];
    for(let i = 0; i < hueArrayLength ; i++){
      let rHue = Math.floor(Math.random()*160);
      if(rHue > 60) rHue += 110;
      hueArray[i] = rHue;
    }

    StarsArray = [];
    for(let i = 0; i < sNumber ; i++){
      let size = (Math.random() * sSizeR) + sSize;
      let x = Math.random() * ((innerWidth - size *2 ) - (size * 2)) + size * 2;
      let y = Math.random() * ((innerHeight - size *2 ) - (size * 2)) + size * 2;

      StarsArray.push(new Star(x, y, size));
    }

    ShootingStarsArray = [];

    DrawMilkyWayCanvas();
  }

  // animation with a simple FPS throttle to reduce CPU/GPU load on slower devices
  let lastFrameTime = 0;
  const targetFPS = 45; // cap FPS to 45 for smoother perf on low-end machines
  const frameInterval = 1000 / targetFPS;

  function animate(timestamp) {
    requestAnimationFrame(animate);
    if (!timestamp) timestamp = performance.now();
    const elapsed = timestamp - lastFrameTime;
    if (elapsed < frameInterval) return; // skip this frame
    lastFrameTime = timestamp;

    // clear the stars canvas only (milky-way is pre-rendered to its own canvas)
    ctx.clearRect(0, 0, innerWidth, innerHeight);

    // update small stars (shimmer)
    for (let i = 0; i < StarsArray.length; i++) {
      StarsArray[i].update();
    }

    // randomly push a new shooting star (less frequently due to lowered density)
    if (randomArray[randomArrayIterator] < shootingStarDensity) {
      let posX = Math.floor(Math.random() * canvas.width);
      let posY = Math.floor(Math.random() * 150);
      let speedX = Math.floor((Math.random() - 0.5) * shootingStarBaseXspeed);
      let speedY = Math.floor(Math.random() * shootingStarBaseYspeed);
      let color = shootingStarsColors[Math.floor(Math.random() * shootingStarsColors.length)];
      ShootingStarsArray.push(new ShootingStar(posX, posY, speedX, speedY, color));
    }

    // update/remove shooting stars
    for (let i = ShootingStarsArray.length - 1; i >= 0; i--) {
      if (ShootingStarsArray[i].goingOut()) {
        ShootingStarsArray.splice(i, 1);
      } else {
        ShootingStarsArray[i].update();
      }
    }

    // advance random iterator
    randomArrayIterator = (randomArrayIterator + 1) % randomArrayLength;
  }

  // to get x position of a star or cluster in the milky way
  function MilkyWayX(){
    return Math.floor(Math.random()*innerWidth);
  }

  // to get y position of a star or cluster in the milky way depending on x position
  function MilkyWayYFromX(xPos, mode){
    let offset = ((innerWidth/2)-xPos)*mwAngle;
    if(mode == "star"){
      return Math.floor(Math.pow(Math.random(),1.2)*innerHeight*(Math.random()-.5) + innerHeight/2 + (Math.random()-.5)*100) + offset;
    }
    else{
      return Math.floor(Math.pow(Math.random(),1.5)*innerHeight*.6*(Math.random()-.5) + innerHeight/2 + (Math.random()-.5)*100) + offset;
    }
  }

  // To draw the milkyWay
  function DrawMilkyWayCanvas(){
    // clear
    ctxMw.clearRect(0,0,innerWidth, innerHeight);
    // at first we draw unclustered stars
    for(let i = 0; i < mwStarCount; i++){
      ctxMw.beginPath();
      let xPos = MilkyWayX();
      let yPos = Math.random() < mwRandomStarProp ? Math.floor(Math.random()*innerHeight) : MilkyWayYFromX(xPos, "star");
      let size = Math.random()*.27;
      ctxMw.arc(xPos, yPos, size, 0, Math.PI*2, false);
      let alpha = .4 + Math.random()*.6;
      ctxMw.fillStyle = "hsla(0,100%,100%," + alpha + ")";
      ctxMw.fill();
    }
    // now we draw clusters
    for(let i = 0; i < mwClusterCount; i++){
      let xPos = MilkyWayX();
      let yPos = MilkyWayYFromX(xPos, "cluster");
      let distToCenter = (1-(Math.abs(xPos - innerWidth/2)/(innerWidth/2)))*(1-(Math.abs(yPos - innerHeight/2)/(innerHeight/2)));
      let size = mwClusterSize + Math.random()*mwClusterSizeR;
      let hue = mwHueMin + Math.floor((Math.random()*.5 + distToCenter*.5)*(mwHueMax - mwHueMin));
      let baseWhiteProportion = mwWhiteProportionMin + Math.random()*(mwWhiteProportionMax - mwWhiteProportionMin);
      new MwStarCluster(xPos, yPos, size, hue, baseWhiteProportion, distToCenter).draw();
    }
  }

  // set up and start
  function start(){
    setCanvasSize();
    init();
    animate();
  }

  // resize handling
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      setCanvasSize();
      // regenerate milky way on resize to match new dimensions
      DrawMilkyWayCanvas();
    }, 150);
  });

  // init when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();
