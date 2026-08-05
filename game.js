// IMPORTAR FIREBASE DESDE LA NUBE
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// EL PACOMAN 
let x = 200;
let y = 200;
const radio = 20;
const velocidad = 3;

let vx = 0; 
let vy = 0; 

// LOS MALOS (Nombres de variables corregidos)
const radioFantasma = 18;
const velocidadFantasma = 1.5;
let gameover = false;

let fantasmas = [
  { x: 50, y: 50 }
];

// EL MORFI 
let comidaX = 300;
let comidaY = 200; 
const radioComida = 6; 
let comidaVisible = true; 
let puntos = 0; 

// BASE DE DATOS EN LA NUBE
const gameOverPanel = document.getElementById("gameOverPanel");
const puntajeFinal = document.getElementById("puntajeFinal");
const nombreJugador = document.getElementById("nombreJugador");
const btnGuardar = document.getElementById("btnGuardar");
const tablaPuntajes = document.getElementById("tablaPuntajes");

window.addEventListener("keydown", (evento) => {
  if (evento.key === "ArrowRight") {
    vx = velocidad;
    vy = 0;
  } else if (evento.key === "ArrowLeft") {
    vx = -velocidad;
    vy = 0;
  } else if (evento.key === "ArrowUp") {
    vx = 0;
    vy = -velocidad;
  } else if (evento.key === "ArrowDown") {
    vx = 0;
    vy = velocidad;
  }
});

// BASE DE DATOS EN LA NUBE
async function obtenerPuntajes() {
  tablaPuntajes.innerHTML = "<tr><td colspan='3'>Cargando ranking global...</td></tr>";
  try {
    const q = query(puntajesRef, orderBy("puntos", "desc"), limit(5));
    const querySnapshot = await getDocs(q);
    tablaPuntajes.innerHTML = "";

    let posicion = 1;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const fila = document.createElement("tr");
      fila.innerHTML = `
        <td>${posicion}</td>
        <td>${data.nombre}</td>
        <td>${data.puntos}</td>
      `;
      tablaPuntajes.appendChild(fila);
      posicion++;
    });
  } catch (error) {
    console.error("Error leyendo Firebase:", error);
  }
}

async function guardarPuntuacion() {
  const nombre = nombreJugador.value.trim() || "Anónimo";
  btnGuardar.disabled = true;

  try {
    await addDoc(puntajesRef, {
      nombre: nombre,
      puntos: puntos,
      fecha: new Date()
    });
    
    await obtenerPuntajes();
    gameOverPanel.classList.add("oculto");
    nombreJugador.value = "";
  } catch (error) {
    console.error("Error guardando en Firebase:", error);
  } finally {
    btnGuardar.disabled = false;
  }
}

btnGuardar.addEventListener("click", guardarPuntuacion);

function actualizarJuego() {
  // Si perdimos, mostramos Game Over
  if (gameover) {
    ctx.fillStyle = "red";
    ctx.font = "30px Arial";
    ctx.fillText("GAME OVER", 110, 200);

    // BASE DE DATOS EN LA NUBE
    if (gameOverPanel.classList.contains("oculto")) {
      puntajeFinal.textContent = puntos;
      gameOverPanel.classList.remove("oculto");
    }
    return;
  }

  // Mover Paco Man
  x += vx;
  y += vy;

  // Condiciones de bordes de Pako Man 
  if (x > canvas.width) {
    x = 0; 
  } else if (x < 0) {
    x = canvas.width; 
  }
  if (y - radio < 0) {
    y = radio;
    vy = 0; 
  } else if (y + radio > canvas.height) {
    y = canvas.height - radio;
    vy = 0; 
  }

  // Comer el Morfi
  if (comidaVisible) {
    const dx = x - comidaX;
    const dy = y - comidaY;
    const distancia = Math.sqrt(dx * dx + dy * dy);
    if (distancia < radio + radioComida) {
      puntos += 10;
      console.log("Vas sumando", puntos);
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

  // DIBUJAR TODO EN PANTALLA
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Morfi
  if (comidaVisible) {
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(comidaX, comidaY, radioComida, 0, 2 * Math.PI);
    ctx.fill();
  }

  // MALO
  fantasmas.forEach((f) => {
    // 2. IA persiguiendo al PacoMan
    if (f.x < x) f.x += velocidadFantasma;
    if (f.x > x) f.x -= velocidadFantasma;
    if (f.y < y) f.y += velocidadFantasma;
    if (f.y > y) f.y -= velocidadFantasma;

    // Morir con el Fantasma
    const dxFantasma = x - f.x;
    const dyFantasma = y - f.y;
    const distFantasma = Math.sqrt(dxFantasma * dxFantasma + dyFantasma * dyFantasma);
    if (distFantasma < radio + radioFantasma) {
      gameover = true;
    }

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(f.x, f.y, radioFantasma, 0, 2 * Math.PI);
    ctx.fill();
  });

  // PAKO
  ctx.fillStyle = "yellow";
  ctx.beginPath();
  ctx.arc(x, y, radio, 0.2 * Math.PI, 1.8 * Math.PI);
  ctx.lineTo(x, y);
  ctx.fill();

  // POINT
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Puntos: " + puntos, 10, 25);

  requestAnimationFrame(actualizarJuego);
}

// BASE DE DATOS EN LA NUBE
obtenerPuntajes();
actualizarJuego();