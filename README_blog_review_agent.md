✅ Step-by-Step Instructions: Build the Langchain/Coral Blog Critique Agent
🧱 STEP 1: Set Up Agent File
Create a new agent script:

bash
Copy
Edit
touch 4_langchain_blog_critique_agent.py
Use the Coral example as a scaffold (like 1_langchain_world_news_agent.py), and import your tools and agent logic.

⚙️ STEP 2: Define Tools
Implement the core LangChain tools using @tool decorators.

✅ fetch_pending_blogs
Pulls unpublished blogs from Supabase with status = 'pending_fact_check'.

python
Copy
Edit
@tool("fetch_pending_blogs")
def fetch_pending_blogs() -> List[Dict]:
    """Fetches blogs pending fact-checking."""
    response = supabase.table("blogs").select("*").eq("status", "pending_fact_check").execute()
    return response.data or []
✅ fact_check_blog_with_perplexity
Use Perplexity API to generate a full fact-check + continuity review.

python
Copy
Edit
@tool("fact_check_blog_with_perplexity")
def fact_check_blog_with_perplexity(blog_text: str) -> str:
    """Performs a deep fact check and continuity review using Perplexity."""
    prompt = f"""
Fact Check and Review the following blog post.

Instructions:
- Validate all claims using up-to-date (2025) data.
- Identify if any statements are misleading, exaggerated, or unsupported.
- Check whether referenced tweets are integrated meaningfully.
- Provide a structured report including:
  1. Introduction & framing analysis
  2. Fact check by section
  3. Continuity and logical flow comments
  4. Final verdict (approve or reject)
  5. Summary table comparing blog claims vs. verified evidence

Blog:
\"\"\"
{blog_text}
\"\"\"
"""
    return call_perplexity_api(prompt)
(You’ll need your call_perplexity_api(prompt) helper function set up, as you already use in the Tweet Research Agent.)

✅ store_critique_report
Saves the full report in Supabase and updates blog status.

python
Copy
Edit
@tool("store_critique_report")
def store_critique_report(blog_id: str, critique: str, decision: str) -> str:
    """Stores the critique report and updates blog status."""
    supabase.table("blog_critique").insert({
        "blog_id": blog_id,
        "critique": critique,
        "summary": decision,
        "decision": decision
    }).execute()

    supabase.table("blogs").update({
        "status": "approved" if decision == "approve" else "rejected",
        "fact_checked_at": datetime.utcnow().isoformat()
    }).eq("id", blog_id).execute()

    return f"Blog {blog_id} marked as {decision}"
✅ list_fact_check_status
Returns a Coral-friendly summary of pending/approved blogs.

python
Copy
Edit
@tool("list_fact_check_status")
def list_fact_check_status() -> str:
    """Returns blog fact-checking status summary."""
    total = supabase.table("blogs").select("*").execute().data
    pending = [b for b in total if b["status"] == "pending_fact_check"]
    approved = [b for b in total if b["status"] == "approved" and not b.get("published_at")]
    
    return f"""
Blogs Pending Fact Check: {len(pending)}
Approved but Unpublished: {len(approved)}
Total Blogs Fact Checked: {len(total) - len(pending)}
"""
🧠 STEP 3: Initialize the Agent
python
Copy
Edit
agent_tools = [
    fetch_pending_blogs,
    fact_check_blog_with_perplexity,
    store_critique_report,
    list_fact_check_status
]

agent = initialize_agent(
    tools=agent_tools,
    llm=ChatOpenAI(model="gpt-4", temperature=0),
    agent_type=AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    verbose=True
)
🤖 STEP 4: Run the Agent in a Coral Thread Loop
python
Copy
Edit
from coral_protocol.agent import AgentApp

def run():
    app = AgentApp(agent_name="blog_critique_agent", agent=agent)
    app.run_polling()  # or app.run_once() for testing
🗄️ STEP 5: Update Supabase Schema
Make sure your tables have these fields:

blogs table (extended):
sql
Copy
Edit
ALTER TABLE blogs ADD COLUMN status TEXT DEFAULT 'pending_fact_check';
ALTER TABLE blogs ADD COLUMN fact_checked_at TIMESTAMP;
blog_critique table:
sql
Copy
Edit
CREATE TABLE blog_critique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id UUID REFERENCES blogs(id),
  critique TEXT,
  summary TEXT,
  decision TEXT CHECK (decision IN ('approved', 'rejected')),
  created_at TIMESTAMP DEFAULT now()
);
🧪 STEP 6: Test and Debug
Insert a dummy blog with status='pending_fact_check'.

Run the agent manually:
python 4_langchain_blog_critique_agent.py

Confirm:

Blog is fetched

Perplexity returns report

Report is stored

Status is updated in Supabase

🧩 STEP 7: Coral Protocol Integration
Once the agent runs via AgentApp, it can:

Respond to Coral UI with questions like:

“Which blogs need fact-checking?”

“How many were approved yesterday?”

Handle automation via polling, no manual triggers needed.

✅ Optional Enhancements Later
Add error logging with a critique_logs table.

Allow searching old critiques (fetch_critique_by_blog_id)

Train an internal quality metric from blog + critique pairs

