from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Depends, Form
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import qrcode
from io import BytesIO
import base64
import json
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create uploads directory if it doesn't exist
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
qr_codes_dir = ROOT_DIR / "qr_codes"
qr_codes_dir.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Mount static files for serving uploaded images and QR codes
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
app.mount("/qr_codes", StaticFiles(directory=str(qr_codes_dir)), name="qr_codes")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Global counter for PET IDs - in production, use atomic operations
PET_COUNTER_COLLECTION = "pet_counter"

async def get_next_pet_id():
    """Generate sequential PET ID like PET001234"""
    counter_doc = await db[PET_COUNTER_COLLECTION].find_one_and_update(
        {"_id": "pet_counter"},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=True
    )
    count = counter_doc.get("count", 1) if counter_doc else 1
    return f"PET{count:06d}"

# Pydantic Models
class Owner(BaseModel):
    name: str
    mobile: str
    email: str
    address: str
    bank_account_number: str
    branch_code: str
    account_holder_name: str

class Pet(BaseModel):
    pet_id: str
    name: str
    breed: str
    medical_info: Optional[str] = ""
    instructions: Optional[str] = ""
    photo_url: Optional[str] = None
    owner: Owner
    qr_code_url: Optional[str] = None
    tag_status: str = "ordered"  # ordered, printed, shipped, delivered
    payment_status: str = "paid"  # paid, arrears
    monthly_fee: float = 2.0  # ZAR
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_payment: Optional[datetime] = None

class PetRegistration(BaseModel):
    pet_name: str
    breed: str
    medical_info: Optional[str] = ""
    instructions: Optional[str] = ""
    owner_name: str
    mobile: str
    email: str
    address: str
    bank_account_number: str
    branch_code: str
    account_holder_name: str

class QRScanResponse(BaseModel):
    pet_name: str
    pet_photo_url: Optional[str]
    owner_name: str
    owner_mobile: str

# Admin authentication (simple for MVP)
ADMIN_TOKEN = "admin123"  # In production, use proper JWT

def verify_admin(token: str = None):
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@api_router.get("/")
async def root():
    return {"message": "Pet Tag System API"}

@api_router.post("/pets/register")
async def register_pet(
    pet_data: str = Form(...),
    photo: UploadFile = File(...)
):
    """Register a new pet with photo upload"""
    try:
        # Parse pet data from JSON string
        pet_info = json.loads(pet_data)
        registration_data = PetRegistration(**pet_info)
        
        # Generate unique pet ID
        pet_id = await get_next_pet_id()
        
        # Save uploaded photo
        photo_filename = f"{pet_id}_{photo.filename}"
        photo_path = uploads_dir / photo_filename
        
        with open(photo_path, "wb") as buffer:
            shutil.copyfileobj(photo.file, buffer)
        
        photo_url = f"/uploads/{photo_filename}"
        
        # Generate QR code
        qr_url = f"{os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')}/scan/{pet_id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_url)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_filename = f"{pet_id}_qr.png"
        qr_path = qr_codes_dir / qr_filename
        qr_img.save(qr_path)
        qr_code_url = f"/qr_codes/{qr_filename}"
        
        # Create pet document
        owner_data = Owner(
            name=registration_data.owner_name,
            mobile=registration_data.mobile,
            email=registration_data.email,
            address=registration_data.address,
            bank_account_number=registration_data.bank_account_number,
            branch_code=registration_data.branch_code,
            account_holder_name=registration_data.account_holder_name
        )
        
        pet = Pet(
            pet_id=pet_id,
            name=registration_data.pet_name,
            breed=registration_data.breed,
            medical_info=registration_data.medical_info,
            instructions=registration_data.instructions,
            photo_url=photo_url,
            owner=owner_data,
            qr_code_url=qr_code_url,
            last_payment=datetime.now(timezone.utc)
        )
        
        # Save to database
        await db.pets.insert_one(pet.dict())
        
        return {"success": True, "pet_id": pet_id, "qr_code_url": qr_code_url}
        
    except Exception as e:
        logging.error(f"Error registering pet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/scan/{pet_id}")
async def scan_qr_code(pet_id: str):
    """Get pet info for QR code scan - public endpoint"""
    try:
        pet_doc = await db.pets.find_one({"pet_id": pet_id})
        if not pet_doc:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        pet = Pet(**pet_doc)
        
        # Return only public info for finder
        return QRScanResponse(
            pet_name=pet.name,
            pet_photo_url=pet.photo_url,
            owner_name=pet.owner.name,
            owner_mobile=pet.owner.mobile
        )
        
    except Exception as e:
        logging.error(f"Error scanning QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/pets", dependencies=[Depends(verify_admin)])
async def get_all_pets(token: str):
    """Admin endpoint to get all pets"""
    try:
        pets = await db.pets.find().to_list(1000)
        return [Pet(**pet) for pet in pets]
    except Exception as e:
        logging.error(f"Error getting pets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/billing/csv", dependencies=[Depends(verify_admin)])
async def generate_billing_csv(token: str):
    """Generate monthly billing CSV"""
    try:
        pets = await db.pets.find({"payment_status": "paid"}).to_list(1000)
        
        # Generate CSV content
        csv_content = "Customer_ID,Account_Holder_Name,Account_Number,Branch_Code,Amount\n"
        
        for pet_doc in pets:
            pet = Pet(**pet_doc)
            csv_content += f"{pet.pet_id},{pet.owner.account_holder_name},{pet.owner.bank_account_number},{pet.owner.branch_code},{pet.monthly_fee:.2f}\n"
        
        # Save CSV file
        csv_filename = f"billing_{datetime.now().strftime('%Y%m%d')}.csv"
        csv_path = ROOT_DIR / csv_filename
        
        with open(csv_path, "w") as f:
            f.write(csv_content)
        
        return FileResponse(
            path=str(csv_path),
            filename=csv_filename,
            media_type="text/csv"
        )
        
    except Exception as e:
        logging.error(f"Error generating billing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/update-payment-status", dependencies=[Depends(verify_admin)])
async def update_payment_status(token: str, pet_id: str, status: str):
    """Update payment status for a pet"""
    try:
        result = await db.pets.update_one(
            {"pet_id": pet_id},
            {"$set": {"payment_status": status}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        return {"success": True}
        
    except Exception as e:
        logging.error(f"Error updating payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/tags/print-queue", dependencies=[Depends(verify_admin)])
async def get_print_queue(token: str):
    """Get pets that need tags printed"""
    try:
        pets = await db.pets.find({"tag_status": "ordered"}).to_list(1000)
        return [Pet(**pet) for pet in pets]
    except Exception as e:
        logging.error(f"Error getting print queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/update-status", dependencies=[Depends(verify_admin)])
async def update_tag_status(token: str, pet_id: str, status: str):
    """Update tag status"""
    try:
        result = await db.pets.update_one(
            {"pet_id": pet_id},
            {"$set": {"tag_status": status}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        return {"success": True}
        
    except Exception as e:
        logging.error(f"Error updating tag status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
