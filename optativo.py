import requests
import time
import random
import argparse
import string
import json

# --- CONFIGURACIÓN DE COLORES PARA CONSOLA ---
class Colors:
    HEADER = '\033[95m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# --- DATOS DE PRUEBA (MOCK DATA) ---
# Usamos esto para simular selecciones reales de usuarios
POSIBLES_CONFIGURACIONES = [
    {"year": 2023, "round": 1, "driverId": 14, "circuitName": "Bahrain - Sakhir"},
    {"year": 2023, "round": 2, "driverId": 1, "circuitName": "Saudi Arabia - Jeddah"},
    {"year": 2023, "round": 5, "driverId": 55, "circuitName": "Miami - Miami Gardens"},
    {"year": 2023, "round": 7, "driverId": 44, "circuitName": "Monaco - Monte Carlo"},
    {"year": 2023, "round": 22, "driverId": 16, "circuitName": "Las Vegas - Las Vegas Strip"},
    {"year": 2024, "round": 1, "driverId": 14, "circuitName": "Bahrain - Sakhir"},
]

class F1UserBot:
    def __init__(self, base_url, username=None, password=None):
        self.base_url = base_url
        self.session = requests.Session() # Mantiene cookies si fuera necesario
        self.token = None
        
        # Si no dan usuario, generamos uno aleatorio
        if not username:
            rand_suffix = ''.join(random.choices(string.digits, k=4))
            self.username = f"bot_tester_{rand_suffix}"
            self.password = "bot1234"
            self.auto_generated = True
        else:
            self.username = username
            self.password = password
            self.auto_generated = False

    def log(self, message, color=Colors.ENDC):
        print(f"{color}[{self.username}] {message}{Colors.ENDC}")

    def register(self):
        """Intenta registrar el usuario en el sistema"""
        endpoint = f"{self.base_url}/user/register"
        try:
            self.log("Intentando registro...", Colors.HEADER)
            res = self.session.post(endpoint, json={"username": self.username, "password": self.password})
            
            if res.status_code == 201:
                self.log("✅ Usuario registrado correctamente", Colors.OKGREEN)
                return True
            elif res.status_code == 409:
                self.log("⚠️ El usuario ya existe, pasamos a login", Colors.WARNING)
                return True
            else:
                self.log(f"❌ Error registro: {res.text}", Colors.FAIL)
                return False
        except Exception as e:
            self.log(f"❌ Error conexión: {e}", Colors.FAIL)
            return False

    def login(self):
        """Se loguea y guarda el Token JWT"""
        endpoint = f"{self.base_url}/user/login"
        try:
            self.log("Iniciando sesión...", Colors.HEADER)
            res = self.session.post(endpoint, json={"username": self.username, "password": self.password})
            
            if res.status_code == 200:
                data = res.json()
                self.token = data.get("token")
                # Configuramos la cabecera para futuras peticiones
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                self.log("✅ Login exitoso. Token obtenido.", Colors.OKGREEN)
                return True
            else:
                self.log(f"❌ Error Login ({res.status_code}): {res.text}", Colors.FAIL)
                return False
        except Exception as e:
            self.log(f"❌ Error conexión: {e}", Colors.FAIL)
            return False

    def add_favorite(self, config):
        """Añade una configuración a favoritos"""
        endpoint = f"{self.base_url}/interactive_favs/add"
        
        # Convertimos los números a string o int según espere tu backend (normalmente JSON aguanta int)
        payload = {
            "year": config['year'],
            "round": config['round'],
            "driverId": config['driverId'],
            "circuitName": config['circuitName']
        }
        
        try:
            res = self.session.post(endpoint, json=payload)
            if res.status_code == 200:
                self.log(f"❤️  Añadido a Favoritos: {config['circuitName']} (Driver {config['driverId']})", Colors.OKGREEN)
                return True
            elif res.status_code == 409:
                self.log(f"⚠️ Ya estaba en favoritos: {config['circuitName']}", Colors.WARNING)
                return True
            else:
                self.log(f"❌ Error al añadir favorito: {res.text}", Colors.FAIL)
                return False
        except Exception as e:
            self.log(f"❌ Error request: {e}", Colors.FAIL)

    def remove_favorite(self, config):
        """Borra una configuración de favoritos"""
        endpoint = f"{self.base_url}/interactive_favs/remove"
        
        payload = {
            "year": config['year'],
            "round": config['round'],
            "driverId": config['driverId']
        }
        
        try:
            res = self.session.post(endpoint, json=payload)
            if res.status_code == 200:
                self.log(f"💔 Eliminado de Favoritos: {config['circuitName']}", Colors.WARNING)
                return True
            else:
                self.log(f"❌ Error al eliminar: {res.text}", Colors.FAIL)
                return False
        except Exception as e:
            self.log(f"❌ Error request: {e}", Colors.FAIL)

    def get_favorites(self):
        """Consulta la lista actual de favoritos"""
        endpoint = f"{self.base_url}/interactive_favs/list"
        try:
            res = self.session.get(endpoint)
            if res.status_code == 200:
                lista = res.json().get('favorites', [])
                self.log(f"📋 El usuario tiene {len(lista)} favoritos guardados.", Colors.HEADER)
                return lista
            return []
        except Exception as e:
            return []

