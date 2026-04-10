from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import base64
from openai import AsyncOpenAI
import secrets
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.environ.get('JWT_SECRET', 'electricalsystem2025securejwtsecret')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# PayPal Configuration
PAYPAL_CLIENT_ID = os.environ.get('PAYPAL_CLIENT_ID', 'AW4860yNCSpE-0k4z_aIUW_E-RZFrQxM8aYRgjCfEUTOTuh16U07wgmW6jwpSo8AQ3FIU4x5CPhqVTjW')
PAYPAL_SECRET = os.environ.get('PAYPAL_SECRET', 'EAttvam1khTZ62eINY-3K7W1aQXz7Xp0mwu3FDZZs9_URGqdMPVczCflYjepDKT_6NxXsqQ9MYhjv67X')
PAYPAL_MODE = os.environ.get('PAYPAL_MODE', 'sandbox')  # sandbox or live

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    role: str = "user"  # user, admin
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class License(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    plan_type: str  # free, basic, enterprise
    license_key: str
    start_date: datetime
    end_date: datetime
    is_active: bool = True
    payment_id: Optional[str] = None
    amount_paid: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_provider: str  # paypal, banco_pichincha
    app_name: str
    client_id: str
    client_secret: str
    access_token: Optional[str] = None
    environment: str = "sandbox"  # sandbox, production
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    location: str
    voltage_system: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    location: str
    voltage_system: str = "220/127V"

class InspectionAnalysis(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    image_data: str
    analysis_result: Dict[str, Any]
    drawings: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DemandCalculation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    lighting_loads: List[Dict[str, Any]]
    special_loads: List[Dict[str, Any]]
    subtotal_1: float
    subtotal_2: float
    total_installed: float
    demand_factor: float
    demand_kw: float
    demand_kva: float
    transformer_capacity: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VoltageDrop(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    circuit_type: str
    segments: List[Dict[str, Any]]
    total_drop: float
    limit: float
    compliant: bool
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Material(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    item: str
    description: str
    unit: str
    unit_price: float
    category: str = "general"

class Conductor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conductor_type: str
    voltage_system: str
    size: str
    phases: int
    fcv_kva_m: float  # FCV en kVA-m para el 1% de caída de voltaje
    resistance_temp: str = "50°C"
    power_factor: float = 0.90

class Budget(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    materials: List[Dict[str, Any]]
    labor: List[Dict[str, Any]]
    dismantling: List[Dict[str, Any]]
    subtotal: float
    administration: float
    utility: float
    iva: float
    total: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    report_type: str  # "autorizacion", "factibilidad", "fiscalizacion"
    data: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def generate_license_key() -> str:
    """Generate a unique license key"""
    random_bytes = secrets.token_bytes(16)
    hash_obj = hashlib.sha256(random_bytes)
    license_key = hash_obj.hexdigest()[:32].upper()
    # Format: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
    formatted = '-'.join([license_key[i:i+4] for i in range(0, len(license_key), 4)])
    return formatted

async def check_license_validity(user_id: str) -> bool:
    """Check if user has a valid active license"""
    license_doc = await db.licenses.find_one({
        "user_id": user_id,
        "is_active": True,
        "end_date": {"$gt": datetime.now(timezone.utc)}
    })
    return license_doc is not None

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Se requieren permisos de administrador")
    return current_user

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt())
    
    # Check if this is the first user - make them admin
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "user"
    
    user = User(email=user_data.email, name=user_data.name, role=role)
    doc = user.model_dump()
    doc["password"] = hashed.decode()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    
    # Create free trial license for new users
    if role == "user":
        license = License(
            user_id=user.id,
            plan_type="free",
            license_key=generate_license_key(),
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=7),
            is_active=True
        )
        license_doc = license.model_dump()
        license_doc["start_date"] = license_doc["start_date"].isoformat()
        license_doc["end_date"] = license_doc["end_date"].isoformat()
        license_doc["created_at"] = license_doc["created_at"].isoformat()
        await db.licenses.insert_one(license_doc)
    
    token = create_token(user.id, user.email)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not bcrypt.checkpw(login_data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"], user["email"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user.get("role", "user")
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    # Get license info if user is not admin
    license_info = None
    if current_user.role != "admin":
        license_doc = await db.licenses.find_one(
            {"user_id": current_user.id, "is_active": True},
            {"_id": 0},
            sort=[("end_date", -1)]
        )
        if license_doc:
            license_info = {
                "plan_type": license_doc.get("plan_type"),
                "license_key": license_doc.get("license_key"),
                "end_date": license_doc.get("end_date"),
                "is_valid": datetime.fromisoformat(license_doc.get("end_date")) > datetime.now(timezone.utc) if isinstance(license_doc.get("end_date"), str) else license_doc.get("end_date") > datetime.now(timezone.utc)
            }
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role,
        "license": license_info
    }

@api_router.post("/projects")
async def create_project(project_data: ProjectCreate, current_user: User = Depends(get_current_user)):
    project = Project(user_id=current_user.id, **project_data.model_dump())
    doc = project.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.projects.insert_one(doc)
    return project

@api_router.get("/projects")
async def get_projects(current_user: User = Depends(get_current_user)):
    projects = await db.projects.find({"user_id": current_user.id}, {"_id": 0}).to_list(1000)
    for p in projects:
        if isinstance(p.get("created_at"), str):
            p["created_at"] = datetime.fromisoformat(p["created_at"])
        if isinstance(p.get("updated_at"), str):
            p["updated_at"] = datetime.fromisoformat(p["updated_at"])
    return projects

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, password: str = Form(...), current_user: User = Depends(get_current_user)):
    # Verificar contraseña
    user_doc = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    if not user_doc or not bcrypt.checkpw(password.encode(), user_doc["password"].encode()):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta")
    
    # Verificar que el proyecto pertenezca al usuario
    project = await db.projects.find_one({"id": project_id, "user_id": current_user.id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    
    # Eliminar proyecto y todos sus datos relacionados
    await db.projects.delete_one({"id": project_id})
    await db.inspections.delete_many({"project_id": project_id})
    await db.demand_calculations.delete_many({"project_id": project_id})
    await db.voltage_drops.delete_many({"project_id": project_id})
    await db.budgets.delete_many({"project_id": project_id})
    
    return {"success": True, "message": "Proyecto eliminado correctamente"}

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: User = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id, "user_id": current_user.id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    if isinstance(project.get("created_at"), str):
        project["created_at"] = datetime.fromisoformat(project["created_at"])
    if isinstance(project.get("updated_at"), str):
        project["updated_at"] = datetime.fromisoformat(project["updated_at"])
    return project

@api_router.post("/inspection/analyze")
async def analyze_inspection(image_base64: str = Form(...), project_id: str = Form(...), current_user: User = Depends(get_current_user)):
    try:
        openai_client = AsyncOpenAI(api_key=EMERGENT_LLM_KEY)
        completion = await openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "Eres un experto ingeniero eléctrico especializado en análisis de infraestructura eléctrica. Analiza imágenes e identifica: postes, redes de media tensión, transformadores, distancias estimadas, y cualquier elemento relevante para diseño eléctrico."
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analiza esta imagen de infraestructura eléctrica. Identifica: postes (tipo, material), redes MT existentes, posible ubicación de transformador, distancias estimadas, y recomendaciones técnicas para el diseño."
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}
                        }
                    ]
                }
            ]
        )
        response = completion.choices[0].message.content
        
        inspection = InspectionAnalysis(
            project_id=project_id,
            image_data=image_base64[:100],
            analysis_result={"analysis": response}
        )
        doc = inspection.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["image_data"] = image_base64
        await db.inspections.insert_one(doc)
        
        return {"analysis": response, "inspection_id": inspection.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en análisis: {str(e)}")

@api_router.post("/inspection/save")
async def save_inspection(
    project_id: str = Form(...),
    image_base64: str = Form(...),
    drawings: str = Form(...),
    title: str = Form("Inspección sin título"),
    current_user: User = Depends(get_current_user)
):
    import json
    drawings_data = json.loads(drawings)
    
    inspection = InspectionAnalysis(
        project_id=project_id,
        image_data=image_base64,
        analysis_result={},
        drawings=drawings_data
    )
    
    doc = inspection.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["title"] = title
    doc["user_id"] = current_user.id
    
    await db.inspections.insert_one(doc)
    
    return {
        "success": True,
        "inspection_id": inspection.id,
        "message": "Inspección guardada correctamente"
    }

@api_router.get("/inspection/list/{project_id}")
async def list_inspections(project_id: str, current_user: User = Depends(get_current_user)):
    inspections = await db.inspections.find(
        {"project_id": project_id, "user_id": current_user.id},
        {"_id": 0, "image_data": 0}
    ).to_list(100)
    
    for inspection in inspections:
        if isinstance(inspection.get("created_at"), str):
            inspection["created_at"] = datetime.fromisoformat(inspection["created_at"])
    
    return inspections

@api_router.get("/inspection/{inspection_id}")
async def get_inspection(inspection_id: str, current_user: User = Depends(get_current_user)):
    inspection = await db.inspections.find_one(
        {"id": inspection_id, "user_id": current_user.id},
        {"_id": 0}
    )
    
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    
    if isinstance(inspection.get("created_at"), str):
        inspection["created_at"] = datetime.fromisoformat(inspection["created_at"])
    
    return inspection

@api_router.delete("/inspection/{inspection_id}")
async def delete_inspection(inspection_id: str, current_user: User = Depends(get_current_user)):
    result = await db.inspections.delete_one({"id": inspection_id, "user_id": current_user.id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    
    return {"success": True, "message": "Inspección eliminada"}

@api_router.post("/demand/calculate")
async def calculate_demand(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    lighting = data.get("lighting_loads", [])
    special = data.get("special_loads", [])
    
    subtotal_1 = sum(item["quantity"] * item["unit_power"] for item in lighting)
    subtotal_2 = sum(item["quantity"] * item["unit_power"] for item in special)
    total_installed = subtotal_1 + subtotal_2
    
    demand_factor = data.get("demand_factor", 0.9)
    power_factor = data.get("power_factor", 0.92)
    
    demand_kw = (total_installed / 1000) * demand_factor
    demand_kva = demand_kw / power_factor
    
    transformer_options = [5, 10, 15, 37.5, 50, 75, 100, 125, 150, 175, 250]
    transformer_capacity = next((cap for cap in transformer_options if cap >= demand_kva), 250)
    
    calc = DemandCalculation(
        project_id=data["project_id"],
        lighting_loads=lighting,
        special_loads=special,
        subtotal_1=subtotal_1,
        subtotal_2=subtotal_2,
        total_installed=total_installed,
        demand_factor=demand_factor,
        demand_kw=demand_kw,
        demand_kva=demand_kva,
        transformer_capacity=transformer_capacity
    )
    doc = calc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.demand_calculations.insert_one(doc)
    
    return calc

@api_router.post("/voltage-drop/calculate")
async def calculate_voltage_drop(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    """
    Calcula la caída de voltaje EXACTAMENTE como el Excel
    Fórmula: kVA·m / FCV_cable = % caída (sin multiplicar por 100)
    """
    segments = data.get("segments", [])
    circuit_type = data.get("circuit_type", "BT")
    limit = data.get("limit", 3.0)
    
    # Procesar cada tramo INDIVIDUALMENTE (sin acumulación)
    for seg in segments:
        # Determinar kVA real del tramo
        kva_input = seg.get("kva", 0)
        kva_per_client = seg.get("kva_per_client", False)
        
        if circuit_type == "BT":
            num_items = seg.get("clients", 0)
        else:  # MT
            num_items = seg.get("transformers", 0)
        
        # Si kva_per_client está activado, multiplicar kVA por número de clientes/transformadores
        if kva_per_client and num_items > 0:
            kva_real = kva_input * num_items
        else:
            kva_real = kva_input
        
        seg["kva_real"] = kva_real
        
        # Calcular kVA·m directamente SIN acumulación
        length = seg.get("length", 0)
        if circuit_type == "BT":
            seg["kva_m"] = kva_real * length
        else:  # MT
            seg["kva_km"] = kva_real * (length / 1000)
        
        # Obtener FCV del conductor
        conductor_id = seg.get("conductor_id")
        fcv_conductor = 1.0
        
        if conductor_id:
            conductor = await db.conductors.find_one({"id": conductor_id}, {"_id": 0})
            if conductor:
                fcv_conductor = conductor.get("fcv_kva_m", 1.0)
        
        # FFsu por defecto 1.0 si no se especifica
        ffsu = seg.get("ffsu", 1.0)
        
        # Número de conductores
        num_conductors = seg.get("num_conductors", 1)
        if num_conductors < 1:
            num_conductors = 1
        
        seg["ffsu"] = ffsu
        seg["num_conductors"] = num_conductors
        
        # FÓRMULA SIMPLE DEL EXCEL:
        # % caída = (kVA·m × FFsu) / (FCV_conductor × num_conductors)
        # SIN multiplicar por 100
        if fcv_conductor > 0 and num_conductors > 0:
            if circuit_type == "BT":
                seg["drop_percent"] = (seg["kva_m"] * ffsu) / (fcv_conductor * num_conductors)
            else:
                seg["drop_percent"] = (seg["kva_km"] * ffsu) / (fcv_conductor * num_conductors)
        else:
            seg["drop_percent"] = 0
    
    # Calcular caída total
    total_drop = sum(seg.get("drop_percent", 0) for seg in segments)
    compliant = total_drop <= limit
    
    drop_calc = VoltageDrop(
        project_id=data["project_id"],
        circuit_type=circuit_type,
        segments=segments,
        total_drop=total_drop,
        limit=limit,
        compliant=compliant
    )
    doc = drop_calc.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.voltage_drops.insert_one(doc)
    
    return drop_calc

@api_router.get("/materials")
async def get_materials(current_user: User = Depends(get_current_user)):
    materials = await db.materials.find({}, {"_id": 0}).to_list(1000)
    return materials

@api_router.post("/materials")
async def create_material(material: Material, current_user: User = Depends(get_current_user)):
    doc = material.model_dump()
    await db.materials.insert_one(doc)
    return material

@api_router.get("/conductors")
async def get_conductors(current_user: User = Depends(get_current_user)):
    conductors = await db.conductors.find({}, {"_id": 0}).to_list(1000)
    return conductors

# ============ ENDPOINTS PARA CARGAR DATOS GUARDADOS DE MÓDULOS ============

@api_router.get("/demand/load/{project_id}")
async def load_demand_calculation(project_id: str, current_user: User = Depends(get_current_user)):
    """Cargar el último cálculo de demanda guardado para un proyecto"""
    calc = await db.demand_calculations.find_one(
        {"project_id": project_id},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if calc and isinstance(calc.get("created_at"), str):
        calc["created_at"] = datetime.fromisoformat(calc["created_at"])
    return calc if calc else {}

@api_router.get("/voltage-drop/load/{project_id}")
async def load_voltage_drop(project_id: str, current_user: User = Depends(get_current_user)):
    """Cargar el último cálculo de caída de voltaje guardado para un proyecto"""
    calc = await db.voltage_drops.find_one(
        {"project_id": project_id},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if calc and isinstance(calc.get("created_at"), str):
        calc["created_at"] = datetime.fromisoformat(calc["created_at"])
    return calc if calc else {}

@api_router.get("/budget/load/{project_id}")
async def load_budget(project_id: str, current_user: User = Depends(get_current_user)):
    """Cargar el último presupuesto guardado para un proyecto"""
    budget = await db.budgets.find_one(
        {"project_id": project_id},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    if budget and isinstance(budget.get("created_at"), str):
        budget["created_at"] = datetime.fromisoformat(budget["created_at"])
    return budget if budget else {}

# ============ ENDPOINTS PARA REPORTES ============

@api_router.post("/reports/save")
async def save_report(report_data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    """Guardar o actualizar un reporte"""
    project_id = report_data.get("project_id")
    report_type = report_data.get("report_type")
    data = report_data.get("data", {})
    
    if not project_id or not report_type:
        raise HTTPException(status_code=400, detail="project_id y report_type son requeridos")
    
    # Verificar si ya existe un reporte de este tipo para este proyecto
    existing = await db.reports.find_one({
        "project_id": project_id,
        "report_type": report_type
    })
    
    if existing:
        # Actualizar reporte existente
        await db.reports.update_one(
            {"id": existing["id"]},
            {"$set": {
                "data": data,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"success": True, "message": "Reporte actualizado", "id": existing["id"]}
    else:
        # Crear nuevo reporte
        report = Report(
            project_id=project_id,
            report_type=report_type,
            data=data
        )
        doc = report.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["updated_at"] = doc["updated_at"].isoformat()
        await db.reports.insert_one(doc)
        return {"success": True, "message": "Reporte creado", "id": report.id}

@api_router.get("/reports/{project_id}")
async def get_reports(project_id: str, current_user: User = Depends(get_current_user)):
    """Obtener todos los reportes de un proyecto"""
    reports = await db.reports.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    for report in reports:
        if isinstance(report.get("created_at"), str):
            report["created_at"] = datetime.fromisoformat(report["created_at"])
        if isinstance(report.get("updated_at"), str):
            report["updated_at"] = datetime.fromisoformat(report["updated_at"])
    return reports

@api_router.get("/reports/{project_id}/{report_type}")
async def get_report_by_type(project_id: str, report_type: str, current_user: User = Depends(get_current_user)):
    """Obtener un reporte específico por tipo"""
    report = await db.reports.find_one({
        "project_id": project_id,
        "report_type": report_type
    }, {"_id": 0})
    
    if report:
        if isinstance(report.get("created_at"), str):
            report["created_at"] = datetime.fromisoformat(report["created_at"])
        if isinstance(report.get("updated_at"), str):
            report["updated_at"] = datetime.fromisoformat(report["updated_at"])
    
    return report if report else {}

@api_router.post("/budget/upload-excel")
async def upload_budget_excel(file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    try:
        import openpyxl
        import xlrd
        from io import BytesIO
        
        contents = await file.read()
        filename = file.filename.lower()
        
        materials = []
        labor = []
        current_section = None
        
        # Detectar formato del archivo
        if filename.endswith('.xlsx'):
            # Formato nuevo - usar openpyxl
            wb = openpyxl.load_workbook(BytesIO(contents))
            ws = wb.active
            
            for row in ws.iter_rows(min_row=2, values_only=True):
                if not row or not row[0]:
                    continue
                    
                row_text = str(row[0]).strip().upper() if row[0] else ""
                
                if "SUBTOTAL MANO DE OBRA" in row_text or "MANO DE OBRA" in row_text:
                    current_section = "labor"
                    continue
                elif "SUBTOTAL" in row_text or "TOTAL DIRECTO" in row_text:
                    if current_section == "labor":
                        break
                    continue
                    
                if len(row) >= 5 and row[1]:
                    try:
                        description = str(row[1]).strip()
                        unit = str(row[2]).strip() if row[2] else "U"
                        quantity = float(row[3]) if row[3] else 0
                        unit_price = float(row[4]) if row[4] else 0
                        
                        if description and quantity >= 0 and unit_price >= 0:
                            item_data = {
                                "description": description,
                                "unit": unit,
                                "quantity": quantity,
                                "unit_price": unit_price
                            }
                            
                            if current_section == "labor":
                                labor.append(item_data)
                            else:
                                materials.append(item_data)
                    except (ValueError, TypeError) as e:
                        continue
        else:
            # Formato antiguo .xls - usar xlrd
            wb = xlrd.open_workbook(file_contents=contents)
            ws = wb.sheet_by_index(0)
            
            for row_idx in range(1, ws.nrows):
                row = ws.row_values(row_idx)
                
                if not row or not row[0]:
                    continue
                    
                row_text = str(row[0]).strip().upper() if row[0] else ""
                
                if "SUBTOTAL MANO DE OBRA" in row_text or "MANO DE OBRA" in row_text:
                    current_section = "labor"
                    continue
                elif "SUBTOTAL" in row_text or "TOTAL DIRECTO" in row_text:
                    if current_section == "labor":
                        break
                    continue
                    
                if len(row) >= 5 and row[1]:
                    try:
                        description = str(row[1]).strip()
                        unit = str(row[2]).strip() if row[2] else "U"
                        quantity = float(row[3]) if row[3] else 0
                        unit_price = float(row[4]) if row[4] else 0
                        
                        if description and quantity >= 0 and unit_price >= 0:
                            item_data = {
                                "description": description,
                                "unit": unit,
                                "quantity": quantity,
                                "unit_price": unit_price
                            }
                            
                            if current_section == "labor":
                                labor.append(item_data)
                            else:
                                materials.append(item_data)
                    except (ValueError, TypeError) as e:
                        continue
        
        return {
            "success": True,
            "materials": materials,
            "labor": labor,
            "message": f"✓ Importados {len(materials)} materiales y {len(labor)} mano de obra"
        }
        
    except Exception as e:
        import traceback
        error_detail = f"Error procesando Excel: {str(e)}\n{traceback.format_exc()}"
        print(error_detail)
        raise HTTPException(status_code=400, detail=f"Error procesando archivo: {str(e)}")

@api_router.post("/budget/generate")
async def generate_budget(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    materials = data.get("materials", [])
    labor = data.get("labor", [])
    dismantling = data.get("dismantling", [])
    
    subtotal = sum(item["quantity"] * item["unit_price"] for item in materials + labor + dismantling)
    admin_percent = data.get("administration_percent", 12)
    utility_percent = data.get("utility_percent", 10)
    iva_percent = data.get("iva_percent", 15)
    
    administration = subtotal * (admin_percent / 100)
    utility = subtotal * (utility_percent / 100)
    subtotal_with_overhead = subtotal + administration + utility
    iva = subtotal_with_overhead * (iva_percent / 100)
    total = subtotal_with_overhead + iva
    
    budget = Budget(
        project_id=data["project_id"],
        materials=materials,
        labor=labor,
        dismantling=dismantling,
        subtotal=subtotal,
        administration=administration,
        utility=utility,
        iva=iva,
        total=total
    )
    doc = budget.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.budgets.insert_one(doc)
    
    return budget

# ============ ADMIN ENDPOINTS ============

@api_router.post("/admin/users")
async def admin_create_user(user_data: UserCreate, admin: User = Depends(get_current_admin)):
    """Admin creates a new user with credentials"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt())
    user = User(email=user_data.email, name=user_data.name, role="user")
    doc = user.model_dump()
    doc["password"] = hashed.decode()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    
    return {
        "success": True,
        "user": {"id": user.id, "email": user.email, "name": user.name},
        "credentials": {"email": user_data.email, "password": user_data.password}
    }

@api_router.get("/admin/users")
async def admin_list_users(admin: User = Depends(get_current_admin)):
    """List all users with their license status"""
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    
    for user in users:
        if user.get("role") != "admin":
            license_doc = await db.licenses.find_one(
                {"user_id": user["id"], "is_active": True},
                {"_id": 0},
                sort=[("end_date", -1)]
            )
            user["license"] = license_doc if license_doc else None
    
    return users

@api_router.post("/admin/licenses")
async def admin_create_license(
    user_id: str = Form(...),
    plan_type: str = Form(...),
    duration_days: int = Form(...),
    admin: User = Depends(get_current_admin)
):
    """Admin generates a license for a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    license = License(
        user_id=user_id,
        plan_type=plan_type,
        license_key=generate_license_key(),
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(days=duration_days),
        is_active=True
    )
    
    doc = license.model_dump()
    doc["start_date"] = doc["start_date"].isoformat()
    doc["end_date"] = doc["end_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.licenses.insert_one(doc)
    
    return {
        "success": True,
        "license_key": license.license_key,
        "plan_type": plan_type,
        "valid_until": license.end_date
    }

@api_router.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: User = Depends(get_current_admin)):
    """Admin deletes a user"""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Delete user's licenses
    await db.licenses.delete_many({"user_id": user_id})
    
    # Delete user's projects and related data
    projects = await db.projects.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    for project in projects:
        project_id = project["id"]
        await db.inspections.delete_many({"project_id": project_id})
        await db.demand_calculations.delete_many({"project_id": project_id})
        await db.voltage_drops.delete_many({"project_id": project_id})
        await db.budgets.delete_many({"project_id": project_id})
        await db.reports.delete_many({"project_id": project_id})
    
    await db.projects.delete_many({"user_id": user_id})
    
    # Delete user
    await db.users.delete_one({"id": user_id})
    
    return {"success": True, "message": "Usuario eliminado correctamente"}

@api_router.put("/admin/users/{user_id}/license")
async def admin_update_user_license(
    user_id: str,
    plan_type: str = Form(...),
    duration_days: int = Form(...),
    admin: User = Depends(get_current_admin)
):
    """Admin updates or creates a license for a user"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Deactivate old licenses
    await db.licenses.update_many(
        {"user_id": user_id},
        {"$set": {"is_active": False}}
    )
    
    # Create new license
    license = License(
        user_id=user_id,
        plan_type=plan_type,
        license_key=generate_license_key(),
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(days=duration_days),
        is_active=True
    )
    
    doc = license.model_dump()
    doc["start_date"] = doc["start_date"].isoformat()
    doc["end_date"] = doc["end_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.licenses.insert_one(doc)
    
    return {
        "success": True,
        "license_key": license.license_key,
        "plan_type": plan_type,
        "valid_until": doc["end_date"]
    }

@api_router.put("/admin/update-credentials")
async def admin_update_credentials(
    current_password: str = Form(...),
    new_email: str = Form(None),
    new_password: str = Form(None),
    admin: User = Depends(get_current_admin)
):
    """Admin actualiza sus propias credenciales"""
    # Verificar contraseña actual
    if not bcrypt.checkpw(current_password.encode('utf-8'), admin.password.encode('utf-8')):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    
    update_fields = {}
    
    # Actualizar email si se proporciona
    if new_email and new_email != admin.email:
        # Verificar que el nuevo email no esté en uso
        existing = await db.users.find_one({"email": new_email, "id": {"$ne": admin.id}})
        if existing:
            raise HTTPException(status_code=400, detail="El email ya está en uso")
        update_fields["email"] = new_email
    
    # Actualizar contraseña si se proporciona
    if new_password:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(new_password.encode('utf-8'), salt)
        update_fields["password"] = hashed.decode('utf-8')
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No se proporcionaron cambios")
    
    # Actualizar en base de datos
    await db.users.update_one(
        {"id": admin.id},
        {"$set": update_fields}
    )
    
    # Generar nuevo token si cambió el email
    new_token = None
    if "email" in update_fields:
        new_token = create_token(admin.id, new_email)
    
    return {
        "success": True,
        "message": "Credenciales actualizadas correctamente",
        "new_token": new_token
    }

@api_router.get("/admin/payment-configs")
async def admin_get_payment_configs(admin: User = Depends(get_current_admin)):
    """Get all payment configurations"""
    configs = await db.payment_configs.find({}, {"_id": 0, "client_secret": 0}).to_list(100)
    return configs

@api_router.post("/admin/payment-configs")
async def admin_save_payment_config(config_data: Dict[str, Any], admin: User = Depends(get_current_admin)):
    """Save or update payment configuration"""
    payment_config = PaymentConfig(**config_data)
    doc = payment_config.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    
    # Update existing or create new
    result = await db.payment_configs.update_one(
        {"payment_provider": payment_config.payment_provider},
        {"$set": doc},
        upsert=True
    )
    
    return {"success": True, "message": "Configuración guardada"}

# ============ PAYMENT ENDPOINTS ============

@api_router.get("/plans")
async def get_plans():
    """Get available subscription plans"""
    return [
        {
            "id": "free",
            "name": "Plan Free",
            "price": 0,
            "duration_days": 7,
            "description": "1 semana de prueba gratuita"
        },
        {
            "id": "basic",
            "name": "Plan Básico",
            "price": 100,
            "duration_days": 365,
            "description": "1 año de uso completo"
        },
        {
            "id": "enterprise",
            "name": "Plan Empresa",
            "price": 200,
            "duration_days": 1825,
            "description": "5 años de uso total"
        }
    ]

@api_router.post("/payment/create-order")
async def create_payment_order(data: Dict[str, Any], current_user: User = Depends(get_current_user)):
    """Create a PayPal order for subscription"""
    import requests
    
    plan_id = data.get("plan_id")
    
    plans = {
        "basic": {"price": 100, "days": 365},
        "enterprise": {"price": 200, "days": 1825}
    }
    
    if plan_id not in plans:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    plan = plans[plan_id]
    
    try:
        # Get PayPal access token
        auth_response = requests.post(
            f"https://api-m.{'sandbox.' if PAYPAL_MODE == 'sandbox' else ''}paypal.com/v1/oauth2/token",
            headers={"Accept": "application/json", "Accept-Language": "en_US"},
            auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
            data={"grant_type": "client_credentials"}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Error al conectar con PayPal: {auth_response.text}")
        
        access_token = auth_response.json()["access_token"]
        
        # Create order
        order_response = requests.post(
            f"https://api-m.{'sandbox.' if PAYPAL_MODE == 'sandbox' else ''}paypal.com/v2/checkout/orders",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {access_token}"
            },
            json={
                "intent": "CAPTURE",
                "purchase_units": [{
                    "amount": {
                        "currency_code": "USD",
                        "value": str(plan["price"])
                    },
                    "description": f"ElectroDesign Pro - Plan {plan_id.title()}"
                }],
                "application_context": {
                    "brand_name": "ElectroDesign Pro",
                    "return_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/payment/success?plan_id={plan_id}",
                    "cancel_url": f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/plans"
                }
            }
        )
        
        if order_response.status_code != 201:
            raise HTTPException(status_code=500, detail=f"Error al crear orden: {order_response.text}")
        
        order_data = order_response.json()
        
        return {
            "order_id": order_data["id"],
            "approval_url": next(link["href"] for link in order_data["links"] if link["rel"] == "approve")
        }
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error de conexión con PayPal: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar: {str(e)}")

@api_router.post("/payment/capture-order")
async def capture_payment_order(
    order_id: str = Form(...),
    plan_id: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Capture PayPal payment and activate license"""
    import requests
    
    plans = {
        "basic": {"price": 100, "days": 365, "name": "basic"},
        "enterprise": {"price": 200, "days": 1825, "name": "enterprise"}
    }
    
    if plan_id not in plans:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    plan = plans[plan_id]
    
    # Get PayPal access token
    auth_response = requests.post(
        f"https://api-m.{'sandbox.' if PAYPAL_MODE == 'sandbox' else ''}paypal.com/v1/oauth2/token",
        headers={"Accept": "application/json"},
        auth=(PAYPAL_CLIENT_ID, PAYPAL_SECRET),
        data={"grant_type": "client_credentials"}
    )
    
    access_token = auth_response.json()["access_token"]
    
    # Capture order
    capture_response = requests.post(
        f"https://api-m.{'sandbox.' if PAYPAL_MODE == 'sandbox' else ''}paypal.com/v2/checkout/orders/{order_id}/capture",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )
    
    if capture_response.status_code != 201:
        raise HTTPException(status_code=400, detail="Error al procesar el pago")
    
    capture_data = capture_response.json()
    
    if capture_data["status"] == "COMPLETED":
        # Create license
        license = License(
            user_id=current_user.id,
            plan_type=plan["name"],
            license_key=generate_license_key(),
            start_date=datetime.now(timezone.utc),
            end_date=datetime.now(timezone.utc) + timedelta(days=plan["days"]),
            is_active=True,
            payment_id=order_id,
            amount_paid=plan["price"]
        )
        
        doc = license.model_dump()
        doc["start_date"] = doc["start_date"].isoformat()
        doc["end_date"] = doc["end_date"].isoformat()
        doc["created_at"] = doc["created_at"].isoformat()
        
        await db.licenses.insert_one(doc)
        
        return {
            "success": True,
            "license_key": license.license_key,
            "valid_until": license.end_date,
            "message": "Pago procesado y licencia activada"
        }
    
    raise HTTPException(status_code=400, detail="Pago no completado")


@api_router.post("/payment/bank-transfer")
async def bank_transfer_payment(
    plan_id: str = Form(...),
    reference: str = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Process bank transfer payment - requires manual activation"""
    plans = {
        "basic": {"price": 100, "days": 365},
        "enterprise": {"price": 200, "days": 1825}
    }
    
    if plan_id not in plans:
        raise HTTPException(status_code=400, detail="Plan inválido")
    
    # Save file
    import os
    os.makedirs("uploads/bank_transfers", exist_ok=True)
    file_path = f"uploads/bank_transfers/{current_user.id}_{reference}_{file.filename}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Create pending license (admin must activate it)
    license = License(
        user_id=current_user.id,
        plan_type=plan_id,
        license_key=generate_license_key(),
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc) + timedelta(days=plans[plan_id]["days"]),
        is_active=False,  # Requires manual activation
        payment_id=f"BANK_TRANSFER_{reference}",
        amount_paid=plans[plan_id]["price"]
    )
    
    doc = license.model_dump()
    doc["start_date"] = doc["start_date"].isoformat()
    doc["end_date"] = doc["end_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["bank_transfer_file"] = file_path
    doc["bank_transfer_reference"] = reference
    
    await db.licenses.insert_one(doc)
    
    return {
        "success": True,
        "message": "Comprobante recibido. Tu licencia será activada en 24-48 horas.",
        "license_key": license.license_key
    }


@api_router.get("/health")
async def health_check():
    return {"status": "ok"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve React frontend static files if the build directory exists
STATIC_DIR = ROOT_DIR / "static"
INDEX_HTML = str(STATIC_DIR / "index.html")
if STATIC_DIR.is_dir():
    # Serve bundled JS/CSS/media from React build's /static subfolder
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR / "static")), name="assets")

    @app.get("/")
    async def serve_index():
        return FileResponse(INDEX_HTML)

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):  # noqa: ARG001
        # SPA fallback: all non-API, non-static routes return index.html
        return FileResponse(INDEX_HTML)
else:
    @app.get("/")
    async def root():
        return {"status": "ok", "message": "ElectroDesign2Pro API is running. Use /api/* endpoints."}

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()