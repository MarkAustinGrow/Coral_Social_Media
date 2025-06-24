# 🚀 Coral Social Media Infrastructure - Complete Setup Guide

Welcome! This guide will walk you through setting up the Coral Social Media Infrastructure from scratch. You'll go from zero to a fully functional AI-powered social media system in about 30 minutes.

## 📋 Prerequisites

Before starting, make sure you have:
- A computer with internet access
- Basic familiarity with copy/paste operations
- Email address for account creation

## 🎯 What You'll Build

By the end of this guide, you'll have:
- ✅ A Supabase database with all required tables
- ✅ 8 AI agents ready to run
- ✅ A web dashboard to monitor everything
- ✅ Automated content creation and social media posting

---

## Step 1: Create Your Supabase Account & Project

### 1.1 Sign Up for Supabase
1. Go to [supabase.com](https://supabase.com)
2. Click **"Start your project"**
3. Sign up with GitHub, Google, or email
4. Verify your email if required

### 1.2 Create a New Project
1. Click **"New Project"**
2. Choose your organization (or create one)
3. Fill in project details:
   - **Name**: `coral-social-media` (or your preferred name)
   - **Database Password**: Generate a strong password and **save it**
   - **Region**: Choose closest to your location
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### 1.3 Get Your Project Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy and save these values:
   - **Project URL** (starts with `https://`)
   - **Project API Key** (anon/public key)

---

## Step 2: Set Up Your Database

### 2.1 Open the SQL Editor
1. In your Supabase dashboard, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**

### 2.2 Run the Database Setup Script
1. Copy the entire contents of `supabase_schema_updated.sql` from this repository
2. Paste it into the SQL editor
3. Click **"Run"** (or press Ctrl/Cmd + Enter)
4. Wait for the script to complete (should take 10-30 seconds)

### 2.3 Verify Your Setup
Run this verification query in the SQL editor:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see 12 tables:
- agent_logs
- agent_status  
- blog_critique
- blog_posts
- engagement_metrics
- personas
- potential_tweets
- system_config
- tweet_insights
- tweet_replies
- tweets_cache
- x_accounts

✅ **Success!** Your database is ready.

---

## Step 3: Configure Your Environment

### 3.1 Download the Project
1. Download or clone this repository to your computer
2. Navigate to the project folder

### 3.2 Create Your Environment File
1. Copy `.env.sample` to `.env`
2. Open `.env` in a text editor
3. Fill in your Supabase credentials:

```env
# Supabase Configuration
SUPABASE_URL=your_project_url_here
SUPABASE_KEY=your_anon_key_here

# OpenAI Configuration (required)
OPENAI_API_KEY=your_openai_key_here

# Twitter/X Configuration (optional for now)
TWITTER_API_KEY=your_twitter_key_here
TWITTER_API_SECRET=your_twitter_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_access_token_secret_here

# World News API (optional)
WORLD_NEWS_API_KEY=your_world_news_key_here
```

### 3.3 Get Your API Keys

#### OpenAI API Key (Required)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login and go to **API Keys**
3. Click **"Create new secret key"**
4. Copy the key and add it to your `.env` file

#### Twitter API Keys (Optional - for posting)
1. Go to [developer.twitter.com](https://developer.twitter.com)
2. Apply for developer access
3. Create a new app and get your keys
4. Add them to your `.env` file

#### World News API (Optional - for news content)
1. Go to [worldnewsapi.com](https://worldnewsapi.com)
2. Sign up for a free account
3. Get your API key and add it to `.env`

---

## Step 4: Install and Test

### 4.1 Install Python Dependencies
Open a terminal/command prompt in the project folder and run:

```bash
pip install -r requirements.txt
```

### 4.2 Test Database Connection
Run this test to verify everything is connected:

```bash
python test_agent_status.py
```

You should see: ✅ **"Database connection successful!"**

### 4.3 Start the Web Dashboard
```bash
cd Web_Interface
npm install
npm run dev
```

Open your browser to `http://localhost:3000` to see your dashboard.

---

## Step 5: Run Your First Agent

### 5.1 Test the World News Agent
```bash
python 1_langchain_world_news_agent.py
```

This agent will:
- Fetch current news
- Store it in your database
- Show you what it found

### 5.2 Check Your Dashboard
Refresh your web dashboard to see:
- Agent status updates
- Logs from the agent run
- Any content that was created

---

## 🎉 Congratulations!

Your Coral Social Media Infrastructure is now running! Here's what you can do next:

### Immediate Next Steps:
1. **Explore the Dashboard** - See all your agents and their status
2. **Run More Agents** - Try the blog writing or tweet agents
3. **Customize Settings** - Adjust personas and topics in the database

### Available Agents:
- **World News Agent** - Fetches and analyzes current events
- **Tweet Scraping Agent** - Monitors Twitter for relevant content
- **Tweet Research Agent** - Analyzes tweets for insights
- **Hot Topic Agent** - Identifies trending topics
- **Blog Writing Agent** - Creates blog posts from news
- **Blog Critique Agent** - Reviews and improves content
- **Blog-to-Tweet Agent** - Converts blogs into tweet threads
- **Twitter Posting Agent** - Publishes content to Twitter
- **X Reply Agent** - Responds to tweets intelligently

### Running All Agents:
```bash
python run_simplified_agents.py
```

---

## 🔧 Troubleshooting

### Common Issues:

**"Database connection failed"**
- Check your Supabase URL and API key in `.env`
- Verify your Supabase project is running

**"OpenAI API error"**
- Verify your OpenAI API key is correct
- Check you have credits in your OpenAI account

**"Module not found"**
- Run `pip install -r requirements.txt` again
- Make sure you're in the correct directory

**"Permission denied"**
- On Mac/Linux, try `python3` instead of `python`
- Make sure you have write permissions in the project folder

### Getting Help:
- Check the logs in your dashboard
- Look at `agent_status_monitor.log` for detailed error messages
- Review the `Codebase_Documentation.md` for technical details

---

## 🚀 Advanced Configuration

Once you have the basics working, you can:

1. **Customize Personas** - Edit the `personas` table in Supabase
2. **Add More Topics** - Update `engagement_metrics` with your interests
3. **Schedule Agents** - Set up cron jobs or task schedulers
4. **Scale Up** - Run multiple agents simultaneously
5. **Monitor Performance** - Use the built-in logging and status system

---

## 📚 Additional Resources

- **Technical Documentation**: `Codebase_Documentation.md`
- **MCP Setup Guide**: `CORAL_MCP_ADAPTER_FIX_DOCUMENTATION.md`
- **Twitter API Setup**: `TWITTER_API_SETUP.md`
- **Agent Status Guide**: `README_agent_status.md`

---

**Welcome to your AI-powered social media infrastructure!** 🎊

Your system is now ready to automatically create content, engage with social media, and help you build your online presence. The agents will work together to keep your content fresh and engaging.

Happy automating! 🤖✨
