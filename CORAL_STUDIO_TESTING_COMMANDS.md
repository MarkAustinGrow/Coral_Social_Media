# Coral Studio Testing Commands

## 🧪 **Test Commands for Application Server**

Run these curl commands from your application server to verify the Coral Studio integration:

### **1. Test EventSource/SSE Connection (Primary Test)**
```bash
# Test the main EventSource endpoint that the Coral Protocol Bridge uses
curl -v "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse?waitForAgents=2&agentId=test_bridge_agent&agentDescription=Test+bridge+agent+for+connection+verification"
```

**Expected Response:**
- Status: `HTTP/2 200`
- Content-Type: `text/event-stream`
- Should show streaming SSE data

### **2. Test Basic Coral Server Connectivity**
```bash
# Test basic HTTPS connectivity to the Coral server
curl -v https://coral.8interns.com/devmode/exampleApplication/privkey/session1/sse
```

**Expected Response:**
- Status: `HTTP/2 200`
- Content-Type: `text/event-stream`
- Valid SSL certificate verification

### **3. Test Message Endpoint (If Available)**
```bash
# Test POST to message endpoint (may require session establishment first)
curl -v -X POST "https://coral.8interns.com/devmode/exampleApplication/privkey/session1/message" \
  -H "Content-Type: application/json" \
  -H "X-User-ID: test-user" \
  -d '{"content": "Test message", "mentions": ["test_agent"]}'
```

### **4. Test Your Web Interface API**
```bash
# Test your Socket.IO API endpoint that uses the Coral Protocol Bridge
curl -v "http://localhost:3000/api/socket.io?action=get-agent-statuses&userId=test-user"
```

**Expected Response:**
- Status: `200 OK`
- JSON response with agent statuses

### **5. Test SSL Certificate Details**
```bash
# Get detailed SSL certificate information
curl -vI https://coral.8interns.com 2>&1 | grep -E "(SSL|TLS|certificate|subject|issuer)"
```

## 🔍 **What to Look For**

### **✅ Success Indicators:**
- HTTP/2 200 responses
- `content-type: text/event-stream` for SSE endpoints
- Valid SSL certificate (Let's Encrypt)
- TLS 1.3 connection
- No connection timeouts

### **❌ Failure Indicators:**
- 503 Service Unavailable
- SSL certificate errors
- Connection timeouts
- 404 Not Found (wrong endpoint)

## 🐛 **Troubleshooting**

### **If you get 503 errors:**
```bash
# Check if Coral server is running
curl -v http://localhost:5555/devmode/exampleApplication/privkey/session1/sse

# Check nginx status
systemctl status nginx

# Check nginx error logs
tail -f /var/log/nginx/error.log
```

### **If you get SSL errors:**
```bash
# Test SSL certificate validity
openssl s_client -connect coral.8interns.com:443 -servername coral.8interns.com

# Check certificate expiration
echo | openssl s_client -connect coral.8interns.com:443 2>/dev/null | openssl x509 -noout -dates
```

## 📊 **Expected Output Example**

**Successful SSE Connection:**
```
< HTTP/2 200 
< server: nginx/1.24.0 (Ubuntu)
< date: Thu, 01 Aug 2025 14:30:00 GMT
< content-type: text/event-stream
< cache-control: no-store
< x-frame-options: DENY
< x-content-type-options: nosniff
< x-xss-protection: 1; mode=block
< strict-transport-security: max-age=31536000; includeSubDomains
< 
data: {"type":"connection","status":"established"}

data: {"endpointUrl":"https://coral.8interns.com/devmode/exampleApplication/privkey/session1/message"}
```

Run these commands to verify your Coral Studio integration is working correctly!
