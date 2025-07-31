# Server: Switch to Coral Studio Branch Guide

## 🎯 Current Server Status
- **Server**: Linode production server
- **Current Branch**: `coral-working`
- **Target Branch**: `coral-studio` (contains all Coral Studio documentation)
- **Location**: `/home/coraluser/Coral_Social_Media`

## 📋 Step-by-Step Branch Switch Commands

### **Step 1: Stash Current Changes**
```bash
# You have uncommitted changes that need to be stashed first
git stash push -m "Stash agent status cache and build files before coral-studio switch"
```

### **Step 2: Fetch Latest Changes from GitHub**
```bash
# Get all the latest branches and commits
git fetch origin
```

### **Step 3: List Available Branches**
```bash
# Verify coral-studio branch is available
git branch -a
```

### **Step 4: Switch to coral-studio Branch**
```bash
# Switch to the coral-studio branch
git checkout coral-studio
```

### **Step 5: Pull Latest Changes**
```bash
# Make sure you have the latest coral-studio content
git pull origin coral-studio
```

### **Step 6: Verify Coral Studio Documentation**
```bash
# Check that the documentation files are present
ls -la CORAL_STUDIO_*.md
```

## 🔍 Expected Results

After running these commands, you should see:

### **Available Documentation Files**
```bash
CORAL_STUDIO_ANALYSIS.md                    # Technical analysis
CORAL_STUDIO_INTEGRATION_ROADMAP.md         # 4-phase implementation plan  
CORAL_STUDIO_PHASE1_COMPLETE.md             # Phase 1 completion summary
CORAL_STUDIO_PHASE1_5_AUDIT.md              # Current system audit
CORAL_STUDIO_GITHUB_BASELINE_COMPLETE.md    # Testing guide
```

### **Git Status Should Show**
```bash
On branch coral-studio
Your branch is up to date with 'origin/coral-studio'.
```

## 🧪 Test the Success Criteria

Once on the `coral-studio` branch, you can test the Phase 2 success criteria:

### **1. Current System Still Works**
```bash
# Test existing Coral Inspector
curl http://localhost:3000/coral-inspector
# Should return the existing interface (not 404)
```

### **2. Documentation Available**
```bash
# Read the roadmap
cat CORAL_STUDIO_INTEGRATION_ROADMAP.md | head -50

# Check testing guide
cat CORAL_STUDIO_GITHUB_BASELINE_COMPLETE.md | grep -A 10 "Success Criteria"
```

### **3. Tweet Scraping Agent Test**
```bash
# Test the Tweet Scraping Agent (should work as before)
python 2_langchain_tweet_scraping_agent_coral.py
# Should start without errors and show Coral Protocol connection
```

## ⚠️ Important Notes

### **About Stashed Changes**
The files you had modified are mostly cache and build files:
- `__pycache__/` - Python cache files (safe to ignore)
- `agent_status_cache/` - Agent status JSON files (will regenerate)
- `.next/` - Next.js build cache (will rebuild)
- `coral_env/` - Virtual environment (should be in .gitignore)

### **If You Need Your Stashed Changes Back**
```bash
# After switching branches, if you need the stashed changes:
git stash list
git stash pop
```

### **If coral-studio Branch Doesn't Exist**
```bash
# If the branch doesn't exist locally, create it from origin:
git checkout -b coral-studio origin/coral-studio
```

## 🎯 What You'll Have After Switch

### **All Coral Studio Documentation**
- Complete technical analysis of the Coral Studio source
- 4-phase implementation roadmap (revised to 4-5 weeks)
- Current system audit and replacement strategy
- Phase 2 success criteria testing guide

### **Preserved Existing System**
- All current functionality remains intact
- Coral Inspector still works at `/coral-inspector`
- All agents continue to function normally
- No breaking changes introduced

### **Ready for Phase 2**
- Clear implementation plan available
- Success criteria defined and testable
- Development workflow established
- Reference materials accessible

## 🚀 Next Steps After Branch Switch

1. **Review Documentation**: Read through the roadmap and testing guide
2. **Test Current System**: Verify everything still works as expected
3. **Plan Phase 2**: Review the implementation tasks and timeline
4. **Begin Development**: Start with Socket.IO dependencies installation

The `coral-studio` branch contains all the planning and analysis work completed, providing a solid foundation for Phase 2 implementation.
