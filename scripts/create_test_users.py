import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'electrodesign_db')

async def create_test_users():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Usuarios de prueba
    test_users = [
        {
            "email": "test@electrodesign.com",
            "password": "test123",
            "name": "Usuario de Prueba",
            "role": "user"
        },
        {
            "email": "demo@electricidad.com",
            "password": "demo123",
            "name": "Usuario Demo",
            "role": "user"
        },
        {
            "email": "admin@electrodesign.com",
            "password": "admin123",
            "name": "Administrador",
            "role": "admin"
        }
    ]
    
    for user_data in test_users:
        # Verificar si el usuario ya existe
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            print(f"⚠️  Usuario {user_data['email']} ya existe, actualizando...")
            user_id = existing["id"]
            # Actualizar contraseña
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(user_data["password"].encode('utf-8'), salt)
            await db.users.update_one(
                {"email": user_data["email"]},
                {"$set": {"password": hashed.decode('utf-8')}}
            )
        else:
            # Crear nuevo usuario
            user_id = str(uuid.uuid4())
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(user_data["password"].encode('utf-8'), salt)
            
            user_doc = {
                "id": user_id,
                "email": user_data["email"],
                "password": hashed.decode('utf-8'),
                "name": user_data["name"],
                "role": user_data["role"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.users.insert_one(user_doc)
            print(f"✓ Usuario creado: {user_data['email']}")
        
        # Crear licencia de prueba (solo para usuarios no admin)
        if user_data["role"] != "admin":
            # Eliminar licencias antiguas
            await db.licenses.delete_many({"user_id": user_id})
            
            # Generar clave de licencia
            import secrets
            import hashlib
            random_str = f"{user_id}-{datetime.now(timezone.utc).isoformat()}-{secrets.token_hex(8)}"
            license_key = hashlib.sha256(random_str.encode()).hexdigest()[:32].upper()
            license_key = "-".join([license_key[i:i+4] for i in range(0, len(license_key), 4)])
            
            # Crear licencia de prueba (30 días)
            license_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "plan_type": "basic",
                "license_key": license_key,
                "start_date": datetime.now(timezone.utc).isoformat(),
                "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(),
                "is_active": True,
                "payment_id": "TEST-DEMO-LICENSE",
                "amount_paid": 0.0,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.licenses.insert_one(license_doc)
            print(f"  ✓ Licencia de prueba creada (30 días) para {user_data['email']}")
            print(f"    Clave: {license_key}")
    
    print("\n" + "="*60)
    print("CREDENCIALES DE ACCESO:")
    print("="*60)
    for user_data in test_users:
        print(f"\n{user_data['name']}:")
        print(f"  Email: {user_data['email']}")
        print(f"  Contraseña: {user_data['password']}")
        print(f"  Rol: {user_data['role']}")
    print("\n" + "="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_users())
