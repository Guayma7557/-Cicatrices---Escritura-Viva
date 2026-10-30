/* ================================================================== */
/*  Variables Globales y Configuración                                */
/* ================================================================== */

let W, H;
let video;
let faceMesh;
let faces = [];
let numPersonas = 0;

// Control de transición para la postura y brillo (0 = Encorvado, 1 = De pie)
let transicionPostura = 0; 

// Sistema de Palabras y Partículas
let palabras = [];
let particulas = [];
const POEMA = [
  'silencio', 'cicatrices', 'abismo', 'paz', 'olvido',
  'aliento', 'susurro', 'miedo', 'tiempo', 'soledad',
  'ruido', 'vacío', 'ansiedad', 'calma', 'luz', 'hogar',
  'reloj', 'afuera', 'mundo', 'gente', 'incomprendida',
  'memoria', 'eterno', 'deseo', 'espero', 'mirando'
];

/* ================================================================== */
/*  Setup y Carga de Modelos                                          */
/* ================================================================== */

function setup() {
  W = windowWidth;
  H = windowHeight;
  createCanvas(W, H);
  
  // Inicializar cámara
  video = createCapture(VIDEO);
  video.size(320, 240);
  video.hide();

  // Inicializar modelo de detección (FaceMesh)
  faceMesh = ml5.faceMesh(video, { maxFaces: 10, flipHorizontal: true }, modelReady);
  
  // Crear las palabras con una órbita más amplia
  for (let i = 0; i < 45; i++) {
    let txt = random(POEMA);
    palabras.push(new Palabra(txt));
  }
}

function modelReady() {
  faceMesh.detectStart(video, gotFaces);
}

function gotFaces(results) {
  faces = results;
  numPersonas = faces.length;
}

function windowResized() {
  W = windowWidth;
  H = windowHeight;
  resizeCanvas(W, H);
}

/* ================================================================== */
/*  Clase Palabra: Órbita amplia, brillo intenso y temblor sutil      */
/* ================================================================== */

class Palabra {
  constructor(texto) {
    this.texto = texto;
    
    // Órbita más alejada del centro
    this.angulo = random(TWO_PI);
    this.radioBase = random(220, 450); 
    this.tamano = random(16, 36);
    
    this.noiseSeedX = random(1000);
    this.noiseSeedY = random(1000);
    
    this.x = W / 2 + cos(this.angulo) * this.radioBase;
    this.y = H / 2 + sin(this.angulo) * this.radioBase * 0.85;
  }

  update(t) {
    // Temblor orgánico sutil (Perlin Noise)
    let fuerzaTemblor = 4;
    let tx = map(noise(this.noiseSeedX + t * 0.8), 0, 1, -fuerzaTemblor, fuerzaTemblor);
    let ty = map(noise(this.noiseSeedY + t * 0.8), 0, 1, -fuerzaTemblor, fuerzaTemblor);

    // Órbita lenta
    let anguloActual = this.angulo + t * 0.1;
    let targetX = W / 2 + cos(anguloActual) * this.radioBase;
    let targetY = H / 2 + sin(anguloActual) * this.radioBase * 0.85;

    // Interpolación suave hacia la posición objetivo
    this.x = lerp(this.x, targetX + tx, 0.05);
    this.y = lerp(this.y, targetY + ty, 0.05);
  }

  display() {
    push();
    translate(this.x, this.y);
    
    textFont('Cormorant Garamond');
    textStyle(ITALIC);
    textSize(this.tamano);
    textAlign(CENTER, CENTER);
    
    let ctx = drawingContext;
    
    // BLANCO PURO Y BRILLO INTENSO
    // El brillo aumenta drásticamente si hay gente detectada
    let intensidadBrillo = map(transicionPostura, 0, 1, 20, 60);
    ctx.shadowColor = 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = intensidadBrillo;
    
    fill(255, 255, 255);
    noStroke();
    text(this.texto, 0, 0);
    
    pop();
  }
}

/* ================================================================== */
/*  Clase Partícula: Destellos de luz estelar (Solo con presencia)    */
/* ================================================================== */

class Particula {
  constructor(x, y) {
    this.x = x + random(-30, 30);
    this.y = y + random(-30, 30);
    this.vx = random(-2, 2);
    this.vy = random(-3, -1); // Flotan hacia arriba
    this.vida = 255;
    this.tamano = random(1.5, 4);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vida -= 3;
  }
  
  display() {
    let ctx = drawingContext;
    ctx.shadowColor = 'rgba(255, 255, 255, 1)';
    ctx.shadowBlur = 10;
    noStroke();
    fill(255, 255, 255, this.vida);
    circle(this.x, this.y, this.tamano);
    ctx.shadowBlur = 0;
  }
}

/* ================================================================== */
/*  Dibujo Principal                                                  */
/* ================================================================== */

