"""
API Token Management Tests
Tests for:
- GET /api/admin/api-tokens - list tokens
- POST /api/admin/api-tokens - create token with permissions
- DELETE /api/admin/api-tokens/{id} - revoke token
- GET /api/admin/api-tokens/permissions - list available permissions
- API Token authentication for /api/documents/search with documents:search permission
- API Token rejection for /api/workspaces/{id}/documents without documents:create permission
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USER = "admin"
ADMIN_PASSWORD = "admin"


class TestApiTokenManagement:
    """Test API Token CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_USER,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        yield
    
    def test_01_list_available_permissions(self):
        """Test GET /api/admin/api-tokens/permissions - list available permissions"""
        response = requests.get(
            f"{BASE_URL}/api/admin/api-tokens/permissions",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to get permissions: {response.text}"
        
        data = response.json()
        assert "permissions" in data
        permissions = data["permissions"]
        
        # Verify expected permissions exist
        expected_permissions = [
            "documents:read",
            "documents:create",
            "documents:update",
            "documents:delete",
            "documents:search",
            "workspaces:read",
            "metadata:read"
        ]
        
        permission_values = [p["value"] for p in permissions]
        for expected in expected_permissions:
            assert expected in permission_values, f"Missing permission: {expected}"
        
        print(f"✓ Found {len(permissions)} permissions: {permission_values}")
    
    def test_02_list_api_tokens_empty_or_existing(self):
        """Test GET /api/admin/api-tokens - list tokens"""
        response = requests.get(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to list tokens: {response.text}"
        
        tokens = response.json()
        assert isinstance(tokens, list)
        print(f"✓ Found {len(tokens)} existing tokens")
    
    def test_03_create_api_token_with_search_permission(self):
        """Test POST /api/admin/api-tokens - create token with documents:search permission"""
        token_data = {
            "name": "TEST_SearchToken",
            "description": "Token for testing document search",
            "permissions": ["documents:search"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers,
            json=token_data
        )
        assert response.status_code == 200, f"Failed to create token: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "token" in data
        assert data["name"] == "TEST_SearchToken"
        assert data["token"].startswith("costa_")
        assert "documents:search" in data["permissions"]
        
        # Store for later tests
        self.__class__.search_token = data["token"]
        self.__class__.search_token_id = data["id"]
        
        print(f"✓ Created token with ID: {data['id']}")
        print(f"✓ Token starts with 'costa_': {data['token'][:10]}...")
    
    def test_04_create_api_token_with_read_only_permission(self):
        """Test POST /api/admin/api-tokens - create token with documents:read only"""
        token_data = {
            "name": "TEST_ReadOnlyToken",
            "description": "Token for testing read-only access",
            "permissions": ["documents:read", "workspaces:read"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers,
            json=token_data
        )
        assert response.status_code == 200, f"Failed to create token: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_ReadOnlyToken"
        assert "documents:read" in data["permissions"]
        assert "workspaces:read" in data["permissions"]
        
        # Store for later tests
        self.__class__.readonly_token = data["token"]
        self.__class__.readonly_token_id = data["id"]
        
        print(f"✓ Created read-only token with ID: {data['id']}")
    
    def test_05_create_token_validation_name_required(self):
        """Test POST /api/admin/api-tokens - validation: name required"""
        token_data = {
            "name": "",
            "permissions": ["documents:read"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers,
            json=token_data
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✓ Validation: empty name rejected")
    
    def test_06_create_token_validation_permissions_required(self):
        """Test POST /api/admin/api-tokens - validation: permissions required"""
        token_data = {
            "name": "TEST_NoPermissions",
            "permissions": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers,
            json=token_data
        )
        # Should fail validation - either 400 or 422
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("✓ Validation: empty permissions rejected")
    
    def test_07_create_token_duplicate_name_rejected(self):
        """Test POST /api/admin/api-tokens - duplicate name rejected"""
        token_data = {
            "name": "TEST_SearchToken",  # Same name as test_03
            "permissions": ["documents:read"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers,
            json=token_data
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "already exists" in response.json().get("detail", "").lower()
        print("✓ Duplicate name rejected")
    
    def test_08_verify_token_in_list(self):
        """Test GET /api/admin/api-tokens - verify created tokens appear in list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers
        )
        assert response.status_code == 200
        
        tokens = response.json()
        token_names = [t["name"] for t in tokens]
        
        assert "TEST_SearchToken" in token_names, "Search token not in list"
        assert "TEST_ReadOnlyToken" in token_names, "ReadOnly token not in list"
        
        # Verify token_preview is shown (not full token)
        for token in tokens:
            if token["name"] == "TEST_SearchToken":
                assert "token_preview" in token
                assert token["token_preview"].startswith("****")
                assert "token" not in token or token.get("token") is None
        
        print("✓ Created tokens appear in list with preview only")
    
    def test_09_api_token_auth_search_with_permission(self):
        """Test API Token auth: use token for /api/documents/search with documents:search permission"""
        if not hasattr(self.__class__, 'search_token'):
            pytest.skip("Search token not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.search_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/documents/search?q=test",
            headers=headers
        )
        assert response.status_code == 200, f"Search with API token failed: {response.text}"
        
        # Should return a list (even if empty)
        data = response.json()
        assert isinstance(data, list)
        
        print("✓ API token with documents:search permission can search documents")
    
    def test_10_api_token_auth_search_without_permission(self):
        """Test API Token auth: reject token without documents:search permission"""
        if not hasattr(self.__class__, 'readonly_token'):
            pytest.skip("ReadOnly token not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.readonly_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/documents/search?q=test",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        assert "documents:search" in response.json().get("detail", "").lower()
        
        print("✓ API token without documents:search permission is rejected")
    
    def test_11_api_token_auth_create_document_without_permission(self):
        """Test API Token auth: reject token without documents:create permission for workspace documents"""
        if not hasattr(self.__class__, 'readonly_token'):
            pytest.skip("ReadOnly token not created")
        
        # First get a workspace ID
        response = requests.get(
            f"{BASE_URL}/api/workspaces",
            headers=self.headers
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No workspaces available")
        
        workspace_id = response.json()[0]["id"]
        
        # Try to create document with read-only token
        headers = {
            "Authorization": f"Bearer {self.__class__.readonly_token}",
            "Content-Type": "application/json"
        }
        
        doc_data = {
            "file_path": "https://example.com/test.pdf",
            "file_name": "test.pdf",
            "metadata": {}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/workspaces/{workspace_id}/documents",
            headers=headers,
            json=doc_data
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        assert "documents:create" in response.json().get("detail", "").lower()
        
        print("✓ API token without documents:create permission is rejected for document creation")
    
    def test_12_api_token_can_read_workspaces(self):
        """Test API Token auth: token with workspaces:read can list workspaces"""
        if not hasattr(self.__class__, 'readonly_token'):
            pytest.skip("ReadOnly token not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.readonly_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/workspaces",
            headers=headers
        )
        assert response.status_code == 200, f"Failed to list workspaces: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ API token with workspaces:read can list {len(data)} workspaces")
    
    def test_13_api_token_cannot_access_admin_endpoints(self):
        """Test API Token auth: API tokens cannot access admin endpoints"""
        if not hasattr(self.__class__, 'search_token'):
            pytest.skip("Search token not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.search_token}",
            "Content-Type": "application/json"
        }
        
        # Try to access admin endpoint
        response = requests.get(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print("✓ API tokens cannot access admin endpoints")
    
    def test_14_delete_api_token(self):
        """Test DELETE /api/admin/api-tokens/{id} - revoke token"""
        if not hasattr(self.__class__, 'search_token_id'):
            pytest.skip("Search token not created")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/api-tokens/{self.__class__.search_token_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to delete token: {response.text}"
        
        data = response.json()
        assert "revoked" in data.get("message", "").lower() or "deleted" in data.get("message", "").lower()
        
        print(f"✓ Token {self.__class__.search_token_id} revoked successfully")
    
    def test_15_deleted_token_cannot_authenticate(self):
        """Test that deleted/revoked token cannot be used"""
        if not hasattr(self.__class__, 'search_token'):
            pytest.skip("Search token not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.search_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/documents/search?q=test",
            headers=headers
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        
        print("✓ Revoked token cannot authenticate")
    
    def test_16_delete_nonexistent_token(self):
        """Test DELETE /api/admin/api-tokens/{id} - nonexistent token returns 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/api-tokens/nonexistent-id-12345",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print("✓ Delete nonexistent token returns 404")
    
    def test_17_cleanup_readonly_token(self):
        """Cleanup: delete the read-only test token"""
        if not hasattr(self.__class__, 'readonly_token_id'):
            pytest.skip("ReadOnly token not created")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/api-tokens/{self.__class__.readonly_token_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to cleanup token: {response.text}"
        
        print("✓ Cleanup: ReadOnly token deleted")


class TestApiTokenWithFullPermissions:
    """Test API Token with full document permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get admin token and create full-permission API token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_USER,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        yield
    
    def test_01_create_full_permission_token(self):
        """Create token with all document permissions"""
        token_data = {
            "name": "TEST_FullPermToken",
            "description": "Token with all document permissions",
            "permissions": [
                "documents:read",
                "documents:create",
                "documents:update",
                "documents:delete",
                "documents:search",
                "workspaces:read",
                "metadata:read"
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/api-tokens",
            headers=self.headers,
            json=token_data
        )
        assert response.status_code == 200, f"Failed to create token: {response.text}"
        
        data = response.json()
        self.__class__.full_token = data["token"]
        self.__class__.full_token_id = data["id"]
        
        print(f"✓ Created full-permission token")
    
    def test_02_full_token_can_create_document(self):
        """Test full-permission token can create documents"""
        if not hasattr(self.__class__, 'full_token'):
            pytest.skip("Full token not created")
        
        # Get workspace
        response = requests.get(
            f"{BASE_URL}/api/workspaces",
            headers=self.headers
        )
        if response.status_code != 200 or not response.json():
            pytest.skip("No workspaces available")
        
        workspace_id = response.json()[0]["id"]
        
        # Create document with API token
        headers = {
            "Authorization": f"Bearer {self.__class__.full_token}",
            "Content-Type": "application/json"
        }
        
        # Use allowed domain or local path format
        doc_data = {
            "file_path": "https://hcostadealmeria.net/api-test-doc.pdf",
            "file_name": "TEST_ApiTokenDoc.pdf",
            "metadata": {"created_by": "api_token"}
        }
        
        response = requests.post(
            f"{BASE_URL}/api/workspaces/{workspace_id}/documents",
            headers=headers,
            json=doc_data
        )
        assert response.status_code == 200, f"Failed to create document: {response.text}"
        
        data = response.json()
        assert data["file_name"] == "TEST_ApiTokenDoc.pdf"
        self.__class__.created_doc_id = data["id"]
        
        print(f"✓ Full-permission token created document: {data['id']}")
    
    def test_03_full_token_can_search_documents(self):
        """Test full-permission token can search documents"""
        if not hasattr(self.__class__, 'full_token'):
            pytest.skip("Full token not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.full_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{BASE_URL}/api/documents/search?q=TEST_ApiTokenDoc",
            headers=headers
        )
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Full-permission token searched documents, found {len(data)} results")
    
    def test_04_full_token_can_delete_document(self):
        """Test full-permission token can delete documents"""
        if not hasattr(self.__class__, 'full_token') or not hasattr(self.__class__, 'created_doc_id'):
            pytest.skip("Full token or document not created")
        
        headers = {
            "Authorization": f"Bearer {self.__class__.full_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.delete(
            f"{BASE_URL}/api/documents/{self.__class__.created_doc_id}",
            headers=headers
        )
        assert response.status_code == 200, f"Delete failed: {response.text}"
        
        print(f"✓ Full-permission token deleted document")
    
    def test_05_cleanup_full_token(self):
        """Cleanup: delete the full-permission test token"""
        if not hasattr(self.__class__, 'full_token_id'):
            pytest.skip("Full token not created")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/api-tokens/{self.__class__.full_token_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed to cleanup token: {response.text}"
        
        print("✓ Cleanup: Full-permission token deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
