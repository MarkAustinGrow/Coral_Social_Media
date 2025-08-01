# EventSource Diagnostic Guide

## 🎯 Purpose

This guide helps you run the EventSource diagnostic tool to identify why Coral Studio's EventSource connections fail while curl succeeds.

## 📋 Steps to Run on Application Server

### 1. Pull the Latest Code
```bash
cd /home/coraluser/Coral_Social_Media
git pull origin feature/coral-studio-phase2-foundation
```

### 2. Make the Script Executable
```bash
chmod +x test_eventsource_connection.js
```

### 3. Install Dependencies (if needed)
```bash
# The eventsource package should already be installed from the previous fix
# But if needed, run:
cd Web_Interface
npm install
cd ..
```

### 4. Run the Diagnostic Test
```bash
node test_eventsource_connection.js
```

## 🔍 What to Look For

### ✅ Success Indicators
- `✅ Connection opened successfully`
- `📨 Received SSE message`
- `🎉 SUCCESS: EventSource connection working properly!`

### ❌ Failure Indicators
- `❌ SSE connection error`
- `socket hang up` error message
- `Connection timeout reached`
- `Max reconnection attempts reached`

### 📊 Key Information to Capture
- **Connection timing** (how long before failure)
- **Error type** (socket hang up, timeout, etc.)
- **ReadyState** when error occurs
- **Any received data** before failure

## 🧪 Expected Results

Based on our investigation:

### **If EventSource Works:**
- This would be surprising and suggest the issue is elsewhere
- We'd need to investigate differences between the diagnostic script and Coral Studio

### **If EventSource Fails (Expected):**
- Should show the same "socket hang up" error as Coral Studio
- Will help us understand the exact failure point
- Timing information will be crucial

## 📝 Next Steps After Running

1. **Copy the complete output** from the diagnostic script
2. **Share the results** so we can analyze the failure pattern
3. **Compare timing** with the curl success (curl works immediately)
4. **Identify the root cause** of EventSource vs curl differences

## 🔧 Potential Solutions We'll Explore

Based on the diagnostic results, we may need to:

1. **Adjust EventSource configuration** (headers, timeouts)
2. **Implement connection retry logic** with different parameters
3. **Switch to HTTP polling** as a fallback mechanism
4. **Modify server-side SSE handling** if needed

## 📞 Troubleshooting

If the script won't run:
```bash
# Check Node.js version
node --version

# Check if eventsource is installed
cd Web_Interface && npm list eventsource

# Install if missing
npm install eventsource
```

The diagnostic will provide the detailed information we need to fix the EventSource connection issue!