function draw() {
  let t = millis() / 1000;

  // Calcular transición según personas (3 o más = postura totalmente erguida)
  let objetivoPostura = constrain(numPersonas / 3.0, 0, 1);
  transicionPostura = lerp(transicionPostura, objetivoPostura, 0.03);

  // 1. Fondo Oscuro Introspectivo (Se mantiene negro/azul profundo)
  background(2, 3, 8);
  dibujarFondoOscuro();

  // 2. Actualizar y dibujar palabras
  for (let p of palabras) {
    p.update(t);
    p.display();
  }

  // 3. Emitir partículas si hay personas
  if (numPersonas > 0 && random(1) < 0.3) {
    particulas.push(new Particula(W / 2, H / 2 - 50)); // Emanan del personaje
  }

  // 4. Actualizar y dibujar partículas
  for (let i = particulas.length - 1; i >= 0; i--) {
    particulas[i].update();
    particulas[i].display();
    if (particulas[i].vida <= 0) particulas.splice(i, 1);
  }

  // 5. Dibujar Personaje (Con animación de incorporación)
  dibujarPersonaje(t);

  // 6. Interfaz de Cámara (Glassmorphism)
  dibujarUI();
}

/* ================================================================== */
/*  Funciones Visuales                                                */
/* ================================================================== */

function dibujarFondoOscuro() {
  // Viñeta sutil para reforzar la introspección
  let grad = drawingContext.createRadialGradient(
    W / 2, H / 2, 50, 
    W / 2, H / 2, max(W, H)
  );
  grad.addColorStop(0, 'rgba(10, 15, 25, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
  drawingContext.fillStyle = grad;
  drawingContext.fillRect(0, 0, W, H);
}

function dibujarPersonaje(t) {
  push();
  translate(W / 2, H / 2 + 20);

  // Respiración (más notoria cuando está de pie)
  let breathe = 1 + sin(t * 1.5) * 0.015;
  scale(breathe);

  let ctx = drawingContext;
  
  // BRILLO BLANCO INTENSO (Aumenta con la presencia)
  let intensidadBrillo = map(transicionPostura, 0, 1, 30, 100);
  ctx.shadowColor = 'rgba(255, 255, 255, 1)';
  ctx.shadowBlur = intensidadBrillo;
  
  stroke(255, 255, 255);
  strokeWeight(3.5);
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);

  // --- Interpolación de Postura (Encorvado a De Pie) ---
  
  // Cabeza
  let headX = lerp(15, 0, transicionPostura);
  let headY = lerp(-50, -120, transicionPostura);
  
  // Cuello / Hombros
  let neckX = lerp(10, 0, transicionPostura);
  let neckY = lerp(-30, -90, transicionPostura);
  
  // Cadera
  let hipX = lerp(-15, 0, transicionPostura);
  let hipY = lerp(40, 0, transicionPostura);

  // Rodillas
  let kneeX = lerp(35, 15, transicionPostura);
  let kneeY = lerp(20, 50, transicionPostura);
  
  // Pies
  let footX = lerp(25, 15, transicionPostura);
  let footY = lerp(80, 100, transicionPostura);

  // Brazo (Codo y Mano)
  let elbowX = lerp(20, 15, transicionPostura);
  let elbowY = lerp(0, -40, transicionPostura);
  let handX = lerp(40, 25, transicionPostura);
  let handY = lerp(25, 10, transicionPostura);

  // --- Dibujo Vectorial ---

  // Cabeza
  ellipse(headX, headY, 32, 32);

  // Espalda (Curva que se endereza)
  beginShape();
  vertex(neckX, neckY);
  // El punto de control de la bezier se aleja para enderezar
  let ctrlX = lerp(neckX - 20, neckX, transicionPostura);
  let ctrlY = lerp(neckY + 25, neckY + 40, transicionPostura);
  bezierVertex(ctrlX, ctrlY, hipX + 10, hipY - 20, hipX, hipY);
  endShape();

  // Brazo
  line(neckX, neckY + 5, elbowX, elbowY);
  line(elbowX, elbowY, handX, handY);

  // Piernas
  line(hipX, hipY, kneeX, kneeY);
  line(kneeX, kneeY, footX, footY);

  // Segunda pierna (Fondo)
  stroke(255, 255, 255, 100); // Un poco más tenue
  strokeWeight(2.5);
  line(hipX - 5, hipY, kneeX - 10, kneeY + 5);
  line(kneeX - 10, kneeY + 5, footX - 15, footY);

  pop();
  ctx.shadowBlur = 0; // Resetear brillo
}

function dibujarUI() {
  push();
  let pw = 180;
  let ph = 135;
  let px = W - pw - 30;
  let py = H - ph - 30;
  
  // Efecto Glassmorphism
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'rgba(0, 0, 0, 0.8)';
  
  // Fondo semi-transparente oscuro
  fill(10, 10, 15, 180);
  noStroke();
  rect(px, py, pw, ph, 16);

  // Borde sutil neón
  noFill();
  stroke(255, 255, 255, 100);
  strokeWeight(1.5);
  rect(px, py, pw, ph, 16);

  // Dibujar video
  drawingContext.save();
  drawingContext.beginPath();
  drawingContext.roundRect(px + 5, py + 5, pw - 10, ph - 10, 12);
  drawingContext.clip();
  image(video, px + 5, py + 5, pw - 10, ph - 10);
  drawingContext.restore();

  // Texto Minimalista
  textFont('Cormorant Garamond');
  textStyle(NORMAL);
  textSize(16);
  textAlign(LEFT, TOP);
  
  // Fondo de texto
  fill(0, 150);
  rect(px + 10, py + 10, 120, 25, 8);
  
  fill(255);
  text(`Presencias: ${numPersonas}`, px + 15, py + 14);
  
  pop();
  drawingContext.shadowBlur = 0;
}