
import requests
import os
import sys
import json
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

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)

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
        
        # Convert to JSON string as expected by the API
        pet_data_str = json.dumps(pet_data)
        
        # Create multipart form data
        form_data = {
            'pet_data': (None, pet_data_str, 'application/json')
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
    
    # Test pet registration
    if not tester.test_pet_registration():
        print("❌ Pet registration test failed, stopping tests")
        return 1
    
    # Test QR code scanning
    if not tester.test_qr_scan():
        print("❌ QR code scanning test failed")
        return 1
    
    # Print results
    print(f"\n📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())
      