import os
import secrets
import re
from typing import Optional
from urllib.parse import urlparse

# JWT Configuration
JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
if not JWT_SECRET_KEY or JWT_SECRET_KEY == "your-secret-key-change-in-production":
    # Generate a secure random key if not provided
    JWT_SECRET_KEY = secrets.token_urlsafe(32)
    print("⚠️  WARNING: Using auto-generated JWT secret. Set JWT_SECRET_KEY environment variable for production!")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # Reduced from 24 hours to 30 minutes

# Rate Limiting Configuration
RATE_LIMIT_LOGIN = "5/minute"  # 5 login attempts per minute
RATE_LIMIT_API = "100/minute"  # 100 API calls per minute

# File Upload Configuration
MAX_METADATA_SIZE = 10240  # 10KB max for metadata JSON
ALLOWED_FILE_EXTENSIONS = {'.pdf', '.doc', '.docx', '.txt', '.png', '.jpg', '.jpeg'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Security Headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()"
}

# Input Validation
MAX_STRING_LENGTH = 500
MAX_DESCRIPTION_LENGTH = 2000

# Allowed external domains for document URLs
ALLOWED_EXTERNAL_DOMAINS = [
    'hcostadealmeria.net',
    'www.hcostadealmeria.net'
]

def validate_external_url(url: str) -> bool:
    """Validate external URL to prevent SSRF attacks"""
    try:
        parsed = urlparse(url)
        
        # Must be http or https
        if parsed.scheme not in ['http', 'https']:
            return False
        
        # Check if domain is in allowed list
        if parsed.netloc in ALLOWED_EXTERNAL_DOMAINS:
            return True
            
        return False
    except Exception:
        return False

def sanitize_string(text: str, max_length: int = MAX_STRING_LENGTH) -> str:
    """Sanitize string input to prevent XSS and injection attacks"""
    if not text:
        return ""
    
    # Remove potential HTML/Script tags
    text = re.sub(r'<[^>]*>', '', text)
    
    # Remove potential SQL/NoSQL injection patterns
    dangerous_patterns = [
        r'\$where', r'\$ne', r'\$gt', r'\$lt', r'\$regex',
        r'javascript:', r'onerror=', r'onload=', r'<script'
    ]
    
    for pattern in dangerous_patterns:
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)
    
    # Limit length
    return text[:max_length].strip()

def validate_file_path(file_path: str) -> bool:
    """Validate file path to prevent path traversal attacks"""
    # Check for path traversal patterns
    dangerous_patterns = ['..', '~', '$', '|', '&', ';', '`']
    
    # Allow external URLs
    if file_path.startswith(('http://', 'https://')):
        return validate_external_url(file_path)
    
    # For local paths, check for dangerous patterns
    for pattern in dangerous_patterns:
        if pattern in file_path:
            return False
    
    # Must start with allowed base path
    allowed_base_paths = ['/app/backend/uploads', '/uploads']
    if not any(file_path.startswith(base) for base in allowed_base_paths):
        return False
    
    return True

def sanitize_metadata(metadata: dict) -> dict:
    """Sanitize metadata dictionary"""
    if not metadata or not isinstance(metadata, dict):
        return {}
    
    sanitized = {}
    for key, value in metadata.items():
        # Sanitize key
        safe_key = sanitize_string(str(key), 100)
        
        # Sanitize value
        if isinstance(value, str):
            safe_value = sanitize_string(value, MAX_DESCRIPTION_LENGTH)
        elif isinstance(value, (int, float, bool)):
            safe_value = value
        else:
            safe_value = sanitize_string(str(value), MAX_DESCRIPTION_LENGTH)
        
        sanitized[safe_key] = safe_value
    
    return sanitized
