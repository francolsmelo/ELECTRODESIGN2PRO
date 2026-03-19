from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
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
    size: str
    phases: int
    fcv: float
    kva_m: float

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

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

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

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    hashed = bcrypt.hashpw(user_data.password.encode(), bcrypt.gensalt())
    user = User(email=user_data.email, name=user_data.name)
    doc = user.model_dump()
    doc["password"] = hashed.decode()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.users.insert_one(doc)
    token = create_token(user.id, user.email)
    
    return {"token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    if not bcrypt.checkpw(login_data.password.encode(), user["password"].encode()):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    token = create_token(user["id"], user["email"])
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"]}}

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "name": current_user.name}

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
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"inspection_{project_id}",
            system_message="Eres un experto ingeniero eléctrico especializado en análisis de infraestructura eléctrica. Analiza imágenes e identifica: postes, redes de media tensión, transformadores, distancias estimadas, y cualquier elemento relevante para diseño eléctrico."
        ).with_model("openai", "gpt-5.2")
        
        image_content = ImageContent(image_base64=image_base64)
        message = UserMessage(
            text="Analiza esta imagen de infraestructura eléctrica. Identifica: postes (tipo, material), redes MT existentes, posible ubicación de transformador, distancias estimadas, y recomendaciones técnicas para el diseño.",
            file_contents=[image_content]
        )
        
        response = await chat.send_message(message)
        
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

@api_router.post("/inspection/save-drawing")
async def save_drawing(inspection_id: str = Form(...), drawings: str = Form(...), current_user: User = Depends(get_current_user)):
    import json
    drawings_data = json.loads(drawings)
    result = await db.inspections.update_one(
        {"id": inspection_id},
        {"$set": {"drawings": drawings_data}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Inspección no encontrada")
    return {"success": True}

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
    segments = data.get("segments", [])
    circuit_type = data.get("circuit_type", "BT")
    limit = data.get("limit", 3.0)
    
    for i in range(len(segments) - 1, -1, -1):
        seg = segments[i]
        accumulated_kva = sum(s["kva"] for s in segments[i:])
        seg["accumulated_kva"] = accumulated_kva
        
        if circuit_type == "BT":
            seg["kva_m"] = accumulated_kva * seg["length"]
        else:
            seg["kva_km"] = accumulated_kva * (seg["length"] / 1000)
        
        fcv = seg.get("fcv", 1.0)
        if circuit_type == "BT":
            seg["drop_percent"] = (seg["kva_m"] * fcv) / 1000
        else:
            seg["drop_percent"] = seg["kva_km"] * fcv
    
    total_drop = sum(seg["drop_percent"] for seg in segments)
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()