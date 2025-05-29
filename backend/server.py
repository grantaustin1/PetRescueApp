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
from io import BytesIO, StringIO
import base64
import json
import shutil
import csv
import pandas as pd

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
billing_dir = ROOT_DIR / "billing"
billing_dir.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Mount static files for serving uploaded images and QR codes
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
app.mount("/qr_codes", StaticFiles(directory=str(qr_codes_dir)), name="qr_codes")
app.mount("/billing", StaticFiles(directory=str(billing_dir)), name="billing")

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
    tag_fee_paid: bool = True  # One-time tag fee paid

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

class PaymentUpdate(BaseModel):
    pet_id: str
    status: str  # paid, arrears

class TagUpdate(BaseModel):
    pet_id: str
    status: str  # ordered, printed, shipped, delivered

class BillingRecord(BaseModel):
    pet_id: str
    billing_date: datetime
    amount: float
    status: str  # generated, processed, paid, failed
    file_path: Optional[str] = None

class PaymentResult(BaseModel):
    customer_id: str  # pet_id
    status: str  # success, failed
    transaction_date: datetime
    amount: float
    error_message: Optional[str] = None

class AdminStats(BaseModel):
    total_pets: int
    pets_paid: int
    pets_in_arrears: int
    tags_to_print: int
    tags_shipped: int
    monthly_revenue: float
    total_revenue: float

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

# ADMIN ENDPOINTS

@api_router.post("/admin/login")
async def admin_login(token: str):
    """Admin login endpoint"""
    try:
        verify_admin(token)
        return {"success": True, "message": "Login successful", "token": token}
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/admin/stats")
async def get_admin_stats(token: str):
    """Get admin dashboard statistics"""
    verify_admin(token)
    try:
        # Get all pets
        pets = await db.pets.find().to_list(10000)
        
        total_pets = len(pets)
        pets_paid = len([p for p in pets if p.get('payment_status') == 'paid'])
        pets_in_arrears = len([p for p in pets if p.get('payment_status') == 'arrears'])
        tags_to_print = len([p for p in pets if p.get('tag_status') == 'ordered'])
        tags_shipped = len([p for p in pets if p.get('tag_status') in ['shipped', 'delivered']])
        
        monthly_revenue = pets_paid * 2.0  # R2 per pet per month
        total_revenue = monthly_revenue  # For MVP, assuming one month
        
        return AdminStats(
            total_pets=total_pets,
            pets_paid=pets_paid,
            pets_in_arrears=pets_in_arrears,
            tags_to_print=tags_to_print,
            tags_shipped=tags_shipped,
            monthly_revenue=monthly_revenue,
            total_revenue=total_revenue
        )
        
    except Exception as e:
        logging.error(f"Error getting admin stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/pets")
async def get_all_pets(token: str):
    """Admin endpoint to get all pets"""
    verify_admin(token)
    try:
        pets = await db.pets.find().to_list(1000)
        return [Pet(**pet) for pet in pets]
    except Exception as e:
        logging.error(f"Error getting pets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/billing/generate-csv")
