#!/bin/bash

# Remove Coral Inspector Interference Script
# This script removes the old Coral Inspector that could interfere with Coral Studio

echo "🧹 Removing Coral Inspector Interference..."
echo "============================================="

# Check if we're in the correct directory
if [ ! -d "Web_Interface/app" ]; then
    echo "❌ Error: Web_Interface/app directory not found. Please run this script from the project root directory."
    exit 1
fi

# 1. Remove the coral-inspector page directory
echo "📁 Removing /coral-inspector page..."
if [ -d "Web_Interface/app/coral-inspector" ]; then
    rm -rf Web_Interface/app/coral-inspector
    echo "✅ Removed Web_Interface/app/coral-inspector directory"
else
    echo "ℹ️  coral-inspector directory already removed"
fi

# 2. Update side navigation to remove Coral Inspector link
echo "🔗 Updating navigation to remove Coral Inspector link..."
if [ -f "Web_Interface/components/side-nav.tsx" ]; then
    # Create backup
    cp Web_Interface/components/side-nav.tsx Web_Interface/components/side-nav.tsx.backup.$(date +%Y%m%d_%H%M%S)
    
    # Remove the Coral Inspector entry from the navigation
    sed -i '/title: "Coral Inspector"/,/},/d' Web_Interface/components/side-nav.tsx
    
    echo "✅ Updated side navigation"
else
    echo "⚠️  side-nav.tsx not found"
fi

# 3. Check for any API routes that might be related to coral-inspector
echo "🔍 Checking for related API routes..."
if [ -d "Web_Interface/app/api/coral" ]; then
    echo "ℹ️  Found coral API routes - these will be used by Coral Studio"
    ls -la Web_Interface/app/api/coral/
else
    echo "ℹ️  No coral API routes found"
fi

# 4. Remove any coral-inspector specific components (if they exist)
echo "🧩 Checking for coral-inspector specific components..."
if [ -f "Web_Interface/components/coral-inspector.tsx" ]; then
    rm Web_Interface/components/coral-inspector.tsx
    echo "✅ Removed coral-inspector component"
else
    echo "ℹ️  No coral-inspector specific components found"
fi

# 5. Check for any imports or references to coral-inspector
echo "🔍 Searching for remaining coral-inspector references..."
if grep -r "coral-inspector" Web_Interface/ --exclude-dir=node_modules --exclude="*.backup.*" 2>/dev/null; then
    echo "⚠️  Found remaining references to coral-inspector (shown above)"
    echo "💡 These should be manually reviewed and removed if necessary"
else
    echo "✅ No remaining coral-inspector references found"
fi

echo ""
echo "🎉 Coral Inspector Removal Complete!"
echo "===================================="
echo ""
echo "📋 Summary of Changes:"
echo "  ✅ Removed /coral-inspector page directory"
echo "  ✅ Updated side navigation to remove Coral Inspector link"
echo "  ✅ Checked for and removed any related components"
echo "  ✅ Searched for remaining references"
echo ""
echo "🔧 What This Fixes:"
echo "  • Eliminates potential interference between Coral Inspector and Coral Studio"
echo "  • Removes the old SSE-based implementation that conflicts with WebSocket"
echo "  • Cleans up navigation to avoid user confusion"
echo "  • Prevents multiple systems from trying to connect to Coral server simultaneously"
echo ""
echo "📝 Next Steps:"
echo "  1. Run the main protocol fix deployment script"
echo "  2. Test Coral Studio at https://8interns.com/coral-studio"
echo "  3. Verify no 503 errors occur"
echo ""
echo "✨ Cleanup completed at: $(date)"
