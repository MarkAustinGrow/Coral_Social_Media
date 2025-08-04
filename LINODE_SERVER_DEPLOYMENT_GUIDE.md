# Linode Server Deployment Guide - Coral Studio Protocol Fix

## 🚀 **DEPLOYMENT READY: Complete Coral Studio Protocol Fix**

**Date:** January 8, 2025, 8:45 PM UTC  
**Status:** ✅ **PUSHED TO GITHUB - READY FOR SERVER DEPLOYMENT**  
**Branch:** `feature/coral-studio-phase2-foundation`  
**Commit:** `870af19`

---

## 📋 **Pre-Deployment Checklist**

- ✅ **Root cause identified** - Wrong protocol implementation (SSE vs WebSocket)
- ✅ **Official implementation created** - WebSocket-based debug observer
- ✅ **Coral Inspector interference resolved** - Removal script created
- ✅ **Deployment automation ready** - Single command deployment
- ✅ **Changes committed and pushed** to GitHub
- ✅ **Comprehensive documentation** provided

---

## 🖥️ **Server Deployment Commands**

### **Step 1: Connect to Linode Server**
```bash
ssh coraluser@your-linode-server-ip
```

### **Step 2: Navigate to Project Directory**
```bash
cd /home/coraluser/Coral_Social_Media
```

### **Step 3: Pull Latest Changes**
```bash
git fetch origin
git checkout feature/coral-studio-phase2-foundation
git pull origin feature/coral-studio-phase2-foundation
```

### **Step 4: Fix Syntax Error (Required)**
```bash
chmod +x fix_side_nav_syntax_error.sh
./fix_side_nav_syntax_error.sh
```

### **Step 5: Deploy the Fix (Single Command)**
```bash
chmod +x deploy_coral_studio_official_protocol_fix.sh
./deploy_coral_studio_official_protocol_fix.sh
```

---

## 🔧 **What the Deployment Script Does**

### **Phase 1: Cleanup**
1. **Removes Coral Inspector** - eliminates interference with Coral Studio
2. **Updates navigation** - removes duplicate/confusing links
3. **Cleans up old SSE implementation** - prevents conflicts

### **Phase 2: Implementation**
4. **Backs up current files** - safety first with timestamped backups
5. **Deploys official WebSocket implementation** - replaces broken SSE bridge
6. **Builds application** - compiles TypeScript and Next.js
7. **Restarts PM2 process** - applies changes to live application

---

## 🧪 **Post-Deployment Testing**

### **Immediate Verification:**
1. **Check PM2 status:**
   ```bash
   pm2 list
   pm2 logs coral-web --lines 50
   ```

2. **Test Coral Studio URL:**
   ```bash
   curl -I https://8interns.com/coral-studio
   ```

### **Browser Testing:**
1. **Navigate to:** `https://8interns.com/coral-studio`
2. **Open browser console** (F12) and verify:
   - ✅ WebSocket connection to `ws://coral.8interns.com/debug/...`
   - ✅ Official event types received (ThreadList, AgentList, MessageSent)
   - ✅ No 503 "Coral Bridge connection failed" errors
   - ✅ Agent status panel loads with real data

3. **Check navigation:**
   - ✅ Coral Inspector link removed from sidebar
   - ✅ Only Coral Studio remains in navigation

---

## 📊 **Expected Results**

### **Before Fix:**
- ❌ 503 Service Unavailable errors
- ❌ SSE connection failures to wrong endpoints
- ❌ Bridge agent registration failures
- ❌ Coral Inspector interference
- ❌ No real-time data in Coral Studio

### **After Fix:**
- ✅ WebSocket connection successful
- ✅ Official Coral Protocol events received
- ✅ Real-time session observation working
- ✅ Agent status panel populated with live data
- ✅ No system interference
- ✅ Clean, professional user experience

---

## 🔍 **Troubleshooting Guide**

### **If Deployment Script Fails:**
1. **Check permissions:**
   ```bash
   ls -la deploy_coral_studio_official_protocol_fix.sh
   chmod +x deploy_coral_studio_official_protocol_fix.sh
   ```

2. **Check Node.js/npm:**
   ```bash
   node --version
   npm --version
   cd Web_Interface && npm install
   ```