async def generate_billing_csv(token: str):
    """Generate monthly billing CSV for bank processing"""
    verify_admin(token)
    try:
        # Get all pets with paid status
        pets = await db.pets.find({"payment_status": "paid"}).to_list(1000)
        
        if not pets:
            raise HTTPException(status_code=400, detail="No pets with paid status found")
        
        # Generate CSV content
        csv_filename = f"billing_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        csv_path = billing_dir / csv_filename
        
        with open(csv_path, "w", newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            # Header row
            writer.writerow(['Customer_ID', 'Account_Holder_Name', 'Account_Number', 'Branch_Code', 'Amount'])
            
            # Data rows
            for pet_doc in pets:
                pet = Pet(**pet_doc)
                writer.writerow([
                    pet.pet_id,
                    pet.owner.account_holder_name,
                    pet.owner.bank_account_number,
                    pet.owner.branch_code,
                    f"{pet.monthly_fee:.2f}"
                ])
        
        # Save billing record
        billing_record = BillingRecord(
            pet_id="BATCH",
            billing_date=datetime.now(timezone.utc),
            amount=len(pets) * 2.0,
            status="generated",
            file_path=str(csv_path)
        )
        await db.billing_records.insert_one(billing_record.dict())
        
        return {
            "success": True,
            "filename": csv_filename,
            "total_amount": len(pets) * 2.0,
            "customer_count": len(pets),
            "download_url": f"/billing/{csv_filename}"
        }
        
    except Exception as e:
        logging.error(f"Error generating billing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/billing/download/{filename}")
async def download_billing_csv(filename: str, token: str):
    """Download generated billing CSV"""
    verify_admin(token)
    try:
        csv_path = billing_dir / filename
        if not csv_path.exists():
            raise HTTPException(status_code=404, detail="File not found")
        
        return FileResponse(
            path=str(csv_path),
            filename=filename,
            media_type="text/csv"
        )
        
    except Exception as e:
        logging.error(f"Error downloading CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/payments/import-results")
async def import_payment_results(
    token: str,
    results_file: UploadFile = File(..., description="CSV file with payment results")
):
    """Import payment results from bank processing"""
    verify_admin(token)
    try:
        # Read uploaded CSV file
        content = await results_file.read()
        csv_data = StringIO(content.decode('utf-8'))
        
        # Parse CSV
        reader = csv.DictReader(csv_data)
        updated_count = 0
        failed_count = 0
        
        for row in reader:
            customer_id = row.get('Customer_ID', '').strip()
            status = row.get('Status', '').strip().lower()
            
            if customer_id and status in ['success', 'paid']:
                # Update pet payment status to paid
                result = await db.pets.update_one(
                    {"pet_id": customer_id},
                    {
                        "$set": {
                            "payment_status": "paid",
                            "last_payment": datetime.now(timezone.utc)
                        }
                    }
                )
                if result.modified_count > 0:
                    updated_count += 1
            elif customer_id and status in ['failed', 'declined']:
                # Update pet payment status to arrears
                result = await db.pets.update_one(
                    {"pet_id": customer_id},
                    {"$set": {"payment_status": "arrears"}}
                )
                if result.modified_count > 0:
                    failed_count += 1
        
        return {
            "success": True,
            "updated_count": updated_count,
            "failed_count": failed_count,
            "message": f"Updated {updated_count} successful payments, {failed_count} failed payments"
        }
        
    except Exception as e:
        logging.error(f"Error importing payment results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/pets/update-payment-status")
async def update_payment_status(token: str, update: PaymentUpdate):
    """Update payment status for a pet"""
    verify_admin(token)
    try:
        update_data = {"payment_status": update.status}
        if update.status == "paid":
            update_data["last_payment"] = datetime.now(timezone.utc)
        
        result = await db.pets.update_one(
            {"pet_id": update.pet_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        return {"success": True, "message": f"Payment status updated to {update.status}"}
        
    except Exception as e:
        logging.error(f"Error updating payment status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/tags/print-queue")
async def get_print_queue(token: str):
    """Get pets that need tags printed"""
    verify_admin(token)
    try:
        pets = await db.pets.find({"tag_status": "ordered"}).to_list(1000)
        return [Pet(**pet) for pet in pets]
    except Exception as e:
        logging.error(f"Error getting print queue: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/update-status")
async def update_tag_status(token: str, update: TagUpdate):
    """Update tag status"""
    verify_admin(token)
    try:
        result = await db.pets.update_one(
            {"pet_id": update.pet_id},
            {"$set": {"tag_status": update.status}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        return {"success": True, "message": f"Tag status updated to {update.status}"}
        
    except Exception as e:
        logging.error(f"Error updating tag status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/bulk-update")
async def bulk_update_tag_status(token: str, pet_ids: List[str], new_status: str):
    """Bulk update tag status for multiple pets"""
    verify_admin(token)
    try:
        result = await db.pets.update_many(
            {"pet_id": {"$in": pet_ids}},
            {"$set": {"tag_status": new_status}}
        )
        
        return {
            "success": True,
            "updated_count": result.modified_count,
            "message": f"Updated {result.modified_count} pets to status: {new_status}"
        }
        
    except Exception as e:
        logging.error(f"Error bulk updating tag status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/billing/history")
async def get_billing_history(token: str):
    """Get billing history"""
    verify_admin(token)
    try:
        records = await db.billing_records.find().sort("billing_date", -1).to_list(100)
        return [BillingRecord(**record) for record in records]
    except Exception as e:
        logging.error(f"Error getting billing history: {str(e)}")
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
