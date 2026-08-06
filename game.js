// IMPORTAR FIREBASE DESDE LA NUBE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDocs, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// BASE DE DATOS EN LA NUBE
const firebaseConfig = {
  apiKey: "AIzaSyDVadzPqGmU_VZ6BxxW0-TYofgBN4Ti9OU",
  authDomain: "pacman-juego.firebaseapp.com",
  projectId: "pacman-juego",
  storageBucket: "pacman-juego.firebasestorage.app",
  messagingSenderId: "809838655698",
  appId: "1:809838655698:web:644a699bf40c3a2219550b",
  measurementId: "G-62T2CJWWBN"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const puntajesRef = collection(db, "puntajes");

// GENERAR O RECUPERAR ID ÚNICO DEL DISPOSITIVO
let dispositivoID = localStorage.getItem("pacman_dispositivo_id");
if (!dispositivoID) {
  dispositivoID = "dev_" + Math.random().toString(36).substring(2, 11) + Date.now();
  localStorage.setItem("pacman_dispositivo_id", dispositivoID);
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// VARIABLES DEL JUEGO
const radio = 20;
const velocidad = 3;
const radioFantasma = 18;
const velocidadBaseFantasma = 1.5;
const radioComida = 6;
const radioSuperComida = 10;

let x, y, vx, vy, gameover, fantasmas, comidaX, comidaY, comidaVisible, puntos;
let animacionId;
let miRecordActual = 0; // Guardará el récord actual del jugador

// VARIABLES MODO FIEBRE Y SÚPER FRUTA
let superComidaX = -100, superComidaY = -100, superComidaVisible = false;
let modoFiebre = false;
let tiempoFiebre = 0;
let intervaloSuperFruta;

// PALETAS DE COLORES SEGÚN NIVEL (CADA 100 PTS)
const coloresPacman = ["#FFFF00", "#00FFCC", "#FF00FF", "#00FF00", "#FF9900", "#FF0066"];
const paletasFantasmas = [
  ["#FF0000", "#FFB8FF", "#00FFFF", "#FFB852"], // Nivel 0 (Originales)
  ["#9900FF", "#00FF00", "#FF00AA", "#0099FF"], // Nivel 1
  ["#FF5722", "#E91E63", "#00BCD4", "#8BC34A"], // Nivel 2
  ["#E6EE9C", "#FFAB91", "#CE93D8", "#80CBC4"]  // Nivel 3+
];

// ELEMENTOS DOM
const gameOverPanel = document.getElementById("gameOverPanel");
const puntajeFinal = document.getElementById("puntajeFinal");
const nombreJugador = document.getElementById("nombreJugador");
const btnGuardar = document.getElementById("btnGuardar");
const btnReiniciar = document.getElementById("btnReiniciar");
const tablaPuntajes = document.getElementById("tablaPuntajes");

// INICIALIZAR/REINICIAR ESTADO DEL JUEGO
function iniciarJuego() {
  x = 200;
  y = 200;
  vx = 0; // Empieza quieto
  vy = 0;
  gameover = false;
  fantasmas = [{ x: 50, y: 50 }];
  comidaX = 300;
  comidaY = 200;
  comidaVisible = true;
  puntos = 0;

  modoFiebre = false;
  tiempoFiebre = 0;
  superComidaVisible = false;

  gameOverPanel.classList.add("oculto");
  btnGuardar.disabled = false;

  if (animacionId) cancelAnimationFrame(animacionId);
  if (intervaloSuperFruta) clearInterval(intervaloSuperFruta);

  // Aparece una súper fruta cada 30 segundos
  intervaloSuperFruta = setInterval(generarSuperFruta, 30000);

  actualizarJuego();
}

function generarSuperFruta() {
  if (!gameover && !superComidaVisible) {
    superComidaX = Math.floor(Math.random() * (canvas.width - 60)) + 30;
    superComidaY = Math.floor(Math.random() * (canvas.height - 60)) + 30;
    superComidaVisible = true;
  }
}

function activarModoFiebre() {
  modoFiebre = true;
  tiempoFiebre = Date.now() + 5000; // 5 segundos de duración
}

// FUNCIONES DE CONTROL DE MOVIMIENTO
function moverArriba() { vx = 0; vy = -velocidad; }
function moverAbajo() { vx = 0; vy = velocidad; }
function moverIzquierda() { vx = -velocidad; vy = 0; }
function moverDerecha() { vx = velocidad; vy = 0; }
function parar() { vx = 0; vy = 0; } // QUEDARSE QUIETO

// TECLADO (Espacio = Frenar)
window.addEventListener("keydown", (evento) => {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space"].includes(evento.key)) {
    evento.preventDefault();
  }

  if (evento.key === "ArrowRight") moverDerecha();
  else if (evento.key === "ArrowLeft") moverIzquierda();
  else if (evento.key === "ArrowUp") moverArriba();
  else if (evento.key === "ArrowDown") moverAbajo();
  else if (evento.key === " " || evento.code === "Space") parar();
});

// BOTONES TÁCTILES PARA CELULAR
document.getElementById("btnArriba")?.addEventListener("click", moverArriba);
document.getElementById("btnAbajo")?.addEventListener("click", moverAbajo);
document.getElementById("btnIzquierda")?.addEventListener("click", moverIzquierda);
document.getElementById("btnDerecha")?.addEventListener("click", moverDerecha);
document.getElementById("btnParar")?.addEventListener("click", parar);

// BOTÓN REINICIAR
btnReiniciar?.addEventListener("click", iniciarJuego);

// FIREBASE: LEER Y GUARDAR SIN REPETIR DISPOSITIVO
async function obtenerPuntajes() {
  tablaPuntajes.innerHTML = "<tr><td colspan='3'>Cargando ranking...</td></tr>";
  try {
    const q = query(puntajesRef, orderBy("puntos", "desc"));
    const querySnapshot = await getDocs(q);
    tablaPuntajes.innerHTML = "";

    let posicion = 1;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      // Guardar mi propio récord si este documento es de mi dispositivo
      if (docSnap.id === dispositivoID) {
        miRecordActual = data.puntos || 0;
        if (!nombreJugador.value && data.nombre) {
          nombreJugador.value = data.nombre; // Recordar su último nombre usado
        }
      }

      // Solo mostrar los primeros 5 en la tabla
      if (posicion <= 5) {
        const fila = document.createElement("tr");
        fila.innerHTML = `
          <td>${posicion}</td>
          <td>${data.nombre}</td>
          <td>${data.puntos}</td>
        `;
        tablaPuntajes.appendChild(fila);
        posicion++;
      }
    });

    if (posicion === 1) {
      tablaPuntajes.innerHTML = "<tr><td colspan='3'>¡Sé el primero en la lista!</td></tr>";
    }
  } catch (error) {
    console.error("Error leyendo Firebase:", error);
  }
}

