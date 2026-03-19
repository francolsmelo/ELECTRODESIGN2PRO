import asyncio
import sys
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Sample materials data based on the user's files
materials_data = [
    {"id": "1", "item": "LOSETA ANCLAJE", "description": "Loseta de anclaje para poste", "unit": "c/u", "unit_price": 17.07, "category": "materiales"},
    {"id": "2", "item": "VARILLA ANCLAJE", "description": "Varilla de anclaje 5/8\" x 1.8m", "unit": "c/u", "unit_price": 11.42, "category": "materiales"},
    {"id": "3", "item": "AISLADOR SUSPENSION", "description": "Aislador polímero tipo suspensión NEMA 52-1", "unit": "c/u", "unit_price": 10.05, "category": "materiales"},
    {"id": "4", "item": "TRANSFORMADOR 50KVA", "description": "Transformador trifásico 50 kVA 13.8/0.22 kV", "unit": "c/u", "unit_price": 7500.00, "category": "equipos"},
    {"id": "5", "item": "TRANSFORMADOR 75KVA", "description": "Transformador trifásico 75 kVA 13.8/0.22 kV", "unit": "c/u", "unit_price": 8200.00, "category": "equipos"},
    {"id": "6", "item": "TRANSFORMADOR 100KVA", "description": "Transformador trifásico 100 kVA 13.8/0.22 kV", "unit": "c/u", "unit_price": 8900.00, "category": "equipos"},
    {"id": "7", "item": "TRANSFORMADOR 150KVA", "description": "Transformador trifásico 150 kVA 13.8/0.22 kV", "unit": "c/u", "unit_price": 9500.00, "category": "equipos"},
    {"id": "8", "item": "CABLE TTU 2/0", "description": "Cable TTU (Triplex) 2/0 AWG", "unit": "m", "unit_price": 13.50, "category": "materiales"},
    {"id": "9", "item": "CABLE TTU 4/0", "description": "Cable TTU (Triplex) 4/0 AWG", "unit": "m", "unit_price": 18.20, "category": "materiales"},
    {"id": "10", "item": "POSTE HORMIGON 12m", "description": "Poste de hormigón armado 12m - 510 kg", "unit": "c/u", "unit_price": 380.00, "category": "materiales"},
]

conductors_data = [
    {"id": "1", "conductor_type": "TTU 2/0 AWG", "size": "2/0", "phases": 3, "fcv": 1.05, "kva_m": 120.0},
    {"id": "2", "conductor_type": "TTU 4/0 AWG", "size": "4/0", "phases": 3, "fcv": 0.85, "kva_m": 180.0},
    {"id": "3", "conductor_type": "ACSR 2 AWG", "size": "2", "phases": 3, "fcv": 1.20, "kva_m": 100.0},
    {"id": "4", "conductor_type": "ACSR 1/0 AWG", "size": "1/0", "phases": 3, "fcv": 0.95, "kva_m": 140.0},
]

async def seed_database():
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    # Clear existing data
    await db.materials.delete_many({})
    await db.conductors.delete_many({})
    
    # Insert materials
    await db.materials.insert_many(materials_data)
    print(f"✓ Insertados {len(materials_data)} materiales")
    
    # Insert conductors
    await db.conductors.insert_many(conductors_data)
    print(f"✓ Insertados {len(conductors_data)} conductores")
    
    client.close()
    print("✓ Base de datos inicializada correctamente")

if __name__ == "__main__":
    asyncio.run(seed_database())
