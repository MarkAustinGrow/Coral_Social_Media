#!/bin/bash

# Coral Studio Official Integration Deployment Script
# This script deploys the official Coral Studio integration with MCP bridge

echo "🚀 Deploying Coral Studio Official Integration..."

# Add environment variables
echo "📝 Adding environment variables..."
cat >> .env << 'EOF'

# Coral Studio Configuration
CORAL_STUDIO_PORT=3001
CORAL_STUDIO_HOST=0.0.0.0
NEXT_PUBLIC_CORAL_STUDIO_URL=http://localhost:3001

EOF

# Update ecosystem.config.js to include Coral Studio server
echo "🔧 Updating PM2 configuration..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'coral-social-media',
      script: 'npm',
      args: 'start',
      cwd: './Web_Interface',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'coral-studio-bridge',
      script: './coral-studio-server.js',
      env: {
        NODE_ENV: 'production',
        CORAL_STUDIO_PORT: 3001,
        HOST: '0.0.0.0',
        NEXT_PUBLIC_APP_URL: 'https://coral.8interns.com'
      }
    }
  ]
}
EOF

# Install dependencies
echo "📦 Installing dependencies..."
cd Web_Interface
npm install

# Build the application
echo "🏗️ Building application..."
npm run build

# Go back to root
cd ..

# Create systemd service for Coral Studio bridge (production)
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/coral-studio-bridge.service > /dev/null << EOF
[Unit]
Description=Coral Studio Socket.IO Bridge
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/Coral_Social_Media
ExecStart=/usr/bin/node coral-studio-server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=CORAL_STUDIO_PORT=3001
Environment=HOST=0.0.0.0
Environment=NEXT_PUBLIC_APP_URL=https://coral.8interns.com

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable service
echo "🔄 Enabling systemd service..."
sudo systemctl daemon-reload
sudo systemctl enable coral-studio-bridge

# Update Nginx configuration
echo "🌐 Updating Nginx configuration..."
sudo tee /etc/nginx/sites-available/coral-studio-bridge > /dev/null << 'EOF'
server {
    listen 80;
    server_name coral-studio.8interns.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name coral-studio.8interns.com;

    ssl_certificate /etc/letsencrypt/live/coral.8interns.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/coral.8interns.com/privkey.pem;

    # Socket.IO specific configuration
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Socket.IO specific timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check and API endpoints
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/coral-studio-bridge /etc/nginx/sites-enabled/

# Update main site to proxy Coral Studio
echo "🔧 Updating main Nginx configuration..."
sudo sed -i '/location \/ {/i\
    # Coral Studio Socket.IO Bridge\
    location /coral-studio-socket/ {\
        proxy_pass http://localhost:3001/;\
        proxy_http_version 1.1;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_cache_bypass $http_upgrade;\
    }\
' /etc/nginx/sites-available/coral.8interns.com

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    sudo systemctl reload nginx
else
    echo "❌ Nginx configuration error - please check manually"
    exit 1
fi

# Start services
echo "🚀 Starting services..."
sudo systemctl start coral-studio-bridge
sudo systemctl restart coral-social-media

# Check service status
echo "📊 Service status:"
sudo systemctl status coral-studio-bridge --no-pager -l
sudo systemctl status coral-social-media --no-pager -l

echo ""
echo "🎉 Coral Studio Official Integration deployed successfully!"
echo ""
echo "📋 Service Information:"
echo "   • Coral Studio Bridge: http://localhost:3001"
echo "   • Socket.IO Endpoint: ws://localhost:3001/socket.io"
echo "   • Main Application: https://coral.8interns.com"
echo "   • Coral Studio UI: https://coral.8interns.com/coral-studio"
echo ""
echo "🔧 Management Commands:"
echo "   • Check bridge logs: sudo journalctl -u coral-studio-bridge -f"
echo "   • Restart bridge: sudo systemctl restart coral-studio-bridge"
echo "   • Check status: sudo systemctl status coral-studio-bridge"
echo ""
echo "🧪 Testing:"
echo "   • Health check: curl http://localhost:3001/health"
echo "   • Socket secret: curl http://localhost:3001/socket-secret"
echo ""