async function guardarPuntuacion() {
  const nombre = nombreJugador.value.trim() || "Anónimo";
  btnGuardar.disabled = true;

  if (puntos <= miRecordActual) {
    alert(`Tu récord personal es de ${miRecordActual} pts. ¡Sigue intentando para superarlo!`);
    btnGuardar.disabled = false;
    gameOverPanel.classList.add("oculto");
    return;
  }

  try {
    await setDoc(doc(db, "puntajes", dispositivoID), {
      nombre: nombre,
      puntos: puntos,
      fecha: new Date()
    });
    
    miRecordActual = puntos;
    await obtenerPuntajes();
    gameOverPanel.classList.add("oculto");
  } catch (error) {
    console.error("Error guardando en Firebase:", error);
  } finally {
    btnGuardar.disabled = false;
  }
}

btnGuardar.addEventListener("click", guardarPuntuacion);

// BUCLE PRINCIPAL DE JUEGO
function actualizarJuego() {
  if (gameover) {
    if (intervaloSuperFruta) clearInterval(intervaloSuperFruta);

    ctx.fillStyle = "red";
    ctx.font = "30px Arial";
    ctx.fillText("GAME OVER", 110, 200);

    if (gameOverPanel.classList.contains("oculto")) {
      puntajeFinal.textContent = puntos;
      gameOverPanel.classList.remove("oculto");
    }
    return;
  }

  // REVISAR ESTADO MODO FIEBRE
  if (modoFiebre && Date.now() > tiempoFiebre) {
    modoFiebre = false;
  }

  // NIVEL ACTUAL Y AUMENTO DE VELOCIDAD (2.5% POR NIVEL)
  const nivel = Math.floor(puntos / 100);
  const factorVelocidad = Math.pow(1.025, nivel);
  let velFantasmaActual = velocidadBaseFantasma * factorVelocidad;

  // En modo fiebre los fantasmas van a mitad de velocidad
  if (modoFiebre) {
    velFantasmaActual *= 0.5;
  }

  // Mover Pac-Man
  x += vx;
  y += vy;

  // Paredes y bordes
  if (x > canvas.width) x = 0;
  else if (x < 0) x = canvas.width;
  
  if (y - radio < 0) {
    y = radio;
    vy = 0; 
  } else if (y + radio > canvas.height) {
    y = canvas.height - radio;
    vy = 0; 
  }

  // Comer comida normal
  if (comidaVisible) {
    const dx = x - comidaX;
    const dy = y - comidaY;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    if (distancia < radio + radioComida) {
      puntos += 10;
      comidaX = Math.floor(Math.random() * (canvas.width - 40)) + 20;
      comidaY = Math.floor(Math.random() * (canvas.height - 40)) + 20;    

      if (puntos % 50 === 0) {
        fantasmas.push({
          x: Math.floor(Math.random() * (canvas.width - 40)) + 20,
          y: Math.floor(Math.random() * (canvas.height - 40)) + 20
        });
      }
    }
  }

  // Comer Súper Fruta (+30 PTS + MODO FIEBRE)
  if (superComidaVisible) {
    const dxSuper = x - superComidaX;
    const dySuper = y - superComidaY;
    const distSuper = Math.sqrt(dxSuper * dxSuper + dySuper * dySuper);
    if (distSuper < radio + radioSuperComida) {
      puntos += 30;
      superComidaVisible = false;
      activarModoFiebre();
    }
  }

  // DIBUJAR PANTALLA
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Comida Normal
  if (comidaVisible) {
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(comidaX, comidaY, radioComida, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Súper Fruta (Brillante)
  if (superComidaVisible) {
    ctx.fillStyle = "#FFD700"; // Dorado
    ctx.beginPath();
    ctx.arc(superComidaX, superComidaY, radioSuperComida, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Fantasmas IA
  const paletaActual = paletasFantasmas[nivel % paletasFantasmas.length];

  fantasmas.forEach((f, idx) => {
    // MOVIMIENTO: Si está en modo Fiebre se alejan (escapan), si no lo persiguen
    if (modoFiebre) {
      if (f.x < x) f.x -= velFantasmaActual;
      if (f.x > x) f.x += velFantasmaActual;
      if (f.y < y) f.y -= velFantasmaActual;
      if (f.y > y) f.y += velFantasmaActual;

      // Mantener fantasmas dentro del canvas cuando escapan
      f.x = Math.max(radioFantasma, Math.min(canvas.width - radioFantasma, f.x));
      f.y = Math.max(radioFantasma, Math.min(canvas.height - radioFantasma, f.y));
    } else {
      if (f.x < x) f.x += velFantasmaActual;
      if (f.x > x) f.x -= velFantasmaActual;
      if (f.y < y) f.y += velFantasmaActual;
      if (f.y > y) f.y -= velFantasmaActual;
    }

    const dxFantasma = x - f.x;
    const dyFantasma = y - f.y;
    const distFantasma = Math.sqrt(dxFantasma * dxFantasma + dyFantasma * dyFantasma);
    
    // COLISIÓN Y COMER FANTASMAS
    if (distFantasma < radio + radioFantasma) {
      if (modoFiebre) {
        // Comer al fantasma: suma 10 puntos y respawnea lejos
        puntos += 10;
        f.x = Math.floor(Math.random() * (canvas.width - 40)) + 20;
        f.y = Math.floor(Math.random() * (canvas.height - 40)) + 20;
      } else {
        gameover = true;
      }
    }

    // Color del fantasma (Azul/Blanco asustado en modo fiebre)
    if (modoFiebre) {
      ctx.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? "#0000FF" : "#FFFFFF";
    } else {
      ctx.fillStyle = paletaActual[idx % paletaActual.length];
    }

    ctx.beginPath();
    ctx.arc(f.x, f.y, radioFantasma, 0, 2 * Math.PI);
    ctx.fill();
  });

  // Pac-Man (Color dinámico / Parpadeo Dorado en Modo Fiebre)
  if (modoFiebre) {
    ctx.fillStyle = Math.floor(Date.now() / 100) % 2 === 0 ? "#FFD700" : "#00FFFF";
  } else {
    ctx.fillStyle = coloresPacman[nivel % coloresPacman.length];
  }

  ctx.beginPath();
  ctx.arc(x, y, radio, 0.2 * Math.PI, 1.8 * Math.PI);
  ctx.lineTo(x, y);
  ctx.fill();

  // Puntuación e Indicadores HUD
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Puntos: " + puntos, 10, 25);
  ctx.fillText("Nivel: " + (nivel + 1), 120, 25);

  if (modoFiebre) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 14px Arial";
    ctx.fillText("¡MODO FIEBRE!", 210, 25);
  }

  animacionId = requestAnimationFrame(actualizarJuego);
}

// INICIAR
obtenerPuntajes();
iniciarJuego();