#!/bin/bash

# Fix Side Navigation Syntax Error
# This script fixes the syntax error caused by the Coral Inspector removal

echo "🔧 Fixing side-nav.tsx syntax error..."
echo "=================================="

# Check if we're in the correct directory
if [ ! -f "Web_Interface/components/side-nav.tsx" ]; then
    echo "❌ Error: side-nav.tsx not found. Please run this script from the project root directory."
    exit 1
fi

# Create backup
echo "📋 Creating backup of current side-nav.tsx..."
cp Web_Interface/components/side-nav.tsx Web_Interface/components/side-nav.tsx.backup.$(date +%Y%m%d_%H%M%S)

# Fix the syntax error by removing the duplicate opening brace
echo "🔧 Fixing syntax error..."
sed -i '/^  {$/d' Web_Interface/components/side-nav.tsx

echo "✅ Syntax error fixed!"
echo ""
echo "🔍 Verifying fix..."
if grep -n "^  {$" Web_Interface/components/side-nav.tsx; then
    echo "⚠️  Warning: Still found duplicate braces"
else
    echo "✅ No duplicate braces found - fix successful!"
fi

echo ""
echo "📝 Next Steps:"
echo "  1. Run: cd Web_Interface && npm run build"
echo "  2. If build succeeds, run: pm2 restart coral-web"
echo ""
echo "✨ Fix completed at: $(date)"
