import requests
import time
import argparse
import sys

# --- CONFIGURACIÓN ---
BASE_URL = "http://localhost:3000"

# --- LISTA DE CONFIGURACIONES VÁLIDAS ---
POSIBLES_CONFIGURACIONES = [
    {"year": 2023, "round": 1, "driverId": 14, "circuitName": "Bahrain - Sakhir"},
    {"year": 2023, "round": 2, "driverId": 1, "circuitName": "Saudi Arabia - Jeddah"},
    {"year": 2023, "round": 5, "driverId": 55, "circuitName": "Miami - Miami Gardens"},
    {"year": 2023, "round": 7, "driverId": 44, "circuitName": "Monaco - Monte Carlo"},
    {"year": 2023, "round": 22, "driverId": 16, "circuitName": "Las Vegas - Las Vegas Strip"},
    {"year": 2024, "round": 1, "driverId": 14, "circuitName": "Bahrain - Sakhir"},
]

def login(username, password):
    """Obtiene el Token JWT"""
    try:
        res = requests.post(f"{BASE_URL}/user/login", json={"username": username, "password": password})
        if res.status_code == 200:
            print(f"✅ Login correcto. Token recibido.")
            return res.json().get("token")
        else:
            print(f"❌ Error Login ({res.status_code}): {res.text}")
            return None
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return None

def run_injector(user, password, delay):
    # 1. Autenticación
    token = login(user, password)
    if not token: sys.exit(1)

    headers = {'Authorization': f'Bearer {token}'}
    total = len(POSIBLES_CONFIGURACIONES)

    print(f"\n Iniciando...")
    print("-" * 50)

    # 2. Bucle Finito (Recorre la lista una sola vez)
    for i, payload in enumerate(POSIBLES_CONFIGURACIONES, 1):
        
        try:
            # Enviamos la petición POST
            res = requests.post(
                f"{BASE_URL}/interactive_favs/add", 
                json=payload, 
                headers=headers
            )

            # Analizamos la respuesta
            info_str = f"{payload['year']} {payload['circuitName']} (Piloto {payload['driverId']})"
            
            if res.status_code == 200:
                print(f"[{i}/{total}] 💾 Insertado: {info_str}")
            elif res.status_code == 409:
                print(f"[{i}/{total}] ⚠️ Ya existe: {info_str}")
            else:
                print(f"[{i}/{total}] ❌ Fallo ({res.status_code}): {info_str}")

        except Exception as e:
            print(f"[{i}/{total}] ❌ Error de red: {e}")

        # Espera entre peticiones (para que se vea el proceso)
        time.sleep(delay)

    print("-" * 50)
    print("✅ Proceso finalizado. Se ha recorrido toda la lista.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--user', required=True, help='Usuario registrado')
    parser.add_argument('--passw', required=True, help='Contraseña')
    parser.add_argument('--delay', type=float, default=1.0, help='Segundos entre inserts')
    
    args = parser.parse_args()
    run_injector(args.user, args.passw, args.delay)