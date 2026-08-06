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

// SISTEMA DE TIENDA Y MONEDAS
let monedasTotales = parseInt(localStorage.getItem("pacman_monedas")) || 0;
let skinEquipada = localStorage.getItem("pacman_skin_equipada") || "clasico";
let skinsDesbloqueadas = JSON.parse(localStorage.getItem("pacman_skins_compradas")) || ["clasico"];

// CATÁLOGO DE SKINS
const CATALOGO_SKINS = {
  clasico: { nombre: "Clásico (Amarillo)", precio: 0, tipo: "color", valor: "#FFFF00" },
  rojo: { nombre: "Pac Rojo", precio: 100, tipo: "color", valor: "#FF0000" },
  neon: { nombre: "Pac Neón", precio: 200, tipo: "color", valor: "#00FFCC" },
  futbol: { nombre: "Pelota de Fútbol", precio: 500, tipo: "dibujo", id: "futbol" },
  sol: { nombre: "Sol Brillante", precio: 700, tipo: "dibujo", id: "sol" },
  luna: { nombre: "Luna", precio: 700, tipo: "dibujo", id: "luna" },
  sushi: { nombre: "Roll de Sushi", precio: 1000, tipo: "dibujo", id: "sushi" },
  hamburguesa: { nombre: "Hamburguesa", precio: 1200, tipo: "dibujo", id: "hamburguesa" },
  argentina: { nombre: "Bandera Argentina", precio: 1500, tipo: "dibujo", id: "argentina" }
};

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
let miRecordActual = 0;

// VARIABLES MODO FIEBRE Y SÚPER FRUTA
let superComidaX = -100, superComidaY = -100, superComidaVisible = false;
let modoFiebre = false;
let tiempoFiebre = 0;
let intervaloSuperFruta;

const paletasFantasmas = [
  ["#FF0000", "#FFB8FF", "#00FFFF", "#FFB852"],
  ["#9900FF", "#00FF00", "#FF00AA", "#0099FF"],
  ["#FF5722", "#E91E63", "#00BCD4", "#8BC34A"],
  ["#E6EE9C", "#FFAB91", "#CE93D8", "#80CBC4"]
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
  vx = 0;
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
  tiempoFiebre = Date.now() + 5000;
}

// FUNCIONES DE CONTROL DE MOVIMIENTO
function moverArriba() { vx = 0; vy = -velocidad; }
function moverAbajo() { vx = 0; vy = velocidad; }
function moverIzquierda() { vx = -velocidad; vy = 0; }
function moverDerecha() { vx = velocidad; vy = 0; }
function parar() { vx = 0; vy = 0; }

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

document.getElementById("btnArriba")?.addEventListener("click", moverArriba);
document.getElementById("btnAbajo")?.addEventListener("click", moverAbajo);
document.getElementById("btnIzquierda")?.addEventListener("click", moverIzquierda);
document.getElementById("btnDerecha")?.addEventListener("click", moverDerecha);
document.getElementById("btnParar")?.addEventListener("click", parar);

btnReiniciar?.addEventListener("click", iniciarJuego);

