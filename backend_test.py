import requests
import sys
import json
from datetime import datetime

class PDFDocumentSystemTester:
    def __init__(self, base_url="https://docusphere-7.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.admin_user_id = None
        self.test_user_id = None
        self.test_team_id = None
        self.test_metadata_id = None
        self.test_workspace_id = None
        self.test_document_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            if 'user' in response:
                self.admin_user_id = response['user']['id']
                print(f"   Admin user ID: {self.admin_user_id}")
                print(f"   First login: {response['user'].get('first_login', False)}")
            return True
        return False

    def test_change_password(self, old_password, new_password):
        """Test password change"""
        success, _ = self.run_test(
            "Change Password",
            "POST",
            "auth/change-password",
            200,
            data={"old_password": old_password, "new_password": new_password}
        )
        return success

    def test_get_current_user(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success, response

    def test_create_user(self, email, password, role="user"):
        """Test creating a new user"""
        success, response = self.run_test(
            "Create User",
            "POST",
            "users",
            200,
            data={"email": email, "password": password, "role": role, "team_ids": []}
        )
        if success and 'id' in response:
            self.test_user_id = response['id']
            print(f"   Created user ID: {self.test_user_id}")
        return success, response

    def test_list_users(self):
        """Test listing all users"""
        success, response = self.run_test(
            "List Users",
            "GET",
            "users",
            200
        )
        return success, response

    def test_create_team(self, name, description="Test team"):
        """Test creating a team"""
        success, response = self.run_test(
            "Create Team",
            "POST",
            "teams",
            200,
            data={"name": name, "description": description, "user_ids": []}
        )
        if success and 'id' in response:
            self.test_team_id = response['id']
            print(f"   Created team ID: {self.test_team_id}")
        return success, response

    def test_list_teams(self):
        """Test listing all teams"""
        success, response = self.run_test(
            "List Teams",
            "GET",
            "teams",
            200
        )
        return success, response

    def test_create_metadata(self, name, field_type="text"):
        """Test creating metadata definition"""
        success, response = self.run_test(
            "Create Metadata",
            "POST",
            "metadata",
            200,
            data={"name": name, "field_type": field_type, "visible": True, "options": []}
        )
        if success and 'id' in response:
            self.test_metadata_id = response['id']
            print(f"   Created metadata ID: {self.test_metadata_id}")
        return success, response

    def test_list_metadata(self):
        """Test listing all metadata definitions"""
        success, response = self.run_test(
            "List Metadata",
            "GET",
            "metadata",
            200
        )
        return success, response

    def test_create_workspace(self, name, description="Test workspace"):
        """Test creating a workspace"""
        metadata_ids = [self.test_metadata_id] if self.test_metadata_id else []
        team_ids = [self.test_team_id] if self.test_team_id else []
        
        success, response = self.run_test(
            "Create Workspace",
            "POST",
            "workspaces",
            200,
            data={
                "name": name,
                "description": description,
                "metadata_ids": metadata_ids,
                "team_ids": team_ids
            }
        )
        if success and 'id' in response:
            self.test_workspace_id = response['id']
            print(f"   Created workspace ID: {self.test_workspace_id}")
        return success, response

    def test_list_workspaces(self):
        """Test listing all workspaces"""
        success, response = self.run_test(
            "List Workspaces",
            "GET",
            "workspaces",
            200
        )
        return success, response

    def test_create_document(self, workspace_id, file_name, file_path):
        """Test creating a document"""
        success, response = self.run_test(
            "Create Document",
            "POST",
            f"workspaces/{workspace_id}/documents",
            200,
            data={
                "workspace_id": workspace_id,
                "file_name": file_name,
                "file_path": file_path,
                "metadata": {"category": "test", "author": "test user"}
            }
        )
        if success and 'id' in response:
            self.test_document_id = response['id']
            print(f"   Created document ID: {self.test_document_id}")
        return success, response

    def test_list_documents(self, workspace_id):
        """Test listing documents in workspace"""
        success, response = self.run_test(
            "List Documents",
            "GET",
            f"workspaces/{workspace_id}/documents",
            200
        )
        return success, response

    def test_search_documents(self, query):
        """Test document search"""
        success, response = self.run_test(
            "Search Documents",
            "GET",
            f"documents/search?q={query}",
            200
        )
        return success, response

    def test_update_document(self, doc_id, new_name):
        """Test updating a document"""
        success, response = self.run_test(
            "Update Document",
            "PUT",
            f"documents/{doc_id}",
            200,
            data={"file_name": new_name}
        )
        return success, response

    def test_delete_document(self, doc_id):
        """Test deleting a document"""
        success, response = self.run_test(
            "Delete Document",
            "DELETE",
            f"documents/{doc_id}",
            200
        )
        return success, response

def main():
    print("🚀 Starting PDF Document Management System API Tests")
    print("=" * 60)
    
    tester = PDFDocumentSystemTester()
    
    # Test 1: Login with default admin credentials
    # Try with original password first, then with changed password
    login_success = False
    if tester.test_login("admin", "admin"):
        login_success = True
    elif tester.test_login("admin", "newpassword123"):
        login_success = True
        print("   Using previously changed password")
    
    if not login_success:
        print("❌ Login failed with both passwords, stopping tests")
        return 1

    # Test 2: Get current user info
    success, user_info = tester.test_get_current_user()
    if success:
        print(f"   User role: {user_info.get('role')}")
        print(f"   First login: {user_info.get('first_login')}")

    # Test 3: Change password (required for first login)
    if user_info.get('first_login'):
        if not tester.test_change_password("admin", "newpassword123"):
            print("❌ Password change failed")
        else:
            print("✅ Password changed successfully")

    # Test 4: User Management
    tester.test_create_user("testuser@example.com", "testpass123", "user")
    tester.test_list_users()

    # Test 5: Team Management
    tester.test_create_team("Test Team", "A test team for testing")
    tester.test_list_teams()

    # Test 6: Metadata Management
    tester.test_create_metadata("Category", "text")
    tester.test_list_metadata()

    # Test 7: Workspace Management
    tester.test_create_workspace("Test Workspace", "A test workspace")
    tester.test_list_workspaces()

    # Test 8: Document Management
    if tester.test_workspace_id:
        tester.test_create_document(
            tester.test_workspace_id,
            "test_document.pdf",
            "/path/to/test_document.pdf"
        )
        tester.test_list_documents(tester.test_workspace_id)
        
        # Test document search
        tester.test_search_documents("test")
        
        # Test document update
        if tester.test_document_id:
            tester.test_update_document(tester.test_document_id, "updated_document.pdf")
            
        # Test document deletion
        if tester.test_document_id:
            tester.test_delete_document(tester.test_document_id)

    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.failed_tests:
        print("\n❌ Failed Tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure.get('test', 'Unknown')}: {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())