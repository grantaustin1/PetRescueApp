
import requests
import os
import sys
import json
import csv
import io
from datetime import datetime
import time

class PetTagAPITester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.pet_id = None
        self.qr_code_url = None
        self.admin_token = "admin123"
        self.csv_filename = None
        self.manufacturing_batch_id = None
        self.shipping_batch_id = None
        self.replacement_pet_id = None
        self.customer_token = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers, params=params)
                else:
                    response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)

            print(f"Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    print(f"Response: {response.text}")
                except:
                    pass
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_pet_registration(self):
        """Test pet registration with photo upload"""
        # Create test image file
        test_image_path = "test_pet.jpg"
        with open(test_image_path, "wb") as f:
            f.write(b"test image content")
        
        # Prepare form data
        pet_data = {
            "pet_name": "Buddy",
            "breed": "Golden Retriever",
            "medical_info": "Allergic to chicken",
            "instructions": "Loves to play fetch",
            "owner_name": "John Doe",
            "mobile": "+27123456789",
            "email": "john@example.com",
            "address": "123 Main St, Cape Town",
            "bank_account_number": "123456789",
            "branch_code": "632005",
            "account_holder_name": "John Doe"
        }
        
        # Create multipart form data
        form_data = {
            'pet_data': json.dumps(pet_data)
        }
        
        files = {
            'photo': ('test_pet.jpg', open(test_image_path, 'rb'), 'image/jpeg')
        }
        
        success, response = self.run_test(
            "Pet Registration",
            "POST",
            "pets/register",
            200,
            data=form_data,
            files=files
        )
        
        # Clean up test image
        os.remove(test_image_path)
        
        if success and 'pet_id' in response:
            self.pet_id = response['pet_id']
            self.qr_code_url = response['qr_code_url']
            print(f"Successfully registered pet with ID: {self.pet_id}")
            print(f"QR Code URL: {self.qr_code_url}")
            return True
        return False

    def test_qr_scan(self):
        """Test QR code scanning endpoint"""
        if not self.pet_id:
            print("❌ Cannot test QR scan without a pet ID")
            return False
            
        success, response = self.run_test(
            "QR Code Scan",
            "GET",
            f"scan/{self.pet_id}",
            200
        )
        
        if success:
            print("QR Scan Response:")
            print(f"Pet Name: {response.get('pet_name')}")
            print(f"Owner Name: {response.get('owner_name')}")
            print(f"Owner Mobile: {response.get('owner_mobile')}")
            print(f"Pet Photo URL: {response.get('pet_photo_url')}")
            return True
        return False
        
    # Admin functionality tests
    
    def test_admin_login(self):
        """Test admin login with token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "admin/login",
            200,
            params={"token": self.admin_token}
        )
        
        if success and response.get('success'):
            print(f"Admin login successful with token: {self.admin_token}")
            return True
        return False
        
    def test_admin_stats(self):
        """Test admin dashboard statistics"""
        success, response = self.run_test(
            "Admin Stats",
            "GET",
            "admin/stats",
            200,
            params={"token": self.admin_token}
        )
        
        if success:
            print("Admin Stats:")
            print(f"Total Pets: {response.get('total_pets')}")
            print(f"Pets Paid: {response.get('pets_paid')}")
            print(f"Pets in Arrears: {response.get('pets_in_arrears')}")
            print(f"Monthly Revenue: R{response.get('monthly_revenue')}")
            return True
        return False
        
    def test_get_all_pets(self):
        """Test getting all pets for admin"""
        success, response = self.run_test(
            "Get All Pets",
            "GET",
            "admin/pets",
            200,
            params={"token": self.admin_token}
        )
        
        if success and isinstance(response, list):
            print(f"Retrieved {len(response)} pets")
            return True
        return False
        
    def test_generate_billing_csv(self):
        """Test generating billing CSV"""
        success, response = self.run_test(
            "Generate Billing CSV",
            "POST",
            "admin/billing/generate-csv",
            200,
            params={"token": self.admin_token}
        )
        
        if success and response.get('success'):
            self.csv_filename = response.get('filename')
            print(f"Generated billing CSV: {self.csv_filename}")
            print(f"Total Amount: R{response.get('total_amount')}")
            print(f"Customer Count: {response.get('customer_count')}")
            print(f"Download URL: {response.get('download_url')}")
            return True
        return False
        
    def test_download_billing_csv(self):
        """Test downloading billing CSV"""
        if not self.csv_filename:
            print("❌ Cannot test CSV download without a filename")
            return False
            
        url = f"{self.base_url}/billing/{self.csv_filename}?token={self.admin_token}"
        print(f"Downloading CSV from: {url}")
        
        try:
            response = requests.get(url)
            if response.status_code == 200:
                self.tests_passed += 1
                self.tests_run += 1
                print("✅ CSV download successful")
                
                # Verify CSV format
                csv_content = response.text
                csv_reader = csv.reader(io.StringIO(csv_content))
                rows = list(csv_reader)
                
                if len(rows) > 0 and rows[0] == ['Customer_ID', 'Account_Holder_Name', 'Account_Number', 'Branch_Code', 'Amount']:
                    print("✅ CSV format is correct")
                    return True
                else:
                    print("❌ CSV format is incorrect")
                    return False
            else:
                self.tests_run += 1
                print(f"❌ Failed to download CSV - Status: {response.status_code}")
                return False
        except Exception as e:
            self.tests_run += 1
            print(f"❌ Failed to download CSV - Error: {str(e)}")
            return False
            
    def test_update_payment_status(self):
        """Test updating payment status for a pet"""
        if not self.pet_id:
            print("❌ Cannot test payment status update without a pet ID")
            return False
            
        success, response = self.run_test(
            "Update Payment Status",
            "POST",
            "admin/pets/update-payment-status",
            200,
            data={"pet_id": self.pet_id, "status": "arrears"},
            params={"token": self.admin_token}
        )
        
        if success and response.get('success'):
            print(f"Updated payment status to 'arrears' for pet {self.pet_id}")
            
            # Now test changing it back to paid
            success2, response2 = self.run_test(
                "Update Payment Status (back to paid)",
                "POST",
                "admin/pets/update-payment-status",
                200,
                data={"pet_id": self.pet_id, "status": "paid"},
                params={"token": self.admin_token}
            )
            
            if success2 and response2.get('success'):
                print(f"Updated payment status back to 'paid' for pet {self.pet_id}")
                return True
            return False
        return False
        
    def test_update_tag_status(self):
        """Test updating tag status for a pet"""
        if not self.pet_id:
            print("❌ Cannot test tag status update without a pet ID")
            return False
            
        # Test each status transition
        statuses = ["printed", "shipped", "delivered"]
        all_success = True
        
        for status in statuses:
            success, response = self.run_test(
                f"Update Tag Status to '{status}'",
                "POST",
                "admin/tags/update-status",
                200,
                data={"pet_id": self.pet_id, "status": status},
                params={"token": self.admin_token}
            )
            
            if success and response.get('success'):
                print(f"Updated tag status to '{status}' for pet {self.pet_id}")
            else:
                all_success = False
                break
                
        return all_success
        
    def test_get_print_queue(self):
        """Test getting the print queue"""
        success, response = self.run_test(
            "Get Print Queue",
            "GET",
            "admin/tags/print-queue",
            200,
            params={"token": self.admin_token}
        )
        
        if success and isinstance(response, list):
            print(f"Print queue contains {len(response)} pets")
            return True
        return False
        
    def test_generate_print_report(self):
        """Test generating print report PDF"""
        if not self.pet_id:
            print("❌ Cannot test print report generation without a pet ID")
            return False
            
        success, response = self.run_test(
            "Generate Print Report",
            "POST",
            "admin/tags/generate-print-report",
            200,
            data={"pet_ids": [self.pet_id], "job_name": "Test Print Job"},
            params={"token": self.admin_token}
        )
        
        if success and response.get('success'):
            print(f"Generated print report: {response.get('filename')}")
            print(f"Pet Count: {response.get('pet_count')}")
            print(f"Download URL: {response.get('download_url')}")
            return True
        return False
        
    def test_create_manufacturing_batch(self):
        """Test creating a manufacturing batch"""
        if not self.pet_id:
            print("❌ Cannot test manufacturing batch creation without a pet ID")
            return False
            
        # First ensure pet is in 'ordered' status
        self.run_test(
            "Reset pet status to ordered",
            "POST",
            "admin/tags/update-status",
            200,
            data={"pet_id": self.pet_id, "status": "ordered"},
            params={"token": self.admin_token}
        )
        
        success, response = self.run_test(
            "Create Manufacturing Batch",
            "POST",
            "admin/tags/create-manufacturing-batch",
            200,
            data=[self.pet_id],
            params={"token": self.admin_token, "notes": "Test manufacturing batch"}
        )
        
        if success and response.get('success'):
            self.manufacturing_batch_id = response.get('batch_id')
            print(f"Created manufacturing batch: {self.manufacturing_batch_id}")
            print(f"Pet Count: {response.get('pet_count')}")
            return True
        return False
        
    def test_create_shipping_batch(self):
        """Test creating a shipping batch"""
        if not self.pet_id:
            print("❌ Cannot test shipping batch creation without a pet ID")
            return False
            
        # Ensure pet is in 'manufactured' status
        self.run_test(
            "Set pet status to manufactured",
            "POST",
            "admin/tags/update-status",
            200,
            data={"pet_id": self.pet_id, "status": "manufactured"},
            params={"token": self.admin_token}
        )
        
        success, response = self.run_test(
            "Create Shipping Batch",
            "POST",
            "admin/tags/create-shipping-batch",
            200,
            data=[self.pet_id],
            params={
                "token": self.admin_token,
                "courier": "Test Courier",
                "tracking_number": "TRACK123456"
            }
        )
        
        if success and response.get('success'):
            self.shipping_batch_id = response.get('shipping_id')
            print(f"Created shipping batch: {self.shipping_batch_id}")
            print(f"Pet Count: {response.get('pet_count')}")
            return True
        return False
        
    def test_bulk_update_tag_status(self):
        """Test bulk updating tag status"""
        if not self.pet_id:
            print("❌ Cannot test bulk update without a pet ID")
            return False
            
        success, response = self.run_test(
            "Bulk Update Tag Status",
            "POST",
            "admin/tags/bulk-update",
            200,
            data={
                "pet_ids": [self.pet_id],
                "new_status": "delivered",
                "notes": "Test bulk update"
            },
            params={"token": self.admin_token}
        )
        
        if success and response.get('success'):
            print(f"Bulk updated {response.get('updated_count')} pets to 'delivered'")
            return True
        return False
        
    def test_create_tag_replacement(self):
        """Test creating a tag replacement"""
        if not self.pet_id:
            print("❌ Cannot test tag replacement without a pet ID")
            return False
            
        success, response = self.run_test(
            "Create Tag Replacement",
            "POST",
            "admin/tags/create-replacement",
            200,
            params={
                "token": self.admin_token,
                "original_pet_id": self.pet_id,
                "reason": "lost"
            }
        )
        
        if success and response.get('success'):
            self.replacement_pet_id = response.get('new_pet_id')
            print(f"Created tag replacement: {self.replacement_pet_id}")
            print(f"Original Pet ID: {response.get('original_pet_id')}")
            print(f"Replacement Fee: R{response.get('replacement_fee')}")
            return True
        return False
        
    def test_import_payment_results(self):
        """Test importing payment results from CSV"""
        # Create test CSV file
        test_csv_path = "test_payment_results.csv"
        with open(test_csv_path, "w", newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['Customer_ID', 'Status', 'Amount', 'Date'])
            writer.writerow([self.pet_id, 'success', '2.00', datetime.now().strftime('%Y-%m-%d')])
        
        files = {
            'results_file': ('test_payment_results.csv', open(test_csv_path, 'rb'), 'text/csv')
        }
        
        success, response = self.run_test(
            "Import Payment Results",
            "POST",
            "admin/payments/import-results",
            200,
            files=files,
            params={"token": self.admin_token}
        )
        
        # Clean up test CSV
        os.remove(test_csv_path)
        
        if success and response.get('success'):
            print(f"Successfully imported payment results: {response.get('message')}")
            return True
        return False

    def test_customer_login(self):
        """Test customer login with email and pet ID"""
        if not self.pet_id:
            print("❌ Cannot test customer login without a pet ID")
            return False
            
        success, response = self.run_test(
            "Customer Login",
            "POST",
            "customer/login",
            200,
            data={"email": "john@example.com", "pet_id": self.pet_id}
        )
        
        if success and 'access_token' in response:
            self.customer_token = response['access_token']
            print(f"Customer login successful with token: {self.customer_token[:10]}...")
            return True
        return False
        
    def test_customer_profile(self):
        """Test getting customer profile"""
        if not hasattr(self, 'customer_token'):
            print("❌ Cannot test customer profile without a token")
            return False
            
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        success, response = self.run_test(
            "Customer Profile",
            "GET",
            "customer/profile",
            200,
            headers=headers
        )
        
        if success:
            print("Customer Profile:")
            print(f"Total Pets: {response.get('total_pets')}")
            print(f"Active Payments: {response.get('active_payments')}")
            print(f"Total Donations: R{response.get('total_donations')}")
            return True
        return False
        
    def test_update_pet_info(self):
        """Test updating pet information"""
        if not hasattr(self, 'customer_token') or not self.pet_id:
            print("❌ Cannot test pet update without token and pet ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        success, response = self.run_test(
            "Update Pet Info",
            "PUT",
            f"customer/pet/{self.pet_id}",
            200,
            data={
                "name": "Buddy Updated",
                "breed": "Golden Retriever Mix",
                "medical_info": "Allergic to chicken and beef",
                "instructions": "Loves to play fetch and swim"
            },
            headers=headers
        )
        
        if success and response.get('success'):
            print(f"Successfully updated pet information")
            return True
        return False
        
    def test_update_customer_profile(self):
        """Test updating customer profile"""
        if not hasattr(self, 'customer_token'):
            print("❌ Cannot test profile update without token")
            return False
            
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        success, response = self.run_test(
            "Update Customer Profile",
            "PUT",
            "customer/profile",
            200,
            data={
                "name": "John Smith",
                "mobile": "+27987654321",
                "address": "456 Main St, Cape Town"
            },
            headers=headers
        )
        
        if success and response.get('success'):
            print(f"Successfully updated customer profile")
            return True
        return False
        
    def test_request_tag_replacement(self):
        """Test requesting tag replacement as customer"""
        if not hasattr(self, 'customer_token') or not self.pet_id:
            print("❌ Cannot test tag replacement request without token and pet ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        success, response = self.run_test(
            "Request Tag Replacement",
            "POST",
            f"customer/request-replacement/{self.pet_id}?reason=lost",
            200,
            headers=headers
        )
        
        if success and response.get('success'):
            print(f"Successfully requested tag replacement")
            print(f"Replacement Fee: R{response.get('replacement_fee')}")
            return True
        return False
        
    def test_download_qr_code(self):
        """Test downloading QR code as customer"""
        if not hasattr(self, 'customer_token') or not self.pet_id:
            print("❌ Cannot test QR code download without token and pet ID")
            return False
            
        headers = {"Authorization": f"Bearer {self.customer_token}"}
        url = f"{self.api_url}/customer/download-qr/{self.pet_id}"
        print(f"Downloading QR code from: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                self.tests_passed += 1
                self.tests_run += 1
                print("✅ QR code download successful")
                
                # Verify it's an image
                if response.headers.get('Content-Type') == 'image/png':
                    print("✅ QR code is a PNG image")
                    return True
                else:
                    print(f"❌ QR code has unexpected content type: {response.headers.get('Content-Type')}")
                    return False
            else:
                self.tests_run += 1
                print(f"❌ Failed to download QR code - Status: {response.status_code}")
                return False
        except Exception as e:
            self.tests_run += 1
            print(f"❌ Failed to download QR code - Error: {str(e)}")
            return False
            
    def test_send_payment_reminders(self):
        """Test sending payment reminders to customers in arrears"""
        success, response = self.run_test(
            "Send Payment Reminders",
            "POST",
            "admin/automation/send-payment-reminders",
            200,
            params={"token": self.admin_token}
        )
        
        if success and response.get('success'):
            print(f"Successfully sent {response.get('reminders_sent')} payment reminders")
            return True
        return False
        
    def test_annual_fee_adjustment(self):
        """Test applying annual fee adjustment"""
        success, response = self.run_test(
            "Annual Fee Adjustment",
            "POST",
            "admin/automation/annual-fee-adjustment",
            200,
            params={"token": self.admin_token, "percentage": 5}
        )
        
        if success and response.get('success'):
            print(f"Successfully applied 5% fee adjustment")
            print(f"Adjustment ID: {response.get('adjustment_id')}")
            print(f"Affected Pets: {response.get('affected_pets')}")
            return True
        return False

def main():
    # Get the backend URL from environment variable or use default
    backend_url = "https://e22c0c5b-4fc7-4d6b-ae83-493712ca2b48.preview.emergentagent.com"
    
    print(f"Testing Pet Tag API at: {backend_url}")
    
    # Initialize tester
    tester = PetTagAPITester(backend_url)
    
    # Test basic connectivity
    if not tester.test_root_endpoint():
        print("❌ Basic API connectivity test failed, stopping tests")
        return 1
    
    print("\n=== Testing Phase 4 Email Integration & Registration ===\n")
    
    # Test pet registration (should trigger automatic QR code email)
    if not tester.test_pet_registration():
        print("❌ Pet registration test failed, stopping tests")
        return 1
    
    # Test QR code scanning
    if not tester.test_qr_scan():
        print("❌ QR code scanning test failed")
    
    print("\n=== Testing Customer Portal & Self-Service ===\n")
    
    # Test customer login
    if not tester.test_customer_login():
        print("❌ Customer login test failed, stopping customer tests")
    else:
        # Test customer profile
        if not tester.test_customer_profile():
            print("❌ Customer profile test failed")
        
        # Test updating pet information
        if not tester.test_update_pet_info():
            print("❌ Update pet info test failed")
        
        # Test updating customer profile
        if not tester.test_update_customer_profile():
            print("❌ Update customer profile test failed")
        
        # Test requesting tag replacement
        if not tester.test_request_tag_replacement():
            print("❌ Request tag replacement test failed")
        
        # Test downloading QR code
        if not tester.test_download_qr_code():
            print("❌ Download QR code test failed")
    
    print("\n=== Testing Admin Functionality & Automation ===\n")
    
    # Test admin login
    if not tester.test_admin_login():
        print("❌ Admin login test failed, stopping admin tests")
        return 1
    
    # Test admin stats
    if not tester.test_admin_stats():
        print("❌ Admin stats test failed")
    
    # Test sending payment reminders
    if not tester.test_send_payment_reminders():
        print("❌ Send payment reminders test failed")
    
    # Test annual fee adjustment
    if not tester.test_annual_fee_adjustment():
        print("❌ Annual fee adjustment test failed")
    
    # Test shipping notification (via shipping batch creation)
    if not tester.test_create_shipping_batch():
        print("❌ Create shipping batch test failed")
    
    print("\n=== Testing Tag Management Features ===\n")
    
    # Test generating print report
    if not tester.test_generate_print_report():
        print("❌ Generate print report test failed")
    
    # Test creating manufacturing batch
    if not tester.test_create_manufacturing_batch():
        print("❌ Create manufacturing batch test failed")
    
    # Test bulk updating tag status
    if not tester.test_bulk_update_tag_status():
        print("❌ Bulk update tag status test failed")
    
    # Test creating tag replacement
    if not tester.test_create_tag_replacement():
        print("❌ Create tag replacement test failed")
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
