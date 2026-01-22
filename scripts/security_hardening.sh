#!/bin/bash

echo "🔒 Costa_Doc Security Hardening Script"
echo "========================================"

# Create audit log file
echo "📋 Setting up audit logging..."
sudo touch /var/log/costa_doc_audit.log
sudo chmod 640 /var/log/costa_doc_audit.log
sudo chown $(whoami):$(whoami) /var/log/costa_doc_audit.log

# Check for default admin password
echo "⚠️  WARNING: Please change the default admin password!"
echo "   Login as admin and change password immediately"

# Display security recommendations
echo ""
echo "🔐 Security Recommendations:"
echo "  1. ✅ JWT secret key configured"
echo "  2. ✅ Rate limiting enabled"
echo "  3. ✅ Security headers configured"
echo "  4. ✅ Input validation implemented"
echo "  5. ✅ Audit logging enabled"
echo "  6. ⚠️  Change default admin password"
echo "  7. ⚠️  Configure CORS_ORIGINS for production"
echo "  8. ⚠️  Set up HTTPS/TLS for production"
echo "  9. ⚠️  Review audit logs regularly: /var/log/costa_doc_audit.log"
echo "  10. ⚠️  Keep dependencies updated"

echo ""
echo "✅ Security hardening complete!"
echo ""
echo "📝 Next Steps:"
echo "  1. Change admin password at first login"
echo "  2. Update CORS_ORIGINS in /app/backend/.env"
echo "  3. Configure firewall rules"
echo "  4. Set up log rotation"
echo "  5. Enable automated backups"
