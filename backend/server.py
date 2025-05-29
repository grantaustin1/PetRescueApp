from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Depends, Form, BackgroundTasks
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import qrcode
from io import BytesIO, StringIO
import base64
import json
import shutil
import csv
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from jinja2 import Environment, FileSystemLoader
from jose import JWTError, jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create directories if they don't exist
uploads_dir = ROOT_DIR / "uploads"
uploads_dir.mkdir(exist_ok=True)
qr_codes_dir = ROOT_DIR / "qr_codes"
qr_codes_dir.mkdir(exist_ok=True)
billing_dir = ROOT_DIR / "billing"
billing_dir.mkdir(exist_ok=True)
reports_dir = ROOT_DIR / "reports"
reports_dir.mkdir(exist_ok=True)
shipping_dir = ROOT_DIR / "shipping"
shipping_dir.mkdir(exist_ok=True)
templates_dir = ROOT_DIR / "templates"
templates_dir.mkdir(exist_ok=True)

# Email Configuration
email_conf = ConnectionConfig(
    MAIL_USERNAME=os.environ['GMAIL_USER'],
    MAIL_PASSWORD=os.environ['GMAIL_APP_PASSWORD'],
    MAIL_FROM=os.environ['GMAIL_USER'],
    MAIL_PORT=int(os.environ['SMTP_PORT']),
    MAIL_SERVER=os.environ['SMTP_SERVER'],
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRE_HOURS = int(os.environ['JWT_EXPIRE_HOURS'])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Jinja2 template environment
env = Environment(loader=FileSystemLoader(str(templates_dir)))

# Create the main app without a prefix
app = FastAPI()

# Mount static files
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
app.mount("/qr_codes", StaticFiles(directory=str(qr_codes_dir)), name="qr_codes")
app.mount("/billing", StaticFiles(directory=str(billing_dir)), name="billing")
app.mount("/reports", StaticFiles(directory=str(reports_dir)), name="reports")
app.mount("/shipping", StaticFiles(directory=str(shipping_dir)), name="shipping")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Global counter for PET IDs
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
    tag_status: str = "ordered"  # ordered, printed, manufactured, shipped, delivered
    payment_status: str = "paid"  # paid, arrears
    monthly_fee: float = 2.0  # ZAR
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_payment: Optional[datetime] = None
    tag_fee_paid: bool = True
    manufacturing_batch: Optional[str] = None
    shipping_tracking: Optional[str] = None
    delivered_date: Optional[datetime] = None
    replacement_count: int = 0
    annual_adjustment_date: Optional[datetime] = None
    last_email_sent: Optional[datetime] = None

class CustomerLogin(BaseModel):
    email: str
    pet_id: str

class CustomerToken(BaseModel):
    access_token: str
    token_type: str = "bearer"

class CustomerProfile(BaseModel):
    pets: List[Pet]
    total_pets: int
    active_payments: int
    total_donations: float

class PetUpdate(BaseModel):
    name: Optional[str] = None
    breed: Optional[str] = None
    medical_info: Optional[str] = None
    instructions: Optional[str] = None

class OwnerUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None

class FeeAdjustment(BaseModel):
    adjustment_id: str
    year: int
    percentage: float
    new_fee: float
    applied_date: datetime
    affected_pets: int

class TagReplacement(BaseModel):
    original_pet_id: str
    new_pet_id: str
    reason: str  # lost, damaged, stolen
    replacement_fee: float = 25.0  # ZAR
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, approved, manufactured, shipped, delivered

class ManufacturingBatch(BaseModel):
    batch_id: str
    pet_ids: List[str]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "pending"  # pending, in_production, completed, shipped
    quantity: int
    estimated_completion: Optional[datetime] = None
    actual_completion: Optional[datetime] = None
    manufacturing_notes: Optional[str] = ""

class ShippingBatch(BaseModel):
    shipping_id: str
    pet_ids: List[str]
    courier: str
    tracking_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "prepared"  # prepared, shipped, in_transit, delivered
    estimated_delivery: Optional[datetime] = None
    shipping_address: str
    shipping_notes: Optional[str] = ""

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
    status: str

class TagUpdate(BaseModel):
    pet_id: str
    status: str

class BulkTagUpdate(BaseModel):
    pet_ids: List[str]
    new_status: str
    notes: Optional[str] = ""

class PrintJobRequest(BaseModel):
    pet_ids: List[str]
    job_name: Optional[str] = ""

class AdminStats(BaseModel):
    total_pets: int
    pets_paid: int
    pets_in_arrears: int
    tags_ordered: int
    tags_printed: int
    tags_manufactured: int
    tags_shipped: int
    tags_delivered: int
    monthly_revenue: float
    total_revenue: float
    replacement_orders: int

# Authentication functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    return verify_token(credentials.credentials)

# Email functions
async def send_email(to: str, subject: str, template_name: str, context: dict, attachments: List = None):
    """Send email with template"""
    try:
        template = env.get_template(template_name)
        html_body = template.render(**context)
        
        message = MessageSchema(
            subject=subject,
            recipients=[to],
            body=html_body,
            subtype="html",
            attachments=attachments or []
        )
        
        fm = FastMail(email_conf)
        await fm.send_message(message)
        return True
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False

async def send_qr_code_email(pet: Pet, background_tasks: BackgroundTasks):
    """Send QR code email after registration"""
    qr_path = qr_codes_dir / f"{pet.pet_id}_qr.png"
    
    context = {
        "owner_name": pet.owner.name,
        "owner_email": pet.owner.email,
        "pet_name": pet.name,
        "breed": pet.breed,
        "pet_id": pet.pet_id,
        "registration_date": pet.created_at.strftime("%Y-%m-%d"),
        "customer_portal_url": f"{os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')}/customer"
    }
    
    attachments = []
    if qr_path.exists():
        attachments.append({
            "file": str(qr_path),
            "headers": {"Content-ID": "<qr_image>"}
        })
    
    background_tasks.add_task(
        send_email,
        pet.owner.email,
        f"🐾 {pet.name}'s Pet Tag Registration Confirmed - {pet.pet_id}",
        "qr_code_email.html",
        context,
        attachments
    )

async def send_payment_reminder(pet: Pet, background_tasks: BackgroundTasks):
    """Send payment reminder email"""
    context = {
        "owner_name": pet.owner.name,
        "pet_name": pet.name,
        "pet_id": pet.pet_id,
        "monthly_fee": f"{pet.monthly_fee:.2f}",
        "amount_due": f"{pet.monthly_fee:.2f}",
        "last_payment_date": pet.last_payment.strftime("%Y-%m-%d") if pet.last_payment else "Never"
    }
    
    background_tasks.add_task(
        send_email,
        pet.owner.email,
        f"💳 Payment Reminder for {pet.name} - {pet.pet_id}",
        "payment_reminder.html",
        context
    )

async def send_shipping_notification(pet: Pet, courier: str, tracking_number: str, background_tasks: BackgroundTasks):
    """Send shipping notification"""
    context = {
        "owner_name": pet.owner.name,
        "pet_name": pet.name,
        "pet_id": pet.pet_id,
        "courier": courier,
        "tracking_number": tracking_number,
        "shipping_date": datetime.now().strftime("%Y-%m-%d"),
        "estimated_delivery": (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
    }
    
    background_tasks.add_task(
        send_email,
        pet.owner.email,
        f"📦 {pet.name}'s Pet Tag Shipped - {pet.pet_id}",
        "shipping_notification.html",
        context
    )

# Admin authentication (simple for MVP)
ADMIN_TOKEN = "admin123"

def verify_admin(token: str = None):
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return True

@api_router.get("/")
async def root():
    return {"message": "Pet Tag System API with Customer Portal"}

@api_router.post("/pets/register")
async def register_pet(
    pet_data: str = Form(...),
    photo: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Register a new pet with photo upload and email notification"""
    try:
        pet_info = json.loads(pet_data)
        registration_data = PetRegistration(**pet_info)
        
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
            last_payment=datetime.now(timezone.utc),
            annual_adjustment_date=datetime.now(timezone.utc)
        )
        
        await db.pets.insert_one(pet.dict())
        
        # Send email notification
        await send_qr_code_email(pet, background_tasks)
        
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
        
        return QRScanResponse(
            pet_name=pet.name,
            pet_photo_url=pet.photo_url,
            owner_name=pet.owner.name,
            owner_mobile=pet.owner.mobile
        )
        
    except Exception as e:
        logging.error(f"Error scanning QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# CUSTOMER PORTAL ENDPOINTS

@api_router.post("/customer/login")
async def customer_login(login_data: CustomerLogin):
    """Customer login with email and pet ID"""
    try:
        # Find pet by email and pet_id
        pet_doc = await db.pets.find_one({
            "owner.email": login_data.email,
            "pet_id": login_data.pet_id
        })
        
        if not pet_doc:
            raise HTTPException(status_code=401, detail="Invalid email or Pet ID")
        
        # Create JWT token
        access_token = create_access_token(data={"sub": login_data.email})
        
        return CustomerToken(access_token=access_token)
        
    except Exception as e:
        logging.error(f"Error during customer login: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/customer/profile")
async def get_customer_profile(current_customer: str = Depends(get_current_customer)):
    """Get customer profile with all pets"""
    try:
        pets_docs = await db.pets.find({"owner.email": current_customer}).to_list(100)
        pets = [Pet(**pet) for pet in pets_docs]
        
        total_pets = len(pets)
        active_payments = len([p for p in pets if p.payment_status == "paid"])
        total_donations = sum(p.monthly_fee for p in pets if p.payment_status == "paid")
        
        return CustomerProfile(
            pets=pets,
            total_pets=total_pets,
            active_payments=active_payments,
            total_donations=total_donations
        )
        
    except Exception as e:
        logging.error(f"Error getting customer profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/customer/pet/{pet_id}")
async def update_pet(
    pet_id: str,
    update_data: PetUpdate,
    current_customer: str = Depends(get_current_customer)
):
    """Update pet information"""
    try:
        # Verify ownership
        pet_doc = await db.pets.find_one({
            "pet_id": pet_id,
            "owner.email": current_customer
        })
        
        if not pet_doc:
            raise HTTPException(status_code=404, detail="Pet not found or not owned by customer")
        
        # Update pet data
        update_fields = {k: v for k, v in update_data.dict().items() if v is not None}
        
        if update_fields:
            await db.pets.update_one(
                {"pet_id": pet_id},
                {"$set": update_fields}
            )
        
        return {"success": True, "message": "Pet updated successfully"}
        
    except Exception as e:
        logging.error(f"Error updating pet: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/customer/profile")
async def update_customer_profile(
    update_data: OwnerUpdate,
    current_customer: str = Depends(get_current_customer)
):
    """Update customer contact information"""
    try:
        # Update all pets owned by this customer
        update_fields = {}
        for field, value in update_data.dict().items():
            if value is not None:
                update_fields[f"owner.{field}"] = value
        
        if update_fields:
            result = await db.pets.update_many(
                {"owner.email": current_customer},
                {"$set": update_fields}
            )
            
            return {"success": True, "updated_pets": result.modified_count}
        
        return {"success": True, "message": "No changes to update"}
        
    except Exception as e:
        logging.error(f"Error updating customer profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/customer/request-replacement/{pet_id}")
async def request_tag_replacement(
    pet_id: str,
    reason: str,
    current_customer: str = Depends(get_current_customer)
):
    """Request tag replacement"""
    try:
        # Verify ownership
        pet_doc = await db.pets.find_one({
            "pet_id": pet_id,
            "owner.email": current_customer
        })
        
        if not pet_doc:
            raise HTTPException(status_code=404, detail="Pet not found or not owned by customer")
        
        # Create replacement request
        replacement = TagReplacement(
            original_pet_id=pet_id,
            new_pet_id="PENDING",  # Will be assigned by admin
            reason=reason
        )
        
        await db.tag_replacements.insert_one(replacement.dict())
        
        return {
            "success": True,
            "message": "Replacement request submitted",
            "replacement_fee": replacement.replacement_fee
        }
        
    except Exception as e:
        logging.error(f"Error requesting tag replacement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/customer/download-qr/{pet_id}")
async def download_qr_code(
    pet_id: str,
    current_customer: str = Depends(get_current_customer)
):
    """Download QR code for customer's pet"""
    try:
        # Verify ownership
        pet_doc = await db.pets.find_one({
            "pet_id": pet_id,
            "owner.email": current_customer
        })
        
        if not pet_doc:
            raise HTTPException(status_code=404, detail="Pet not found or not owned by customer")
        
        qr_path = qr_codes_dir / f"{pet_id}_qr.png"
        if not qr_path.exists():
            raise HTTPException(status_code=404, detail="QR code file not found")
        
        return FileResponse(
            path=str(qr_path),
            filename=f"{pet_id}_qr_code.png",
            media_type="image/png"
        )
        
    except Exception as e:
        logging.error(f"Error downloading QR code: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ADMIN ENDPOINTS (Enhanced with automation)

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
        pets = await db.pets.find().to_list(10000)
        replacements = await db.tag_replacements.find().to_list(10000)
        
        total_pets = len(pets)
        pets_paid = len([p for p in pets if p.get('payment_status') == 'paid'])
        pets_in_arrears = len([p for p in pets if p.get('payment_status') == 'arrears'])
        
        tags_ordered = len([p for p in pets if p.get('tag_status') == 'ordered'])
        tags_printed = len([p for p in pets if p.get('tag_status') == 'printed'])
        tags_manufactured = len([p for p in pets if p.get('tag_status') == 'manufactured'])
        tags_shipped = len([p for p in pets if p.get('tag_status') == 'shipped'])
        tags_delivered = len([p for p in pets if p.get('tag_status') == 'delivered'])
        
        monthly_revenue = pets_paid * 2.0
        total_revenue = monthly_revenue
        replacement_orders = len(replacements)
        
        return AdminStats(
            total_pets=total_pets,
            pets_paid=pets_paid,
            pets_in_arrears=pets_in_arrears,
            tags_ordered=tags_ordered,
            tags_printed=tags_printed,
            tags_manufactured=tags_manufactured,
            tags_shipped=tags_shipped,
            tags_delivered=tags_delivered,
            monthly_revenue=monthly_revenue,
            total_revenue=total_revenue,
            replacement_orders=replacement_orders
        )
        
    except Exception as e:
        logging.error(f"Error getting admin stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/automation/send-payment-reminders")
async def send_payment_reminders(token: str, background_tasks: BackgroundTasks):
    """Send payment reminder emails to customers in arrears"""
    verify_admin(token)
    try:
        arrears_pets = await db.pets.find({"payment_status": "arrears"}).to_list(1000)
        
        sent_count = 0
        for pet_doc in arrears_pets:
            pet = Pet(**pet_doc)
            # Send reminder email
            await send_payment_reminder(pet, background_tasks)
            sent_count += 1
            
            # Update last email sent timestamp
            await db.pets.update_one(
                {"pet_id": pet.pet_id},
                {"$set": {"last_email_sent": datetime.now(timezone.utc)}}
            )
        
        return {
            "success": True,
            "reminders_sent": sent_count,
            "message": f"Sent {sent_count} payment reminder emails"
        }
        
    except Exception as e:
        logging.error(f"Error sending payment reminders: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/automation/annual-fee-adjustment")
async def apply_annual_fee_adjustment(token: str, percentage: float):
    """Apply annual fee adjustment to all active pets"""
    verify_admin(token)
    try:
        current_year = datetime.now().year
        adjustment_id = f"ADJ{current_year}_{int(percentage*100)}"
        
        # Get all pets that haven't had this year's adjustment
        pets = await db.pets.find({
            "payment_status": "paid",
            "$or": [
                {"annual_adjustment_date": {"$exists": False}},
                {"annual_adjustment_date": {"$lt": datetime(current_year, 1, 1)}}
            ]
        }).to_list(10000)
        
        updated_count = 0
        for pet_doc in pets:
            pet = Pet(**pet_doc)
            new_fee = round(pet.monthly_fee * (1 + percentage / 100), 2)
            
            await db.pets.update_one(
                {"pet_id": pet.pet_id},
                {
                    "$set": {
                        "monthly_fee": new_fee,
                        "annual_adjustment_date": datetime.now(timezone.utc)
                    }
                }
            )
            updated_count += 1
        
        # Record the adjustment
        adjustment = FeeAdjustment(
            adjustment_id=adjustment_id,
            year=current_year,
            percentage=percentage,
            new_fee=2.0 * (1 + percentage / 100),  # Base fee adjusted
            applied_date=datetime.now(timezone.utc),
            affected_pets=updated_count
        )
        
        await db.fee_adjustments.insert_one(adjustment.dict())
        
        return {
            "success": True,
            "adjustment_id": adjustment_id,
            "affected_pets": updated_count,
            "percentage": percentage,
            "message": f"Applied {percentage}% fee increase to {updated_count} pets"
        }
        
    except Exception as e:
        logging.error(f"Error applying fee adjustment: {str(e)}")
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

# TAG MANAGEMENT ENDPOINTS (existing ones remain the same)
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

@api_router.post("/admin/tags/generate-print-report")
async def generate_print_report(token: str, request: PrintJobRequest):
    """Generate PDF print report for manufacturing"""
    verify_admin(token)
    try:
        pets_data = []
        for pet_id in request.pet_ids:
            pet_doc = await db.pets.find_one({"pet_id": pet_id})
            if pet_doc:
                pets_data.append(Pet(**pet_doc))
        
        if not pets_data:
            raise HTTPException(status_code=400, detail="No valid pets found")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"print_job_{timestamp}.pdf"
        filepath = reports_dir / filename
        
        doc = SimpleDocTemplate(str(filepath), pagesize=A4)
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1
        )
        story.append(Paragraph("Pet Tag Manufacturing Report", title_style))
        story.append(Spacer(1, 20))
        
        job_info = f"""
        <b>Print Job Details:</b><br/>
        Job Name: {request.job_name or 'Standard Print Job'}<br/>
        Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}<br/>
        Total Tags: {len(pets_data)}<br/>
        """
        story.append(Paragraph(job_info, styles['Normal']))
        story.append(Spacer(1, 20))
        
        data = [['Pet ID', 'Pet Name', 'Owner', 'QR Code', 'Address']]
        
        for pet in pets_data:
            qr_path = qr_codes_dir / f"{pet.pet_id}_qr.png"
            if qr_path.exists():
                qr_img = Image(str(qr_path), width=1*inch, height=1*inch)
            else:
                qr_img = "QR Missing"
            
            data.append([
                pet.pet_id,
                pet.name,
                pet.owner.name,
                qr_img,
                pet.owner.address[:50] + "..." if len(pet.owner.address) > 50 else pet.owner.address
            ])
        
        table = Table(data, colWidths=[1.2*inch, 1.2*inch, 1.5*inch, 1.2*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        story.append(table)
        doc.build(story)
        
        return {
            "success": True,
            "filename": filename,
            "download_url": f"/reports/{filename}",
            "pet_count": len(pets_data)
        }
        
    except Exception as e:
        logging.error(f"Error generating print report: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/create-manufacturing-batch")
async def create_manufacturing_batch(token: str, pet_ids: List[str], notes: Optional[str] = ""):
    """Create a manufacturing batch for selected pets"""
    verify_admin(token)
    try:
        batch_id = f"MFG{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        batch = ManufacturingBatch(
            batch_id=batch_id,
            pet_ids=pet_ids,
            quantity=len(pet_ids),
            manufacturing_notes=notes
        )
        
        await db.manufacturing_batches.insert_one(batch.dict())
        
        await db.pets.update_many(
            {"pet_id": {"$in": pet_ids}},
            {
                "$set": {
                    "tag_status": "printed",
                    "manufacturing_batch": batch_id
                }
            }
        )
        
        return {
            "success": True,
            "batch_id": batch_id,
            "pet_count": len(pet_ids),
            "message": f"Manufacturing batch {batch_id} created successfully"
        }
        
    except Exception as e:
        logging.error(f"Error creating manufacturing batch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/create-shipping-batch")
async def create_shipping_batch(token: str, pet_ids: List[str], courier: str, tracking_number: Optional[str] = "", background_tasks: BackgroundTasks = BackgroundTasks()):
    """Create shipping batch for manufactured tags with email notifications"""
    verify_admin(token)
    try:
        shipping_id = f"SHIP{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        pet_doc = await db.pets.find_one({"pet_id": pet_ids[0]})
        if not pet_doc:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        shipping_address = pet_doc["owner"]["address"]
        
        batch = ShippingBatch(
            shipping_id=shipping_id,
            pet_ids=pet_ids,
            courier=courier,
            tracking_number=tracking_number,
            shipping_address=shipping_address
        )
        
        await db.shipping_batches.insert_one(batch.dict())
        
        await db.pets.update_many(
            {"pet_id": {"$in": pet_ids}},
            {"$set": {"tag_status": "shipped", "shipping_tracking": tracking_number}}
        )
        
        # Send shipping notifications
        for pet_id in pet_ids:
            pet_doc = await db.pets.find_one({"pet_id": pet_id})
            if pet_doc:
                pet = Pet(**pet_doc)
                await send_shipping_notification(pet, courier, tracking_number, background_tasks)
        
        return {
            "success": True,
            "shipping_id": shipping_id,
            "pet_count": len(pet_ids),
            "message": f"Shipping batch {shipping_id} created successfully"
        }
        
    except Exception as e:
        logging.error(f"Error creating shipping batch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/bulk-update")
async def bulk_update_tag_status(token: str, request: BulkTagUpdate):
    """Bulk update tag status for multiple pets"""
    verify_admin(token)
    try:
        update_data = {"tag_status": request.new_status}
        if request.new_status == "delivered":
            update_data["delivered_date"] = datetime.now(timezone.utc)
        
        result = await db.pets.update_many(
            {"pet_id": {"$in": request.pet_ids}},
            {"$set": update_data}
        )
        
        return {
            "success": True,
            "updated_count": result.modified_count,
            "message": f"Updated {result.modified_count} pets to status: {request.new_status}"
        }
        
    except Exception as e:
        logging.error(f"Error bulk updating tag status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/update-status")
async def update_tag_status(token: str, update: TagUpdate):
    """Update tag status for individual pet"""
    verify_admin(token)
    try:
        update_data = {"tag_status": update.status}
        if update.status == "delivered":
            update_data["delivered_date"] = datetime.now(timezone.utc)
        
        result = await db.pets.update_one(
            {"pet_id": update.pet_id},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Pet not found")
        
        return {"success": True, "message": f"Tag status updated to {update.status}"}
        
    except Exception as e:
        logging.error(f"Error updating tag status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/tags/create-replacement")
async def create_tag_replacement(token: str, original_pet_id: str, reason: str):
    """Create a replacement tag for lost/damaged tag"""
    verify_admin(token)
    try:
        original_pet_doc = await db.pets.find_one({"pet_id": original_pet_id})
        if not original_pet_doc:
            raise HTTPException(status_code=404, detail="Original pet not found")
        
        original_pet = Pet(**original_pet_doc)
        new_pet_id = await get_next_pet_id()
        
        replacement = TagReplacement(
            original_pet_id=original_pet_id,
            new_pet_id=new_pet_id,
            reason=reason
        )
        
        await db.tag_replacements.insert_one(replacement.dict())
        
        # Generate new QR code
        qr_url = f"{os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3000')}/scan/{new_pet_id}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_url)
        qr.make(fit=True)
        
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_filename = f"{new_pet_id}_qr.png"
        qr_path = qr_codes_dir / qr_filename
        qr_img.save(qr_path)
        qr_code_url = f"/qr_codes/{qr_filename}"
        
        new_pet = original_pet.copy()
        new_pet.pet_id = new_pet_id
        new_pet.qr_code_url = qr_code_url
        new_pet.tag_status = "ordered"
        new_pet.replacement_count = original_pet.replacement_count + 1
        new_pet.created_at = datetime.now(timezone.utc)
        
        await db.pets.insert_one(new_pet.dict())
        
        await db.pets.update_one(
            {"pet_id": original_pet_id},
            {"$set": {"tag_status": "replaced"}}
        )
        
        return {
            "success": True,
            "original_pet_id": original_pet_id,
            "new_pet_id": new_pet_id,
            "qr_code_url": qr_code_url,
            "replacement_fee": replacement.replacement_fee
        }
        
    except Exception as e:
        logging.error(f"Error creating tag replacement: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# BILLING ENDPOINTS (existing)
@api_router.post("/admin/billing/generate-csv")
async def generate_billing_csv(token: str):
    """Generate monthly billing CSV for bank processing"""
    verify_admin(token)
    try:
        pets = await db.pets.find({"payment_status": "paid"}).to_list(1000)
        
        if not pets:
            raise HTTPException(status_code=400, detail="No pets with paid status found")
        
        csv_filename = f"billing_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        csv_path = billing_dir / csv_filename
        
        with open(csv_path, "w", newline='', encoding='utf-8') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow(['Customer_ID', 'Account_Holder_Name', 'Account_Number', 'Branch_Code', 'Amount'])
            
            for pet_doc in pets:
                pet = Pet(**pet_doc)
                writer.writerow([
                    pet.pet_id,
                    pet.owner.account_holder_name,
                    pet.owner.bank_account_number,
                    pet.owner.branch_code,
                    f"{pet.monthly_fee:.2f}"
                ])
        
        return {
            "success": True,
            "filename": csv_filename,
            "total_amount": sum(Pet(**pet).monthly_fee for pet in pets),
            "customer_count": len(pets),
            "download_url": f"/billing/{csv_filename}"
        }
        
    except Exception as e:
        logging.error(f"Error generating billing CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/payments/import-results")
async def import_payment_results(
    token: str,
    results_file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Import payment results from bank processing"""
    verify_admin(token)
    try:
        content = await results_file.read()
        csv_data = StringIO(content.decode('utf-8'))
        
        reader = csv.DictReader(csv_data)
        updated_count = 0
        failed_count = 0
        
        for row in reader:
            customer_id = row.get('Customer_ID', '').strip()
            status = row.get('Status', '').strip().lower()
            
            if customer_id and status in ['success', 'paid']:
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
                result = await db.pets.update_one(
                    {"pet_id": customer_id},
                    {"$set": {"payment_status": "arrears"}}
                )
                if result.modified_count > 0:
                    failed_count += 1
                    
                    # Send payment reminder for failed payments
                    pet_doc = await db.pets.find_one({"pet_id": customer_id})
                    if pet_doc:
                        pet = Pet(**pet_doc)
                        await send_payment_reminder(pet, background_tasks)
        
        return {
            "success": True,
            "updated_count": updated_count,
            "failed_count": failed_count,
            "message": f"Updated {updated_count} successful payments, {failed_count} failed payments. Reminders sent to failed payments."
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
