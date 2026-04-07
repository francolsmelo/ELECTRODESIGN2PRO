import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path

# Agregar el directorio backend al path
sys.path.append(str(Path(__file__).parent.parent / 'backend'))
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

# Nuevos conductores con FCV actualizados según las especificaciones del usuario
# FCV EN kVA-m PARA EL 1% DE CAÍDA DE VOLTAJE

conductors_data = [
    # CONDUCTOR: ACSR BV (120V 2 hilos)
    {"id": "acsr_bv_6_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "6 AWG", "phases": 2, "fcv_kva_m": 31, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_4_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "4 AWG", "phases": 2, "fcv_kva_m": 47, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_2_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "2 AWG", "phases": 2, "fcv_kva_m": 71, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_1/0_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "1/0 AWG", "phases": 2, "fcv_kva_m": 103, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_2/0_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "2/0 AWG", "phases": 2, "fcv_kva_m": 123, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_3/0_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "3/0 AWG", "phases": 2, "fcv_kva_m": 146, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_4/0_120_2h", "conductor_type": "ACSR BV", "voltage_system": "120V 2 hilos", "size": "4/0 AWG", "phases": 2, "fcv_kva_m": 171, "resistance_temp": "50°C", "power_factor": 0.90},
    
    # CONDUCTOR: ACSR BV (240V 3 hilos)
    {"id": "acsr_bv_6_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "6 AWG", "phases": 3, "fcv_kva_m": 124, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_4_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "4 AWG", "phases": 3, "fcv_kva_m": 189, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_2_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "2 AWG", "phases": 3, "fcv_kva_m": 283, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_1/0_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "1/0 AWG", "phases": 3, "fcv_kva_m": 413, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_2/0_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "2/0 AWG", "phases": 3, "fcv_kva_m": 493, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_3/0_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "3/0 AWG", "phases": 3, "fcv_kva_m": 583, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_4/0_240_3h", "conductor_type": "ACSR BV", "voltage_system": "240V 3 hilos", "size": "4/0 AWG", "phases": 3, "fcv_kva_m": 684, "resistance_temp": "50°C", "power_factor": 0.90},
    
    # CONDUCTOR: ACSR BV (220V 4 hilos)
    {"id": "acsr_bv_6_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "6 AWG", "phases": 4, "fcv_kva_m": 208, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_4_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "4 AWG", "phases": 4, "fcv_kva_m": 316, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_2_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "2 AWG", "phases": 4, "fcv_kva_m": 472, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_1/0_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "1/0 AWG", "phases": 4, "fcv_kva_m": 686, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_2/0_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "2/0 AWG", "phases": 4, "fcv_kva_m": 817, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_3/0_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "3/0 AWG", "phases": 4, "fcv_kva_m": 964, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "acsr_bv_4/0_220_4h", "conductor_type": "ACSR BV", "voltage_system": "220V 4 hilos", "size": "4/0 AWG", "phases": 4, "fcv_kva_m": 1128, "resistance_temp": "50°C", "power_factor": 0.90},
    
    # CONDUCTOR: PREENSAMBLADOS BV (240/120V 3 hilos)
    {"id": "preens_bv_2_240_3h", "conductor_type": "Preensamblados BV", "voltage_system": "240/120V 3 hilos", "size": "2 AWG 2x35(35) mm²", "phases": 3, "fcv_kva_m": 311, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "preens_bv_1/0_240_3h", "conductor_type": "Preensamblados BV", "voltage_system": "240/120V 3 hilos", "size": "1/0 AWG 2x50(50) mm²", "phases": 3, "fcv_kva_m": 416, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "preens_bv_2/0_240_3h", "conductor_type": "Preensamblados BV", "voltage_system": "240/120V 3 hilos", "size": "2/0 AWG 2x70(70) mm²", "phases": 3, "fcv_kva_m": 584, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "preens_bv_3/0_240_3h", "conductor_type": "Preensamblados BV", "voltage_system": "240/120V 3 hilos", "size": "3/0 AWG 2x95(95) mm²", "phases": 3, "fcv_kva_m": 781, "resistance_temp": "50°C", "power_factor": 0.90},
    
    # CONDUCTOR: PREENSAMBLADOS BV (220/127V 4 hilos)
    {"id": "preens_bv_2_220_4h", "conductor_type": "Preensamblados BV", "voltage_system": "220/127V 4 hilos", "size": "2 AWG 3x35(35) mm²", "phases": 4, "fcv_kva_m": 523, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "preens_bv_1/0_220_4h", "conductor_type": "Preensamblados BV", "voltage_system": "220/127V 4 hilos", "size": "1/0 AWG 3x50(50) mm²", "phases": 4, "fcv_kva_m": 699, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "preens_bv_2/0_220_4h", "conductor_type": "Preensamblados BV", "voltage_system": "220/127V 4 hilos", "size": "2/0 AWG 3x70(70) mm²", "phases": 4, "fcv_kva_m": 981, "resistance_temp": "50°C", "power_factor": 0.90},
    {"id": "preens_bv_3/0_220_4h", "conductor_type": "Preensamblados BV", "voltage_system": "220/127V 4 hilos", "size": "3/0 AWG 3x95(95) mm²", "phases": 4, "fcv_kva_m": 1312, "resistance_temp": "50°C", "power_factor": 0.90},
]

async def update_conductors():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'electrodesign_db')]
    
    # Clear existing conductors
    await db.conductors.delete_many({})
    print("✓ Conductores antiguos eliminados")
    
    # Insert new conductors
    await db.conductors.insert_many(conductors_data)
    print(f"✓ Insertados {len(conductors_data)} conductores nuevos con FCV actualizados")
    
    # Verify insertion
    count = await db.conductors.count_documents({})
    print(f"✓ Total de conductores en base de datos: {count}")
    
    client.close()
    print("✓ Actualización de conductores completada")

if __name__ == "__main__":
    asyncio.run(update_conductors())
