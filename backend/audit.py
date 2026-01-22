import logging
from datetime import datetime, timezone
from typing import Optional

# Configure audit logger
audit_logger = logging.getLogger('audit')
audit_logger.setLevel(logging.INFO)

# Create file handler for audit logs
audit_handler = logging.FileHandler('/var/log/costa_doc_audit.log')
audit_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
audit_handler.setFormatter(formatter)

# Add handler to logger
audit_logger.addHandler(audit_handler)

def log_auth_attempt(email: str, success: bool, ip_address: str = None):
    """Log authentication attempts"""
    status = "SUCCESS" if success else "FAILED"
    audit_logger.info(f"AUTH_ATTEMPT: user={email}, status={status}, ip={ip_address}")

def log_document_access(user_id: str, document_id: str, action: str, ip_address: str = None):
    """Log document access"""
    audit_logger.info(f"DOCUMENT_ACCESS: user={user_id}, document={document_id}, action={action}, ip={ip_address}")

def log_admin_action(user_id: str, action: str, target: str, ip_address: str = None):
    """Log administrative actions"""
    audit_logger.info(f"ADMIN_ACTION: user={user_id}, action={action}, target={target}, ip={ip_address}")

def log_security_event(event_type: str, details: str, ip_address: str = None):
    """Log security events"""
    audit_logger.warning(f"SECURITY_EVENT: type={event_type}, details={details}, ip={ip_address}")