3. **Manual deployment steps:**
   ```bash
   # Remove Coral Inspector
   ./remove_coral_inspector_interference.sh
   
   # Replace protocol bridge
   cp Web_Interface/lib/coral-protocol-bridge-official.ts Web_Interface/lib/coral-protocol-bridge.ts
   
   # Build and restart
   cd Web_Interface && npm run build
   pm2 restart coral-web
   ```

### **If WebSocket Connection Fails:**
1. **Check Coral server connectivity:**
   ```bash
   telnet coral.8interns.com 80
   nc -zv coral.8interns.com 80
   ```

2. **Check firewall/network:**
   ```bash
   sudo ufw status
   netstat -tlnp | grep :3000
   ```

3. **Check PM2 logs:**
   ```bash
   pm2 logs coral-web --lines 100
   pm2 monit
   ```

### **If 503 Errors Persist:**
1. **Verify Coral Inspector removal:**
   ```bash
   ls -la Web_Interface/app/coral-inspector/
   grep -r "coral-inspector" Web_Interface/components/side-nav.tsx
   ```

2. **Check browser cache:**
   - Clear browser cache and cookies
   - Try incognito/private browsing mode
   - Check browser developer tools for cached resources

3. **Restart services:**
   ```bash
   pm2 restart all
   pm2 reload ecosystem.config.js
   ```

---

## 📝 **Files Modified/Created**

### **New Files:**
- `CORAL_STUDIO_PROTOCOL_ARCHITECTURE_ANALYSIS_COMPLETE.md`
- `CORAL_STUDIO_COMPLETE_FIX_FINAL.md`
- `Web_Interface/lib/coral-protocol-bridge-official.ts`
- `remove_coral_inspector_interference.sh`
- `deploy_coral_studio_official_protocol_fix.sh`

### **Modified Files:**
- `Web_Interface/lib/coral-protocol-bridge.ts` (will be replaced during deployment)
- `Web_Interface/components/side-nav.tsx` (Coral Inspector link removed)
- `Web_Interface/app/coral-inspector/` (directory removed)

---

## 🎯 **Success Metrics**

### **Technical Metrics:**
- ✅ **0 HTTP 503 errors** from Coral Studio
- ✅ **WebSocket connection established** within 5 seconds
- ✅ **Official events received** (ThreadList, AgentList, MessageSent)
- ✅ **Real-time updates** working in agent status panel

### **User Experience Metrics:**
- ✅ **Clean navigation** - no duplicate/confusing links
- ✅ **Fast loading** - no timeout errors
- ✅ **Live data** - agent statuses update in real-time
- ✅ **Professional interface** - matches official Coral Studio

---

## 🏆 **Deployment Completion**

### **Verification Commands:**
```bash
# Check deployment success
pm2 list | grep coral-web
curl -s https://8interns.com/coral-studio | grep -i "coral studio"

# Check WebSocket connectivity (from browser console)
# new WebSocket('ws://coral.8interns.com/debug/exampleApplication/privkey/session_test/?timeout=10000')

# Verify no 503 errors
curl -I https://8interns.com/coral-studio
```

### **Final Status Check:**
- [ ] PM2 process running and healthy
- [ ] Coral Studio page loads without errors
- [ ] WebSocket connection established in browser console
- [ ] Agent status panel shows live data
- [ ] No 503 Service Unavailable errors
- [ ] Navigation clean (no Coral Inspector link)

---

## 📞 **Support Information**

**Documentation Files:**
- `CORAL_STUDIO_COMPLETE_FIX_FINAL.md` - Complete implementation guide
- `CORAL_STUDIO_PROTOCOL_ARCHITECTURE_ANALYSIS_COMPLETE.md` - Technical analysis

**Key Changes:**
- **Protocol:** SSE → WebSocket
- **Endpoint:** `/devmode/.../sse` → `/debug/.../websocket`
- **Role:** Bridge Agent → Debug Observer
- **Events:** Custom → Official (ThreadList, AgentList, MessageSent)

**Deployment Status:** ✅ **READY FOR PRODUCTION**

---

**Last Updated:** January 8, 2025, 8:45 PM UTC  
**GitHub Branch:** `feature/coral-studio-phase2-foundation`  
**Commit Hash:** `870af19`  
**Deployment Method:** Single command automation script