// FIREBASE: LEER Y GUARDAR
async function obtenerPuntajes() {
  tablaPuntajes.innerHTML = "<tr><td colspan='3'>Cargando ranking...</td></tr>";
  try {
    const q = query(puntajesRef, orderBy("puntos", "desc"));
    const querySnapshot = await getDocs(q);
    tablaPuntajes.innerHTML = "";

    let posicion = 1;
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();

      if (docSnap.id === dispositivoID) {
        miRecordActual = data.puntos || 0;
        if (!nombreJugador.value && data.nombre) {
          nombreJugador.value = data.nombre;
        }
      }

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

// FUNCIÓN PARA DIBUJAR SKINS PERSONALIZADAS EN PAC-MAN
function dibujarSkinPacman(px, py, radioSkin, skinKey) {
  const skin = CATALOGO_SKINS[skinKey] || CATALOGO_SKINS.clasico;

  ctx.save();
  ctx.translate(px, py);

  if (skin.tipo === "color") {
    ctx.fillStyle = skin.valor;
    ctx.beginPath();
    ctx.arc(0, 0, radioSkin, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(0, 0);
    ctx.fill();
  } else {
    // Dibujo base circular
    ctx.beginPath();
    ctx.arc(0, 0, radioSkin, 0, 2 * Math.PI);
    ctx.clip(); // Recorta los dibujos dentro del círculo

    switch (skin.id) {
      case "futbol":
        ctx.fillStyle = "#FFFFFF";
        ctx.fill();
        ctx.fillStyle = "#000000";
        // Hexágonos / manchas de pelota
        ctx.beginPath();
        ctx.arc(0, 0, radioSkin * 0.4, 0, 2 * Math.PI);
        ctx.arc(-radioSkin * 0.7, -radioSkin * 0.5, radioSkin * 0.3, 0, 2 * Math.PI);
        ctx.arc(radioSkin * 0.7, radioSkin * 0.5, radioSkin * 0.3, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case "sol":
        ctx.fillStyle = "#FFCC00";
        ctx.fill();
        ctx.fillStyle = "#FF6600";
        ctx.beginPath();
        ctx.arc(0, 0, radioSkin * 0.5, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case "luna":
        ctx.fillStyle = "#DDDDDD";
        ctx.fill();
        ctx.fillStyle = "#AAAAAA"; // Cráteres
        ctx.beginPath();
        ctx.arc(-5, -5, 4, 0, 2 * Math.PI);
        ctx.arc(6, 4, 3, 0, 2 * Math.PI);
        ctx.arc(-2, 7, 2, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case "sushi":
        ctx.fillStyle = "#113311"; // Nori (Alga)
        ctx.fill();
        ctx.fillStyle = "#FFFFFF"; // Arroz
        ctx.beginPath();
        ctx.arc(0, 0, radioSkin * 0.7, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "#FF5533"; // Salmón centro
        ctx.beginPath();
        ctx.arc(0, 0, radioSkin * 0.35, 0, 2 * Math.PI);
        ctx.fill();
        break;

      case "hamburguesa":
        ctx.fillStyle = "#C68A4C"; // Pan inferior
        ctx.fill();
        ctx.fillStyle = "#502800"; // Carne
        ctx.fillRect(-radioSkin, -3, radioSkin * 2, 6);
        ctx.fillStyle = "#FFCC00"; // Queso
        ctx.fillRect(-radioSkin, 3, radioSkin * 2, 3);
        ctx.fillStyle = "#E53935"; // Tomate
        ctx.fillRect(-radioSkin, -7, radioSkin * 2, 4);
        break;

      case "argentina":
        ctx.fillStyle = "#75AADB"; // Celeste arriba
        ctx.fillRect(-radioSkin, -radioSkin, radioSkin * 2, radioSkin * 0.66);
        ctx.fillStyle = "#FFFFFF"; // Blanco centro
        ctx.fillRect(-radioSkin, -radioSkin * 0.33, radioSkin * 2, radioSkin * 0.66);
        ctx.fillStyle = "#75AADB"; // Celeste abajo
        ctx.fillRect(-radioSkin, radioSkin * 0.33, radioSkin * 2, radioSkin * 0.66);
        // Sol de mayo centro
        ctx.fillStyle = "#FDB913";
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.fill();
        break;
    }
  }

  ctx.restore();
}

// FUNCIONES DE LA TIENDA (Para llamar desde la consola o interfaz)
window.comprarSkin = function(keySkin) {
  const skin = CATALOGO_SKINS[keySkin];
  if (!skin) return alert("La skin no existe.");
  if (skinsDesbloqueadas.includes(keySkin)) return alert("¡Ya tenés esta skin!");

  if (monedasTotales >= skin.precio) {
    monedasTotales -= skin.precio;
    skinsDesbloqueadas.push(keySkin);
    skinEquipada = keySkin;

    localStorage.setItem("pacman_monedas", monedasTotales);
    localStorage.setItem("pacman_skins_compradas", JSON.stringify(skinsDesbloqueadas));
    localStorage.setItem("pacman_skin_equipada", skinEquipada);

    alert(`¡Compraste y equipaste la skin ${skin.nombre}!`);
  } else {
    alert(`Te faltan ${skin.precio - monedasTotales} puntos/monedas para esta skin.`);
  }
};

window.equiparSkin = function(keySkin) {
  if (skinsDesbloqueadas.includes(keySkin)) {
    skinEquipada = keySkin;
    localStorage.setItem("pacman_skin_equipada", skinEquipada);
    alert(`Skin equipada: ${CATALOGO_SKINS[keySkin].nombre}`);
  } else {
    alert("Primero tenés que comprar esta skin.");
  }
};

// BUCLE PRINCIPAL DE JUEGO
function actualizarJuego() {
  if (gameover) {
    if (intervaloSuperFruta) clearInterval(intervaloSuperFruta);

    // Sumar los puntos obtenidos a las monedas totales guardadas
    monedasTotales += puntos;
    localStorage.setItem("pacman_monedas", monedasTotales);

    ctx.fillStyle = "red";
    ctx.font = "30px Arial";
    ctx.fillText("GAME OVER", 110, 200);

    if (gameOverPanel.classList.contains("oculto")) {
      puntajeFinal.textContent = puntos;
      gameOverPanel.classList.remove("oculto");
    }
    return;
  }

  if (modoFiebre && Date.now() > tiempoFiebre) {
    modoFiebre = false;
  }

  const nivel = Math.floor(puntos / 100);
  const factorVelocidad = Math.pow(1.025, nivel);
  let velFantasmaActual = velocidadBaseFantasma * factorVelocidad;

  if (modoFiebre) {
    velFantasmaActual *= 0.5;
  }

  x += vx;
  y += vy;

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

  // Comer Súper Fruta (+30 PTS)
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

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (comidaVisible) {
    ctx.fillStyle = "green";
    ctx.beginPath();
    ctx.arc(comidaX, comidaY, radioComida, 0, 2 * Math.PI);
    ctx.fill();
  }

  if (superComidaVisible) {
    ctx.fillStyle = "#FFD700";
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
    if (modoFiebre) {
      if (f.x < x) f.x -= velFantasmaActual;
      if (f.x > x) f.x += velFantasmaActual;
      if (f.y < y) f.y -= velFantasmaActual;
      if (f.y > y) f.y += velFantasmaActual;

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
    
    if (distFantasma < radio + radioFantasma) {
      if (modoFiebre) {
        puntos += 10;
        f.x = Math.floor(Math.random() * (canvas.width - 40)) + 20;
        f.y = Math.floor(Math.random() * (canvas.height - 40)) + 20;
      } else {
        gameover = true;
      }
    }

    if (modoFiebre) {
      ctx.fillStyle = Math.floor(Date.now() / 200) % 2 === 0 ? "#0000FF" : "#FFFFFF";
    } else {
      ctx.fillStyle = paletaActual[idx % paletaActual.length];
    }

    ctx.beginPath();
    ctx.arc(f.x, f.y, radioFantasma, 0, 2 * Math.PI);
    ctx.fill();
  });

  // PAC-MAN (DIBUJAR SKIN EQUIPADA)
  if (modoFiebre) {
    ctx.fillStyle = Math.floor(Date.now() / 100) % 2 === 0 ? "#FFD700" : "#00FFFF";
    ctx.beginPath();
    ctx.arc(x, y, radio, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(x, y);
    ctx.fill();
  } else {
    dibujarSkinPacman(x, y, radio, skinEquipada);
  }

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("Puntos: " + puntos, 10, 25);
  ctx.fillText("Monedas: " + (monedasTotales + puntos), 120, 25);

  if (modoFiebre) {
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 14px Arial";
    ctx.fillText("¡MODO FIEBRE!", 250, 25);
  }

  animacionId = requestAnimationFrame(actualizarJuego);
}
// CONTROL DE LA TIENDA UI
const modalTienda = document.getElementById("modalTienda");
const btnAbrirTienda = document.getElementById("btnAbrirTienda");
const btnCerrarTienda = document.getElementById("btnCerrarTienda");
const catalogoContenedor = document.getElementById("catalogoContenedor");
const monedasTienda = document.getElementById("monedasTienda");

function renderizarTienda() {
  monedasTienda.textContent = monedasTotales;
  catalogoContenedor.innerHTML = "";

  Object.keys(CATALOGO_SKINS).forEach((key) => {
    const skin = CATALOGO_SKINS[key];
    const comprada = skinsDesbloqueadas.includes(key);
    const equipada = skinEquipada === key;

    const card = document.createElement("div");
    card.className = `card-skin ${equipada ? "equipada" : ""}`;

    let botonTexto = "";
    let botonClase = "";
    let accion = null;

    if (equipada) {
      botonTexto = "Equipada";
      botonClase = "btn-equipar";
    } else if (comprada) {
      botonTexto = "Equipar";
      botonClase = "btn-equipar";
      accion = () => {
        equiparSkin(key);
        renderizarTienda();
      };
    } else {
      botonTexto = `${skin.precio} 🪙`;
      botonClase = "btn-comprar";
      accion = () => {
        comprarSkin(key);
        renderizarTienda();
      };
    }

    card.innerHTML = `
      <strong>${skin.nombre}</strong>
      <button class="${botonClase}" ${equipada ? "disabled" : ""}>${botonTexto}</button>
    `;

    if (accion && !equipada) {
      card.querySelector("button").addEventListener("click", accion);
    }

    catalogoContenedor.appendChild(card);
  });
}

btnAbrirTienda?.addEventListener("click", () => {
  renderizarTienda();
  modalTienda.classList.remove("oculto");
});

btnCerrarTienda?.addEventListener("click", () => {
  modalTienda.classList.add("oculto");
});

// INICIAR
obtenerPuntajes();
iniciarJuego();