def run_simulation(base_url, iterations, delay, user, password):
    # 1. Instanciamos el Bot
    bot = F1UserBot(base_url, user, password)

    # 2. Flujo de Autenticación
    if not bot.register():
        return
    if not bot.login():
        return

    print("-" * 50)
    
    # 3. Bucle de comportamiento
    # Simula que el usuario entra, añade cosas, borra cosas, espera, vuelve a añadir...
    for i in range(iterations):
        print(f"\n🔁 {Colors.BOLD}Iteración {i+1}/{iterations}{Colors.ENDC}")
        
        # ACCIÓN A: Añadir 2 o 3 favoritos aleatorios
        num_to_add = random.randint(1, 3)
        configs_to_add = random.sample(POSIBLES_CONFIGURACIONES, num_to_add)
        
        for config in configs_to_add:
            bot.add_favorite(config)
            time.sleep(0.5) # Pequeña pausa "humana"

        # ACCIÓN B: Consultar lista
        current_favs = bot.get_favorites()
        
        # ACCIÓN C: Borrar algunos (si hay)
        if current_favs:
            # Borramos el primero de la lista para simular rotación
            # (Tu backend devuelve objetos con _id, pero para borrar necesitamos year/round/driverId)
            fav_to_delete = current_favs[0] 
            
            # Reconstruimos el objeto config necesario para el endpoint /remove
            config_for_remove = {
                "year": fav_to_delete['year'],
                "round": fav_to_delete['round'],
                "driverId": fav_to_delete['driverId'],
                "circuitName": fav_to_delete.get('circuitName', 'Desconocido')
            }
            
            # Simulamos que el usuario se lo piensa un poco antes de borrar
            time.sleep(delay) 
            bot.remove_favorite(config_for_remove)

        # Espera entre iteraciones (Simula que el usuario está viendo la carrera o navegando)
        time.sleep(delay)

    print(f"\n{Colors.OKGREEN}✅ Simulación de cliente finalizada.{Colors.ENDC}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Simulador de Comportamiento de Cliente F1')
    
    parser.add_argument('--url', type=str, default="http://localhost:3000", help='URL del Backend')
    parser.add_argument('--iter', type=int, default=3, help='Número de ciclos de añadir/borrar')
    parser.add_argument('--delay', type=float, default=2.0, help='Segundos de espera entre acciones')
    parser.add_argument('--user', type=str, help='Usuario (opcional, si no se genera uno)')
    parser.add_argument('--passw', type=str, help='Contraseña (opcional)')

    args = parser.parse_args()

    run_simulation(args.url, args.iter, args.delay, args.user, args.passw)