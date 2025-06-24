import asyncio
import os
import json
import logging
import urllib.parse
from dotenv import load_dotenv
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.prompts import ChatPromptTemplate
from langchain.chat_models import init_chat_model
from langchain.agents import create_tool_calling_agent, AgentExecutor
from langchain_core.tools import tool
import worldnewsapi
from worldnewsapi.rest import ApiException

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Validate API keys
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY is not set in environment variables.")
if not os.getenv("WORLD_NEWS_API_KEY"):
    raise ValueError("WORLD_NEWS_API_KEY is not set in environment variables.")

# WorldNewsAPI config
news_configuration = worldnewsapi.Configuration(host="https://api.worldnewsapi.com")
news_configuration.api_key["apiKey"] = os.getenv("WORLD_NEWS_API_KEY")

# Agent config
base_url = "http://localhost:5555/devmode/exampleApplication/privkey/session1/sse"
params = {
    "waitForAgents": 2,
    "agentId": "world_news_agent",
    "agentDescription": "You are world_news_agent, responsible for fetching and generating news topics based on mentions from other agents"
}
MCP_SERVER_URL = f"{base_url}?{urllib.parse.urlencode(params)}"
AGENT_NAME = "world_news_agent"

def get_tools_description(tools):
    return "\n".join(
        f"Tool: {tool.name}, Schema: {json.dumps(tool.args).replace('{', '{{').replace('}', '}}')}"
        for tool in tools
    )

@tool
def WorldNewsTool(
    text: str,
    text_match_indexes: str = "title,content",
    source_country: str = "us",
    language: str = "en",
    sort: str = "publish-time",
    sort_direction: str = "ASC",
    offset: int = 0,
    number: int = 3,
):
    """
    Search articles from WorldNewsAPI.
    """
    logger.info(f"Calling WorldNewsTool with text: {text}")
    try:
        with worldnewsapi.ApiClient(news_configuration) as api_client:
            api_instance = worldnewsapi.NewsApi(api_client)
            api_response = api_instance.search_news(
                text=text,
                text_match_indexes=text_match_indexes,
                source_country=source_country,
                language=language,
                sort=sort,
                sort_direction=sort_direction,
                offset=offset,
                number=number,
            )
            articles = api_response.news
            if not articles:
                return {"result": "No news articles found for the query."}
            return {
                "result": "\n".join(
                    f"### Title: {article.title or 'N/A'}\n"
                    f"**URL:** [{article.url}]({article.url})\n"
                    f"**Date:** {article.publish_date or 'N/A'}\n"
                    f"**Text:** {article.text or 'No summary available'}\n"
                    f"------------------"
                    for article in articles
                )
            }
    except ApiException as e:
        logger.error(f"News API error: {e}")
        return {"result": f"Failed to fetch news: {e}"}
    except Exception as e:
        logger.error(f"Unexpected error in WorldNewsTool: {e}")
        return {"result": f"Unexpected error: {e}"}

async def create_world_news_agent(client, tools, agent_tool):
    tools_description = get_tools_description(tools)
    agent_tools_description = get_tools_description(agent_tool)

    prompt = ChatPromptTemplate.from_messages([
        ("system", f"""
You are an agent with tools provided by the Coral Server and your own specialized tools.

Process flow:
1. Call wait_for_mentions (timeoutMs: 8000).
2. When mentioned, keep the thread ID and sender ID.
3. Think for 2 seconds and analyze the instruction content.
4. Based on the instruction, choose the right tool from your own tools only.
5. Create a plan in steps.
6. Use the right tools to complete the task.
7. Think for 3 seconds and generate an "answer".
8. Use send_message to reply in the same thread to the sender with the "answer".
9. If any error occurs, reply using send_message with content "error".
10. Always respond.
11. Wait 2 seconds and repeat.

All available tools: {tools_description}
Your tools: {agent_tools_description}
        """),
        ("placeholder", "{agent_scratchpad}")
    ])

    model = init_chat_model(
        model="gpt-4o-mini",
        model_provider="openai",
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.3,
        max_tokens=16000
    )

    agent = create_tool_calling_agent(model, tools, prompt)
    return AgentExecutor(agent=agent, tools=tools, verbose=True)

async def main():
    client = MultiServerMCPClient(
        connections={
            "coral": {
                "transport": "sse",
                "url": MCP_SERVER_URL,
                "timeout": 300,
                "sse_read_timeout": 300,
            }
        }
    )

    async with client.session("coral") as session:
        tools = await session.get_tools()
        tools += [WorldNewsTool]
        agent_tool = [WorldNewsTool]

        agent_executor = await create_world_news_agent(session, tools, agent_tool)

        while True:
            try:
                logger.info("Starting new agent invocation")
                await agent_executor.ainvoke({"agent_scratchpad": []})
                logger.info("Completed agent invocation, restarting loop")
                await asyncio.sleep(1)
            except Exception as e:
                logger.error(f"Error in agent loop: {e}")
                await asyncio.sleep(5)

if __name__ == "__main__":
    asyncio.run(main())
